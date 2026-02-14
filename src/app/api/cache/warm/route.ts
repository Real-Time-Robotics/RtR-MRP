// src/app/api/cache/warm/route.ts
// Cache warming API endpoint

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { warmAllCaches, warmCache } from "@/lib/cache/cache-warmer";
import { logger } from '@/lib/logger';

// POST - Trigger cache warming
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { type } = body as { type?: string };

    // Warm specific cache or all caches
    if (type && ["dashboard", "workOrders", "salesOrders", "parts", "suppliers"].includes(type)) {
      const result = await warmCache(type as "dashboard" | "workOrders" | "salesOrders" | "parts" | "suppliers");
      return NextResponse.json({
        success: result.success,
        result,
      });
    }

    // Warm all caches
    const report = await warmAllCaches();

    return NextResponse.json({
      success: report.summary.failed === 0,
      report,
    });
  } catch (error) {
    logger.error('Cache warming error', { context: 'POST /api/cache/warm', details: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to warm cache" },
      { status: 500 }
    );
  }
}
