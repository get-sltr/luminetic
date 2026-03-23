import { describe, it, expect, vi, beforeEach } from "vitest";

// Only stub external services — AWS network calls
const dbSend = vi.hoisted(() => vi.fn());
const getSquareClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: { send: dbSend },
}));

vi.mock("@/lib/square", () => ({
  getSquareClient: (...args: unknown[]) => getSquareClientMock(...args),
}));

vi.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: class {
    send = vi.fn().mockResolvedValue({
      SecretString: JSON.stringify({ SQUARE_WEBHOOK_SIGNATURE_KEY: "test-webhook-key" }),
    });
  },
  GetSecretValueCommand: class {},
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  GetCommand: class {
    constructor(public input: unknown) {}
  },
  TransactWriteCommand: class {
    constructor(public input: unknown) {}
  },
}));

// Stub only the Square signature verification (network-dependent crypto)
vi.mock("square", () => ({
  WebhooksHelper: {
    verifySignature: vi.fn(),
  },
}));

import { POST } from "./route";
import { WebhooksHelper } from "square";
import { NextRequest } from "next/server";

// Get a handle on the real stubbed function
const verifySignature = vi.mocked(WebhooksHelper.verifySignature);

function makeWebhookRequest(body: Record<string, unknown>, signature = "valid-sig") {
  return new NextRequest("http://localhost/api/webhooks/square", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-square-hmacsha256-signature": signature,
      host: "luminetic.io",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify(body),
  });
}

function completedPaymentEvent(metadataOverrides: Record<string, unknown> = {}) {
  return {
    event_id: "evt-abc-123-def-456",
    type: "payment.created" as string,
    data: {
      object: {
        payment: {
          status: "COMPLETED",
          order: {
            metadata: {
              userId: "cognito-user-a1b2c3",
              packId: "starter",
              scans: "1",
              ...metadataOverrides,
            },
          },
        },
      },
    },
  };
}

describe("POST /api/webhooks/square", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifySignature.mockResolvedValue(true);
    dbSend.mockResolvedValue({ Item: undefined }); // event not yet processed
    getSquareClientMock.mockReset();
    getSquareClientMock.mockRejectedValue(
      new Error("getSquareClient should not run when webhook includes order metadata")
    );
  });

  // ── Signature verification ────────────────────────────────

  it("rejects requests with invalid HMAC signature", async () => {
    verifySignature.mockResolvedValue(false);
    const res = await POST(makeWebhookRequest(completedPaymentEvent()));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid signature.");
  });

  it("passes correct args to Square signature verification", async () => {
    verifySignature.mockResolvedValue(true);
    await POST(makeWebhookRequest(completedPaymentEvent(), "hmac-sha256-value"));

    expect(verifySignature).toHaveBeenCalledWith({
      requestBody: expect.any(String),
      signatureHeader: "hmac-sha256-value",
      signatureKey: "test-webhook-key",
      notificationUrl: "https://luminetic.io/api/webhooks/square",
    });
  });

  // ── Idempotency ───────────────────────────────────────────

  it("requires event_id for idempotency", async () => {
    const event = completedPaymentEvent();
    delete (event as Record<string, unknown>).event_id;
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing event_id.");
  });

  it("skips already-processed events and returns duplicate flag", async () => {
    dbSend.mockResolvedValueOnce({ Item: { PK: "WEBHOOK#evt-abc-123-def-456" } });
    const res = await POST(makeWebhookRequest(completedPaymentEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
  });

  // ── Payment status filtering ──────────────────────────────

  it("ignores non-completed payments (PENDING)", async () => {
    const event = {
      event_id: "evt-pending-001",
      type: "payment.created",
      data: { object: { payment: { status: "PENDING" } } },
    };
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    // Should only call DB once (idempotency check), NOT update user
    expect(dbSend).toHaveBeenCalledTimes(1);
  });

  it("ignores non-payment event types", async () => {
    const event = { event_id: "evt-other-001", type: "customer.created", data: { object: {} } };
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
  });

  // ── Credit granting ───────────────────────────────────────

  it("grants scan credits for completed starter payment", async () => {
    const res = await POST(makeWebhookRequest(completedPaymentEvent()));
    expect(res.status).toBe(200);
    // 2 DB calls: check idempotency → atomic transact write (credits + event marker)
    expect(dbSend).toHaveBeenCalledTimes(2);
  });

  it("grants scan credits for completed pro payment (3 scans)", async () => {
    const event = completedPaymentEvent({ packId: "pro", scans: "3" });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(dbSend).toHaveBeenCalledTimes(2);
  });

  it("grants scan credits for completed agency payment (10 scans)", async () => {
    const event = completedPaymentEvent({ packId: "agency", scans: "10" });
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(dbSend).toHaveBeenCalledTimes(2);
  });

  it("grants credits when webhook has only orderId (fetches Order metadata via Square API)", async () => {
    getSquareClientMock.mockResolvedValue({
      orders: {
        get: vi.fn().mockResolvedValue({
          order: {
            metadata: {
              userId: "cognito-user-a1b2c3",
              packId: "starter",
              scans: "1",
            },
          },
        }),
      },
    });
    const event = {
      event_id: "evt-order-fetch-001",
      type: "payment.created" as string,
      data: {
        object: {
          payment: {
            status: "COMPLETED",
            orderId: "order_test_abc",
          },
        },
      },
    };
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(getSquareClientMock).toHaveBeenCalled();
    expect(dbSend).toHaveBeenCalledTimes(2);
  });

  it("handles payment.updated event type the same as payment.created", async () => {
    const event = completedPaymentEvent();
    event.type = "payment.updated";
    const res = await POST(makeWebhookRequest(event));
    expect(res.status).toBe(200);
    expect(dbSend).toHaveBeenCalledTimes(2);
  });

  it("treats transaction conditional conflicts as duplicate events", async () => {
    dbSend
      .mockResolvedValueOnce({ Item: undefined })
      .mockRejectedValueOnce({
        name: "TransactionCanceledException",
        message: "ConditionalCheckFailed",
      });
    const res = await POST(makeWebhookRequest(completedPaymentEvent()));
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
  });

  // ── Metadata validation (guards against tampered webhooks) ─

  it("rejects scan count above max (10)", async () => {
    const res = await POST(makeWebhookRequest(completedPaymentEvent({ scans: "999" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("scan count");
  });

  it("rejects negative scan count", async () => {
    const res = await POST(makeWebhookRequest(completedPaymentEvent({ scans: "-1" })));
    expect(res.status).toBe(400);
  });

  it("rejects non-numeric scan count", async () => {
    const res = await POST(makeWebhookRequest(completedPaymentEvent({ scans: "abc" })));
    expect(res.status).toBe(400);
  });

  it("rejects zero scan count", async () => {
    const res = await POST(makeWebhookRequest(completedPaymentEvent({ scans: "0" })));
    expect(res.status).toBe(400);
  });

  it("rejects unknown packId", async () => {
    const res = await POST(makeWebhookRequest(completedPaymentEvent({ packId: "hacker_pack" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid pack");
  });

  it("accepts all valid packIds: starter, pro, agency", async () => {
    for (const packId of ["starter", "pro", "agency"]) {
      vi.clearAllMocks();
      verifySignature.mockResolvedValue(true);
      dbSend.mockResolvedValue({ Item: undefined });

      const res = await POST(makeWebhookRequest(completedPaymentEvent({ packId, scans: "1" })));
      expect(res.status).toBe(200);
    }
  });
});
