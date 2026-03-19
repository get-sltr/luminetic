import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
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
      scanCount: 0,
      scanCredits: 0,
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
  // Query by GSI to find by scanId
  const res = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    FilterExpression: "scanId = :sid",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":prefix": "SCAN#",
      ":sid": scanId,
    },
    Limit: 1,
  }));
  return res.Items?.[0] || null;
}
