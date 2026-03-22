/**
 * In-memory sliding-window rate limiter.
 * Each instance tracks a specific action (e.g. "login", "analyze").
 * Requests are keyed by an identifier (IP, userId, etc.).
 *
 * NOTE: This is per-Lambda-instance. In a serverless environment each
 * cold start gets its own map, which is acceptable — it means limits
 * are slightly generous rather than slightly strict. For tighter
 * guarantees at scale, swap to a DynamoDB or ElastiCache backend.
 */

interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(opts: { maxRequests: number; windowMs: number }) {
    this.maxRequests = opts.maxRequests;
    this.windowMs = opts.windowMs;
  }

  /**
   * Returns { allowed: true } if under limit, or
   * { allowed: false, retryAfterMs } if over.
   */
  check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Drop timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldest = entry.timestamps[0]!;
      const retryAfterMs = oldest + this.windowMs - now;
      return { allowed: false, retryAfterMs };
    }

    entry.timestamps.push(now);
    return { allowed: true };
  }

  /** Periodic cleanup of stale keys to prevent memory leaks. */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) this.store.delete(key);
    }
  }
}

// ── Shared instances ────────────────────────────────────────

/** Auth endpoints: 10 attempts per 15 minutes per IP */
export const authLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
});

/** Analysis endpoints: 20 requests per hour per userId */
export const analyzeLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
});

/** Checkout: 5 requests per 10 minutes per userId */
export const checkoutLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 10 * 60 * 1000,
});

/** IPA presign + upload attempts: generous limit for a core flow (was sharing checkout limiter at 5/10m) */
export const uploadLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 15 * 60 * 1000,
});

// Cleanup every 5 minutes
setInterval(() => {
  authLimiter.cleanup();
  analyzeLimiter.cleanup();
  checkoutLimiter.cleanup();
  uploadLimiter.cleanup();
}, 5 * 60 * 1000).unref();

// ── Helper ──────────────────────────────────────────────────

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}
