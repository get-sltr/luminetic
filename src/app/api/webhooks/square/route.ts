import { NextRequest, NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { getSquareClient } from "@/lib/square";
import { SCAN_PACKS } from "@/lib/scan-packs";
import { db } from "@/lib/db";
import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const TABLE = process.env.DYNAMODB_TABLE || "appready";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedWebhookSig: string | null = null;
let webhookSigFetchedAt = 0;
const WEBHOOK_SIG_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getWebhookSignatureKey(): Promise<string> {
  // Try env var first (always fresh)
  const envKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (envKey) return envKey;

  const now = Date.now();
  if (cachedWebhookSig && now - webhookSigFetchedAt < WEBHOOK_SIG_TTL_MS) return cachedWebhookSig;
  try {
    const command = new GetSecretValueCommand({
      SecretId: "luminetic/square-webhook-signature",
    });
    const response = await secretsClient.send(command);
    const key = response.SecretString
      ? JSON.parse(response.SecretString).SQUARE_WEBHOOK_SIGNATURE_KEY
      : null;
    if (!key) throw new Error("Square webhook signature key not found");
    cachedWebhookSig = key;
    webhookSigFetchedAt = Date.now();
    return key;
  } catch {
    throw new Error(
      "Square webhook signature key is not configured. Set SQUARE_WEBHOOK_SIGNATURE_KEY environment variable."
    );
  }
}

/** Check if we already processed this event (idempotency). */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const res = await db.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `WEBHOOK#${eventId}`, SK: "EVENT" },
      ProjectionExpression: "PK",
    })
  );
  return !!res.Item;
}

async function grantCreditsAtomically(params: {
  eventId: string;
  userId: string;
  scans: number;
  packId: string;
}) {
  const { eventId, userId, scans, packId } = params;
  const now = new Date().toISOString();

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `USER#${userId}`, SK: "PROFILE" },
            UpdateExpression: "SET #p = :plan, updatedAt = :now ADD scanCredits :credits",
            ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
            ExpressionAttributeNames: {
              "#p": "plan",
            },
            ExpressionAttributeValues: {
              ":plan": packId,
              ":credits": scans,
              ":now": now,
            },
          },
        },
        {
          Put: {
            TableName: TABLE,
            Item: {
              PK: `WEBHOOK#${eventId}`,
              SK: "EVENT",
              userId,
              scans,
              processedAt: now,
              ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            },
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
    })
  );
}

function isTransactionCanceled(error: unknown): error is Error & { name: string; CancellationReasons?: Array<{ Code?: string }> } {
  return error instanceof Error && error.name === "TransactionCanceledException";
}

const VALID_PACK_IDS = new Set<string>(SCAN_PACKS.map((pack) => pack.id));
const MAX_SCANS_PER_PACK = Math.max(...SCAN_PACKS.map((pack) => pack.scans));

/** Must match the subscription URL in Square Developer Dashboard (used for HMAC). */
const WEBHOOK_NOTIFICATION_URL =
  process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "https://luminetic.io/api/webhooks/square";

type OrderMeta = { userId?: string; scans?: string; packId?: string };
type OrderMetaResolution =
  | { metadata: OrderMeta; retryable: false }
  | { metadata: null; retryable: false }
  | { metadata: null; retryable: true; reason: string };

function metadataComplete(m: OrderMeta | undefined): m is Required<Pick<OrderMeta, "userId" | "scans">> & OrderMeta {
  return !!(m?.userId && m?.scans);
}

/**
 * Square often omits `order` on payment webhooks. Metadata is on the Order — fetch by `orderId` when needed.
 */
