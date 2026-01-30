import { NextRequest, NextResponse } from 'next/server';
import { kpiService } from '@/lib/analytics';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { code } = await context.params;

  try {
    const { searchParams } = new URL(request.url);
    const periods = parseInt(searchParams.get('periods') || '6');

    const result = await kpiService.getKPIWithTrend(code, periods);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'KPI not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching KPI:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI' },
      { status: 500 }
    );
  }
}
