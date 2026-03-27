import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
export const db = DynamoDBDocumentClient.from(client);

const TABLE = process.env.DYNAMODB_TABLE || "appready";

// ── User ────────────────────────────────────────────────────

export async function putUser(userId: string, email: string) {
  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      userId,
      email,
      plan: "free",
      role: "user",
      scanCount: 0,
      scanCredits: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ConditionExpression: "attribute_not_exists(PK)",
  }));
}

export async function deductScanCredit(userId: string): Promise<boolean> {
  try {
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
      UpdateExpression: "ADD scanCredits :dec SET updatedAt = :now",
      ConditionExpression: "scanCredits > :zero",
      ExpressionAttributeValues: {
        ":dec": -1,
        ":zero": 0,
        ":now": new Date().toISOString(),
      },
    }));
    return true;
  } catch {
    return false;
  }
}

/** Restore one credit (e.g. analysis failed after deduct). */
export async function refundScanCredit(userId: string): Promise<void> {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    UpdateExpression: "ADD scanCredits :one SET updatedAt = :now",
    ConditionExpression: "attribute_exists(PK)",
    ExpressionAttributeValues: {
      ":one": 1,
      ":now": new Date().toISOString(),
    },
  }));
}

export async function getUser(userId: string) {
  const res = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: "PROFILE" },
  }));
  return res.Item;
}

// ── Scans ───────────────────────────────────────────────────

export async function putScan(userId: string, data: {
  inputText: string;
  mergedResult: unknown;
  geminiResult: unknown;
  deepseekResult?: unknown;
  claudeResult: unknown;
  sonnetResult?: unknown;
  score: number;
  s3Key?: string;
  bundleId?: string;
}) {
  const scanId = randomUUID();
  const timestamp = new Date().toISOString();

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `USER#${userId}`,
      SK: `SCAN#${timestamp}#${scanId}`,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `SCAN#${timestamp}`,
      scanId,
      userId,
      inputText: data.inputText,
      mergedResult: data.mergedResult,
      geminiResult: data.geminiResult,
      claudeResult: data.claudeResult,
      ...(data.deepseekResult ? { deepseekResult: data.deepseekResult } : {}),
      ...(data.sonnetResult ? { sonnetResult: data.sonnetResult } : {}),
      score: data.score,
      ...(data.s3Key ? { s3Key: data.s3Key } : {}),
      ...(data.bundleId ? { bundleId: data.bundleId } : {}),
      status: "complete",
      createdAt: timestamp,
    },
  }));

  // Increment scan count
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    UpdateExpression: "ADD scanCount :inc SET updatedAt = :now",
    ExpressionAttributeValues: { ":inc": 1, ":now": new Date().toISOString() },
  }));

  return { scanId, timestamp };
}

export async function getScans(userId: string, limit = 20) {
  const res = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":prefix": "SCAN#",
    },
    ScanIndexForward: false,
    Limit: limit,
    ProjectionExpression: "scanId, score, createdAt, SK",
  }));
  return res.Items || [];
}

export async function getMonthlyScansCount(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const res = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":start": `SCAN#${monthStart}`,
      ":end": `SCAN#${now.toISOString()}~`,
    },
    Select: "COUNT",
  }));
  return res.Count || 0;
}

export async function getAllScansWithIssues(userId: string) {
  const res = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":prefix": "SCAN#",
    },
    ScanIndexForward: false,
    ProjectionExpression: "scanId, score, createdAt, mergedResult",
  }));
  return res.Items || [];
}

export async function getScan(userId: string, scanId: string) {
  // Fetch by direct key lookup using GetCommand for efficiency
  // SK format: SCAN#<timestamp>#<scanId> — since we don't know the timestamp,
  // query all scans and filter. Do NOT use Limit with FilterExpression
  // (Limit applies before filter, causing missed results).
  const res = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    FilterExpression: "scanId = :sid",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":prefix": "SCAN#",
      ":sid": scanId,
    },
  }));
  return res.Items?.[0] || null;
}

// ── Free-scan abuse prevention ────────────────────────────

/** Check if an IPA (by SHA-256 hash or bundle ID) has already been scanned with a free credit. */
export async function isAppFreeScanned(ipaHash: string, bundleId?: string): Promise<boolean> {
  // Check by hash
  const hashCheck = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `FREE_SCAN#${ipaHash}`, SK: "HASH" },
  }));
  if (hashCheck.Item) return true;

  // Check by bundle ID
  if (bundleId) {
    const bundleCheck = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `FREE_SCAN#${bundleId}`, SK: "BUNDLE" },
    }));
    if (bundleCheck.Item) return true;
  }

  return false;
}

/** Record that an IPA was scanned using a free credit. */
export async function markFreeScannedApp(ipaHash: string, bundleId: string | undefined, userId: string): Promise<void> {
  const now = new Date().toISOString();

  // Record hash
  await db.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `FREE_SCAN#${ipaHash}`,
      SK: "HASH",
      userId,
      bundleId: bundleId || "unknown",
      createdAt: now,
    },
  }));

  // Record bundle ID
  if (bundleId) {
    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `FREE_SCAN#${bundleId}`,
        SK: "BUNDLE",
        userId,
        ipaHash,
        createdAt: now,
      },
    }));
  }
}

/** Check if a user's credits are from signup (never purchased). */
export async function isFreeTierUser(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;
  // User has exactly 1 credit, has never completed a scan, and has no purchase history
  // Simplification: if scanCount is 0 and credits <= 1, they're on the free tier
  return (user.scanCount === 0 || user.scanCount === undefined) && (user.scanCredits as number) <= 1;
}

// ── Admin ──────────────────────────────────────────────────

export async function listUsers() {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "SK = :profile",
      ExpressionAttributeValues: { ":profile": "PROFILE" },
      ProjectionExpression: "userId, email, #p, #r, scanCredits, scanCount, createdAt, updatedAt",
      ExpressionAttributeNames: { "#p": "plan", "#r": "role" },
      ExclusiveStartKey: lastKey,
    }));
    if (res.Items) items.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

export async function updateUserRole(userId: string, role: string) {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    UpdateExpression: "SET #r = :role, updatedAt = :now",
    ExpressionAttributeNames: { "#r": "role" },
    ExpressionAttributeValues: { ":role": role, ":now": new Date().toISOString() },
  }));
}

export async function updateUserCredits(userId: string, credits: number) {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    UpdateExpression: "SET scanCredits = :credits, updatedAt = :now",
    ExpressionAttributeValues: { ":credits": credits, ":now": new Date().toISOString() },
  }));
}

export async function updateUserPlan(userId: string, plan: string) {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: "PROFILE" },
    UpdateExpression: "SET #p = :plan, updatedAt = :now",
    ExpressionAttributeNames: { "#p": "plan" },
    ExpressionAttributeValues: { ":plan": plan, ":now": new Date().toISOString() },
  }));
}