async function resolveOrderMetadata(
  payment: Record<string, unknown> | undefined,
  eventDataObject: Record<string, unknown> | undefined
): Promise<OrderMetaResolution> {
  const fromPaymentOrder = (payment?.order as { metadata?: OrderMeta } | undefined)?.metadata;
  if (metadataComplete(fromPaymentOrder)) return { metadata: fromPaymentOrder, retryable: false };

  const fromEventOrder = (eventDataObject?.order as { metadata?: OrderMeta } | undefined)?.metadata;
  if (metadataComplete(fromEventOrder)) return { metadata: fromEventOrder, retryable: false };

  const orderId =
    (typeof payment?.orderId === "string" && payment.orderId) ||
    (typeof payment?.order_id === "string" && payment.order_id) ||
    undefined;

  if (!orderId) {
    console.warn("[square-webhook] COMPLETED payment has no embedded order metadata and no orderId — cannot grant credits");
    return { metadata: null, retryable: false };
  }

  try {
    const square = await getSquareClient();
    const res = await square.orders.get({ orderId });
    const meta = res.order?.metadata as OrderMeta | undefined;
    if (metadataComplete(meta)) return { metadata: meta, retryable: false };
    console.warn("[square-webhook] Retrieved order but metadata incomplete:", orderId);
    return {
      metadata: null,
      retryable: true,
      reason: "Order metadata missing after retrieval",
    };
  } catch (e) {
    console.error("[square-webhook] orders.get failed for", orderId, e);
    return {
      metadata: null,
      retryable: true,
      reason: "Temporary failure fetching Square order metadata",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature");
    if (!signature) {
      console.error("[square-webhook] Missing x-square-hmacsha256-signature header");
      return NextResponse.json({ error: "Missing signature." }, { status: 401 });
    }

    let signatureKey: string;
    try {
      signatureKey = await getWebhookSignatureKey();
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : String(configErr);
      console.error("[square-webhook] Missing or invalid SQUARE_WEBHOOK_SIGNATURE_KEY / Secrets Manager:", msg);
      return NextResponse.json(
        { error: "Webhook signing key not configured on server." },
        { status: 503 }
      );
    }

    const url = WEBHOOK_NOTIFICATION_URL;
    let isValid: boolean;
    try {
      isValid = await WebhooksHelper.verifySignature({
        requestBody: rawBody,
        signatureHeader: signature,
        signatureKey,
        notificationUrl: url,
      });
    } catch (verifyErr) {
      console.error("[square-webhook] verifySignature threw:", verifyErr);
      return NextResponse.json({ error: "Signature verification error." }, { status: 400 });
    }
    if (!isValid) {
      console.error("[square-webhook] Invalid signature (check SQUARE_WEBHOOK_NOTIFICATION_URL matches subscription URL exactly)");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    let event: { event_id?: string; type?: string; data?: { object?: { payment?: unknown; order?: unknown } } };
    try {
      event = JSON.parse(rawBody) as typeof event;
    } catch {
      console.error("[square-webhook] Invalid JSON body");
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const eventId = event.event_id as string | undefined;
    const eventType = event.type as string;

    // Require event_id for idempotency
    if (!eventId) {
      return NextResponse.json({ error: "Missing event_id." }, { status: 400 });
    }

    // Idempotency: skip if already processed
    if (await isEventProcessed(eventId)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Handle payment events
    if (eventType === "payment.created" || eventType === "payment.updated") {
      const payment = event.data?.object?.payment as Record<string, unknown> | undefined;
      const status = typeof payment?.status === "string" ? payment.status : undefined;

      // Only process completed payments
      if (status !== "COMPLETED") {
        return NextResponse.json({ received: true });
      }

      const metadataResolution = await resolveOrderMetadata(
        payment as Record<string, unknown> | undefined,
        event.data?.object as Record<string, unknown> | undefined
      );
      if (metadataResolution.retryable) {
        console.error("[square-webhook] Retryable metadata resolution failure:", metadataResolution.reason);
        return NextResponse.json(
          { error: "Could not resolve order metadata. Ask Square to retry this webhook." },
          { status: 503 }
        );
      }
      const orderMetadata = metadataResolution.metadata;

      if (orderMetadata?.userId && orderMetadata?.scans) {
        const userId = orderMetadata.userId;
        const scansToAdd = parseInt(orderMetadata.scans, 10);
        const packId = orderMetadata.packId || "unknown";

        // Validate metadata
        if (isNaN(scansToAdd) || scansToAdd <= 0 || scansToAdd > MAX_SCANS_PER_PACK) {
          console.error(`[square-webhook] Invalid scans value: ${orderMetadata.scans}`);
          return NextResponse.json({ error: "Invalid scan count." }, { status: 400 });
        }

        if (packId !== "unknown" && !VALID_PACK_IDS.has(packId)) {
          console.error(`[square-webhook] Invalid packId: ${packId}`);
          return NextResponse.json({ error: "Invalid pack." }, { status: 400 });
        }

        // Validate payment amount matches expected pack price
        // Square webhook payloads use snake_case (amount_money), not camelCase
        if (packId !== "unknown") {
          const expectedPack = SCAN_PACKS.find((p) => p.id === packId);
          const amountObj = (payment as Record<string, unknown>)?.amount_money ?? (payment as Record<string, unknown>)?.amountMoney;
          const paidAmountCents = typeof amountObj === "object" && amountObj !== null
            ? ((amountObj as { amount?: number }).amount ?? null)
            : null;
          if (expectedPack && paidAmountCents !== null && paidAmountCents < expectedPack.priceInCents) {
            console.error(`[square-webhook] Amount mismatch: paid ${paidAmountCents} < expected ${expectedPack.priceInCents} for ${packId}`);
            return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
          }
        }

        try {
          await grantCreditsAtomically({
            eventId,
            userId,
            scans: scansToAdd,
            packId,
          });
        } catch (error) {
          if (isTransactionCanceled(error)) {
            const reasons = error.CancellationReasons?.map((reason) => reason.Code).filter(Boolean) || [];
            if (reasons.includes("ConditionalCheckFailed")) {
              if (await isEventProcessed(eventId)) {
                console.warn("[square-webhook] Duplicate event raced during processing:", eventId);
                return NextResponse.json({ received: true, duplicate: true });
              }

              console.error("[square-webhook] User profile missing or invalid during credit grant:", {
                eventId,
                userId,
                packId,
                scansToAdd,
                reasons,
              });
            }
          }
          throw error;
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[square-webhook] Unhandled error:", msg);
    if (stack) console.error("[square-webhook] Stack:", stack);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
