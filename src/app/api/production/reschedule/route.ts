// src/app/api/production/reschedule/route.ts
// POST reschedule a work order with conflict detection

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import {
  checkRescheduleConflicts,
  rescheduleWorkOrder,
} from '@/lib/production/schedule-conflict';
import { z } from 'zod';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const RescheduleSchema = z.object({
  workOrderId: z.string().min(1, "Work order ID is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  force: z.boolean().default(false),
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const body = await request.json();

  const validation = RescheduleSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { workOrderId, startDate, endDate, force } = validation.data;

  try {
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    // Check conflicts first
    const conflicts = await checkRescheduleConflicts(
      workOrderId,
      newStart,
      newEnd
    );

    // If has conflicts and not forced, return conflicts for UI
    if (conflicts.hasConflict && !force) {
      return NextResponse.json({
        success: false,
        conflicts: conflicts.conflicts,
        canProceed: conflicts.canProceed,
      });
    }

    // Execute reschedule
    const result = await rescheduleWorkOrder(
      workOrderId,
      newStart,
      newEnd,
      force
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to reschedule work order',
      },
      { status: 500 }
    );
  }
});
