// =============================================================================
// RTR MRP - RATE LIMITER (Gate 5.2)
// Upstash Redis-based rate limiting for heavy endpoints
// =============================================================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if running in test environment
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' ||
         process.env.PLAYWRIGHT_TEST === 'true' ||
         process.env.E2E_TEST === 'true' ||
         process.env.SKIP_RATE_LIMIT === 'true';
}

// Initialize Redis client (only if credentials available and NOT in test mode)
let redis: Redis | null = null;
let heavyEndpointLimiter: Ratelimit | null = null;
let writeEndpointLimiter: Ratelimit | null = null;
let readEndpointLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Redis configured - initialize rate limiters
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Heavy endpoint limiter: 60 requests per minute (AI, OCR, import)
  heavyEndpointLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit:heavy',
  });

  // Write endpoint limiter: 120 requests per minute (auth, create, update)
  writeEndpointLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    analytics: true,
    prefix: 'ratelimit:write',
  });

  // Read endpoint limiter: 300 requests per minute (list, get)
  readEndpointLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'),
    analytics: true,
    prefix: 'ratelimit:read',
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
  // Skip rate limiting in test environment
  if (isTestEnvironment()) {
    return { success: true, limit: 9999, remaining: 9999, reset: 0 };
  }

  // If Upstash not configured, allow with warning
  if (!heavyEndpointLimiter) {
    if (!isTestEnvironment()) {
      console.warn('[rate-limit] Upstash Redis not configured - rate limiting disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    }
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

/**
 * Check rate limit for write endpoints (auth, create, update operations)
 * Returns null if allowed, or a 429 NextResponse if rate limited
 */
export async function checkWriteEndpointLimit(
  request: Request,
  userId?: string
): Promise<Response | null> {
  // Skip rate limiting in test environment
  if (isTestEnvironment()) {
    return null;
  }

  // If Upstash not configured, allow with warning
  if (!writeEndpointLimiter) {
    if (!isTestEnvironment()) {
      console.warn('[rate-limit] Upstash Redis not configured - write rate limiting disabled.');
    }
    return null;
  }

  const identifier = getRateLimitIdentifier(request, userId);
  const result = await writeEndpointLimiter.limit(identifier);

  if (result.success) {
    return null;
  }

  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter || 60),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

/**
 * Check rate limit for read endpoints (list, get operations)
 * Returns null if allowed, or a 429 Response if rate limited
 */
export async function checkReadEndpointLimit(
  request: Request,
  userId?: string
): Promise<Response | null> {
  // Skip rate limiting in test environment
  if (isTestEnvironment()) {
    return null;
  }

  // If Upstash not configured, allow with warning
  if (!readEndpointLimiter) {
    if (!isTestEnvironment()) {
      console.warn('[rate-limit] Upstash Redis not configured - read rate limiting disabled.');
    }
    return null;
  }

  const identifier = getRateLimitIdentifier(request, userId);
  const result = await readEndpointLimiter.limit(identifier);

  if (result.success) {
    return null;
  }

  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter || 60),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

export { heavyEndpointLimiter, writeEndpointLimiter, readEndpointLimiter };
