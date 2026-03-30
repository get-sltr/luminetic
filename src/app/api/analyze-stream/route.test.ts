import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const lambdaSendMock = vi.hoisted(() => vi.fn());
const dbSendMock = vi.hoisted(() => vi.fn());

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
    send = lambdaSendMock;
  },
  InvokeCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: dbSendMock }),
  },
  PutCommand: class {
    constructor(public input: unknown) {}
  },
  UpdateCommand: class {
    constructor(public input: unknown) {}
  },
}));

import { POST } from "./route";
import { verifyToken } from "@/lib/auth";
import {
  getUser,
  deductScanCredit,
  refundScanCredit,
} from "@/lib/db";
import { analyzeLimiter } from "@/lib/rate-limit";

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
    vi.mocked(getUser).mockResolvedValue({ plan: "free", scanCredits: 3, scanCount: 2 });
    vi.mocked(deductScanCredit).mockResolvedValue(true);
    vi.mocked(refundScanCredit).mockResolvedValue();
    dbSendMock.mockResolvedValue({});
    lambdaSendMock.mockResolvedValue({});
  });

  it("refunds credit when async lambda invocation fails", async () => {
    lambdaSendMock.mockRejectedValueOnce(new Error("Lambda unavailable"));

    const res = await POST(makeRequest({ feedback: "My app was rejected due to guideline issues in review." }));

    expect(res.status).toBe(503);
    expect(vi.mocked(refundScanCredit)).toHaveBeenCalledWith("user-1");
    const body = await res.json();
    expect(body.error).toContain("credit was not used");
  });

  it("keeps credit deducted when invocation succeeds", async () => {
    const res = await POST(makeRequest({ feedback: "My app was rejected due to guideline issues in review." }));

    expect(res.status).toBe(200);
    expect(vi.mocked(refundScanCredit)).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.status).toBe("pending");
    expect(typeof body.scanId).toBe("string");
  });
});
