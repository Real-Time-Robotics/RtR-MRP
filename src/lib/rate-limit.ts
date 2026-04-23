// =============================================================================
// RTR MRP - RATE LIMITER (TIP-05)
// rate-limiter-flexible backend:
//   - RateLimiterRedis when REDIS_URL is present (shares ioredis connection with BullMQ)
//   - RateLimiterMemory fallback in dev
//   - Production fails fast at import time when NODE_ENV=production and no Redis
//
// Exposes prom-client counter rtr_mrp_rate_limit_exceeded_total{tier,backend}.
//
// Public API is unchanged vs. the previous Upstash-based module so the 240+
// route callers don't need to be touched:
//   - getRateLimitIdentifier, getIpIdentifier
//   - checkHeavyEndpointLimit, checkWriteEndpointLimit, checkReadEndpointLimit
//   - checkSigninLimit, checkStrictAuthLimit
// =============================================================================

import { RateLimiterMemory, RateLimiterRedis, type RateLimiterAbstract } from 'rate-limiter-flexible';
import IORedis, { type RedisOptions } from 'ioredis';
import { logger } from '@/lib/logger';
import { rateLimitExceededTotal } from '@/lib/monitoring/metrics';

// =============================================================================
// ENVIRONMENT CHECKS
// =============================================================================

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.PLAYWRIGHT_TEST === 'true' ||
    process.env.E2E_TEST === 'true' ||
    process.env.SKIP_RATE_LIMIT === 'true'
  );
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getRedisUrl(): string | null {
  return process.env.REDIS_URL || null;
}

// =============================================================================
// REDIS CONNECTION
// A dedicated IORedis instance with the options rate-limiter-flexible prefers:
//   - enableOfflineQueue: false so buffered commands don't pile up
//   - maxRetriesPerRequest: 3 — same as cache connection (NOT null)
// =============================================================================

let redisClient: IORedis | null = null;

const RATE_LIMIT_REDIS_OPTIONS: RedisOptions = {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 5000,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
};

function getRedisClient(): IORedis | null {
  if (redisClient) return redisClient;
  const url = getRedisUrl();
  if (!url) return null;
  try {
    redisClient = new IORedis(url, RATE_LIMIT_REDIS_OPTIONS);
    redisClient.on('connect', () => logger.info('[RATE-LIMIT] Redis connected'));
    redisClient.on('error', (err) => {
      logger.warn('[RATE-LIMIT] Redis error', { error: err.message });
    });
    redisClient.connect().catch(() => {
      logger.warn('[RATE-LIMIT] Redis connect failed — falling back to in-memory');
    });
    return redisClient;
  } catch (err) {
    logger.warn('[RATE-LIMIT] Failed to create Redis client', {
      error: (err as Error).message,
    });
    return null;
  }
}

// =============================================================================
// PRODUCTION FAIL-FAST
// We do NOT want a production node to silently fall back to the in-memory
// limiter. In-memory rate limiting is useless under a multi-instance deploy —
// each instance sees its own bucket and a malicious caller can just spray.
// So: if NODE_ENV=production and no REDIS_URL, throw at module init.
// =============================================================================

if (isProduction() && !getRedisUrl() && !isTestEnvironment()) {
  // Throwing from a module-level statement crashes the process on boot. That's
  // the intended behaviour — the orchestrator should restart / alert.
  throw new Error(
    '[RATE-LIMIT] FATAL: NODE_ENV=production but REDIS_URL is not set. ' +
      'Refusing to boot with in-memory rate limiting. ' +
      'Set REDIS_URL or SKIP_RATE_LIMIT=true (not recommended).'
  );
}

// =============================================================================
// LIMITER FACTORY
// =============================================================================

type Tier = 'heavy' | 'write' | 'read' | 'signin' | 'strict-auth';

interface LimiterSpec {
  /** Identifier prefix in Redis; also the `tier` label in metrics. */
  tier: Tier;
  /** Max points per window. */
  points: number;
  /** Window in seconds. */
  duration: number;
}

const LIMITER_SPECS: Record<Tier, LimiterSpec> = {
  heavy: { tier: 'heavy', points: 60, duration: 60 }, // 60 req/min
  write: { tier: 'write', points: 120, duration: 60 }, // 120 req/min
  read: { tier: 'read', points: 300, duration: 60 }, // 300 req/min
  signin: { tier: 'signin', points: 5, duration: 60 }, // 5 req/min per IP
  'strict-auth': { tier: 'strict-auth', points: 3, duration: 60 }, // 3 req/min per IP
};

