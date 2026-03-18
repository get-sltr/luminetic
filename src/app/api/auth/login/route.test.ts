import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/lib/cognito", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  putUser: vi.fn(),
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
import { signIn } from "@/lib/cognito";
import { putUser } from "@/lib/db";
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

// Create a fake JWT with a sub claim
function fakeAccessToken(sub: string) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.fakesig`;
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authLimiter.check).mockReturnValue({ allowed: true });
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "bad", password: "password123" }));
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
    const res = await POST(makeRequest({ email: "test@test.com", password: "password123" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("5");
  });

  it("returns 401 when Cognito returns no tokens", async () => {
    vi.mocked(signIn).mockResolvedValue({ AuthenticationResult: undefined, $metadata: {} });
    const res = await POST(makeRequest({ email: "test@test.com", password: "password123" }));
    expect(res.status).toBe(401);
  });

  it("returns success with valid credentials", async () => {
    const token = fakeAccessToken("user-123");
    vi.mocked(signIn).mockResolvedValue({
      AuthenticationResult: {
        AccessToken: token,
        RefreshToken: "refresh-abc",
      },
      $metadata: {},
    });
    vi.mocked(putUser).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ email: "test@test.com", password: "password123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(setAuthCookies).toHaveBeenCalled();
    expect(putUser).toHaveBeenCalledWith("user-123", "test@test.com");
  });

  it("succeeds even if putUser throws (user already exists)", async () => {
    const token = fakeAccessToken("user-123");
    vi.mocked(signIn).mockResolvedValue({
      AuthenticationResult: {
        AccessToken: token,
        RefreshToken: "refresh-abc",
      },
      $metadata: {},
    });
    vi.mocked(putUser).mockRejectedValue(new Error("ConditionalCheckFailedException"));

    const res = await POST(makeRequest({ email: "test@test.com", password: "password123" }));
    expect(res.status).toBe(200);
  });

  it("returns 401 for NotAuthorizedException from Cognito", async () => {
    vi.mocked(signIn).mockRejectedValue(new Error("NotAuthorizedException: Incorrect username or password"));
    const res = await POST(makeRequest({ email: "test@test.com", password: "password123" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Incorrect email or password.");
  });
});
