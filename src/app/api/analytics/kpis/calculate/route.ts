import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kpiService } from '@/lib/analytics';
import { z } from 'zod';

// =============================================================================
// KPIs CALCULATE API - BATCH CALCULATION
// =============================================================================

const calculateSchema = z.object({
  codes: z.array(z.string()).min(1).max(50),
  params: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
    includeTrend: z.boolean().optional(),
    trendPeriods: z.number().min(1).max(12).optional(),
    filters: z.record(z.any()).optional(),
  }).optional(),
});

// POST /api/analytics/kpis/calculate - Calculate multiple KPIs
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = calculateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { codes, params } = parsed.data;

    const calculationParams = {
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
      period: params?.period,
      includeTrend: params?.includeTrend,
      trendPeriods: params?.trendPeriods,
      filters: params?.filters,
    };

    const values = await kpiService.calculateKPIs(codes, calculationParams);

    return NextResponse.json({
      success: true,
      data: values,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate KPIs' },
      { status: 500 }
    );
  }
}
