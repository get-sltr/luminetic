import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
);
const TABLE = process.env.DYNAMODB_TABLE || "appready";
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

function isConditionalFailure(error) {
  return error?.name === "ConditionalCheckFailedException" || error?.name === "TransactionCanceledException";
}

async function refundScanCreditForScan(userId, scanSK) {
  const now = new Date().toISOString();

  try {
    await db.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `USER#${userId}`, SK: scanSK },
            UpdateExpression: "SET creditRefunded = :true, creditRefundedAt = :now, updatedAt = :now",
            ConditionExpression: "creditCharged = :true AND (attribute_not_exists(creditRefunded) OR creditRefunded = :false) AND (attribute_not_exists(#s) OR #s <> :complete)",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: {
              ":true": true,
              ":false": false,
              ":complete": "complete",
              ":now": now,
            },
          },
        },
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `USER#${userId}`, SK: "PROFILE" },
            UpdateExpression: "ADD scanCredits :one SET updatedAt = :now",
            ConditionExpression: "attribute_exists(PK)",
            ExpressionAttributeValues: {
              ":one": 1,
              ":now": now,
            },
          },
        },
      ],
    }));
    return true;
  } catch (error) {
    if (isConditionalFailure(error)) return false;
    throw error;
  }
}

export const handler = async () => {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  // Find stale active scans and charged error scans whose refund marker is missing.
  const stuckScans = [];
  let lastKey;
  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "begins_with(SK, :scanPrefix) AND (((#s IN (:pending, :analyzing, :reconciling)) AND updatedAt < :cutoff) OR (#s = :error AND creditCharged = :true AND (attribute_not_exists(creditRefunded) OR creditRefunded = :false)))",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":pending": "pending",
        ":analyzing": "analyzing",
        ":reconciling": "reconciling",
        ":error": "error",
        ":true": true,
        ":false": false,
        ":cutoff": cutoff,
        ":scanPrefix": "SCAN#",
      },
      ProjectionExpression: "PK, SK, scanId, #s, updatedAt, creditCharged, creditRefunded",
      ExclusiveStartKey: lastKey,
    }));
    if (res.Items) stuckScans.push(...res.Items);
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
      // Mark as error
      if (scan.status !== "error") {
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
      }

      // Refund only if this scan durably recorded a charged paid credit.
      const userId = scan.PK.replace("USER#", "");
      try {
        const refunded = await refundScanCreditForScan(userId, scan.SK);
        if (refunded) {
          console.log(`[Sweeper] Refunded credit for user ${userId}, scan ${scan.scanId}`);
        } else {
          console.log(`[Sweeper] No charged refundable credit for user ${userId}, scan ${scan.scanId}`);
        }
      } catch (refundErr) {
        console.warn(`[Sweeper] Credit refund failed for ${userId}:`, refundErr);
      }

      swept++;
      console.log(`[Sweeper] Marked scan ${scan.scanId} as error (was ${scan.status} since ${scan.updatedAt})`);
    } catch (err) {
      // ConditionExpression failure means status already changed — skip
      if (isConditionalFailure(err)) {
        console.log(`[Sweeper] Scan ${scan.scanId} status already changed, skipping`);
      } else {
        console.error(`[Sweeper] Failed to update scan ${scan.scanId}:`, err);
      }
    }
  }

  console.log(`[Sweeper] Done — swept ${swept} scan(s)`);
  return { swept };
};
