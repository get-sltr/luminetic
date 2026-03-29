import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyToken = vi.fn();
const mockGetUser = vi.fn();
const mockDeductScanCredit = vi.fn();
const mockRefundScanCredit = vi.fn();
const mockIsFreeTierUser = vi.fn();
const mockIsAppFreeScanned = vi.fn();
const mockMarkFreeScannedApp = vi.fn();
const mockAnalyzeLimiterCheck = vi.fn();
const mockDbSend = vi.fn();
const mockLambdaSend = vi.fn();

vi.mock("@/lib/auth", () => ({
  verifyToken: mockVerifyToken,
}));

vi.mock("@/lib/db", () => ({
  getUser: mockGetUser,
  deductScanCredit: mockDeductScanCredit,
  refundScanCredit: mockRefundScanCredit,
  isFreeTierUser: mockIsFreeTierUser,
  isAppFreeScanned: mockIsAppFreeScanned,
  markFreeScannedApp: mockMarkFreeScannedApp,
}));

vi.mock("@/lib/rate-limit", () => ({
  analyzeLimiter: { check: mockAnalyzeLimiterCheck },
}));

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: class {
    send = mockLambdaSend;
  },
  InvokeCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockDbSend })),
  },
  PutCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  UpdateCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { POST } from "./route";

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

describe("POST /api/analyze-stream startup failure handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockVerifyToken.mockResolvedValue({ userId: "user-1", email: "test@example.com" });
    mockAnalyzeLimiterCheck.mockReturnValue({ allowed: true });
    mockGetUser.mockResolvedValue({ plan: "free", role: "user", scanCredits: 2 });
    mockDeductScanCredit.mockResolvedValue(true);
    mockRefundScanCredit.mockResolvedValue(undefined);
    mockDbSend.mockResolvedValue({});
    mockLambdaSend.mockResolvedValue({});
    mockIsFreeTierUser.mockResolvedValue(false);
    mockIsAppFreeScanned.mockResolvedValue(false);
    mockMarkFreeScannedApp.mockResolvedValue(undefined);
  });

  it("refunds credits and marks pending scan as error when Lambda invoke fails", async () => {
    mockDbSend.mockResolvedValueOnce({}); // Put scan record succeeds
    mockLambdaSend.mockRejectedValueOnce(new Error("invoke failed"));

    const res = await POST(makeRequest({ feedback: "This feedback message is long enough." }));

    expect(res.status).toBe(503);
    expect(mockRefundScanCredit).toHaveBeenCalledWith("user-1");
    expect(mockDbSend).toHaveBeenCalledTimes(2);

    const updateCommand = mockDbSend.mock.calls[1][0] as { input?: Record<string, unknown> };
    const values = updateCommand.input?.ExpressionAttributeValues as Record<string, string>;
    expect(values[":s"]).toBe("error");
    expect(values[":msg"]).toContain("Failed to start analysis");
  });

  it("refunds credits when scan record creation fails before Lambda invoke", async () => {
    mockDbSend.mockRejectedValueOnce(new Error("ddb write failed"));

    const res = await POST(makeRequest({ feedback: "This feedback message is long enough." }));

    expect(res.status).toBe(503);
    expect(mockLambdaSend).not.toHaveBeenCalled();
    expect(mockRefundScanCredit).toHaveBeenCalledWith("user-1");
    expect(mockDbSend).toHaveBeenCalledTimes(1);
  });
});
