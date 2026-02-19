// =============================================================================
// MRP RUN API ROUTE
// POST /api/mrp/run - Submit MRP calculation to background job queue
// GET /api/mrp/run - Get MRP run history
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { jobQueue, JOB_NAMES } from "@/lib/jobs/job-queue";
import "@/lib/jobs/handlers"; // Ensure handlers are registered
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';

const mrpRunBodySchema = z.object({
  orderIds: z.array(z.string()).min(1),
  options: z.any().optional(),
});

// =============================================================================
// POST /api/mrp/run
// Submit MRP calculation to background job queue
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const rawBody = await request.json();
    const parseResult = mrpRunBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { orderIds, options } = parseResult.data;

    // Submit to background job queue with high priority
    const bgJob = jobQueue.add(
      JOB_NAMES.MRP_CALCULATION,
      { orderIds, options },
      2 // high priority
    );

    return NextResponse.json({
      success: true,
      backgroundJobId: bgJob.id,
      message: `MRP calculation queued for ${orderIds.length} order(s). Poll /api/jobs/${bgJob.id} for progress.`,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "POST /api/mrp/run" }
    );
    return NextResponse.json(
      { success: false, error: "MRP calculation failed" },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET /api/mrp/run
// Get MRP run history
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const runs = await prisma.mrpRun.findMany({
      take: limit,
      orderBy: { runDate: "desc" },
      include: {
        suggestions: {
          take: 5,
          include: {
            part: {
              select: {
                partNumber: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedRuns = runs.map((run) => ({
      runId: run.id,
      runNumber: run.runNumber,
      runDate: run.runDate.toISOString(),
      salesOrders: (run.parameters as Record<string, unknown>)?.orderIds || [],
      status: run.status === "completed" ? "Completed" : run.status,
      totalRequirements: run.totalParts || 0,
      criticalItems: run.expediteAlerts || 0,
      lowItems: run.shortageWarnings || 0,
      purchaseSuggestions: run.purchaseSuggestions || 0,
      totalPurchaseValue: run.suggestions.reduce(
        (sum, s) => sum + (s.estimatedCost || 0),
        0
      ),
      createdBy: run.createdBy || "System",
      completedAt: run.completedAt?.toISOString(),
    }));

    return NextResponse.json({ success: true, data: formattedRuns });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: "GET /api/mrp/run" }
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch MRP history" },
      { status: 500 }
    );
  }
});
