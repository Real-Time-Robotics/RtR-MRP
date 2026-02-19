import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { reportService } from '@/lib/analytics';
import { ReportScheduleCreateInput } from '@/lib/analytics/types';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
const scheduleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })),
  outputFormat: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const schedules = await reportService.getSchedulesForReport(id);

    return NextResponse.json({
      success: true,
      data: schedules,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/reports/[id]/schedule' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const schedule = await reportService.createSchedule(
      { reportId: id, ...parsed.data } as ReportScheduleCreateInput,
      'demo-user'
    );

    return NextResponse.json({
      success: true,
      data: schedule,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/analytics/reports/[id]/schedule' });
    return NextResponse.json(
      { success: false, error: 'Failed to schedule report' },
      { status: 500 }
    );
  }
});
