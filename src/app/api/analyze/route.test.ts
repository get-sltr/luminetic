import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  canUserScan: vi.fn(),
  claimFreeScan: vi.fn(),
  deductScanCredit: vi.fn(),
  putScan: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return { analyzeLimiter: limiter };
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () =>
                JSON.stringify({
                  guidelines_referenced: [{ section: "2.1", name: "App Completeness", description: "test" }],
                  issues_identified: [{ severity: "major", issue: "Test issue", evidence: "Evidence", guideline_section: "2.1" }],
                  action_plan: [{ priority: 1, action: "Fix it", details: "Do the thing", estimated_effort: "1 hour" }],
                  readiness_assessment: { score: 65, summary: "Needs work", risk_factors: ["Risk 1"] },
                }),
            },
          }),
        };
      }
    },
  };
});

vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  return {
    BedrockRuntimeClient: class {
      send = vi.fn().mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [
              {
                text: JSON.stringify({
                  validation: { confirmed_issues: ["Test issue"], disputed_issues: [], missed_issues: [] },
                  refined_action_plan: [{ priority: 1, action: "Fix it", details: "Steps", estimated_effort: "1 hour", confidence: "high", source: "gemini_confirmed" }],
                  final_assessment: { score: 70, confidence: "high", summary: "Good progress", agreement_level: "full", risk_factors: ["Risk 1"] },
                }),
              },
            ],
          })
        ),
      });
    },
    InvokeModelCommand: class {},
  };
});

vi.mock("@aws-sdk/client-secrets-manager", () => {
  return {
    SecretsManagerClient: class {
      send = vi.fn().mockResolvedValue({
        SecretString: JSON.stringify({ GEMINI_API_KEY: "test-key" }),
      });
    },
    GetSecretValueCommand: class {},
  };
});

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import { canUserScan, claimFreeScan, deductScanCredit, putScan } from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(body: unknown, accessToken = "valid-token") {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `access_token=${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@test.com", plan: "free" });
    vi.mocked(canUserScan).mockResolvedValue({ allowed: true, reason: "Paid credit available.", isPaidScan: true, isFreeScan: false, credits: 5, scanCount: 2 });
    vi.mocked(claimFreeScan).mockResolvedValue(true);
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(putScan).mockResolvedValue({ scanId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" as `${string}-${string}-${string}-${string}-${string}`, timestamp: "2026-01-01T00:00:00Z" });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Sign in");
  });

  it("returns 400 for missing feedback", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for feedback too short", async () => {
    const res = await POST(makeRequest({ feedback: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: false, retryAfterMs: 10000 });
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1" }));
    expect(res.status).toBe(429);
  });

  it("returns 402 when no scan credits remaining", async () => {
    vi.mocked(canUserScan).mockResolvedValue({ allowed: false, reason: "No scan credits remaining.", isPaidScan: false, isFreeScan: false, credits: 0, scanCount: 5 });
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1" }));
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toContain("credits");
  });

  it("allows founder plan without credits", async () => {
    vi.mocked(canUserScan).mockResolvedValue({ allowed: true, reason: "Founder access.", isPaidScan: false, isFreeScan: false, credits: 0, scanCount: 100 });
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1" }));
    expect(res.status).toBe(200);
    expect(deductScanCredit).not.toHaveBeenCalled();
  });

  it("returns analysis result with dual-model merge", async () => {
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1 because it was incomplete" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBeDefined();
    expect(data.result.assessment.score).toBeGreaterThan(0);
    expect(data.result.meta.models_used).toContain("gemini-2.5-pro");
    expect(data.result.meta.models_used).toContain("claude-opus");
    expect(data.scanId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("deducts credit for non-founder users", async () => {
    await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1 testing" }));
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
  });

  it("claims free scan atomically for free-scan users", async () => {
    vi.mocked(canUserScan).mockResolvedValue({ allowed: true, reason: "Free scan available.", isPaidScan: false, isFreeScan: true, credits: 0, scanCount: 0 });
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1 testing" }));
    expect(res.status).toBe(200);
    expect(claimFreeScan).toHaveBeenCalledWith("user-1");
    expect(deductScanCredit).not.toHaveBeenCalled();
  });

  it("returns 402 when free scan claim loses race", async () => {
    vi.mocked(canUserScan).mockResolvedValue({ allowed: true, reason: "Free scan available.", isPaidScan: false, isFreeScan: true, credits: 0, scanCount: 0 });
    vi.mocked(claimFreeScan).mockResolvedValue(false);
    const res = await POST(makeRequest({ feedback: "My app was rejected for guideline 2.1 testing" }));
    expect(res.status).toBe(402);
  });

  it("accepts alternative field names (email, text)", async () => {
    const res = await POST(makeRequest({ email: "This is the email content from Apple reviewer about rejection" }));
    expect(res.status).toBe(200);
  });
});
