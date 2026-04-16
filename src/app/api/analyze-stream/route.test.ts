import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { dbSendMock, lambdaSendMock } = vi.hoisted(() => ({
  dbSendMock: vi.fn(),
  lambdaSendMock: vi.fn(),
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

vi.mock("@/lib/analyzers/orchestrator", () => ({
  runStaticAnalysis: vi.fn(),
}));

vi.mock("@/lib/vindicara", () => ({
  guardInput: vi.fn(),
}));

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: dbSendMock })),
  },
  PutCommand: class {},
}));

vi.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: class {
    send = lambdaSendMock;
  },
  InvokeCommand: class {},
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import { analyzeLimiter } from "@/lib/rate-limit";
import {
  canUserScan,
  deductScanCredit,
  refundScanCredit,
  isAppFreeScanned,
  markFreeScannedApp,
} from "@/lib/db";
import { guardInput } from "@/lib/vindicara";
import { parseIpa } from "@/lib/ipa-parser";

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
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@test.com", plan: "pro" });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 1,
      scanCount: 2,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue(undefined);
    vi.mocked(isAppFreeScanned).mockResolvedValue(false);
    vi.mocked(markFreeScannedApp).mockResolvedValue(undefined);
    dbSendMock.mockResolvedValue({});
    lambdaSendMock.mockResolvedValue({});
    vi.mocked(guardInput).mockResolvedValue({
      allowed: false,
      blocked: true,
      verdict: "blocked",
      rules: [],
    });
  });

  it("refunds paid credit when input is blocked by guard", async () => {
    const res = await POST(makeRequest({ feedback: "This rejection message is definitely long enough to pass validation." }));

    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
    expect(parseIpa).not.toHaveBeenCalled();
  });

  it("does not refund when no paid credit was charged", async () => {
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Founder access.",
      isPaidScan: false,
      isFreeScan: false,
      credits: 0,
      scanCount: 0,
    });

    const res = await POST(makeRequest({ feedback: "This rejection message is definitely long enough to pass validation." }));

    expect(res.status).toBe(400);
    expect(deductScanCredit).not.toHaveBeenCalled();
    expect(refundScanCredit).not.toHaveBeenCalled();
  });

  it("refunds paid credit when scan record write fails after charging", async () => {
    vi.mocked(guardInput).mockResolvedValue({
      allowed: true,
      blocked: false,
      verdict: "allowed",
      rules: [],
    });
    dbSendMock.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

    const res = await POST(makeRequest({ feedback: "This rejection message is definitely long enough to pass validation." }));

    expect(res.status).toBe(500);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
  });
});
