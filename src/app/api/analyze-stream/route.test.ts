import { describe, it, expect, vi, beforeEach } from "vitest";

const dbSend = vi.hoisted(() => vi.fn());
const lambdaSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  canUserScan: vi.fn(),
  deductScanCredit: vi.fn(),
  refundScanCredit: vi.fn(),
  isAppFreeScanned: vi.fn(),
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
  runStaticAnalysis: vi.fn().mockReturnValue({ findings: [], metadata: {} }),
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
  TransactWriteCommand: class {
    constructor(public input: unknown) {}
  },
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import { canUserScan, deductScanCredit, refundScanCredit, isAppFreeScanned } from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";
import { guardInput } from "@/lib/vindicara";
import { parseIpa } from "@/lib/ipa-parser";
import { NextRequest } from "next/server";

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

function ipaBody() {
  return {
    s3Key: "ipa-uploads/user-1/MyApp.ipa",
    synopsis: "This is a realistic app synopsis for analysis.",
  };
}

function getCommandInputs() {
  return dbSend.mock.calls.map(([command]) => (command as { input: unknown }).input as Record<string, unknown>);
}

describe("POST /api/analyze-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@test.com", plan: "free" });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 1,
      scanCount: 3,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue();
    vi.mocked(isAppFreeScanned).mockResolvedValue(false);
    vi.mocked(guardInput).mockResolvedValue({ allowed: true, blocked: false, verdict: "allowed", rules: [] });
    vi.mocked(parseIpa).mockResolvedValue({
      sha256: "ipa-sha-256",
      metadata: {
        appName: "MyApp",
        bundleId: "com.example.myapp",
        version: "1.0",
        buildNumber: "100",
        minimumOSVersion: "17.0",
        supportsIndirectInputEvents: true,
        privacyUsageDescriptions: { NSCameraUsageDescription: "Camera access" },
        backgroundModes: [],
        requiredDeviceCapabilities: [],
        urlSchemes: [],
        urlTypes: [],
        queriesSchemes: [],
        exportCompliance: false,
        frameworks: [],
        xcodeVersion: null,
        xcodeBuild: null,
        sdkName: null,
        sdkBuild: null,
        platformVersion: null,
        atsConfig: null,
        sceneManifest: null,
        launchStoryboard: null,
        privacyManifest: null,
        frameworkDetails: [],
        provisioningType: null,
        teamId: null,
        provisioningExpiry: null,
        entitlements: {},
      },
    });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    dbSend.mockResolvedValue({});
    lambdaSend.mockResolvedValue({ StatusCode: 202 });
  });

  it("runs prompt-injection guard before charging paid credits", async () => {
    vi.mocked(guardInput).mockResolvedValue({ allowed: false, blocked: true, verdict: "blocked", rules: [] });

    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(400);
    expect(canUserScan).not.toHaveBeenCalled();
    expect(deductScanCredit).not.toHaveBeenCalled();
    expect(dbSend).not.toHaveBeenCalled();
    expect(lambdaSend).not.toHaveBeenCalled();
  });

  it("records charged scans and refunds atomically when Lambda invocation fails", async () => {
    lambdaSend.mockRejectedValueOnce(new Error("Lambda invoke failed"));

    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(500);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).not.toHaveBeenCalled();

    const putInput = getCommandInputs().find((input) => {
      const item = input.Item as Record<string, unknown> | undefined;
      return item?.scanId;
    });
    expect(putInput?.Item).toMatchObject({
      status: "pending",
      creditCharged: true,
      creditRefunded: false,
      isFreeScan: false,
      freeScanIpaHash: "ipa-sha-256",
      freeScanBundleId: "com.example.myapp",
    });

    const refundInput = getCommandInputs().find((input) => Array.isArray(input.TransactItems));
    expect(refundInput?.TransactItems).toHaveLength(2);
    expect(JSON.stringify(refundInput)).toContain("creditCharged = :true");
    expect(JSON.stringify(refundInput)).toContain("ADD scanCredits :one");
  });

  it("passes free-scan markers to Lambda without consuming them before success", async () => {
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Free scan available.",
      isPaidScan: false,
      isFreeScan: true,
      credits: 0,
      scanCount: 0,
    });

    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(200);
    expect(deductScanCredit).not.toHaveBeenCalled();
    expect(isAppFreeScanned).toHaveBeenCalledWith("ipa-sha-256", "com.example.myapp");

    const invokeInput = (lambdaSend.mock.calls[0][0] as { input: { Payload: Uint8Array } }).input;
    const payload = JSON.parse(Buffer.from(invokeInput.Payload).toString("utf8"));
    expect(payload).toMatchObject({
      isFreeScan: true,
      ipaHash: "ipa-sha-256",
      freeScanBundleId: "com.example.myapp",
    });
  });
});
