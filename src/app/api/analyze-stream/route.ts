/**
 * SSR thin route — validates, deducts credit, parses IPA, invokes
 * the standalone luminetic-analyze Lambda (120s timeout) async,
 * then returns { scanId } immediately. Client polls for results.
 */

export const maxDuration = 30;

import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  canUserScan,
  deductScanCredit,
  refundScanCredit,
  isAppFreeScanned,
  markFreeScannedApp,
} from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";
import { runStaticAnalysis } from "@/lib/analyzers/orchestrator";
import { z } from "zod";
import { guardInput } from "@/lib/vindicara";
import { parseIpa, type IpaMetadata } from "@/lib/ipa-parser";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const lambda = new LambdaClient({ region: process.env.AWS_REGION || "us-east-1" });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const TABLE = process.env.DYNAMODB_TABLE || "appready";
const LAMBDA_NAME = process.env.ANALYZE_LAMBDA_NAME || "luminetic-analyze";

function buildMetadataContext(
  metadata: IpaMetadata,
  synopsis: string,
  credentials?: { email: string; password: string }
): string {
  const parts: string[] = [];
  parts.push(`## App Synopsis\n${synopsis}`);
  parts.push(`\n## App Identity`);
  parts.push(`- App Name: ${metadata.appName || "Unknown"}`);
  parts.push(`- Bundle ID: ${metadata.bundleId || "Unknown"}`);
  parts.push(`- Version: ${metadata.version || "Unknown"} (Build ${metadata.buildNumber || "Unknown"})`);
  parts.push(`- Minimum OS: ${metadata.minimumOSVersion || "Unknown"}`);

  if (credentials?.email) {
    parts.push(`\n## Test Credentials`);
    parts.push(`- Email: ${credentials.email}`);
    parts.push(`- Password: [provided]`);
  }

  const privacyEntries = Object.entries(metadata.privacyUsageDescriptions || {});
  if (privacyEntries.length > 0) {
    parts.push(`\n## Privacy Usage Descriptions`);
    privacyEntries.forEach(([key, value]) => parts.push(`- ${key}: "${value}"`));
  } else {
    parts.push(`\n## Privacy Usage Descriptions\n⚠️ NONE FOUND — This is likely a critical issue.`);
  }

  if (metadata.backgroundModes.length > 0)
    parts.push(`\n## Background Modes\n${metadata.backgroundModes.map((m) => `- ${m}`).join("\n")}`);
  if (metadata.requiredDeviceCapabilities.length > 0)
    parts.push(`\n## Required Device Capabilities\n${metadata.requiredDeviceCapabilities.map((c) => `- ${c}`).join("\n")}`);
  if (metadata.urlSchemes.length > 0)
    parts.push(`\n## URL Schemes\n${metadata.urlSchemes.map((s) => `- ${s}`).join("\n")}`);
  parts.push(`\n## Export Compliance\n- Uses Non-Exempt Encryption: ${metadata.exportCompliance ? "Yes" : "No"}`);
  if (metadata.frameworks.length > 0)
    parts.push(`\n## Embedded Frameworks (SDKs Detected)\n${metadata.frameworks.map((f) => `- ${f}`).join("\n")}`);
  if (metadata.entitlements && Object.keys(metadata.entitlements).length > 0) {
    parts.push(`\n## Entitlements`);
    Object.entries(metadata.entitlements).forEach(([key, value]) => parts.push(`- ${key}: ${JSON.stringify(value)}`));
  }
  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  let scanCreditCharged = false;
  let scanQueued = false;
  let refundUserId: string | null = null;

  try {
    // ── Parse input ──
    const schema = z.object({
      s3Key: z.string().min(1).optional(),
      synopsis: z.string().min(10).max(10000).optional(),
      bundleId: z.string().optional(),
      credentials: z.object({ email: z.string(), password: z.string() }).optional(),
      feedback: z.string().min(10).max(10000).optional(),
      email: z.string().min(10).max(10000).optional(),
      text: z.string().min(10).max(10000).optional(),
    }).refine((d) => d.s3Key || d.feedback || d.email || d.text, {
      message: "Please provide an .ipa file or review feedback.",
    });

    let parsed;
    try {
      parsed = schema.parse(await request.json());
    } catch (error) {
      const msg = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid input.";
      return Response.json({ error: msg }, { status: 400 });
    }

    // ── Auth ──
    const accessToken = request.cookies.get("access_token")?.value;
    const authUser = accessToken ? await verifyToken(accessToken) : null;
    if (!authUser) return Response.json({ error: "Sign in to run an analysis." }, { status: 401 });
    refundUserId = authUser.userId;

    // ── Rate limit ──
    const rl = analyzeLimiter.check(authUser.userId);
    if (!rl.allowed) return Response.json({ error: "Too many requests. Please wait." }, { status: 429 });

    // ── s3Key ownership ──
    if (parsed.s3Key) {
      if (parsed.s3Key.includes("..") || !parsed.s3Key.startsWith(`ipa-uploads/${authUser.userId}/`))
        return Response.json({ error: "Forbidden: invalid file reference." }, { status: 403 });
    }

    // ── VINDICARA: Guard user-supplied text against prompt injection ──
    const userText = parsed.synopsis || parsed.feedback || parsed.email || parsed.text;
    if (userText) {
      const guard = await guardInput(userText, "prompt-injection");
      if (guard.blocked) {
        return Response.json(
          { error: "Your input was flagged by our security system. Please revise and try again." },
          { status: 400 }
        );
      }
    }

    // ── Scan gating: founder > paid credits > free scan > blocked ──
    let isFreeScan = false;
    let gate;
    try {
      gate = await canUserScan(authUser.userId);
      if (!gate.allowed) {
        return Response.json(
          { error: "No scan credits remaining. Purchase a scan pack to continue.", code: "NO_CREDITS" },
          { status: 402 },
        );
      }
      if (gate.isPaidScan) {
        const used = await deductScanCredit(authUser.userId);
        if (!used) return Response.json({ error: "No scan credits remaining.", code: "NO_CREDITS" }, { status: 402 });
        scanCreditCharged = true;
      }
      if (gate.isFreeScan) {
        isFreeScan = true;
      }
    } catch (err) {
      console.error("Credit check error:", err);
      return Response.json({ error: "Unable to verify credits." }, { status: 503 });
    }

    // ── Parse IPA / build context ──
    const isIpaFlow = !!parsed.s3Key;
    let contextForAI: string;
    let ipaMetadata: IpaMetadata | null = null;
    let ipaHash: string | null = null;

    if (isIpaFlow) {
      try {
        const parseResult = await parseIpa(parsed.s3Key!);
        ipaMetadata = parseResult.metadata;
        ipaHash = parseResult.sha256;
        contextForAI = buildMetadataContext(ipaMetadata, parsed.synopsis || "No synopsis provided.", parsed.credentials);
      } catch (err) {
        console.error("[IPA parse error]", err);
        if (scanCreditCharged) {
          try { await refundScanCredit(authUser.userId); } catch { /* best effort */ }
        }
        return Response.json({ error: "Failed to parse .ipa file." }, { status: 400 });
      }

      // Anti-abuse: block free-tier duplicate scans (paid scans skip this entirely)
      if (isFreeScan && ipaHash) {
        const bundleId = ipaMetadata.bundleId || parsed.bundleId;
        const alreadyScanned = await isAppFreeScanned(ipaHash, bundleId || undefined);
        if (alreadyScanned) {
          return Response.json({
            error: "This app has already been analyzed with a free scan. Purchase a scan pack to analyze it again.",
            code: "FREE_SCAN_DUPLICATE",
          }, { status: 409 });
        }
      }
    } else {
      contextForAI = (parsed.feedback || parsed.email || parsed.text)!.trim().slice(0, 10000);
    }

    // ── Layer 1: Deep static analysis (IPA flow only) ──
    const layer1 = ipaMetadata ? runStaticAnalysis(ipaMetadata) : null;

    // ── Create scan record in DynamoDB ──
    const scanId = randomUUID();
    const timestamp = new Date().toISOString();
    const scanSK = `SCAN#${timestamp}#${scanId}`;

    await db.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `USER#${authUser.userId}`,
        SK: scanSK,
        GSI1PK: `USER#${authUser.userId}`,
        GSI1SK: `SCAN#${timestamp}`,
        scanId,
        userId: authUser.userId,
        status: "pending",
        creditCharged: scanCreditCharged,
        ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        ...(ipaMetadata?.bundleId || parsed.bundleId ? { bundleId: ipaMetadata?.bundleId || parsed.bundleId } : {}),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }));

    // ── Mark free-scanned app (only for free scans) ──
    if (ipaHash && isFreeScan) {
      try {
        await markFreeScannedApp(ipaHash, ipaMetadata?.bundleId || parsed.bundleId, authUser.userId);
      } catch { /* best effort */ }
    }

    // ── Invoke Lambda async (fire-and-forget) ──
    await lambda.send(new InvokeCommand({
      FunctionName: LAMBDA_NAME,
      InvocationType: "Event", // async — returns 202 immediately
      Payload: Buffer.from(JSON.stringify({
        userId: authUser.userId,
        scanSK,
        scanId,
        contextForAI,
        layer1,
        ipaMetadata: ipaMetadata ? {
          appName: ipaMetadata.appName,
          bundleId: ipaMetadata.bundleId,
          version: ipaMetadata.version,
          buildNumber: ipaMetadata.buildNumber,
          frameworks: ipaMetadata.frameworks,
          privacyDescriptions: ipaMetadata.privacyUsageDescriptions,
        } : null,
        s3Key: parsed.s3Key,
        bundleId: ipaMetadata?.bundleId || parsed.bundleId,
      })),
    }));

    scanQueued = true;
    return Response.json({ scanId, status: "pending" });
  } catch (err) {
    console.error("[analyze-stream] Unhandled error:", err);
    if (scanCreditCharged && !scanQueued && refundUserId) {
      scanCreditCharged = false;
      try { await refundScanCredit(refundUserId); } catch { /* best effort */ }
    }
    return Response.json({ error: "Analysis service error. Please try again." }, { status: 500 });
  }
}
