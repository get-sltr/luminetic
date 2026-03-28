import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockDeductScanCredit,
  mockRefundScanCredit,
  mockGetUser,
  mockIsFreeTierUser,
  mockIsAppFreeScanned,
  mockMarkFreeScannedApp,
  mockVerifyToken,
  mockParseIpa,
  mockAnalyzeLimiterCheck,
  mockDbSend,
  mockLambdaSend,
} = vi.hoisted(() => ({
  mockDeductScanCredit: vi.fn(),
  mockRefundScanCredit: vi.fn(),
  mockGetUser: vi.fn(),
  mockIsFreeTierUser: vi.fn(),
  mockIsAppFreeScanned: vi.fn(),
  mockMarkFreeScannedApp: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockParseIpa: vi.fn(),
  mockAnalyzeLimiterCheck: vi.fn(),
  mockDbSend: vi.fn(),
  mockLambdaSend: vi.fn(),
}));

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
  analyzeLimiter: {
    check: mockAnalyzeLimiterCheck,
  },
}));

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: mockParseIpa,
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => {
  class PutCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class UpdateCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    DynamoDBDocumentClient: {
      from: () => ({ send: mockDbSend }),
    },
    PutCommand,
    UpdateCommand,
  };
});

vi.mock("@aws-sdk/client-lambda", () => {
  class InvokeCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class LambdaClient {
    send = mockLambdaSend;
  }
  return {
    LambdaClient,
    InvokeCommand,
  };
});

import { POST } from "./route";

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
    mockVerifyToken.mockResolvedValue({ userId: "user-1" });
    mockAnalyzeLimiterCheck.mockReturnValue({ allowed: true });
    mockGetUser.mockResolvedValue({ plan: "free", scanCredits: 3, scanCount: 2 });
    mockDeductScanCredit.mockResolvedValue(true);
    mockRefundScanCredit.mockResolvedValue(undefined);
    mockParseIpa.mockResolvedValue({
      sha256: "hash-1",
      metadata: {
        appName: "Test App",
        bundleId: "com.test.app",
        version: "1.0.0",
        buildNumber: "1",
        minimumOSVersion: "16.0",
        privacyUsageDescriptions: { NSCameraUsageDescription: "Need camera" },
        backgroundModes: [],
        requiredDeviceCapabilities: [],
        urlSchemes: [],
        exportCompliance: false,
        frameworks: [],
        entitlements: {},
      },
    });
    mockIsFreeTierUser.mockResolvedValue(false);
    mockIsAppFreeScanned.mockResolvedValue(false);
    mockDbSend.mockResolvedValue({});
    mockLambdaSend.mockResolvedValue({});
    mockMarkFreeScannedApp.mockResolvedValue(undefined);
  });

  it("refunds credit when Lambda invoke fails after deduction", async () => {
    mockLambdaSend.mockRejectedValueOnce(new Error("lambda unavailable"));

    const res = await POST(makeRequest({
      s3Key: "ipa-uploads/user-1/app.ipa",
      synopsis: "A valid synopsis with enough characters.",
    }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Failed to start analysis");

    expect(mockDeductScanCredit).toHaveBeenCalledWith("user-1");
    expect(mockRefundScanCredit).toHaveBeenCalledTimes(1);
    expect(mockMarkFreeScannedApp).not.toHaveBeenCalled();
  });

  it("refunds once for free-scan duplicate and does not queue job", async () => {
    mockIsFreeTierUser.mockResolvedValueOnce(true);
    mockIsAppFreeScanned.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({
      s3Key: "ipa-uploads/user-1/app.ipa",
      synopsis: "A valid synopsis with enough characters.",
    }));

    expect(res.status).toBe(409);
    expect(mockRefundScanCredit).toHaveBeenCalledTimes(1);
    expect(mockDbSend).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  it("marks free-scanned app only after Lambda accepts invocation", async () => {
    mockIsFreeTierUser.mockResolvedValue(true);

    const res = await POST(makeRequest({
      s3Key: "ipa-uploads/user-1/app.ipa",
      synopsis: "A valid synopsis with enough characters.",
    }));

    expect(res.status).toBe(200);
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
    expect(mockMarkFreeScannedApp).toHaveBeenCalledTimes(1);
    expect(mockRefundScanCredit).not.toHaveBeenCalled();
  });
});
