import { NextRequest } from 'next/server';
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { runMrpCalculation } from "@/lib/mrp-engine";
import { logger } from "@/lib/logger";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const mrpBodySchema = z.object({
  planningHorizonDays: z.number().optional(),
  includeConfirmed: z.boolean().optional(),
  includeDraft: z.boolean().optional(),
  includeSafetyStock: z.boolean().optional(),
});

// ============================================================================
// MRP API - FIXED: Now runs synchronously (no Redis/BullMQ queue)
// Previously: Created "queued" record → Poll forever → Loading vô hạn
// Now: Runs calculation immediately → Returns "completed" → Works!
// ============================================================================

// In-memory rate limit (simple, no Redis)
const mrpRateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Auto-cleanup stuck runs (runs older than 10 minutes in running/queued status)
async function cleanupStuckRuns() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await prisma.mrpRun.updateMany({
      where: {
        status: { in: ['running', 'queued'] },
        runDate: { lt: tenMinutesAgo },
      },
      data: {
        status: 'failed',
      },
    });

    if (result.count > 0) {
      logger.info(`[MRP Cleanup] Marked ${result.count} stuck runs as failed`);
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'MRP Cleanup' });
  }
}

function checkMrpRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 3600 * 1000; // 1 hour
  const limit = 5;

  const record = mrpRateLimitMap.get(userId);

  if (!record || now > record.resetAt) {
    mrpRateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// GET - List MRP runs
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
// Auto-cleanup stuck runs on every request
    await cleanupStuckRuns();

    const runs = await prisma.mrpRun.findMany({
      orderBy: { runDate: "desc" },
      take: 20,
      include: {
        _count: {
          select: { suggestions: true },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mrp' });
    return NextResponse.json(
      { error: "Failed to fetch MRP runs" },
      { status: 500 }
    );
  }
});

// POST - Run new MRP calculation (Sync - no Redis queue)
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  // In-memory rate limit (no Redis)
  const rateLimit = checkMrpRateLimit(session.user.id || 'anonymous');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many MRP requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = mrpBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      planningHorizonDays = 90,
      includeConfirmed = true,
      includeDraft = false,
      includeSafetyStock = true,
    } = parseResult.data;

    // Run MRP calculation SYNCHRONOUSLY (no Redis/BullMQ queue)
    // This replaces the old queued approach that caused infinite loading
    logger.info("[MRP API] Starting synchronous MRP calculation...");

    const mrpRun = await runMrpCalculation({
      planningHorizonDays,
      includeConfirmed,
      includeDraft,
      includeSafetyStock,
    });

    logger.info("[MRP API] MRP calculation completed", { runId: mrpRun.id });

    // Fetch the full run with suggestions count
    const fullRun = await prisma.mrpRun.findUnique({
      where: { id: mrpRun.id },
      include: {
        _count: {
          select: { suggestions: true },
        },
      },
    });

    return NextResponse.json(fullRun);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/mrp' });
    return NextResponse.json(
      { error: "Failed to run MRP calculation" },
      { status: 500 }
    );
  }
});
