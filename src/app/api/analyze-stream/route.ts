// SSE streaming for IPA analysis — 3 AI models + test generation
// Phase 1: Extract .ipa metadata
// Phase 2: Gemini 2.5 Pro → Claude Sonnet → Claude Opus
// Phase 3: Generate Maestro + Detox tests

export const maxDuration = 120; // 2 minutes — 3 sequential AI model calls need more than the 30s default

import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken } from "@/lib/auth";
import { putScan, getUser, deductScanCredit, refundScanCredit, isFreeTierUser, isAppFreeScanned, markFreeScannedApp } from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { parseIpa, type IpaMetadata } from "@/lib/ipa-parser";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  if (cachedGeminiKey) return cachedGeminiKey;
  const command = new GetSecretValueCommand({ SecretId: "luminetic/gemini-api-key" });
  const response = await secretsClient.send(command);
  const key = response.SecretString ? JSON.parse(response.SecretString).GEMINI_API_KEY : null;
  if (!key) throw new Error("Gemini API key not found (set GEMINI_API_KEY or luminetic/gemini-api-key in Secrets Manager)");
  cachedGeminiKey = key;
  return key;
}

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

function buildMetadataContext(metadata: IpaMetadata, synopsis: string, credentials?: { email: string; password: string }): string {
  const parts: string[] = [];

  parts.push(`## App Synopsis\n${synopsis}`);

  parts.push(`\n## App Identity`);
  parts.push(`- App Name: ${metadata.appName || 'Unknown'}`);
  parts.push(`- Bundle ID: ${metadata.bundleId || 'Unknown'}`);
  parts.push(`- Version: ${metadata.version || 'Unknown'} (Build ${metadata.buildNumber || 'Unknown'})`);
  parts.push(`- Minimum OS: ${metadata.minimumOSVersion || 'Unknown'}`);

  if (credentials?.email) {
    parts.push(`\n## Test Credentials`);
    parts.push(`- Email: ${credentials.email}`);
    parts.push(`- Password: [provided]`);
  }

  const privacyEntries = Object.entries(metadata.privacyUsageDescriptions || {});
  if (privacyEntries.length > 0) {
    parts.push(`\n## Privacy Usage Descriptions`);
    privacyEntries.forEach(([key, value]) => {
      parts.push(`- ${key}: "${value}"`);
    });
  } else {
    parts.push(`\n## Privacy Usage Descriptions\n⚠️ NONE FOUND — This is likely a critical issue.`);
  }

  if (metadata.backgroundModes.length > 0) {
    parts.push(`\n## Background Modes\n${metadata.backgroundModes.map(m => `- ${m}`).join('\n')}`);
  }

  if (metadata.requiredDeviceCapabilities.length > 0) {
    parts.push(`\n## Required Device Capabilities\n${metadata.requiredDeviceCapabilities.map(c => `- ${c}`).join('\n')}`);
  }

  if (metadata.urlSchemes.length > 0) {
    parts.push(`\n## URL Schemes\n${metadata.urlSchemes.map(s => `- ${s}`).join('\n')}`);
  }

  parts.push(`\n## Export Compliance\n- Uses Non-Exempt Encryption: ${metadata.exportCompliance ? 'Yes' : 'No'}`);

  if (metadata.frameworks.length > 0) {
    parts.push(`\n## Embedded Frameworks (SDKs Detected)\n${metadata.frameworks.map(f => `- ${f}`).join('\n')}`);
  }

  if (metadata.entitlements && Object.keys(metadata.entitlements).length > 0) {
    parts.push(`\n## Entitlements`);
    Object.entries(metadata.entitlements).forEach(([key, value]) => {
      parts.push(`- ${key}: ${JSON.stringify(value)}`);
    });
  }

  return parts.join('\n');
}

