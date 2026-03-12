import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WebhooksHelper } = require("square") as { WebhooksHelper: { verifySignature: (body: string, sig: string, key: string, url: string) => boolean } };
import { db } from "@/lib/db";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
  if (cachedWebhookSig) return cachedWebhookSig;
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
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";

    // Verify webhook signature
    let signatureKey: string;
    try {
      signatureKey = await getWebhookSignatureKey();
    } catch {
      // If webhook sig secret doesn't exist yet, log and process anyway in dev
      console.warn("[square-webhook] No webhook signature key configured, skipping verification");
      signatureKey = "";
    }

    if (signatureKey) {
      const url = `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}${request.nextUrl.pathname}`;
      const isValid = WebhooksHelper.verifySignature(rawBody, signature, signatureKey, url);
      if (!isValid) {
        console.error("[square-webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type as string;

    // Handle payment completed
    if (eventType === "payment.completed" || eventType === "order.fulfillment.updated") {
      const order = event.data?.object?.order || event.data?.object?.payment?.order;
      const metadata = order?.metadata;

      if (metadata?.userId && metadata?.scans) {
        const userId = metadata.userId;
        const scansToAdd = parseInt(metadata.scans, 10);
        const packId = metadata.packId || "unknown";

        // Add scan credits to user
        await db.send(
          new UpdateCommand({
            TableName: TABLE,
            Key: { PK: `USER#${userId}`, SK: "PROFILE" },
            UpdateExpression:
              "SET plan = :plan, updatedAt = :now ADD scanCredits :credits",
            ExpressionAttributeValues: {
              ":plan": packId,
              ":credits": scansToAdd,
              ":now": new Date().toISOString(),
            },
          })
        );

        console.log(`[square-webhook] Added ${scansToAdd} credits to user ${userId} (pack: ${packId})`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[square-webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
