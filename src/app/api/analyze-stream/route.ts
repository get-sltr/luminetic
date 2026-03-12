// SSE streaming wrapper for the dual-model analysis engine
// Sends real-time progress events as each model completes

import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken } from "@/lib/auth";
import { putScan, getUser, useScanCredit } from "@/lib/db";
import { z } from "zod";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// Re-use secrets + clients from analyze route (duplicated to keep routes independent)
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  if (cachedGeminiKey) return cachedGeminiKey;
  const command = new GetSecretValueCommand({ SecretId: "luminetic/gemini-api-key" });
  const response = await secretsClient.send(command);
  const key = response.SecretString ? JSON.parse(response.SecretString).GEMINI_API_KEY : null;
  if (!key) throw new Error("Gemini API key not found in Secrets Manager");
  cachedGeminiKey = key;
  return key;
}

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const GEMINI_SYSTEM_PROMPT = `You are an expert App Store Review Guidelines analyst. Your role is to analyze App Store review feedback or rejection notices from Apple and provide a structured analysis.

You have deep knowledge of:
- Apple's App Store Review Guidelines (all sections 1-5)
- Apple's Human Interface Guidelines
- Common rejection patterns and resolution strategies
- App Store Connect submission requirements
- Privacy, data collection, and App Tracking Transparency requirements
- In-App Purchase and subscription rules
- Content and age rating policies

When given review feedback or a rejection notice, respond ONLY with valid JSON (no markdown, no backticks, no preamble) in this exact structure:

{
  "guidelines_referenced": [{ "section": "e.g. 2.1", "name": "e.g. App Completeness", "description": "Brief description" }],
  "issues_identified": [{ "severity": "critical" | "major" | "minor", "issue": "Clear description", "evidence": "What indicates this", "guideline_section": "e.g. 2.1" }],
  "action_plan": [{ "priority": 1, "action": "Specific action", "details": "Step-by-step guidance", "estimated_effort": "e.g. 1-2 hours" }],
  "readiness_assessment": { "score": 0-100, "summary": "Assessment paragraph", "risk_factors": ["List of risks"] }
}`;

