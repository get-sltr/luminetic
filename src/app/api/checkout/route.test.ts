import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/square", () => ({
  getSquareClient: vi.fn(),
  SQUARE_LOCATION_ID: "TEST_LOCATION",
  SCAN_PACKS: [
    { id: "starter", name: "Starter", scans: 1, priceInCents: 1500 },
    { id: "pro", name: "Pro", scans: 3, priceInCents: 4000 },
    { id: "agency", name: "Agency", scans: 10, priceInCents: 14900 },
  ],
}));

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return { checkoutLimiter: limiter };
});

vi.mock("crypto", () => ({
  randomUUID: () => "test-uuid-1234",
}));

import { POST } from "./route";
import { getAuthUser } from "@/lib/auth";
import { getSquareClient } from "@/lib/square";
import { checkoutLimiter } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(body: unknown, origin = "https://luminetic.io") {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  const mockSquareClient = {
    checkout: {
      paymentLinks: {
        create: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUser).mockResolvedValue({ userId: "user-1", email: "test@test.com", plan: "free" });
    vi.mocked(getSquareClient).mockResolvedValue(mockSquareClient as never);
    vi.mocked(checkoutLimiter.check).mockReturnValue({ allowed: true });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null);
    const res = await POST(makeRequest({ packId: "starter" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkoutLimiter.check).mockReturnValue({ allowed: false, retryAfterMs: 6000 });
    const res = await POST(makeRequest({ packId: "starter" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid pack ID", async () => {
    const res = await POST(makeRequest({ packId: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns checkout URL for valid starter pack", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockResolvedValue({
      paymentLink: { url: "https://square.link/test-checkout" },
    });

    const res = await POST(makeRequest({ packId: "starter" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://square.link/test-checkout");
  });

  it("returns checkout URL for valid pro pack", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockResolvedValue({
      paymentLink: { url: "https://square.link/pro-checkout" },
    });

    const res = await POST(makeRequest({ packId: "pro" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://square.link/pro-checkout");
  });

  it("returns checkout URL for valid agency pack", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockResolvedValue({
      paymentLink: { url: "https://square.link/agency-checkout" },
    });

    const res = await POST(makeRequest({ packId: "agency" }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when Square returns no URL", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockResolvedValue({
      paymentLink: { url: undefined },
    });

    const res = await POST(makeRequest({ packId: "starter" }));
    expect(res.status).toBe(500);
  });

  it("passes correct metadata to Square", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockResolvedValue({
      paymentLink: { url: "https://square.link/test" },
    });

    await POST(makeRequest({ packId: "pro" }));

    const callArgs = mockSquareClient.checkout.paymentLinks.create.mock.calls[0][0];
    expect(callArgs.order.metadata.userId).toBe("user-1");
    expect(callArgs.order.metadata.packId).toBe("pro");
    expect(callArgs.order.metadata.scans).toBe("3");
  });

  it("uses luminetic.io as default origin for unknown origins", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockResolvedValue({
      paymentLink: { url: "https://square.link/test" },
    });

    await POST(makeRequest({ packId: "starter" }, "https://evil.com"));

    const callArgs = mockSquareClient.checkout.paymentLinks.create.mock.calls[0][0];
    expect(callArgs.checkoutOptions.redirectUrl).toContain("luminetic.io");
  });

  it("returns 500 when Square API throws", async () => {
    mockSquareClient.checkout.paymentLinks.create.mockRejectedValue(new Error("Square API error"));
    const res = await POST(makeRequest({ packId: "starter" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).not.toContain("Square API");
  });
});
