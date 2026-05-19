import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
);
const TABLE = process.env.DYNAMODB_TABLE || "appready";
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export const handler = async () => {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  const stuckScans = [];
  let lastKey;
  do {
    // Pending scans can also get stuck if the async Lambda invoke is accepted but never starts.
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "(#s = :pending OR #s = :analyzing OR #s = :reconciling) AND updatedAt < :cutoff AND begins_with(SK, :scanPrefix)",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":pending": "pending",
        ":analyzing": "analyzing",
        ":reconciling": "reconciling",
        ":cutoff": cutoff,
        ":scanPrefix": "SCAN#",
      },
      ProjectionExpression: "PK, SK, scanId, #s, updatedAt, creditCharged, creditRefunded",
      ExclusiveStartKey: lastKey,
    }));
    stuckScans.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  if (stuckScans.length === 0) {
    console.log("[Sweeper] No stuck scans found");
    return { swept: 0 };
  }

  console.log(`[Sweeper] Found ${stuckScans.length} stuck scan(s)`);

  let swept = 0;
  for (const scan of stuckScans) {
    try {
      const userId = scan.PK.replace("USER#", "");
      const now = new Date().toISOString();

      if (scan.creditCharged === true) {
        await db.send(new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: TABLE,
                Key: { PK: scan.PK, SK: scan.SK },
                UpdateExpression: "SET #s = :error, errorMessage = :msg, updatedAt = :now, creditRefunded = :true, creditRefundedAt = :now",
                ConditionExpression: "#s = :currentStatus AND creditCharged = :true AND (attribute_not_exists(creditRefunded) OR creditRefunded <> :true)",
                ExpressionAttributeNames: { "#s": "status" },
                ExpressionAttributeValues: {
                  ":error": "error",
                  ":msg": "Analysis timed out. Your credit has been preserved — please try again.",
                  ":currentStatus": scan.status,
                  ":true": true,
                  ":now": now,
                },
              },
            },
            {
              Update: {
                TableName: TABLE,
                Key: { PK: scan.PK, SK: "PROFILE" },
                UpdateExpression: "ADD scanCredits :one SET updatedAt = :now",
                ConditionExpression: "attribute_exists(PK)",
                ExpressionAttributeValues: { ":one": 1, ":now": now },
              },
            },
          ],
        }));
        console.log(`[Sweeper] Refunded credit for user ${userId}, scan ${scan.scanId}`);
      } else {
        await db.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: scan.PK, SK: scan.SK },
          UpdateExpression: "SET #s = :error, errorMessage = :msg, updatedAt = :now",
          ConditionExpression: "#s = :currentStatus",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":error": "error",
            ":msg": "Analysis timed out. Please try again.",
            ":currentStatus": scan.status,
            ":now": now,
          },
        }));
      }

      swept++;
      console.log(`[Sweeper] Marked scan ${scan.scanId} as error (was ${scan.status} since ${scan.updatedAt})`);
    } catch (err) {
      // Conditional failures mean the status changed or this credit was already refunded.
      if (err.name === "ConditionalCheckFailedException" || err.name === "TransactionCanceledException") {
        console.log(`[Sweeper] Scan ${scan.scanId} status already changed, skipping`);
      } else {
        console.error(`[Sweeper] Failed to update scan ${scan.scanId}:`, err);
      }
    }
  }

  console.log(`[Sweeper] Done — swept ${swept} scan(s)`);
  return { swept };
};