function makeLimiter(spec: LimiterSpec): RateLimiterAbstract {
  const redis = getRedisClient();
  if (redis) {
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${spec.tier}`,
      points: spec.points,
      duration: spec.duration,
      // If Redis is unreachable mid-request, fall back to "allow" — better to
      // let requests through than to 500 the whole API. The error is logged.
      insuranceLimiter: new RateLimiterMemory({
        keyPrefix: `rl:${spec.tier}:insurance`,
        points: spec.points,
        duration: spec.duration,
      }),
    });
  }
  // Dev / test path.
  return new RateLimiterMemory({
    keyPrefix: `rl:${spec.tier}`,
    points: spec.points,
    duration: spec.duration,
  });
}

const limiters: Record<Tier, RateLimiterAbstract> = {
  heavy: makeLimiter(LIMITER_SPECS.heavy),
  write: makeLimiter(LIMITER_SPECS.write),
  read: makeLimiter(LIMITER_SPECS.read),
  signin: makeLimiter(LIMITER_SPECS.signin),
  'strict-auth': makeLimiter(LIMITER_SPECS['strict-auth']),
};

function getBackendLabel(): 'redis' | 'memory' {
  return getRedisClient() ? 'redis' : 'memory';
}

// =============================================================================
// IDENTIFIER EXTRACTION (unchanged)
// =============================================================================

export function getRateLimitIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return `ip:${firstIp}`;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return `ip:${realIp}`;

  return 'ip:127.0.0.1';
}

export function getIpIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return `ip:${firstIp}`;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return `ip:${realIp}`;

  return 'ip:127.0.0.1';
}

// =============================================================================
// CORE CONSUME + 429 RESPONSE
// =============================================================================

interface CheckResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms when the token resets
  retryAfter?: number; // seconds
}

async function consume(tier: Tier, key: string): Promise<CheckResult> {
  const spec = LIMITER_SPECS[tier];
  const limiter = limiters[tier];
  try {
    const res = await limiter.consume(key, 1);
    return {
      success: true,
      limit: spec.points,
      remaining: res.remainingPoints,
      reset: Date.now() + res.msBeforeNext,
    };
  } catch (err) {
    // rate-limiter-flexible throws a RateLimiterRes on 429 (not a real Error).
    const rateRes = err as { remainingPoints?: number; msBeforeNext?: number };
    if (typeof rateRes?.msBeforeNext === 'number') {
      rateLimitExceededTotal.inc({ tier, backend: getBackendLabel() });
      return {
        success: false,
        limit: spec.points,
        remaining: rateRes.remainingPoints ?? 0,
        reset: Date.now() + rateRes.msBeforeNext,
        retryAfter: Math.max(1, Math.ceil(rateRes.msBeforeNext / 1000)),
      };
    }
    // Real error (Redis down AND insurance limiter also failed). Fail-open.
    logger.logError(err as Error, { context: 'rate-limit', tier, key });
    return {
      success: true,
      limit: spec.points,
      remaining: spec.points,
      reset: Date.now() + spec.duration * 1000,
    };
  }
}

function build429Response(result: {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}): Response {
  const retryAfter = result.retryAfter ?? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Heavy endpoints (AI, OCR, import): 60 req/min.
 * Returns { success, limit, remaining, reset, retryAfter? }.
 */
export async function checkHeavyEndpointLimit(
  request: Request,
  userId?: string
): Promise<CheckResult> {
  if (isTestEnvironment()) {
    return { success: true, limit: 9999, remaining: 9999, reset: 0 };
  }
  const identifier = getRateLimitIdentifier(request, userId);
  return consume('heavy', identifier);
}

/**
 * Write endpoints (create/update): 120 req/min.
 * Returns null if allowed, or a 429 Response if rate limited.
 */
export async function checkWriteEndpointLimit(
  request: Request,
  userId?: string
): Promise<Response | null> {
  if (isTestEnvironment()) return null;
  const result = await consume('write', getRateLimitIdentifier(request, userId));
  return result.success ? null : build429Response(result);
}

/**
 * Read endpoints (list/get): 300 req/min.
 * Returns null if allowed, or a 429 Response if rate limited.
 */
export async function checkReadEndpointLimit(
  request: Request,
  userId?: string
): Promise<Response | null> {
  if (isTestEnvironment()) return null;
  const result = await consume('read', getRateLimitIdentifier(request, userId));
  return result.success ? null : build429Response(result);
}

/**
 * Auth signin: 5 req/min per IP (IP-only identifier).
 */
export async function checkSigninLimit(request: Request): Promise<Response | null> {
  if (isTestEnvironment()) return null;
  const result = await consume('signin', `signin:${getIpIdentifier(request)}`);
  return result.success ? null : build429Response(result);
}

/**
 * Signup / forgot-password: 3 req/min per IP.
 */
export async function checkStrictAuthLimit(request: Request): Promise<Response | null> {
  if (isTestEnvironment()) return null;
  const result = await consume('strict-auth', `strict-auth:${getIpIdentifier(request)}`);
  return result.success ? null : build429Response(result);
}

// =============================================================================
// SHUTDOWN
// =============================================================================

export async function closeRateLimitConnection(): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }
  redisClient = null;
}

// =============================================================================
// LEGACY EXPORTS (kept for backward compatibility with code that previously
// imported these names from the Upstash-based module)
// =============================================================================

/** @deprecated Use the check* functions above. Kept for backward compatibility. */
export const heavyEndpointLimiter = limiters.heavy;
/** @deprecated Use the check* functions above. Kept for backward compatibility. */
export const writeEndpointLimiter = limiters.write;
/** @deprecated Use the check* functions above. Kept for backward compatibility. */
export const readEndpointLimiter = limiters.read;

/**
 * @deprecated Only used by tests that mocked the old in-memory helper.
 * Returns a pure in-memory rate limiter with the same `check(token)` shape
 * as the legacy helper so existing tests keep passing.
 */
export function createInMemoryLimiter(config: {
  limit: number;
  windowMs: number;
  maxTokens?: number;
}) {
  const mem = new RateLimiterMemory({
    points: config.limit,
    duration: Math.ceil(config.windowMs / 1000),
  });

  return {
    async check(token: string) {
      try {
        const res = await mem.consume(token, 1);
        return {
          success: true,
          limit: config.limit,
          remaining: res.remainingPoints,
          reset: Date.now() + res.msBeforeNext,
        };
      } catch (err) {
        const r = err as { remainingPoints?: number; msBeforeNext?: number };
        return {
          success: false,
          limit: config.limit,
          remaining: r.remainingPoints ?? 0,
          reset: Date.now() + (r.msBeforeNext ?? config.windowMs),
        };
      }
    },
    reset(token: string) {
      void mem.delete(token);
    },
  };
}