const CLAUDE_SYSTEM_PROMPT = `You are a senior App Store Review Guidelines expert performing a confirmation review. You will receive:
1. The original App Store review feedback from Apple
2. An initial analysis from another AI model (Gemini)

Your job is to: VALIDATE, IDENTIFY missed issues, CORRECT errors, ADD context, RECONCILE disagreements.

Respond ONLY with valid JSON (no markdown, no backticks, no preamble) in this structure:

{
  "validation": { "confirmed_issues": ["..."], "disputed_issues": [{ "original_issue": "...", "dispute_reason": "...", "correction": "..." }], "missed_issues": [{ "severity": "critical"|"major"|"minor", "issue": "...", "guideline_section": "...", "action": "..." }] },
  "refined_action_plan": [{ "priority": 1, "action": "...", "details": "...", "estimated_effort": "...", "confidence": "high"|"medium"|"low", "source": "gemini_confirmed"|"claude_added"|"claude_corrected" }],
  "final_assessment": { "score": 0-100, "confidence": "high"|"medium"|"low", "summary": "...", "agreement_level": "full"|"partial"|"significant_disagreement", "risk_factors": ["..."] }
}`;

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  const schema = z.object({
    feedback: z.string().min(10).max(10000).optional(),
    email: z.string().min(10).max(10000).optional(),
    text: z.string().min(10).max(10000).optional(),
  }).refine((d) => d.feedback || d.email || d.text, {
    message: "Please paste valid App Store review feedback (minimum 10 characters).",
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

  const trimmedFeedback = (parsed.feedback || parsed.email || parsed.text)!.trim().slice(0, 10000);
  const accessToken = request.cookies.get("access_token")?.value;
  const authUser = accessToken ? await verifyToken(accessToken) : null;

  // Credit check (founders get unlimited access)
  if (authUser) {
    try {
      const userRecord = await getUser(authUser.userId);
      const isFounder = userRecord?.plan === "founder";
      if (!isFounder) {
        const credits = (userRecord?.scanCredits as number) || 0;
        if (credits <= 0) {
          return new Response(
            JSON.stringify({ error: "No scan credits remaining. Purchase a scan pack to continue." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
        const used = await useScanCredit(authUser.userId);
        if (!used) {
          return new Response(
            JSON.stringify({ error: "No scan credits remaining. Purchase a scan pack to continue." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    } catch (err) {
      console.error("Credit check error:", err);
      return new Response(
        JSON.stringify({ error: "Unable to verify credits. Please try again." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const totalStart = Date.now();

      try {
        // LAYER 1: Gemini
        sendEvent(controller, "status", { step: "gemini", message: "Scanning with Gemini 2.5 Pro..." });

        let geminiData: Record<string, unknown> | null = null;
        let geminiLatency = 0;
        let geminiSuccess = false;

        const gStart = Date.now();
        try {
          const apiKey = await getGeminiKey();
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro", generationConfig: { temperature: 0.2, maxOutputTokens: 4096 } });
          const result = await model.generateContent([
            { text: GEMINI_SYSTEM_PROMPT },
            { text: `Analyze this App Store review feedback:\n\n${trimmedFeedback}` },
          ]);
          const raw = result.response.text();
          const cleaned = raw.replace(/```json\s*|```/g, "").trim();
          geminiData = JSON.parse(cleaned);
          geminiSuccess = true;
        } catch (err) {
          console.error("[Gemini error]", err);
        }
        geminiLatency = Date.now() - gStart;

        sendEvent(controller, "status", { step: "gemini_done", success: geminiSuccess, latency: geminiLatency });

        // LAYER 2: Claude Opus
        sendEvent(controller, "status", { step: "claude", message: "Verifying with Claude Opus..." });

        let claudeData: Record<string, unknown> | null = null;
        let claudeLatency = 0;
        let claudeSuccess = false;
        const cStart = Date.now();

        try {
          const userMessage = geminiData
            ? `ORIGINAL REVIEW FEEDBACK FROM APPLE:\n${trimmedFeedback}\n\nINITIAL ANALYSIS FROM GEMINI:\n${JSON.stringify(geminiData, null, 2)}\n\nPlease validate, correct, and enhance the above analysis.`
            : `ORIGINAL REVIEW FEEDBACK FROM APPLE:\n${trimmedFeedback}\n\nNOTE: The initial Gemini analysis failed. Please provide a complete standalone analysis in the confirmation format. Treat all issues as claude_added.`;

          const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4096,
            temperature: 0.2,
            system: CLAUDE_SYSTEM_PROMPT,
            messages: [{ role: "user", content: userMessage }],
          };

          const command = new InvokeModelCommand({
            modelId: "us.anthropic.claude-opus-4-5-v1",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
          });

          const response = await bedrock.send(command);
          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          const raw = responseBody?.content?.[0]?.text;
          if (!raw) throw new Error("Empty response from Bedrock");
          const cleaned = raw.replace(/```json\s*|```/g, "").trim();
          claudeData = JSON.parse(cleaned);
          claudeSuccess = true;
        } catch (err) {
          console.error("[Claude error]", err);
        }
        claudeLatency = Date.now() - cStart;

        sendEvent(controller, "status", { step: "claude_done", success: claudeSuccess, latency: claudeLatency });

        // MERGE
        sendEvent(controller, "status", { step: "merging", message: "Preparing your results..." });

        // Import merge logic inline to keep streaming route self-contained
        const gemini = geminiData;
        const claude = claudeData;
        let merged;

        if (!gemini && !claude) {
          merged = {
            guidelines: [], issues: [], action_plan: [],
            assessment: { score: 0, confidence: "low", summary: "Analysis could not be completed.", agreement_level: "none", risk_factors: [] },
            meta: { models_used: [], gemini_latency_ms: geminiLatency, claude_latency_ms: claudeLatency, total_latency_ms: Date.now() - totalStart, gemini_success: false, claude_success: false },
          };
        } else if (gemini && !claude) {
          const ra = (gemini.readiness_assessment as Record<string, unknown>) || {};
          merged = {
            guidelines: (gemini.guidelines_referenced as unknown[]) || [],
            issues: (gemini.issues_identified as unknown[]) || [],
            action_plan: ((gemini.action_plan as unknown[]) || []).map((i: unknown) => ({ ...(i as Record<string, unknown>), confidence: "medium", source: "gemini_only" })),
            assessment: { score: (ra.score as number) || 0, confidence: "medium", summary: (ra.summary as string) || "Single model.", agreement_level: "single_model", risk_factors: (ra.risk_factors as string[]) || [] },
            meta: { models_used: ["gemini-2.5-pro"], gemini_latency_ms: geminiLatency, claude_latency_ms: claudeLatency, total_latency_ms: Date.now() - totalStart, gemini_success: true, claude_success: false },
          };
        } else if (!gemini && claude) {
          const fa = (claude.final_assessment as Record<string, unknown>) || {};
          merged = {
            guidelines: [],
            issues: ((claude.validation as Record<string, unknown>)?.missed_issues as unknown[]) || [],
            action_plan: (claude.refined_action_plan as unknown[]) || [],
            assessment: { score: (fa.score as number) || 0, confidence: (fa.confidence as string) || "medium", summary: (fa.summary as string) || "Single model.", agreement_level: "single_model", risk_factors: (fa.risk_factors as string[]) || [] },
            meta: { models_used: ["claude-opus"], gemini_latency_ms: geminiLatency, claude_latency_ms: claudeLatency, total_latency_ms: Date.now() - totalStart, gemini_success: false, claude_success: true },
          };
        } else {
          const validation = (claude!.validation as Record<string, unknown>) || {};
          const fa = (claude!.final_assessment as Record<string, unknown>) || {};
          const gr = (gemini!.readiness_assessment as Record<string, unknown>) || {};
          const confirmedIssues = (gemini!.issues_identified as unknown[]) || [];
          const missedIssues = (validation.missed_issues as unknown[]) || [];
          const disputedIssues = (validation.disputed_issues as unknown[]) || [];
          const disputedOriginals = new Set(disputedIssues.map((d: unknown) => (d as Record<string, unknown>).original_issue as string));
          const reconciledIssues = [
            ...confirmedIssues.filter((i: unknown) => !disputedOriginals.has((i as Record<string, unknown>).issue as string)),
            ...disputedIssues.map((d: unknown) => ({ severity: "major", issue: (d as Record<string, unknown>).correction, evidence: (d as Record<string, unknown>).dispute_reason, source: "claude_corrected" })),
            ...missedIssues.map((i: unknown) => ({ ...(i as Record<string, unknown>), source: "claude_added" })),
          ];
          const gs = (gr.score as number) || 0;
          const cs = (fa.score as number) || 0;
          merged = {
            guidelines: (gemini!.guidelines_referenced as unknown[]) || [],
            issues: reconciledIssues,
            action_plan: (claude!.refined_action_plan as unknown[]) || [],
            assessment: { score: Math.round(gs * 0.4 + cs * 0.6), confidence: (fa.confidence as string) || "high", summary: (fa.summary as string) || "", agreement_level: (fa.agreement_level as string) || "partial", risk_factors: (fa.risk_factors as string[]) || [] },
            meta: { models_used: ["gemini-2.5-pro", "claude-opus"], gemini_latency_ms: geminiLatency, claude_latency_ms: claudeLatency, total_latency_ms: Date.now() - totalStart, gemini_success: true, claude_success: true },
          };
        }

        // Save scan
        let scanId: string | undefined;
        if (authUser && merged.assessment.score > 0) {
          try {
            const saved = await putScan(authUser.userId, {
              inputText: trimmedFeedback,
              mergedResult: merged,
              geminiResult: geminiData,
              claudeResult: claudeData,
              score: merged.assessment.score,
            });
            scanId = saved.scanId;
          } catch (err) {
            console.error("Failed to save scan:", err);
          }
        }

        sendEvent(controller, "result", { result: merged, scanId, timestamp: new Date().toISOString() });
      } catch (err) {
        console.error("Stream error:", err);
        sendEvent(controller, "error", { error: "Analysis failed. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
