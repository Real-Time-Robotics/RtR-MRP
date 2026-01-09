// =============================================================================
// RTR MRP - RATE LIMITER
// In-memory rate limiting (Redis disabled for Render compatibility)
// =============================================================================

interface RateLimitConfig {
  uniqueId: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, record] of entries) {
      if (now > record.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Cleanup every minute
}

export class RateLimiter {
  /**
   * Check if the action is allowed for the given ID.
   * Uses in-memory fixed window counter.
   */
  static async check(config: RateLimitConfig): Promise<RateLimitResult> {
    const { uniqueId, limit, windowSeconds } = config;
    const key = `ratelimit:${uniqueId}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let record = rateLimitStore.get(key);

    // Create new window if doesn't exist or expired
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, record);

      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.floor(record.resetAt / 1000),
      };
    }

    // Increment count
    record.count++;
    const remaining = Math.max(0, limit - record.count);
    const ttl = Math.floor((record.resetAt - now) / 1000);

    return {
      success: record.count <= limit,
      limit,
      remaining,
      reset: Math.floor(Date.now() / 1000) + ttl,
    };
  }

  /**
   * Reset rate limit for a specific ID
   */
  static async reset(uniqueId: string): Promise<void> {
    const key = `ratelimit:${uniqueId}`;
    rateLimitStore.delete(key);
  }

  /**
   * Get current usage for a specific ID
   */
  static async getUsage(uniqueId: string): Promise<{ count: number; resetAt: number } | null> {
    const key = `ratelimit:${uniqueId}`;
    const record = rateLimitStore.get(key);

    if (!record || Date.now() > record.resetAt) {
      return null;
    }

    return record;
  }
}

export default RateLimiter;
