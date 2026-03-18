import { describe, it, expect, beforeEach, vi } from "vitest";
import { RateLimiter, getClientIp } from "./rate-limit";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
  });

  it("allows requests under the limit", () => {
    expect(limiter.check("user1")).toEqual({ allowed: true });
    expect(limiter.check("user1")).toEqual({ allowed: true });
    expect(limiter.check("user1")).toEqual({ allowed: true });
  });

  it("blocks requests over the limit", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");
    const result = limiter.check("user1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("tracks keys independently", () => {
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);
    expect(limiter.check("user2").allowed).toBe(true);
  });

  it("resets after the time window", () => {
    vi.useFakeTimers();
    limiter.check("user1");
    limiter.check("user1");
    limiter.check("user1");
    expect(limiter.check("user1").allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(limiter.check("user1").allowed).toBe(true);
    vi.useRealTimers();
  });

  it("cleanup removes stale keys", () => {
    vi.useFakeTimers();
    limiter.check("user1");
    vi.advanceTimersByTime(1001);
    limiter.cleanup();
    // After cleanup, key should be gone — user gets full quota again
    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);
    expect(limiter.check("user1").allowed).toBe(true);
    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("returns unknown when no forwarded header", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });

  it("trims whitespace from IP", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "  10.0.0.1 , 10.0.0.2" },
    });
    expect(getClientIp(request)).toBe("10.0.0.1");
  });
});
