import { NextRequest, NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { db } from "@/lib/db";
import { UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
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

/** Mark an event as processed. TTL = 30 days. */
async function markEventProcessed(eventId: string, userId: string, scans: number) {
  await db.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `WEBHOOK#${eventId}`,
        SK: "EVENT",
        userId,
        scans,
        processedAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      },
    })
  );
}

const VALID_PACK_IDS = new Set(["starter", "pro", "agency"]);
const MAX_SCANS_PER_PACK = 10;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";

    // Always verify webhook signature — fail hard if key is unavailable
    const signatureKey = await getWebhookSignatureKey();

    const url = "https://luminetic.io/api/webhooks/square";
    const isValid = await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader: signature,
      signatureKey,
      notificationUrl: url,
    });
    if (!isValid) {
      console.error("[square-webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
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
      const payment = event.data?.object?.payment;
      const status = payment?.status;

      // Only process completed payments
      if (status !== "COMPLETED") {
        return NextResponse.json({ received: true });
      }

      const order = payment?.order || event.data?.object?.order;
      const orderMetadata = order?.metadata;

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

        // Add scan credits to user
        await db.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: { PK: `USER#${userId}`, SK: "PROFILE" },
            UpdateExpression:
              "SET #p = :plan, updatedAt = :now ADD scanCredits :credits",
            ExpressionAttributeNames: {
              "#p": "plan",
            },
            ExpressionAttributeValues: {
              ":plan": packId,
              ":credits": scansToAdd,
              ":now": new Date().toISOString(),
            },
          })
        );

        // Record event as processed (idempotency)
        await markEventProcessed(eventId, userId, scansToAdd);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[square-webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
