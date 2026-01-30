import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reportService } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// =============================================================================
// REPORT SCHEDULE API
// =============================================================================

const scheduleSchema = z.object({
  name: z.string().max(100).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    type: z.enum(['to', 'cc', 'bcc']).default('to'),
  })).min(1),
  outputFormat: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
  parameters: z.record(z.any()).optional(),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(2000).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/analytics/reports/[id]/schedule - Get schedules for report
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: reportId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if report exists and user has access
    const report = await prisma.savedReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const schedules = await reportService.getSchedulesForReport(reportId);

    return NextResponse.json({
      success: true,
      data: schedules,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/reports/[id]/schedule - Create schedule
export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: reportId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if report exists and user owns it
    const report = await prisma.savedReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const schedule = await reportService.createSchedule(
      { reportId, ...parsed.data },
      session.user.id
    );

    return NextResponse.json({
      success: true,
      data: schedule,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
