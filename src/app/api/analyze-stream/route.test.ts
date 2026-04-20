import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  lambdaSend: vi.fn(),
  dbSend: vi.fn(),
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

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return { analyzeLimiter: limiter };
});

vi.mock("@/lib/vindicara", () => ({
  guardInput: vi.fn(),
}));

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: vi.fn(),
}));

vi.mock("@/lib/analyzers/orchestrator", () => ({
  runStaticAnalysis: vi.fn(),
}));

vi.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: class {
    send = mocks.lambdaSend;
  },
  InvokeCommand: class {},
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mocks.dbSend })),
  },
  PutCommand: class {},
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import { analyzeLimiter } from "@/lib/rate-limit";
import { canUserScan, deductScanCredit, refundScanCredit } from "@/lib/db";
import { guardInput } from "@/lib/vindicara";
import { parseIpa } from "@/lib/ipa-parser";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analyze-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "access_token=valid-token",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lambdaSend.mockResolvedValue({});
    mocks.dbSend.mockResolvedValue({});
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@test.com", plan: "free" });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 1,
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

  it("refunds paid credit when prompt guard blocks submission", async () => {
    const res = await POST(makeRequest({ feedback: "This is valid length feedback for analysis." }));
    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
    expect(parseIpa).not.toHaveBeenCalled();
    expect(mocks.dbSend).not.toHaveBeenCalled();
    expect(mocks.lambdaSend).not.toHaveBeenCalled();
  });
});
