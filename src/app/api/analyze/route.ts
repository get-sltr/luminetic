// src/app/api/analyze/route.ts
// Dual-Model AI Analysis Engine
// Layer 1: Gemini 2.5 Pro (initial scan)
// Layer 2: Claude Opus via AWS Bedrock (confirmation + reconciliation)

import { NextRequest, NextResponse } from "next/server";
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

// ============================================================
// SECRETS
// ============================================================

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  if (cachedGeminiKey) return cachedGeminiKey;

  const command = new GetSecretValueCommand({
    SecretId: "luminetic/gemini-api-key",
  });

  const response = await secretsClient.send(command);
  const key = response.SecretString
    ? JSON.parse(response.SecretString).GEMINI_API_KEY
    : null;

  if (!key) throw new Error("Gemini API key not found in Secrets Manager");

  cachedGeminiKey = key;
  return key;
}

// ============================================================
// CLIENTS
// ============================================================

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// ============================================================
// SYSTEM PROMPTS
// ============================================================

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
  "guidelines_referenced": [
    {
      "section": "e.g. 2.1",
      "name": "e.g. App Completeness",
      "description": "Brief description of what this guideline covers"
    }
  ],
  "issues_identified": [
    {
      "severity": "critical" | "major" | "minor",
      "issue": "Clear description of the problem",
      "evidence": "What in the feedback indicates this issue",
      "guideline_section": "e.g. 2.1"
    }
  ],
  "action_plan": [
    {
      "priority": 1,
      "action": "Specific action to take",
      "details": "Step-by-step implementation guidance",
      "estimated_effort": "e.g. 1-2 hours"
    }
  ],
  "readiness_assessment": {
    "score": 0-100,
    "summary": "One paragraph assessment of submission readiness after fixes",
    "risk_factors": ["List of remaining risks even after fixes"]
  }
}`;

const CLAUDE_SYSTEM_PROMPT = `You are a senior App Store Review Guidelines expert performing a confirmation review. You will receive:

1. The original App Store review feedback from Apple
2. An initial analysis from another AI model (Gemini)

Your job is to:
- VALIDATE the initial analysis for accuracy
- IDENTIFY any guidelines or issues that were missed
- CORRECT any misidentified guidelines or incorrect advice
- ADD any additional context or nuance
- RECONCILE any disagreements between your analysis and the initial one

You have authoritative knowledge of Apple's App Store Review Guidelines, Human Interface Guidelines, and common reviewer behavior patterns.

Respond ONLY with valid JSON (no markdown, no backticks, no preamble) in this exact structure:

