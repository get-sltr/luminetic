import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockLambdaSend = vi.fn();
const mockDbSend = vi.fn();

class MockPutCommand {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

class MockUpdateCommand {
  input: unknown;
  constructor(input: unknown) {
    this.input = input;
  }
}

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getUser: vi.fn(),
  deductScanCredit: vi.fn(),
  refundScanCredit: vi.fn(),
  isFreeTierUser: vi.fn(),
  isAppFreeScanned: vi.fn(),
  markFreeScannedApp: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return { analyzeLimiter: limiter };
});

vi.mock("@/lib/ipa-parser", () => ({
  parseIpa: vi.fn(),
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

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({ send: mockDbSend })),
  },
  PutCommand: MockPutCommand,
  UpdateCommand: MockUpdateCommand,
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import {
  deductScanCredit,
  getUser,
  isAppFreeScanned,
  isFreeTierUser,
  refundScanCredit,
} from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";
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

    vi.mocked(verifyToken).mockResolvedValue({
      userId: "user-1",
      email: "test@test.com",
      plan: "free",
    });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(getUser).mockResolvedValue({ plan: "free", scanCredits: 1, scanCount: 0 });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue();
    vi.mocked(isFreeTierUser).mockResolvedValue(false);
    vi.mocked(isAppFreeScanned).mockResolvedValue(false);
    vi.mocked(parseIpa).mockResolvedValue({
      metadata: {
        appName: "Demo",
        bundleId: "com.example.demo",
        version: "1.0",
        buildNumber: "1",
        minimumOSVersion: "15.0",
        privacyUsageDescriptions: {},
        backgroundModes: [],
        requiredDeviceCapabilities: [],
        urlSchemes: [],
        exportCompliance: false,
        frameworks: [],
        entitlements: {},
      },
      sha256: "abc123",
    });

    mockDbSend.mockResolvedValue({});
    mockLambdaSend.mockResolvedValue({});
  });

  it("refunds credit and marks scan as error when Lambda invoke fails", async () => {
    mockLambdaSend.mockRejectedValueOnce(new Error("invoke failed"));

    const res = await POST(
      makeRequest({
        s3Key: "ipa-uploads/user-1/demo.ipa",
        synopsis: "This is a valid synopsis for testing flow.",
      })
    );

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("failed to start");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");

    const updateCall = mockDbSend.mock.calls.find(
      ([command]) => command instanceof MockUpdateCommand
    );
    expect(updateCall).toBeTruthy();
    const updateInput = (updateCall?.[0] as MockUpdateCommand).input as {
      ExpressionAttributeValues?: Record<string, unknown>;
    };
    expect(updateInput.ExpressionAttributeValues?.[":status"]).toBe("error");
  });
});
