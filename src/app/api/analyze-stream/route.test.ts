import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  mockLambdaSend: vi.fn(),
  mockDbSend: vi.fn(),
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
  analyzeLimiter: { check: vi.fn().mockReturnValue({ allowed: true }) },
}));

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
    send = mocks.mockLambdaSend;
  },
  InvokeCommand: class {},
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mocks.mockDbSend })),
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

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analyze-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "access_token=test-token",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockLambdaSend.mockResolvedValue({});
    mocks.mockDbSend.mockResolvedValue({});
    vi.mocked(verifyToken).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
      plan: "free",
    });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 2,
      scanCount: 1,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue();
    vi.mocked(isAppFreeScanned).mockResolvedValue(false);
    vi.mocked(markFreeScannedApp).mockResolvedValue();
    vi.mocked(guardInput).mockResolvedValue({
      allowed: true,
      blocked: false,
      verdict: "allowed",
      rules: [],
    });
  });

  it("refunds paid credit when security guard blocks input", async () => {
    vi.mocked(guardInput).mockResolvedValue({
      allowed: false,
      blocked: true,
      verdict: "blocked",
      rules: [{ id: "prompt-injection" }],
    });

    const res = await POST(
      makeRequest({
        s3Key: "ipa-uploads/user-1/app.ipa",
        synopsis: "This is a sufficiently long synopsis for testing.",
      }),
    );

    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
    expect(mocks.mockDbSend).not.toHaveBeenCalled();
    expect(mocks.mockLambdaSend).not.toHaveBeenCalled();
  });
});
