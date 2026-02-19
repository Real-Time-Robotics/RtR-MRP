// src/app/api/cache/warm/route.ts
// Cache warming API endpoint

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { warmAllCaches, warmCache } from "@/lib/cache/cache-warmer";
import { logger } from '@/lib/logger';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

// POST - Trigger cache warming
export const POST = withAuth(async (request, context, session) => {
  // Rate limiting (heavy endpoint - cache warming is resource-intensive)
  const rateLimitCheck = await checkHeavyEndpointLimit(request);
  if (!rateLimitCheck.success) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitCheck.retryAfter || 60),
          'X-RateLimit-Limit': String(rateLimitCheck.limit),
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
          'X-RateLimit-Reset': String(rateLimitCheck.reset),
        },
      }
    );
  }

  try {
const bodySchema = z.object({
      type: z.string().optional(),
    });

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { type } = parseResult.data;

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
});
