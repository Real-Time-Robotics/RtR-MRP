import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { kpiService } from '@/lib/analytics';
import { KPICalculationParams } from '@/lib/analytics/types';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const calculateSchema = z.object({
  codes: z.array(z.string()).min(1),
  params: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    warehouseId: z.string().optional(),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
    includeTrend: z.boolean().optional(),
    trendPeriods: z.number().optional(),
  }).optional(),
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
const body = await request.json();
    const parsed = calculateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { codes, params } = parsed.data;
    const results = await kpiService.calculateKPIs(codes, params as KPICalculationParams);

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/analytics/kpis/calculate' });
    return NextResponse.json(
      { success: false, error: 'Failed to calculate KPIs' },
      { status: 500 }
    );
  }
});
