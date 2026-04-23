import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lambdaSendMock = vi.fn();
const ddbSendMock = vi.fn();

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
    send = lambdaSendMock;
  },
  InvokeCommand: class {},
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: ddbSendMock })),
  },
  PutCommand: class {},
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import {
  canUserScan,
  deductScanCredit,
  refundScanCredit,
  isAppFreeScanned,
  markFreeScannedApp,
} from "@/lib/db";
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

describe("POST /api/analyze-stream credit handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ddbSendMock.mockResolvedValue({});
    lambdaSendMock.mockResolvedValue({});
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@test.com", plan: "free" });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 3,
      scanCount: 2,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue();
    vi.mocked(isAppFreeScanned).mockResolvedValue(false);
    vi.mocked(markFreeScannedApp).mockResolvedValue();
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(guardInput).mockResolvedValue({ blocked: true });
  });

  it("refunds paid credit when Vindicara blocks input", async () => {
    const res = await POST(makeRequest({ feedback: "This is long enough feedback for analysis." }));

    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
    expect(ddbSendMock).not.toHaveBeenCalled();
    expect(lambdaSendMock).not.toHaveBeenCalled();
  });

  it("does not refund when no paid credit was deducted", async () => {
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Free scan available.",
      isPaidScan: false,
      isFreeScan: true,
      credits: 0,
      scanCount: 0,
    });

    const res = await POST(makeRequest({ feedback: "This is long enough feedback for analysis." }));

    expect(res.status).toBe(400);
    expect(deductScanCredit).not.toHaveBeenCalled();
    expect(refundScanCredit).not.toHaveBeenCalled();
  });
});
