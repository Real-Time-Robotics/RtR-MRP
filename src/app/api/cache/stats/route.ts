// src/app/api/cache/stats/route.ts
// Cache statistics and management endpoint
// Note: Redis cache disabled - not available on Render free tier

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}

// POST - Clear cache (admin only)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}
