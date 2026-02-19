// src/app/api/reports/schedule/route.ts
// Report Schedule API - Manage scheduled report delivery

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import {
  createReportSchedule,
  updateReportSchedule,
  deleteReportSchedule,
  getUserSchedules,
} from '@/lib/reports/report-scheduler';
import { z } from 'zod';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// Validation schemas
const createScheduleSchema = z.object({
  name: z.string().min(1).max(200),
  templateId: z.string().min(1),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  format: z.enum(['PDF', 'EXCEL', 'BOTH']),
  recipients: z.array(z.string().email()).min(1),
  filters: z.record(z.string(), z.unknown()).optional(),
});

const updateScheduleSchema = z.object({
  scheduleId: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  format: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

// GET /api/reports/schedule - Get user's schedules
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const schedules = await getUserSchedules(session.user?.id || '');

    return NextResponse.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/reports/schedule' });
    return NextResponse.json(
      { error: 'Failed to get schedules' },
      { status: 500 }
    );
  }
});

// POST /api/reports/schedule - Create new schedule
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = createScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schedule = await createReportSchedule({
      ...parsed.data,
      userId: session.user?.id || '',
    });

    return NextResponse.json({
      success: true,
      data: schedule,
      message: 'Schedule created successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/reports/schedule' });
    return NextResponse.json(
      { error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
});

// PUT /api/reports/schedule - Update schedule
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = updateScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { scheduleId, ...updateData } = parsed.data;

    const schedule = await updateReportSchedule(
      scheduleId,
      updateData,
      session.user?.id || ''
    );

    return NextResponse.json({
      success: true,
      data: schedule,
      message: 'Schedule updated successfully',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/reports/schedule' });
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
});

// DELETE /api/reports/schedule - Delete schedule
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    await deleteReportSchedule(scheduleId, session.user?.id || '');

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/reports/schedule' });
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
});
