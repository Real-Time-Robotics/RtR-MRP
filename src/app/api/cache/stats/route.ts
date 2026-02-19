// src/app/api/cache/stats/route.ts
// Cache statistics and management endpoint
// Note: Redis cache disabled - not available on Render free tier

import { NextResponse } from "next/server";
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

export const GET = withAuth(async (request, context, session) => {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
// Redis cache disabled - return placeholder stats
    return NextResponse.json({
      success: true,
      stats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        enabled: false,
        message: "Redis cache disabled - not available on Render free tier",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Cache stats error', { context: 'GET /api/cache/stats', details: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500 }
    );
  }
});

// POST - Clear cache (admin only)
export const POST = withAuth(async (request, context, session) => {
  // Rate limiting
  const writeRateLimitResult = await checkWriteEndpointLimit(request);
  if (writeRateLimitResult) return writeRateLimitResult;

  try {
// Redis cache disabled - no-op
    return NextResponse.json({
      success: true,
      message: "Cache management disabled - Redis not available on Render free tier"
    });
  } catch (error) {
    logger.error('Cache management error', { context: 'POST /api/cache/stats', details: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to manage cache" },
      { status: 500 }
    );
  }
});
