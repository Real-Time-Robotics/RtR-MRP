import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { autoScheduleAll, scheduleWorkOrder } from "@/lib/production/scheduling-engine";
import { z } from "zod";

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
const AutoScheduleSchema = z.object({
  workOrderId: z.string().min(1).optional(),
  startDate: z.string().optional(),
  priority: z.number().int().optional(),
  workCenterIds: z.array(z.string()).optional(),
});

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
    const body = await request.json();

    const validation = AutoScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.workOrderId) {
      // Schedule single work order
      const result = await scheduleWorkOrder({
        workOrderId: data.workOrderId,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        priority: data.priority,
      });

      return NextResponse.json(result);
    }

    // Auto-schedule all
    const result = await autoScheduleAll({
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      workCenterIds: data.workCenterIds,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/production/scheduler/auto-schedule' });
    return NextResponse.json(
      { error: "Failed to auto-schedule" },
      { status: 500 }
    );
  }
});
