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
  runStaticAnalysis: vi.fn().mockReturnValue({ findings: [], metadata: null }),
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

const ipaMetadata = {
  appName: "Test App",
  bundleId: "com.example.test",
  version: "1.0",
  buildNumber: "1",
  minimumOSVersion: "17.0",
  privacyUsageDescriptions: {},
  backgroundModes: [],
  requiredDeviceCapabilities: [],
  urlSchemes: [],
  exportCompliance: false,
  frameworks: [],
  entitlements: {},
};

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

function ipaBody(overrides: Record<string, unknown> = {}) {
  return {
    s3Key: "ipa-uploads/user-1/app.ipa",
    synopsis: "This is a legitimate app synopsis.",
    ...overrides,
  };
}

describe("POST /api/analyze-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue({ userId: "user-1", email: "test@example.com", plan: "free" });
    vi.mocked(canUserScan).mockResolvedValue({
      allowed: true,
      reason: "Paid credit available.",
      isPaidScan: true,
      isFreeScan: false,
      credits: 1,
      scanCount: 1,
    });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue();
    vi.mocked(isAppFreeScanned).mockResolvedValue(false);
    vi.mocked(guardInput).mockResolvedValue({ allowed: true, blocked: false, verdict: "allowed", rules: [] });
    vi.mocked(parseIpa).mockResolvedValue({ metadata: ipaMetadata, sha256: "ipa-hash-1" });
    vi.mocked(analyzeLimiter.check).mockReturnValue({ allowed: true });
    dbSend.mockResolvedValue({});
    lambdaSend.mockResolvedValue({});
  });

  it("runs the prompt-injection guard before billing", async () => {
    vi.mocked(guardInput).mockResolvedValue({ allowed: false, blocked: true, verdict: "blocked", rules: [] });

    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(400);
    expect(canUserScan).not.toHaveBeenCalled();
    expect(deductScanCredit).not.toHaveBeenCalled();
  });

  it("refunds a paid credit when IPA parsing fails after deduction", async () => {
    vi.mocked(parseIpa).mockRejectedValue(new Error("bad ipa"));

    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(400);
    expect(deductScanCredit).toHaveBeenCalledWith("user-1");
    expect(refundScanCredit).toHaveBeenCalledWith("user-1");
  });

  it("refunds and marks the scan when Lambda invoke fails after the pending write", async () => {
    lambdaSend.mockRejectedValue(new Error("lambda unavailable"));

    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(500);
    expect(refundScanCredit).not.toHaveBeenCalled();
    const transactInputs = dbSend.mock.calls
      .map(([command]) => command.input)
      .filter((input): input is Record<string, unknown> => (
        typeof input === "object" && input !== null && "TransactItems" in input
      ));
    expect(JSON.stringify(transactInputs[0])).toContain("creditRefunded");
  });

  it("persists paid credit markers and passes them to Lambda on success", async () => {
    const res = await POST(makeRequest(ipaBody()));

    expect(res.status).toBe(200);
    const putInput = dbSend.mock.calls[0][0].input as { Item: Record<string, unknown> };
    expect(putInput.Item.creditCharged).toBe(true);
    expect(putInput.Item.creditRefunded).toBe(false);

    const invokeInput = lambdaSend.mock.calls[0][0].input as { Payload: Uint8Array };
    const payload = JSON.parse(Buffer.from(invokeInput.Payload).toString("utf8"));
    expect(payload.creditCharged).toBe(true);
    expect(payload.ipaHash).toBe("ipa-hash-1");
  });

  it("records free-scan metadata without consuming the duplicate marker before Lambda success", async () => {
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
    const putInput = dbSend.mock.calls[0][0].input as { Item: Record<string, unknown> };
    expect(putInput.Item.creditCharged).toBe(false);
    expect(putInput.Item.freeScan).toBe(true);
    expect(putInput.Item.ipaHash).toBe("ipa-hash-1");

    const invokeInput = lambdaSend.mock.calls[0][0].input as { Payload: Uint8Array };
    const payload = JSON.parse(Buffer.from(invokeInput.Payload).toString("utf8"));
    expect(payload.freeScan).toBe(true);
    expect(payload.ipaHash).toBe("ipa-hash-1");
  });
});