const GEMINI_SYSTEM_PROMPT = `You are an expert iOS App Store submission analyst. You analyze .ipa app metadata to identify potential App Store Review Guideline violations, missing configurations, and submission risks BEFORE the developer submits to Apple.

You have deep knowledge of:
- Apple's App Store Review Guidelines (all sections 1-5)
- Info.plist configuration requirements
- Privacy and data collection requirements (NSUsageDescriptions, ATT)
- In-App Purchase and StoreKit requirements
- Entitlements and capabilities
- Framework/SDK compliance issues
- Common rejection patterns

You will receive extracted .ipa metadata including Info.plist data, entitlements, frameworks, and a developer-provided app synopsis.

Analyze the metadata for issues and respond ONLY with valid JSON (no markdown, no backticks) in this structure:

{
  "guidelines_referenced": [{ "section": "e.g. 2.1", "name": "e.g. App Completeness", "description": "Brief description" }],
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "What metadata indicates this", "guideline_section": "e.g. 2.1" }],
  "action_plan": [{ "priority": 1, "action": "Specific action", "details": "Step-by-step guidance", "estimated_effort": "e.g. 1-2 hours" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
  "preflight_checks": {
    "privacy_policy": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "account_deletion": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "export_compliance": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "iap_configuration": { "status": "pass" | "fail" | "warning" | "unknown" | "not_applicable", "detail": "..." },
    "age_rating": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "permissions_usage": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "minimum_os": { "status": "pass" | "fail" | "warning", "detail": "..." },
    "att_compliance": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." },
    "sign_in_with_apple": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." },
    "push_notifications": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." }
  }
}`;

const DEEPSEEK_SYSTEM_PROMPT = `You are an expert iOS App Store submission analyst specializing in deep logical reasoning. You analyze .ipa app metadata to identify potential App Store Review Guideline violations, missing configurations, and submission risks.

You have deep knowledge of:
- Apple's App Store Review Guidelines (all sections 1-5)
- Info.plist configuration requirements and common misconfigurations
- Privacy and data collection requirements (NSUsageDescriptions, ATT, privacy nutrition labels)
- Framework/SDK compliance issues and deprecated API concerns
- Common rejection patterns and edge cases other analysts miss

Analyze the metadata carefully. Think step by step about each requirement. Look for subtle issues that automated checks would miss.

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "What metadata indicates this", "guideline_section": "e.g. 2.1", "reasoning": "Step-by-step reasoning for this finding" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
  "preflight_checks": {
    "privacy_policy": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "account_deletion": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "export_compliance": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "permissions_usage": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "att_compliance": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." }
  }
}`;

const CLAUDE_SONNET_PROMPT = `You are a meticulous iOS App Store review compliance analyst. You will receive:
1. Extracted .ipa metadata (Info.plist, entitlements, frameworks)
2. An app synopsis from the developer
3. Initial analyses from Gemini and DeepSeek

Your job is to:
- VALIDATE findings from other models against the actual metadata
- IDENTIFY issues they missed (especially subtle privacy, SDK, and entitlement issues)
- CHECK for framework-specific requirements (e.g., if AdSupport.framework is present but no ATT prompt)
- FLAG any SDK compatibility or deprecated API concerns
- VERIFY all preflight checks against the metadata

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "validation": {
    "confirmed_issues": ["..."],
    "disputed_issues": [{ "original_issue": "...", "dispute_reason": "...", "correction": "..." }],
    "missed_issues": [{ "severity": "critical"|"major"|"minor", "issue": "...", "guideline_section": "...", "evidence": "...", "action": "..." }]
  },
  "refined_preflight": {
    "privacy_policy": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "account_deletion": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "export_compliance": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "iap_configuration": { "status": "pass"|"fail"|"warning"|"unknown"|"not_applicable", "detail": "..." },
    "age_rating": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "permissions_usage": { "status": "pass"|"fail"|"warning"|"unknown", "detail": "..." },
    "att_compliance": { "status": "pass"|"fail"|"warning"|"not_applicable", "detail": "..." },
    "sign_in_with_apple": { "status": "pass"|"fail"|"warning"|"not_applicable", "detail": "..." }
  }
}`;

const CLAUDE_OPUS_PROMPT = `You are the final-stage senior App Store review analyst. You perform deep reconciliation across findings from Gemini, DeepSeek, and Claude Sonnet. You will receive:
1. Extracted .ipa metadata
2. App synopsis
3. Gemini's analysis
4. DeepSeek's analysis
5. Claude Sonnet's validation

Your job: RECONCILE all findings from all models, produce the final authoritative assessment, refine the action plan, and assign final confidence scores.

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "refined_action_plan": [{ "priority": 1, "action": "...", "details": "...", "estimated_effort": "...", "confidence": "high"|"medium"|"low", "source": "gemini_confirmed"|"sonnet_added"|"opus_refined" }],
  "final_assessment": { "score": 0-100, "confidence": "high"|"medium"|"low", "summary": "...", "agreement_level": "full"|"partial"|"significant_disagreement", "risk_factors": ["..."] },
  "review_packet_notes": {
    "testing_steps": ["Step-by-step testing instructions for Apple reviewer"],
    "reviewer_notes": "Notes to include in the App Store Connect reviewer notes field",
    "known_limitations": ["Any known limitations to disclose"]
  }
}`;

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

