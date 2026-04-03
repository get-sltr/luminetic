import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
);
const TABLE = process.env.DYNAMODB_TABLE || "appready";
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export const handler = async () => {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  // Find stuck scans — status is analyzing/reconciling AND updatedAt is old
  const res = await db.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: "(#s = :analyzing OR #s = :reconciling) AND updatedAt < :cutoff AND begins_with(SK, :scanPrefix)",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: {
      ":analyzing": "analyzing",
      ":reconciling": "reconciling",
      ":cutoff": cutoff,
      ":scanPrefix": "SCAN#",
    },
    ProjectionExpression: "PK, SK, scanId, #s, updatedAt, creditCharged",
  }));

  const stuckScans = res.Items || [];
  if (stuckScans.length === 0) {
    console.log("[Sweeper] No stuck scans found");
    return { swept: 0 };
  }

  console.log(`[Sweeper] Found ${stuckScans.length} stuck scan(s)`);

  let swept = 0;
  for (const scan of stuckScans) {
    try {
      // Mark as error
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: scan.PK, SK: scan.SK },
        UpdateExpression: "SET #s = :error, errorMessage = :msg, updatedAt = :now",
        ConditionExpression: "#s = :currentStatus",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":error": "error",
          ":msg": "Analysis timed out. Your credit has been preserved — please try again.",
          ":currentStatus": scan.status,
          ":now": new Date().toISOString(),
        },
      }));

      // Refund credit only when this scan actually deducted one.
      // Free scans/founder scans should never mint paid credits on timeout.
      const userId = scan.PK.replace("USER#", "");
      if (scan.creditCharged) {
        try {
          await db.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: scan.PK, SK: "PROFILE" },
            UpdateExpression: "ADD scanCredits :one SET updatedAt = :now",
            ExpressionAttributeValues: { ":one": 1, ":now": new Date().toISOString() },
          }));
          console.log(`[Sweeper] Refunded credit for user ${userId}, scan ${scan.scanId}`);
        } catch (refundErr) {
          console.warn(`[Sweeper] Credit refund failed for ${userId}:`, refundErr);
        }
      } else {
        console.log(`[Sweeper] No refund needed for scan ${scan.scanId} (creditCharged=false)`);
      }

      swept++;
      console.log(`[Sweeper] Marked scan ${scan.scanId} as error (was ${scan.status} since ${scan.updatedAt})`);
    } catch (err) {
      // ConditionExpression failure means status already changed — skip
      if (err.name === "ConditionalCheckFailedException") {
        console.log(`[Sweeper] Scan ${scan.scanId} status already changed, skipping`);
      } else {
        console.error(`[Sweeper] Failed to update scan ${scan.scanId}:`, err);
      }
    }
  }

  console.log(`[Sweeper] Done — swept ${swept} scan(s)`);
  return { swept };
};
