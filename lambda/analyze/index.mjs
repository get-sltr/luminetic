/**
 * Standalone Lambda — AI analysis engine for Luminetic.
 * Invoked async from the SSR route. Writes progress + results to DynamoDB.
 *
 * Stage 1: Gemini 2.5 Pro + Claude Sonnet 4.6 + DeepSeek V3.2 in parallel
 * Stage 2: Claude Opus 4.6 reconciles all three outputs
 * Final:   Merge, score, save to DynamoDB
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.DYNAMODB_TABLE || "appready";

const bedrock = new BedrockRuntimeClient({ region: REGION });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const secrets = new SecretsManagerClient({ region: REGION });
const s3 = new S3Client({ region: REGION });
const S3_BUCKET = process.env.S3_BUCKET;

let cachedGeminiKey = null;

async function getGeminiKey() {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  if (cachedGeminiKey) return cachedGeminiKey;
  const res = await secrets.send(new GetSecretValueCommand({ SecretId: "luminetic/gemini-api-key" }));
  const key = res.SecretString ? JSON.parse(res.SecretString).GEMINI_API_KEY : null;
  if (!key) throw new Error("Gemini API key not found");
  cachedGeminiKey = key;
  return key;
}

// ── Status helper ──────────────────────────────────────────
async function updateScanStatus(userId, scanSK, status, extra = {}) {
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: scanSK },
    UpdateExpression: "SET #s = :s, updatedAt = :now" +
      Object.keys(extra).map((k, i) => `, #e${i} = :e${i}`).join(""),
    ExpressionAttributeNames: {
      "#s": "status",
      ...Object.fromEntries(Object.keys(extra).map((k, i) => [`#e${i}`, k])),
    },
    ExpressionAttributeValues: {
      ":s": status,
      ":now": new Date().toISOString(),
      ...Object.fromEntries(Object.entries(extra).map(([k, v], i) => [`:e${i}`, v])),
    },
  }));
}

// ── Prompts ────────────────────────────────────────────────
const GEMINI_SYSTEM_PROMPT = `You are an expert iOS App Store submission analyst. You analyze .ipa app metadata to identify potential App Store Review Guideline violations, missing configurations, and submission risks BEFORE the developer submits to Apple.

You have deep knowledge of:
- Apple's App Store Review Guidelines (all sections 1-5)
- Info.plist configuration requirements
- Privacy and data collection requirements (NSUsageDescriptions, ATT)
- In-App Purchase and StoreKit requirements
- Entitlements and capabilities
- Framework/SDK compliance issues
- Common rejection patterns

Analyze the metadata for issues and respond ONLY with valid JSON (no markdown, no backticks):

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

const DEEPSEEK_SYSTEM_PROMPT = `You are an expert iOS App Store submission analyst. You analyze .ipa metadata to find App Store Review Guideline violations.

CRITICAL INSTRUCTION: You MUST respond with ONLY a valid JSON object. Do NOT include any text, explanation, or markdown before or after the JSON. Do NOT start with "Let's", "Sure", "Here", or any other word. Your entire response must be parseable by JSON.parse().

Respond with this exact JSON structure:

{
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "What metadata indicates this", "guideline_section": "e.g. 2.1", "reasoning": "Step-by-step reasoning" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] },
  "preflight_checks": {
    "privacy_policy": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "account_deletion": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "export_compliance": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "permissions_usage": { "status": "pass" | "fail" | "warning" | "unknown", "detail": "..." },
    "att_compliance": { "status": "pass" | "fail" | "warning" | "not_applicable", "detail": "..." }
  }
}`;

const SONNET_SYSTEM_PROMPT = `You are a meticulous iOS App Store review compliance analyst. Analyze the provided .ipa metadata independently for App Store Review Guideline compliance.

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

const OPUS_JUDGE_PROMPT = `You are the final-stage senior App Store review analyst. You reconcile findings from three independent AI analyses (Gemini, DeepSeek, Claude Sonnet) to produce the authoritative final assessment.

Your job:
- RECONCILE all findings — confirm agreements, resolve disagreements
- Produce the FINAL action plan with confidence levels
- Assign the FINAL readiness score (0-100)
- Generate App Store reviewer notes

Respond ONLY with valid JSON (no markdown, no backticks):

{
  "refined_action_plan": [{ "priority": 1, "action": "...", "details": "...", "estimated_effort": "...", "confidence": "high"|"medium"|"low", "source": "gemini_confirmed"|"sonnet_added"|"opus_refined"|"deepseek_added" }],
  "final_assessment": { "score": 0-100, "confidence": "high"|"medium"|"low", "summary": "...", "agreement_level": "full"|"partial"|"significant_disagreement", "risk_factors": ["..."] },
  "review_packet_notes": {
    "testing_steps": ["Step-by-step testing instructions for Apple reviewer"],
    "reviewer_notes": "Notes to include in the App Store Connect reviewer notes field",
    "known_limitations": ["Any known limitations to disclose"]
  }
}`;

// ── Model callers ──────────────────────────────────────────
async function callMistralLarge(context) {
  const start = Date.now();
  try {
    const payload = {
      max_tokens: 8192,
      temperature: 0.2,
      messages: [
        { role: "system", content: GEMINI_SYSTEM_PROMPT },
        { role: "user", content: `Analyze this iOS app's metadata for App Store Review compliance:\n\n${context}` },
      ],
    };
    const cmd = new InvokeModelCommand({
      modelId: "mistral.mistral-large-3-675b-instruct",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty response from Mistral Large");
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[Mistral Large error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}

async function callGemini(context) {
  const start = Date.now();
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const apiKey = await getGeminiKey();
      // Dynamic import — @google/generative-ai is bundled with the Lambda
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
      });
      const result = await model.generateContent([
        { text: GEMINI_SYSTEM_PROMPT },
        { text: `Analyze this iOS app's metadata for App Store Review compliance:\n\n${context}` },
      ]);
      const raw = result.response.text();
      const cleaned = raw.replace(/```json\s*|```/g, "").trim();
      return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
    } catch (err) {
      const isRetryable = err?.status === 503 || err?.status === 429;
      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`[Gemini] ${err.status} on attempt ${attempt}, retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      console.error("[Gemini error]", err);
      // Fallback to Mistral Large 3
      console.log("[Gemini] Falling back to Mistral Large 3...");
      return await callMistralLarge(context);
    }
  }
}

async function callDeepSeek(context) {
  const start = Date.now();
  try {
    const payload = {
      max_tokens: 8192,
      temperature: 0.2,
      system: DEEPSEEK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this iOS app metadata for App Store compliance. Respond with ONLY valid JSON:\n\n${context}` }],
    };
    const cmd = new InvokeModelCommand({
      modelId: "deepseek.v3.2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.choices?.[0]?.message?.content || body?.content?.[0]?.text || null;
    if (!raw) throw new Error("Empty response from DeepSeek");
    const cleaned = (typeof raw === "string" ? raw : JSON.stringify(raw)).replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[DeepSeek error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}

async function callSonnet(context) {
  const start = Date.now();
  try {
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0.2,
      system: SONNET_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `APP METADATA:\n${context}\n\nAnalyze this iOS app's metadata for App Store Review compliance.` }],
    };
    const cmd = new InvokeModelCommand({
      modelId: "us.anthropic.claude-sonnet-4-6",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.content?.[0]?.text;
    if (!raw) throw new Error("Empty response from Sonnet");
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[Sonnet error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}

async function callOpus(context, geminiData, deepseekData, sonnetData) {
  const start = Date.now();
  try {
    const userMessage = `APP METADATA:\n${context}\n\nGEMINI ANALYSIS:\n${JSON.stringify(geminiData, null, 2)}\n\nDEEPSEEK ANALYSIS:\n${JSON.stringify(deepseekData, null, 2)}\n\nCLAUDE SONNET ANALYSIS:\n${JSON.stringify(sonnetData, null, 2)}\n\nReconcile all findings and produce the final assessment.`;
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0.2,
      system: OPUS_JUDGE_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    };
    const cmd = new InvokeModelCommand({
      modelId: "us.anthropic.claude-opus-4-6-v1",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });
    const response = await bedrock.send(cmd);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const raw = body?.content?.[0]?.text;
    if (!raw) throw new Error("Empty response from Opus");
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    return { data: JSON.parse(cleaned), success: true, latency: Date.now() - start };
  } catch (err) {
    console.error("[Opus error]", err);
    return { data: null, success: false, latency: Date.now() - start };
  }
}

// ── Score helpers ──────────────────────────────────────────
function parseScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d+(\.\d+)?)/);
    if (m) { const n = Math.round(parseFloat(m[1])); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null; }
  }
  return null;
}

function heuristicScore(issues) {
  if (!issues.length) return 72;
  let penalty = 0;
  for (const i of issues) {
    const sev = String(i?.severity || "minor").toLowerCase();
    if (sev === "critical") penalty += 20;
    else if (sev === "major") penalty += 10;
    else penalty += 3;
  }
  return Math.max(10, Math.min(95, 100 - Math.min(90, penalty)));
}

function resolveScore(geminiAssessment, opusFinal, allIssues, anyOk) {
  const gs = parseScore(geminiAssessment?.score) ?? parseScore(geminiAssessment?.readiness_score);
  const os = parseScore(opusFinal?.score) ?? parseScore(opusFinal?.readiness_score);
  if (gs != null && os != null) { const b = Math.round(gs * 0.3 + os * 0.7); if (b > 0) return b; }
  if (os != null && os > 0) return os;
  if (gs != null && gs > 0) return gs;
  if (allIssues.length > 0) return heuristicScore(allIssues);
  if (anyOk) return 65;
  return 0;
}

// ── Merge logic ────────────────────────────────────────────
function mergeResults({ gemini, deepseek, sonnet, opus, context, ipaMetadata, totalStart }) {
  const geminiData = gemini.data;
  const deepseekData = deepseek.data;
  const sonnetData = sonnet.data;
  const opusData = opus.data;

  // Collect issues
  const confirmedIssues = geminiData?.issues_identified || [];
  const deepseekIssues = deepseekData?.issues_identified || [];
  const geminiTexts = new Set(confirmedIssues.map(i => (i?.issue || "").toLowerCase().slice(0, 60)));
  const uniqueDeepseek = deepseekIssues.filter(i => !geminiTexts.has((i?.issue || "").toLowerCase().slice(0, 60)));

  const sonnetMissed = sonnetData?.validation?.missed_issues || [];
  const sonnetDisputed = sonnetData?.validation?.disputed_issues || [];
  const disputedSet = new Set(sonnetDisputed.map(d => d?.original_issue));

  const allIssues = [
    ...confirmedIssues.filter(i => !disputedSet.has(i?.issue)),
    ...uniqueDeepseek.map(i => ({ ...i, source: "deepseek_added" })),
    ...sonnetDisputed.map(d => ({ severity: "major", issue: d?.correction, evidence: d?.dispute_reason, source: "sonnet_corrected" })),
    ...sonnetMissed.map(i => ({ ...i, source: "sonnet_added" })),
  ];

  const opusFinal = opusData?.final_assessment || null;
  const geminiAssessment = geminiData?.readiness_assessment || null;
  const anyOk = gemini.success || deepseek.success || sonnet.success || opus.success;
  const finalScore = resolveScore(geminiAssessment, opusFinal, allIssues, anyOk);

  // Merge preflight
  const gPre = geminiData?.preflight_checks || {};
  const dPre = deepseekData?.preflight_checks || {};
  const sPre = sonnetData?.refined_preflight || {};
  const mergedPreflight = { ...gPre, ...dPre, ...sPre };

  const reviewPacket = opusData?.review_packet_notes || {};

  return {
    guidelines: geminiData?.guidelines_referenced || [],
    issues: allIssues,
    action_plan: opusData?.refined_action_plan || geminiData?.action_plan || [],
    assessment: {
      score: finalScore,
      confidence: opusFinal?.confidence || "medium",
      summary: opusFinal?.summary || geminiAssessment?.summary || "Analysis completed.",
      agreement_level: opusFinal?.agreement_level || "partial",
      risk_factors: opusFinal?.risk_factors || geminiAssessment?.risk_factors || [],
    },
    preflight: mergedPreflight,
    review_packet: reviewPacket,
    ipa_metadata: ipaMetadata || null,
    meta: {
      models_used: [gemini.success && "gemini", deepseek.success && "deepseek", sonnet.success && "sonnet", opus.success && "opus"].filter(Boolean),
      gemini_latency_ms: gemini.latency,
      deepseek_latency_ms: deepseek.latency,
      sonnet_latency_ms: sonnet.latency,
      opus_latency_ms: opus.latency,
      total_latency_ms: Date.now() - totalStart,
      gemini_success: gemini.success,
      deepseek_success: deepseek.success,
      sonnet_success: sonnet.success,
      opus_success: opus.success,
    },
  };
}

// ── Handler ────────────────────────────────────────────────
export const handler = async (event) => {
  const { userId, scanSK, scanId, contextForAI, ipaMetadata, s3Key, bundleId } = event;
  const totalStart = Date.now();

  try {
    // ── Stage 1: Gemini + Sonnet + DeepSeek in parallel ──
    await updateScanStatus(userId, scanSK, "analyzing");

    const [gemini, sonnet, deepseek] = await Promise.all([
      callGemini(contextForAI),
      callSonnet(contextForAI),
      callDeepSeek(contextForAI),
    ]);

    console.log(`[Stage 1] Gemini=${gemini.success}(${gemini.latency}ms) Sonnet=${sonnet.success}(${sonnet.latency}ms) DeepSeek=${deepseek.success}(${deepseek.latency}ms)`);

    if (!gemini.success && !sonnet.success && !deepseek.success) {
      await updateScanStatus(userId, scanSK, "error", {
        errorMessage: "All AI models failed in Stage 1. Please try again.",
      });
      return { statusCode: 500, body: "All Stage 1 models failed" };
    }

    // ── Stage 2: Opus reconciles all three ──
    await updateScanStatus(userId, scanSK, "reconciling");

    const opus = await callOpus(contextForAI, gemini.data, deepseek.data, sonnet.data);
    console.log(`[Stage 2] Opus=${opus.success}(${opus.latency}ms)`);

    // ── Merge + save ──
    const merged = mergeResults({ gemini, deepseek, sonnet, opus, contextForAI, ipaMetadata, totalStart });

    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: scanSK },
      UpdateExpression: "SET #s = :s, mergedResult = :mr, geminiResult = :gr, deepseekResult = :dr, claudeResult = :cr, sonnetResult = :sr, score = :sc, updatedAt = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":s": "complete",
        ":mr": merged,
        ":gr": gemini.data,
        ":dr": deepseek.data,
        ":cr": opus.data,
        ":sr": sonnet.data,
        ":sc": merged.assessment.score,
        ":now": new Date().toISOString(),
      },
    }));

    // Increment scan count
    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: "PROFILE" },
      UpdateExpression: "ADD scanCount :inc SET updatedAt = :now",
      ExpressionAttributeValues: { ":inc": 1, ":now": new Date().toISOString() },
    }));

    // Delete IPA from S3 — metadata is extracted, original file no longer needed
    if (s3Key && S3_BUCKET) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
        console.log(`[Cleanup] Deleted s3://${S3_BUCKET}/${s3Key}`);
      } catch (delErr) {
        console.warn(`[Cleanup] Failed to delete IPA (non-fatal):`, delErr);
      }
    }

    console.log(`[Done] scanId=${scanId} score=${merged.assessment.score} total=${Date.now() - totalStart}ms`);
    return { statusCode: 200, body: JSON.stringify({ scanId, score: merged.assessment.score }) };
  } catch (err) {
    console.error("[Lambda fatal]", err);
    await updateScanStatus(userId, scanSK, "error", {
      errorMessage: "Analysis failed unexpectedly. Please try again.",
    }).catch(() => {});
    return { statusCode: 500, body: String(err) };
  }
};