/** Model JSON often returns score as string, or omits it — avoid treating missing as 0. */
function parseReadinessScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d+(\.\d+)?)/);
    if (m) {
      const n = Math.round(parseFloat(m[1]));
      if (!Number.isFinite(n)) return null;
      return Math.max(0, Math.min(100, n));
    }
  }
  return null;
}

function blendReadinessScores(gs: number | null, os: number | null): number | null {
  if (gs != null && os != null) return Math.round(gs * 0.3 + os * 0.7);
  if (os != null) return os;
  if (gs != null) return gs;
  return null;
}

/** When model scores are missing, infer from issue severities (0–100). */
function heuristicScoreFromIssues(issues: unknown[]): number {
  if (!issues.length) return 72;
  let penalty = 0;
  for (const raw of issues) {
    const sev = String((raw as Record<string, unknown>).severity || "minor").toLowerCase();
    if (sev === "critical") penalty += 20;
    else if (sev === "major") penalty += 10;
    else penalty += 3;
  }
  return Math.max(10, Math.min(95, 100 - Math.min(90, penalty)));
}

/**
 * Resolve final 0–100 score: prefer blended Gemini+Opus, then single model, then heuristic.
 * Avoid showing 0 when analysis succeeded but `score` was omitted or returned as a string.
 */
function resolveFinalReadinessScore(opts: {
  geminiAssessment: Record<string, unknown> | null;
  opusFinal: Record<string, unknown> | null;
  allIssues: unknown[];
  geminiSuccess: boolean;
  sonnetSuccess: boolean;
  opusSuccess: boolean;
}): number {
  const { geminiAssessment, opusFinal, allIssues, geminiSuccess, sonnetSuccess, opusSuccess } = opts;
  const anyAiOk = geminiSuccess || sonnetSuccess || opusSuccess;

  let gs = geminiAssessment ? parseReadinessScore(geminiAssessment.score) : null;
  let os = opusFinal ? parseReadinessScore(opusFinal.score) : null;

  if (gs === null && geminiAssessment) {
    gs = parseReadinessScore((geminiAssessment as { readiness_score?: unknown }).readiness_score);
  }
  if (os === null && opusFinal) {
    os = parseReadinessScore((opusFinal as { readiness_score?: unknown }).readiness_score);
  }

  const blended = blendReadinessScores(gs, os);

  if (blended !== null && blended > 0) {
    return blended;
  }

  // Both models returned 0 — use heuristic if we have issues, otherwise trust a low score
  if (blended === 0) {
    if (allIssues.length > 0) return heuristicScoreFromIssues(allIssues);
    if (anyAiOk) return 65;
    return 0;
  }

  // blended is null — no model returned a valid score
  if (allIssues.length > 0) return heuristicScoreFromIssues(allIssues);
  if (anyAiOk) return 65;
  return 0;
}

const ALL_MODELS_FAILED_MSG =
  "All AI analysis steps failed. Please try again later or contact support if the issue persists.";

