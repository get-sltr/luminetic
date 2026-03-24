import { NextRequest, NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { getSquareClient } from "@/lib/square";
import { db } from "@/lib/db";
import { UpdateCommand, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const TABLE = process.env.DYNAMODB_TABLE || "appready";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedWebhookSig: string | null = null;

async function getWebhookSignatureKey(): Promise<string> {
  // Try env var first
  const envKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (envKey) return envKey;

  if (cachedWebhookSig) return cachedWebhookSig;
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

function isDuplicateEventError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const e = error as {
    name?: string;
    message?: string;
    CancellationReasons?: Array<{ Code?: string }>;
    cancellationReasons?: Array<{ Code?: string }>;
  };

  const reasons = e.CancellationReasons || e.cancellationReasons;
  if (Array.isArray(reasons) && reasons.some((r) => r?.Code === "ConditionalCheckFailed")) {
    return true;
  }

  return (
    e.name === "ConditionalCheckFailedException" ||
    (e.name === "TransactionCanceledException" &&
      typeof e.message === "string" &&
      e.message.includes("ConditionalCheckFailed"))
  );
}

/**
 * Atomically grants credits exactly once per event:
 * - writes webhook marker with conditional put
 * - updates user credits in the same transaction
 */
async function grantCreditsExactlyOnce(
  eventId: string,
  userId: string,
  scansToAdd: number,
  packId: string
): Promise<"applied" | "duplicate"> {
  try {
    await db.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE,
              Item: {
                PK: `WEBHOOK#${eventId}`,
                SK: "EVENT",
                userId,
                scans: scansToAdd,
                processedAt: new Date().toISOString(),
                ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              },
              ConditionExpression: "attribute_not_exists(PK)",
            },
          },
          {
            Update: {
              TableName: TABLE,
              Key: { PK: `USER#${userId}`, SK: "PROFILE" },
              UpdateExpression: "SET #p = :plan, updatedAt = :now ADD scanCredits :credits",
              ExpressionAttributeNames: {
                "#p": "plan",
              },
              ExpressionAttributeValues: {
                ":plan": packId,
                ":credits": scansToAdd,
                ":now": new Date().toISOString(),
              },
            },
          },
        ],
      })
    );
    return "applied";
  } catch (error) {
    if (isDuplicateEventError(error)) return "duplicate";
    throw error;
  }
}

const VALID_PACK_IDS = new Set(["starter", "pro", "agency"]);
const MAX_SCANS_PER_PACK = 10;

/** Must match the subscription URL in Square Developer Dashboard (used for HMAC). */
const WEBHOOK_NOTIFICATION_URL =
  process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "https://luminetic.io/api/webhooks/square";

type OrderMeta = { userId?: string; scans?: string; packId?: string };

function metadataComplete(m: OrderMeta | undefined): m is Required<Pick<OrderMeta, "userId" | "scans">> & OrderMeta {
  return !!(m?.userId && m?.scans);
}

/**
 * Square often omits `order` on payment webhooks. Metadata is on the Order — fetch by `orderId` when needed.
 */
async function resolveOrderMetadata(
  payment: Record<string, unknown> | undefined,
  eventDataObject: Record<string, unknown> | undefined
): Promise<OrderMeta | null> {
  const fromPaymentOrder = (payment?.order as { metadata?: OrderMeta } | undefined)?.metadata;
  if (metadataComplete(fromPaymentOrder)) return fromPaymentOrder;

  const fromEventOrder = (eventDataObject?.order as { metadata?: OrderMeta } | undefined)?.metadata;
  if (metadataComplete(fromEventOrder)) return fromEventOrder;

  const orderId =
    (typeof payment?.orderId === "string" && payment.orderId) ||
    (typeof payment?.order_id === "string" && payment.order_id) ||
    undefined;

  if (!orderId) {
    console.warn("[square-webhook] COMPLETED payment has no embedded order metadata and no orderId — cannot grant credits");
    return null;
  }

  try {
    const square = await getSquareClient();
    const res = await square.orders.get({ orderId });
    const meta = res.order?.metadata as OrderMeta | undefined;
    if (metadataComplete(meta)) return meta;
    console.warn("[square-webhook] Retrieved order but metadata incomplete:", orderId);
  } catch (e) {
    console.error("[square-webhook] orders.get failed for", orderId, e);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";

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

      const orderMetadata = await resolveOrderMetadata(
        payment as Record<string, unknown> | undefined,
        event.data?.object as Record<string, unknown> | undefined
      );

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

        const grantResult = await grantCreditsExactlyOnce(eventId, userId, scansToAdd, packId);
        if (grantResult === "duplicate") {
          return NextResponse.json({ received: true, duplicate: true });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[square-webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
