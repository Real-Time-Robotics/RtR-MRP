import { NextRequest, NextResponse } from 'next/server';
import { kpiService } from '@/lib/analytics';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;

    const definitions = await kpiService.getKPIDefinitions(category as any);

    return NextResponse.json({
      success: true,
      data: definitions,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/kpis' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI definitions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await kpiService.seedSystemKPIs();

    return NextResponse.json({
      success: true,
      message: 'System KPIs seeded successfully',
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/analytics/kpis' });
    return NextResponse.json(
      { success: false, error: 'Failed to seed KPIs' },
      { status: 500 }
    );
  }
}
