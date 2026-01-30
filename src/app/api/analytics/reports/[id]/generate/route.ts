import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reportService } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// =============================================================================
// REPORT GENERATE API
// =============================================================================

const generateSchema = z.object({
  format: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
  parameters: z.record(z.any()).optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    type: z.enum(['to', 'cc', 'bcc']).default('to'),
  })).optional(),
  sendEmail: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/analytics/reports/[id]/generate - Generate report
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

    if (!report.isPublic && report.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const instance = await reportService.generateReport({
      reportId,
      format: parsed.data.format,
      parameters: parsed.data.parameters,
      recipients: parsed.data.recipients,
      sendEmail: parsed.data.sendEmail,
    });

    return NextResponse.json({
      success: true,
      data: instance,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
