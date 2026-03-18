import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cognito", () => ({
  signUp: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return {
    authLimiter: limiter,
    getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  };
});

import { POST } from "./route";
import { signUp } from "@/lib/cognito";
import { authLimiter } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authLimiter.check).mockReturnValue({ allowed: true });
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "notanemail", password: "ValidPass123!!" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for short password (under 12 chars)", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", password: "Short1!" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(authLimiter.check).mockReturnValue({ allowed: false, retryAfterMs: 3000 });
    const res = await POST(makeRequest({ email: "test@test.com", password: "ValidPass123!!" }));
    expect(res.status).toBe(429);
  });

  it("returns success on valid signup", async () => {
    vi.mocked(signUp).mockResolvedValue({ $metadata: {}, UserConfirmed: false, UserSub: "sub-1" });
    const res = await POST(makeRequest({ email: "test@test.com", password: "ValidPass123!!" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("Verification");
  });

  it("returns friendly error for existing user", async () => {
    vi.mocked(signUp).mockRejectedValue(new Error("UsernameExistsException: An account with the given email already exists."));
    const res = await POST(makeRequest({ email: "test@test.com", password: "ValidPass123!!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("already exists");
  });

  it("returns friendly error for weak password", async () => {
    vi.mocked(signUp).mockRejectedValue(new Error("InvalidPasswordException: Password did not conform with policy"));
    const res = await POST(makeRequest({ email: "test@test.com", password: "ValidPass123!!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("requirements");
  });

  it("does not leak Cognito error details", async () => {
    vi.mocked(signUp).mockRejectedValue(new Error("InternalErrorException: something went wrong in AWS"));
    const res = await POST(makeRequest({ email: "test@test.com", password: "ValidPass123!!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).not.toContain("InternalErrorException");
    expect(data.error).not.toContain("AWS");
  });
});
