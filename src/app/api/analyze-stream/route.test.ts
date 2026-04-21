import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  lambdaSend: vi.fn(),
  dbSend: vi.fn(),
  limiterCheck: vi.fn(),
}));

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

vi.mock("@/lib/rate-limit", () => ({
  analyzeLimiter: { check: mocks.limiterCheck },
}));

vi.mock("@/lib/analyzers/orchestrator", () => ({
  runStaticAnalysis: vi.fn(),
}));

vi.mock("@/lib/vindicara", () => ({
  guardInput: vi.fn(),
}));

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: vi.fn(),
}));

vi.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: class {
    send = mocks.lambdaSend;
  },
  InvokeCommand: class {
    constructor(_input: unknown) {}
  },
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {
    constructor(_config: unknown) {}
  },
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mocks.dbSend })),
  },
  PutCommand: class {
    constructor(_input: unknown) {}
  },
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import { canUserScan, deductScanCredit, refundScanCredit } from "@/lib/db";
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
    mocks.limiterCheck.mockReturnValue({ allowed: true });
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
      plan: "paid",
    });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 3,
      scanCount: 0,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(guardInput).mockResolvedValue({
      allowed: false,
      blocked: true,
      verdict: "blocked",
      rules: [{ id: "prompt-injection" }],
    });
  });

  it("refunds charged paid credit when guard blocks input", async () => {
    const res = await POST(
      makeRequest({ feedback: "This is long enough feedback text for validation." })
    );

    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
    expect(mocks.dbSend).not.toHaveBeenCalled();
    expect(mocks.lambdaSend).not.toHaveBeenCalled();
  });
});
