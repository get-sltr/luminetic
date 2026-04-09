import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lambdaSend = vi.hoisted(() => vi.fn());
const dbSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  canUserScan: vi.fn(),
  deductScanCredit: vi.fn(),
  refundScanCredit: vi.fn(),
  isAppFreeScanned: vi.fn(),
  markFreeScannedApp: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return { analyzeLimiter: limiter };
});

vi.mock("@/lib/analyzers/orchestrator", () => ({
  runStaticAnalysis: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/vindicara", () => ({
  guardInput: vi.fn(),
}));

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: vi.fn(),
}));

vi.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: class {
    send = lambdaSend;
  },
  InvokeCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: dbSend }),
  },
  PutCommand: class {
    constructor(public input: unknown) {}
  },
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import { canUserScan, deductScanCredit, refundScanCredit } from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";
import { guardInput } from "@/lib/vindicara";

function makeRequest(body: unknown, accessToken = "valid-token") {
  return new NextRequest("http://localhost/api/analyze-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `access_token=${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@example.com", plan: "free" });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 3,
      scanCount: 5,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(guardInput).mockResolvedValue({
      allowed: false,
      blocked: true,
      verdict: "blocked",
      rules: [{ id: "prompt-injection" }],
    });
  });

  it("refunds paid scan credit when guard blocks input", async () => {
    const res = await POST(makeRequest({ feedback: "This input should be flagged by prompt-injection guard." }));

    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
    expect(dbSend).not.toHaveBeenCalled();
    expect(lambdaSend).not.toHaveBeenCalled();
  });
});
