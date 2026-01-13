// =============================================================================
// RTR MRP - RATE LIMITER (Gate 5.2)
// Upstash Redis-based rate limiting for heavy endpoints
// =============================================================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (only if credentials available)
let redis: Redis | null = null;
let heavyEndpointLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Heavy endpoint limiter: 60 requests per minute
  heavyEndpointLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:heavy',
  });
}

/**
 * Extract identifier for rate limiting
 * Priority: userId (if authenticated) -> IP from x-forwarded-for
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Extract IP from x-forwarded-for (Render sets this)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP before comma
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return `ip:${firstIp}`;
    }
  }

  return 'ip:unknown';
}

/**
 * Check rate limit for heavy endpoints
 * Returns { success, limit, remaining, reset, retryAfter }
 */
export async function checkHeavyEndpointLimit(
  request: Request,
  userId?: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}> {
  // If Upstash not configured, allow all requests
  if (!heavyEndpointLimiter) {
    return { success: true, limit: 60, remaining: 60, reset: 0 };
  }

  const identifier = getRateLimitIdentifier(request, userId);
  const result = await heavyEndpointLimiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

export { heavyEndpointLimiter };
