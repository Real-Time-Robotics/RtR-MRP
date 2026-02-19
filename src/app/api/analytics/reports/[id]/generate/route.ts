import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { reportService } from '@/lib/analytics';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const generateSchema = z.object({
  format: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
  params: z.record(z.string(), z.any()).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { format, params } = parsed.data;
    const instance = await reportService.generateReport({
      reportId: id,
      format,
      parameters: params || {},
    });

    return NextResponse.json({
      success: true,
      data: instance,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/analytics/reports/[id]/generate' });
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
});
