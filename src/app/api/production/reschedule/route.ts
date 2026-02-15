// src/app/api/production/reschedule/route.ts
// POST reschedule a work order with conflict detection

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  checkRescheduleConflicts,
  rescheduleWorkOrder,
} from '@/lib/production/schedule-conflict';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { workOrderId, startDate, endDate, force = false } = body;

  if (!workOrderId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

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
        error:
          error instanceof Error ? error.message : 'Reschedule failed',
      },
      { status: 500 }
    );
  }
}