{
  "validation": {
    "confirmed_issues": ["List of issue descriptions from the initial analysis that are correct"],
    "disputed_issues": [
      {
        "original_issue": "The issue from the initial analysis",
        "dispute_reason": "Why this is incorrect or needs modification",
        "correction": "The corrected assessment"
      }
    ],
    "missed_issues": [
      {
        "severity": "critical" | "major" | "minor",
        "issue": "Description of the missed issue",
        "guideline_section": "e.g. 4.3",
        "action": "What to do about it"
      }
    ]
  },
  "refined_action_plan": [
    {
      "priority": 1,
      "action": "Specific action to take",
      "details": "Step-by-step implementation guidance",
      "estimated_effort": "e.g. 1-2 hours",
      "confidence": "high" | "medium" | "low",
      "source": "gemini_confirmed" | "claude_added" | "claude_corrected"
    }
  ],
  "final_assessment": {
    "score": 0-100,
    "confidence": "high" | "medium" | "low",
    "summary": "Final reconciled assessment",
    "agreement_level": "full" | "partial" | "significant_disagreement",
    "risk_factors": ["Remaining risks after all fixes applied"]
  }
}`;

// ============================================================
// ANALYSIS FUNCTIONS
// ============================================================

async function analyzeWithGemini(feedback: string): Promise<{
  success: boolean;
  data: Record<string, unknown> | null;
  raw: string;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const apiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const result = await model.generateContent([
      { text: GEMINI_SYSTEM_PROMPT },
      { text: `Analyze this App Store review feedback:\n\n${feedback}` },
    ]);

    const raw = result.response.text();
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();
    const data = JSON.parse(cleaned);

    return {
      success: true,
      data,
      raw,
      latency: Date.now() - start,
    };
  } catch (error) {
    console.error("[Gemini error]", error);
    return {
      success: false,
      data: null,
      raw: "",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Gemini analysis failed",
    };
  }
}

async function analyzeWithClaude(
  feedback: string,
  geminiAnalysis: Record<string, unknown> | null
): Promise<{
  success: boolean;
  data: Record<string, unknown> | null;
  raw: string;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  const userMessage = geminiAnalysis
    ? `ORIGINAL REVIEW FEEDBACK FROM APPLE:\n${feedback}\n\nINITIAL ANALYSIS FROM GEMINI:\n${JSON.stringify(geminiAnalysis, null, 2)}\n\nPlease validate, correct, and enhance the above analysis.`
    : `ORIGINAL REVIEW FEEDBACK FROM APPLE:\n${feedback}\n\nNOTE: The initial Gemini analysis failed. Please provide a complete standalone analysis in the confirmation format. Treat all issues as claude_added.`;

  try {
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      temperature: 0.2,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
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
    const data = JSON.parse(cleaned);

    return {
      success: true,
      data,
      raw,
      latency: Date.now() - start,
    };
  } catch (error) {
    console.error("[Claude error]", error);
    return {
      success: false,
      data: null,
      raw: "",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Claude analysis failed",
    };
  }
}

// ============================================================
// MERGE / RECONCILE
// ============================================================

interface MergedAnalysis {
  guidelines: unknown[];
  issues: unknown[];
  action_plan: unknown[];
  assessment: {
    score: number;
    confidence: string;
    summary: string;
    agreement_level: string;
    risk_factors: string[];
  };
  meta: {
    models_used: string[];
    gemini_latency_ms: number;
    claude_latency_ms: number;
    total_latency_ms: number;
    gemini_success: boolean;
    claude_success: boolean;
  };
}

function mergeResults(
  geminiResult: {
    success: boolean;
    data: Record<string, unknown> | null;
    latency: number;
  },
  claudeResult: {
    success: boolean;
    data: Record<string, unknown> | null;
    latency: number;
  },
  totalStart: number
): MergedAnalysis {
  const gemini = geminiResult.data as Record<string, unknown> | null;
  const claude = claudeResult.data as Record<string, unknown> | null;

  if (!gemini && !claude) {
    return {
      guidelines: [],
      issues: [],
      action_plan: [],
      assessment: {
        score: 0,
        confidence: "low",
        summary: "Analysis could not be completed. Please try again.",
        agreement_level: "none",
        risk_factors: [],
      },
      meta: {
        models_used: [],
        gemini_latency_ms: geminiResult.latency,
        claude_latency_ms: claudeResult.latency,
        total_latency_ms: Date.now() - totalStart,
        gemini_success: false,
        claude_success: false,
      },
    };
  }

  if (gemini && !claude) {
    const readiness = (gemini.readiness_assessment as Record<string, unknown>) || {};
    return {
      guidelines: (gemini.guidelines_referenced as unknown[]) || [],
      issues: (gemini.issues_identified as unknown[]) || [],
      action_plan: ((gemini.action_plan as unknown[]) || []).map(
        (item: unknown) => ({
          ...(item as Record<string, unknown>),
          confidence: "medium",
          source: "gemini_only",
        })
      ),
      assessment: {
        score: (readiness.score as number) || 0,
        confidence: "medium",
        summary:
          (readiness.summary as string) ||
          "Analysis completed with single model only.",
        agreement_level: "single_model",
        risk_factors: (readiness.risk_factors as string[]) || [],
      },
      meta: {
        models_used: ["gemini-2.5-pro"],
        gemini_latency_ms: geminiResult.latency,
        claude_latency_ms: claudeResult.latency,
        total_latency_ms: Date.now() - totalStart,
        gemini_success: true,
        claude_success: false,
      },
    };
  }

  if (!gemini && claude) {
    const finalAssessment = (claude.final_assessment as Record<string, unknown>) || {};
    return {
      guidelines: [],
      issues:
        ((claude.validation as Record<string, unknown>)?.missed_issues as unknown[]) || [],
      action_plan: (claude.refined_action_plan as unknown[]) || [],
      assessment: {
        score: (finalAssessment.score as number) || 0,
        confidence: (finalAssessment.confidence as string) || "medium",
        summary:
          (finalAssessment.summary as string) ||
          "Analysis completed with confirmation model only.",
        agreement_level: "single_model",
        risk_factors: (finalAssessment.risk_factors as string[]) || [],
      },
      meta: {
        models_used: ["claude-opus"],
        gemini_latency_ms: geminiResult.latency,
        claude_latency_ms: claudeResult.latency,
        total_latency_ms: Date.now() - totalStart,
        gemini_success: false,
        claude_success: true,
      },
    };
  }

  // Both succeeded: full dual-model merge
  const validation = (claude!.validation as Record<string, unknown>) || {};
  const finalAssessment = (claude!.final_assessment as Record<string, unknown>) || {};
  const geminiReadiness = (gemini!.readiness_assessment as Record<string, unknown>) || {};

  const guidelines = (gemini!.guidelines_referenced as unknown[]) || [];

  const confirmedIssues = (gemini!.issues_identified as unknown[]) || [];
  const missedIssues = (validation.missed_issues as unknown[]) || [];
  const disputedIssues = (validation.disputed_issues as unknown[]) || [];

  const disputedOriginals = new Set(
    disputedIssues.map(
      (d: unknown) => (d as Record<string, unknown>).original_issue as string
    )
  );

  const reconciledIssues = [
    ...confirmedIssues.filter(
      (issue: unknown) =>
        !disputedOriginals.has((issue as Record<string, unknown>).issue as string)
    ),
    ...disputedIssues.map((d: unknown) => ({
      severity: "major",
      issue: (d as Record<string, unknown>).correction,
      evidence: (d as Record<string, unknown>).dispute_reason,
      source: "claude_corrected",
    })),
    ...missedIssues.map((issue: unknown) => ({
      ...(issue as Record<string, unknown>),
      source: "claude_added",
    })),
  ];

  const actionPlan = (claude!.refined_action_plan as unknown[]) || [];

  const geminiScore = (geminiReadiness.score as number) || 0;
  const claudeScore = (finalAssessment.score as number) || 0;
  const weightedScore = Math.round(geminiScore * 0.4 + claudeScore * 0.6);

  return {
    guidelines,
    issues: reconciledIssues,
    action_plan: actionPlan,
    assessment: {
      score: weightedScore,
      confidence: (finalAssessment.confidence as string) || "high",
      summary: (finalAssessment.summary as string) || "",
      agreement_level: (finalAssessment.agreement_level as string) || "partial",
      risk_factors: (finalAssessment.risk_factors as string[]) || [],
    },
    meta: {
      models_used: ["gemini-2.5-pro", "claude-opus"],
      gemini_latency_ms: geminiResult.latency,
      claude_latency_ms: claudeResult.latency,
      total_latency_ms: Date.now() - totalStart,
      gemini_success: true,
      claude_success: true,
    },
  };
}

// ============================================================
// API ROUTE HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  const totalStart = Date.now();

  try {
    const body = await request.json();

    const schema = z.object({
      feedback: z.string().min(10, "Please paste valid App Store review feedback (minimum 10 characters).").max(10000).optional(),
      email: z.string().min(10).max(10000).optional(),
      text: z.string().min(10).max(10000).optional(),
    }).refine((d) => d.feedback || d.email || d.text, {
      message: "Please paste valid App Store review feedback (minimum 10 characters).",
    });

    const parsed = schema.parse(body);
    const trimmedFeedback = (parsed.feedback || parsed.email || parsed.text)!.trim().slice(0, 10000);

    // Check if user is authenticated (save scan if so)
    const accessToken = request.cookies.get("access_token")?.value;
    const authUser = accessToken ? await verifyToken(accessToken) : null;

    // Credit check
    if (authUser) {
      try {
        const userRecord = await getUser(authUser.userId);
        const credits = (userRecord?.scanCredits as number) || 0;
        if (credits <= 0) {
          return NextResponse.json(
            { error: "No scan credits remaining. Purchase a scan pack to continue." },
            { status: 429 }
          );
        }
        const used = await useScanCredit(authUser.userId);
        if (!used) {
          return NextResponse.json(
            { error: "No scan credits remaining. Purchase a scan pack to continue." },
            { status: 429 }
          );
        }
      } catch (err) {
        console.error("Credit check error:", err);
        return NextResponse.json(
          { error: "Unable to verify credits. Please try again." },
          { status: 503 }
        );
      }
    }

    // LAYER 1: Gemini initial scan
    const geminiResult = await analyzeWithGemini(trimmedFeedback);

    // LAYER 2: Claude Opus confirmation (receives Gemini's output)
    const claudeResult = await analyzeWithClaude(trimmedFeedback, geminiResult.data);

    // MERGE: Reconcile both analyses
    const merged = mergeResults(geminiResult, claudeResult, totalStart);

    // Save scan to DynamoDB if authenticated
    let scanId: string | undefined;
    if (authUser && merged.assessment.score > 0) {
      try {
        const saved = await putScan(authUser.userId, {
          inputText: trimmedFeedback,
          mergedResult: merged,
          geminiResult: geminiResult.data,
          claudeResult: claudeResult.data,
          score: merged.assessment.score,
        });
        scanId = saved.scanId;
      } catch (err) {
        console.error("Failed to save scan:", err);
      }
    }

    return NextResponse.json({
      result: merged,
      scanId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input." },
        { status: 400 }
      );
    }
    console.error("Analysis route error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed. Please try again.",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
