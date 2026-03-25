import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/lib/cognito", () => ({
  signIn: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  putUser: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  setAuthCookies: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => {
  const limiter = { check: vi.fn().mockReturnValue({ allowed: true }) };
  return {
    authLimiter: limiter,
    getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  };
});

import { POST } from "./route";
import { signIn, getUser as getCognitoUser } from "@/lib/cognito";
import { putUser, getUser } from "@/lib/db";
import { setAuthCookies } from "@/lib/auth";
import { authLimiter } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authLimiter.check).mockReturnValue({ allowed: true });
    vi.mocked(getUser).mockResolvedValue({ scanCredits: 0 });
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "bad", password: "password12345" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 for short password", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(authLimiter.check).mockReturnValue({ allowed: false, retryAfterMs: 5000 });
    const res = await POST(makeRequest({ email: "test@test.com", password: "password12345" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("5");
  });

  it("returns 401 when Cognito returns no tokens", async () => {
    vi.mocked(signIn).mockResolvedValue({ AuthenticationResult: undefined, $metadata: {} });
    const res = await POST(makeRequest({ email: "test@test.com", password: "password12345" }));
    expect(res.status).toBe(401);
  });

  it("returns success with valid credentials", async () => {
    vi.mocked(signIn).mockResolvedValue({
      AuthenticationResult: {
        AccessToken: "access-123",
        RefreshToken: "refresh-abc",
      },
      $metadata: {},
    });
    vi.mocked(getCognitoUser).mockResolvedValue({ Username: "user-123" } as never);
    vi.mocked(putUser).mockResolvedValue(undefined);
    vi.mocked(getUser).mockResolvedValue({ scanCredits: 3 });

    const res = await POST(makeRequest({ email: "test@test.com", password: "password12345" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.credits).toBe(3);
    expect(setAuthCookies).toHaveBeenCalled();
    expect(putUser).toHaveBeenCalledWith("user-123", "test@test.com");
  });

  it("succeeds even if putUser throws (user already exists)", async () => {
    vi.mocked(signIn).mockResolvedValue({
      AuthenticationResult: {
        AccessToken: "access-123",
        RefreshToken: "refresh-abc",
      },
      $metadata: {},
    });
    vi.mocked(getCognitoUser).mockResolvedValue({ Username: "user-123" } as never);
    vi.mocked(putUser).mockRejectedValue(new Error("ConditionalCheckFailedException"));

    const res = await POST(makeRequest({ email: "test@test.com", password: "password12345" }));
    expect(res.status).toBe(200);
  });

  it("returns 401 for NotAuthorizedException from Cognito", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("NotAuthorizedException: Incorrect username or password"));
    const res = await POST(makeRequest({ email: "test@test.com", password: "password12345" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Incorrect email or password.");
  });
});