export async function POST(request: NextRequest) {
  try {
  const schema = z.object({
    // New IPA-based flow
    s3Key: z.string().min(1).optional(),
    synopsis: z.string().min(10).max(10000).optional(),
    bundleId: z.string().optional(),
    credentials: z.object({
      email: z.string(),
      password: z.string(),
    }).optional(),
    // Legacy text-based flow (keep for backward compatibility)
    feedback: z.string().min(10).max(10000).optional(),
    email: z.string().min(10).max(10000).optional(),
    text: z.string().min(10).max(10000).optional(),
  }).refine((d) => d.s3Key || d.feedback || d.email || d.text, {
    message: "Please provide an .ipa file or review feedback.",
  });

  let parsed;
  try {
    const body = await request.json();
    parsed = schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.issues[0]?.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Invalid input." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isIpaFlow = !!parsed.s3Key;

  // Auth
  const accessToken = request.cookies.get("access_token")?.value;
  const authUser = accessToken ? await verifyToken(accessToken) : null;
  if (!authUser) {
    return new Response(
      JSON.stringify({ error: "Sign in to run an analysis." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit
  const rl = analyzeLimiter.check(authUser.userId);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  // Validate s3Key belongs to this user — prevent cross-user IPA access
  if (parsed.s3Key) {
    if (parsed.s3Key.includes("..") || !parsed.s3Key.startsWith(`ipa-uploads/${authUser.userId}/`)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: invalid file reference." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  let scanCreditCharged = false;
  {
    try {
      const userRecord = await getUser(authUser.userId);
      const isFounder = userRecord?.plan === "founder" || userRecord?.role === "founder" || userRecord?.role === "admin";
      if (!isFounder) {
        const credits = (userRecord?.scanCredits as number) || 0;
        if (credits <= 0) {
          return new Response(
            JSON.stringify({ error: "No scan credits remaining. Purchase a scan pack to continue." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
        const used = await deductScanCredit(authUser.userId);
        if (!used) {
          return new Response(
            JSON.stringify({ error: "No scan credits remaining." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
        scanCreditCharged = true;
      }
    } catch (err) {
      console.error("Credit check error:", err);
      return new Response(
        JSON.stringify({ error: "Unable to verify credits." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const totalStart = Date.now();

      // Heartbeat to keep CloudFront connection alive (30s timeout)
      const heartbeat = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(": heartbeat\n\n")); } catch { /* stream closed */ }
      }, 8000);

      const cleanup = () => clearInterval(heartbeat);

      const maybeRefundCredit = async (reason: string) => {
        if (!scanCreditCharged) return;
        try {
          await refundScanCredit(authUser.userId);
          console.log("[analyze-stream] Refunded 1 scan credit:", reason);
        } catch (e) {
          console.error("[analyze-stream] Failed to refund scan credit:", e);
        }
      };

      try {
        let contextForAI: string;
        let ipaMetadata: IpaMetadata | null = null;
        let ipaHash: string | null = null;

        if (isIpaFlow) {
          // PHASE 1: Extract .ipa metadata
          sendEvent(controller, "status", { step: "extracting", message: "Extracting app metadata from .ipa..." });

          try {
            const parseResult = await parseIpa(parsed.s3Key!);
            ipaMetadata = parseResult.metadata;
            ipaHash = parseResult.sha256;
            contextForAI = buildMetadataContext(ipaMetadata, parsed.synopsis || "No synopsis provided.", parsed.credentials);
            sendEvent(controller, "status", { step: "extracted", metadata: { appName: ipaMetadata.appName, bundleId: ipaMetadata.bundleId, version: ipaMetadata.version } });
          } catch (err) {
            console.error("[IPA parse error]", err);
            await maybeRefundCredit("ipa_parse_failed");
            sendEvent(controller, "error", { error: "Failed to parse .ipa file. Please ensure it's a valid iOS app." });
            cleanup();
            controller.close();
            return;
          }

          // Anti-abuse: block free-tier users from scanning an IPA that was already free-scanned
          if (scanCreditCharged) {
            const freeTier = await isFreeTierUser(authUser.userId);
            if (freeTier) {
              const bundleId = ipaMetadata.bundleId || parsed.bundleId;
              const alreadyScanned = await isAppFreeScanned(ipaHash, bundleId || undefined);
              if (alreadyScanned) {
                await refundScanCredit(authUser.userId);
                scanCreditCharged = false;
                sendEvent(controller, "error", {
                  error: "This app has already been analyzed with a free scan. Purchase a scan pack to analyze it again.",
                  code: "FREE_SCAN_DUPLICATE",
                });
                cleanup();
                controller.close();
                return;
              }
            }
          }
        } else {
          // Legacy text flow
          contextForAI = (parsed.feedback || parsed.email || parsed.text)!.trim().slice(0, 10000);
        }

        // PHASE 2: AI Analysis — Gemini + Sonnet run in parallel, then Opus reconciles

        sendEvent(controller, "status", { step: "gemini", message: "Running primary analysis..." });

        // Run Gemini, DeepSeek, and Sonnet in parallel (all analyze metadata independently)
        const geminiPromise = (async () => {
          const start = Date.now();
          try {
            const apiKey = await getGeminiKey();
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig: { temperature: 0.2, maxOutputTokens: 8192 } });
            const prompt = isIpaFlow
              ? `Analyze this iOS app's metadata for App Store Review compliance:\n\n${contextForAI}`
              : `Analyze this App Store review feedback:\n\n${contextForAI}`;
            const result = await model.generateContent([
              { text: GEMINI_SYSTEM_PROMPT },
              { text: prompt },
            ]);
            const raw = result.response.text();
            const cleaned = raw.replace(/```json\s*|```/g, "").trim();
            return { data: JSON.parse(cleaned) as Record<string, unknown>, success: true, latency: Date.now() - start };
          } catch (err) {
            console.error("[Gemini error]", err);
            return { data: null, success: false, latency: Date.now() - start };
          }
        })();

        const deepseekPromise = (async () => {
          const start = Date.now();
          try {
            const userMessage = isIpaFlow
              ? `Analyze this iOS app's metadata for App Store Review compliance. Think step by step about each requirement:\n\n${contextForAI}`
              : `Analyze this App Store review feedback for compliance issues. Think step by step:\n\n${contextForAI}`;

            const payload = {
              max_tokens: 8192,
              temperature: 0.2,
              system: DEEPSEEK_SYSTEM_PROMPT,
              messages: [{ role: "user", content: userMessage }],
            };

            const command = new InvokeModelCommand({
              modelId: "deepseek.v3.2",
              contentType: "application/json",
              accept: "application/json",
              body: JSON.stringify(payload),
            });

            const response = await bedrock.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const raw = responseBody?.choices?.[0]?.message?.content
              || responseBody?.content?.[0]?.text
              || (typeof responseBody === "string" ? responseBody : null);
            if (!raw) throw new Error("Empty response from DeepSeek");
            const cleaned = (typeof raw === "string" ? raw : JSON.stringify(raw)).replace(/```json\s*|```/g, "").trim();
            return { data: JSON.parse(cleaned) as Record<string, unknown>, success: true, latency: Date.now() - start };
          } catch (err) {
            console.error("[DeepSeek error]", err);
            return { data: null, success: false, latency: Date.now() - start };
          }
        })();

        const sonnetPromise = (async () => {
          const start = Date.now();
          try {
            const userMessage = isIpaFlow
              ? `APP METADATA:\n${contextForAI}\n\nAnalyze this iOS app's metadata for App Store Review compliance. Identify issues, validate privacy configurations, check framework-specific requirements, and verify all preflight checks.`
              : `FEEDBACK:\n${contextForAI}\n\nAnalyze this App Store review feedback for compliance issues.`;

            const payload = {
              anthropic_version: "bedrock-2023-05-31",
              max_tokens: 4096,
              temperature: 0.2,
              system: CLAUDE_SONNET_PROMPT,
              messages: [{ role: "user", content: userMessage }],
            };

            const command = new InvokeModelCommand({
              modelId: "us.anthropic.claude-sonnet-4-6",
              contentType: "application/json",
              accept: "application/json",
              body: JSON.stringify(payload),
            });

            const response = await bedrock.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const raw = responseBody?.content?.[0]?.text;
            if (!raw) throw new Error("Empty response from Sonnet");
            const cleaned = raw.replace(/```json\s*|```/g, "").trim();
            return { data: JSON.parse(cleaned) as Record<string, unknown>, success: true, latency: Date.now() - start };
          } catch (err) {
            console.error("[Sonnet error]", err);
            return { data: null, success: false, latency: Date.now() - start };
          }
        })();

        const [geminiResult, deepseekResult, sonnetResult] = await Promise.all([geminiPromise, deepseekPromise, sonnetPromise]);

        const geminiData = geminiResult.data;
        const geminiLatency = geminiResult.latency;
        const geminiSuccess = geminiResult.success;
        const deepseekData = deepseekResult.data;
        const deepseekLatency = deepseekResult.latency;
        const deepseekSuccess = deepseekResult.success;
        const sonnetData = sonnetResult.data;
        const sonnetLatency = sonnetResult.latency;
        const sonnetSuccess = sonnetResult.success;

        sendEvent(controller, "status", { step: "gemini_done", success: geminiSuccess, latency: geminiLatency });
        sendEvent(controller, "status", { step: "deepseek_done", success: deepseekSuccess, latency: deepseekLatency });
        sendEvent(controller, "status", { step: "sonnet_done", success: sonnetSuccess, latency: sonnetLatency });

        // Model 4: Claude Opus (reconciles all findings)
        sendEvent(controller, "status", { step: "claude-opus", message: "Deep reconciliation analysis..." });

        let opusData: Record<string, unknown> | null = null;
        let opusLatency = 0;
        let opusSuccess = false;
        const oStart = Date.now();

        try {
          const contextLabel = isIpaFlow ? "APP METADATA" : "FEEDBACK";
          const userMessage = `${contextLabel}:\n${contextForAI}\n\nGEMINI ANALYSIS:\n${JSON.stringify(geminiData, null, 2)}\n\nDEEPSEEK ANALYSIS:\n${JSON.stringify(deepseekData, null, 2)}\n\nCLAUDE SONNET ANALYSIS:\n${JSON.stringify(sonnetData, null, 2)}\n\nReconcile all findings from all models and produce the final assessment.`;

          const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4096,
            temperature: 0.2,
            system: CLAUDE_OPUS_PROMPT,
            messages: [{ role: "user", content: userMessage }],
          };

          const command = new InvokeModelCommand({
            modelId: "us.anthropic.claude-opus-4-6-v1",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
          });

          const response = await bedrock.send(command);
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          const raw = responseBody?.content?.[0]?.text;
          if (!raw) throw new Error("Empty response from Opus");
          const cleaned = raw.replace(/```json\s*|```/g, "").trim();
          opusData = JSON.parse(cleaned);
          opusSuccess = true;
        } catch (err) {
          console.error("[Opus error]", err);
        }
        opusLatency = Date.now() - oStart;

        sendEvent(controller, "status", { step: "opus_done", success: opusSuccess, latency: opusLatency });

        const anyModelSucceeded = geminiSuccess || deepseekSuccess || sonnetSuccess || opusSuccess;
        if (!anyModelSucceeded) {
          console.error(
            "[analyze-stream] All models failed — Gemini:",
            geminiSuccess,
            "DeepSeek:",
            deepseekSuccess,
            "Sonnet:",
            sonnetSuccess,
            "Opus:",
            opusSuccess
          );
          await maybeRefundCredit("all_models_failed");
          sendEvent(controller, "error", { error: ALL_MODELS_FAILED_MSG, code: "ALL_MODELS_FAILED" });
          return;
        }

        // MERGE ALL THREE MODELS
        sendEvent(controller, "status", { step: "merging", message: "Preparing your results..." });

        const confirmedIssues = geminiData
          ? (geminiData.issues_identified as unknown[]) || []
          : [];

        // DeepSeek issues (deduplicated against Gemini's)
        const deepseekIssues = deepseekData
          ? (deepseekData.issues_identified as unknown[]) || []
          : [];
        const geminiIssueTexts = new Set(confirmedIssues.map((i: unknown) => ((i as Record<string, unknown>).issue as string || "").toLowerCase().slice(0, 60)));
        const uniqueDeepseekIssues = deepseekIssues.filter((i: unknown) => {
          const text = ((i as Record<string, unknown>).issue as string || "").toLowerCase().slice(0, 60);
          return !geminiIssueTexts.has(text);
        });

        const sonnetMissed = sonnetData
          ? ((sonnetData.validation as Record<string, unknown>)?.missed_issues as unknown[]) || []
          : [];

        const sonnetDisputed = sonnetData
          ? ((sonnetData.validation as Record<string, unknown>)?.disputed_issues as unknown[]) || []
          : [];

        const disputedOriginals = new Set(sonnetDisputed.map((d: unknown) => (d as Record<string, unknown>).original_issue as string));

        const allIssues = [
          ...confirmedIssues.filter((i: unknown) => !disputedOriginals.has((i as Record<string, unknown>).issue as string)),
          ...uniqueDeepseekIssues.map((i: unknown) => ({ ...(i as Record<string, unknown>), source: "deepseek_added" })),
          ...sonnetDisputed.map((d: unknown) => ({ severity: "major", issue: (d as Record<string, unknown>).correction, evidence: (d as Record<string, unknown>).dispute_reason, source: "sonnet_corrected" })),
          ...sonnetMissed.map((i: unknown) => ({ ...(i as Record<string, unknown>), source: "sonnet_added" })),
        ];

        // Use Opus final assessment if available, fall back to Gemini
        const opusFinal = opusData ? (opusData.final_assessment as Record<string, unknown>) : null;
        const geminiAssessment = geminiData ? (geminiData.readiness_assessment as Record<string, unknown>) : null;

        const finalScore = resolveFinalReadinessScore({
          geminiAssessment,
          opusFinal,
          allIssues,
          geminiSuccess,
          sonnetSuccess: sonnetSuccess || deepseekSuccess,
          opusSuccess,
        });

        // Merge preflight checks from Gemini + DeepSeek + Sonnet
        const geminiPreflight = geminiData ? (geminiData.preflight_checks as Record<string, unknown>) || {} : {};
        const deepseekPreflight = deepseekData ? (deepseekData.preflight_checks as Record<string, unknown>) || {} : {};
        const sonnetPreflight = sonnetData ? (sonnetData.refined_preflight as Record<string, unknown>) || {} : {};
        const mergedPreflight = { ...geminiPreflight, ...deepseekPreflight, ...sonnetPreflight };

        // Review packet notes from Opus
        const reviewPacketNotes = opusData ? (opusData.review_packet_notes as Record<string, unknown>) || {} : {};

        const merged = {
          guidelines: geminiData ? (geminiData.guidelines_referenced as unknown[]) || [] : [],
          issues: allIssues,
          action_plan: opusData ? (opusData.refined_action_plan as unknown[]) || [] : geminiData ? (geminiData.action_plan as unknown[]) || [] : [],
          assessment: {
            score: finalScore,
            confidence: opusFinal ? (opusFinal.confidence as string) : "medium",
            summary: opusFinal ? (opusFinal.summary as string) : geminiAssessment ? (geminiAssessment.summary as string) : "Analysis completed.",
            agreement_level: opusFinal ? (opusFinal.agreement_level as string) : "partial",
            risk_factors: opusFinal ? (opusFinal.risk_factors as string[]) || [] : geminiAssessment ? (geminiAssessment.risk_factors as string[]) || [] : [],
          },
          preflight: mergedPreflight,
          review_packet: reviewPacketNotes,
          ipa_metadata: ipaMetadata ? {
            appName: ipaMetadata.appName,
            bundleId: ipaMetadata.bundleId,
            version: ipaMetadata.version,
            buildNumber: ipaMetadata.buildNumber,
            frameworks: ipaMetadata.frameworks,
            privacyDescriptions: ipaMetadata.privacyUsageDescriptions,
          } : null,
          meta: {
            models_used: [
              geminiSuccess ? "gemini" : null,
              deepseekSuccess ? "deepseek" : null,
              sonnetSuccess ? "sonnet" : null,
              opusSuccess ? "opus" : null,
            ].filter(Boolean),
            gemini_latency_ms: geminiLatency,
            deepseek_latency_ms: deepseekLatency,
            sonnet_latency_ms: sonnetLatency,
            opus_latency_ms: opusLatency,
            total_latency_ms: Date.now() - totalStart,
            gemini_success: geminiSuccess,
            deepseek_success: deepseekSuccess,
            sonnet_success: sonnetSuccess,
            opus_success: opusSuccess,
          },
        };

        // Save scan
        let scanId: string | undefined;
        try {
          const saved = await putScan(authUser.userId, {
            inputText: isIpaFlow ? `IPA: ${parsed.s3Key} | Synopsis: ${parsed.synopsis?.slice(0, 500)}` : contextForAI,
            mergedResult: merged,
            geminiResult: geminiData,
            deepseekResult: deepseekData,
            claudeResult: opusData,
            sonnetResult: sonnetData,
            score: merged.assessment.score,
            s3Key: parsed.s3Key,
            bundleId: ipaMetadata?.bundleId || parsed.bundleId,
          });
          scanId = saved.scanId;

          // Mark IPA as free-scanned so it can't be re-scanned with another free account
          if (ipaHash && scanCreditCharged) {
            try {
              const freeTier = await isFreeTierUser(authUser.userId);
              if (freeTier) {
                await markFreeScannedApp(ipaHash, ipaMetadata?.bundleId || parsed.bundleId, authUser.userId);
              }
            } catch (markErr) {
              console.error("[analyze-stream] Failed to mark free-scanned app:", markErr);
            }
          }
        } catch (err) {
          console.error("Failed to save scan:", err);
        }

        sendEvent(controller, "result", { result: merged, scanId, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error("Stream error:", err);
        sendEvent(controller, "error", { error: "Analysis failed. Please try again." });
      } finally {
        cleanup();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
  } catch (err) {
    console.error("[analyze-stream] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Analysis service error. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
