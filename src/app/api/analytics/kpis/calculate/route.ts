import { NextRequest, NextResponse } from 'next/server';
import { kpiService } from '@/lib/analytics';
import { z } from 'zod';

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

export async function POST(request: NextRequest) {
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
    const results = await kpiService.calculateKPIs(codes, params as any);

    return NextResponse.json({
      success: true,
      data: results,
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
