// src/lib/security/rate-limiter.ts
// Rate limiting utility for RTR MRP System

import { redis } from "@/lib/cache/redis";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/monitoring/logger";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    windowMs = 60000, // 1 minute default
    maxRequests = 100, // 100 requests default
    keyPrefix = "rl",
  } = config;

  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set for sliding window
    const multi = redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Count requests in window
    multi.zcard(key);

    // Set expiry
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();
    const requestCount = (results?.[2]?.[1] as number) || 0;

    const allowed = requestCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - requestCount);
    const resetTime = now + windowMs;

    if (!allowed) {
      logger.security({
        type: 'rate_limited',
        ip: identifier,
        details: `Request count: ${requestCount}/${maxRequests}`,
      });
    }

    return { allowed, remaining, resetTime, limit: maxRequests };
  } catch (error) {
    // On error, allow request but log
    const err = error as Error;
    logger.error("Rate limit check failed", { error: err.message, stack: err.stack });
    return { allowed: true, remaining: maxRequests, resetTime: now + windowMs, limit: maxRequests };
  }
}

// Middleware helper
export async function rateLimitMiddleware(
  req: NextRequest,
  config?: Partial<RateLimitConfig>
): Promise<NextResponse | null> {
  // Get identifier (IP or user ID)
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  const identifier = `ip:${ip}`;

  const defaultConfig: RateLimitConfig = {
    windowMs: 60000,
    maxRequests: 100,
    ...config,
  };

  const result = await rateLimit(identifier, defaultConfig);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.resetTime.toString(),
          "Retry-After": Math.ceil(
            (result.resetTime - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  return null;
}

// API route rate limiting configurations
export const rateLimitConfigs = {
  // General API endpoints
  api: { windowMs: 60000, maxRequests: 100 },

  // Auth endpoints (stricter)
  auth: { windowMs: 60000, maxRequests: 10 },

  // Login specifically (very strict)
  login: { windowMs: 300000, maxRequests: 5 },

  // Export/heavy operations
  export: { windowMs: 60000, maxRequests: 5 },

  // AI/ML endpoints
  ai: { windowMs: 60000, maxRequests: 20 },

  // Dashboard (frequently polled)
  dashboard: { windowMs: 60000, maxRequests: 60 },

  // List endpoints (paginated)
  list: { windowMs: 60000, maxRequests: 120 },

  // Write operations
  write: { windowMs: 60000, maxRequests: 30 },
};

// ============================================
// GRACEFUL DEGRADATION
// ============================================

interface DegradationConfig {
  enabled: boolean;
  thresholds: {
    warning: number; // % of rate limit used
    critical: number; // % of rate limit used
  };
  actions: {
    warning: () => void;
    critical: () => void;
  };
}

const defaultDegradationConfig: DegradationConfig = {
  enabled: true,
  thresholds: {
    warning: 70,
    critical: 90,
  },
  actions: {
    warning: () => {
      logger.warn("Rate limit warning threshold reached");
    },
    critical: () => {
      logger.error("Rate limit critical threshold reached");
    },
  },
};

export async function rateLimitWithDegradation(
  identifier: string,
  config: RateLimitConfig,
  degradation: Partial<DegradationConfig> = {}
): Promise<RateLimitResult & { degradationLevel: "normal" | "warning" | "critical" }> {
  const result = await rateLimit(identifier, config);
  const degradationConfig = { ...defaultDegradationConfig, ...degradation };

  const usagePercent = ((config.maxRequests - result.remaining) / config.maxRequests) * 100;
  let degradationLevel: "normal" | "warning" | "critical" = "normal";

  if (degradationConfig.enabled) {
    if (usagePercent >= degradationConfig.thresholds.critical) {
      degradationLevel = "critical";
      degradationConfig.actions.critical();
    } else if (usagePercent >= degradationConfig.thresholds.warning) {
      degradationLevel = "warning";
      degradationConfig.actions.warning();
    }
  }

  return { ...result, degradationLevel };
}

// Higher-order function for API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<RateLimitConfig>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimitMiddleware(req, config);
    if (rateLimitResponse) return rateLimitResponse;
    return handler(req);
  };
}
