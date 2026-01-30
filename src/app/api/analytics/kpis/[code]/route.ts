import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kpiService } from '@/lib/analytics';

// =============================================================================
// KPI API - SINGLE KPI WITH TREND
// =============================================================================

interface RouteContext {
  params: Promise<{ code: string }>;
}

// GET /api/analytics/kpis/[code] - Get single KPI with trend data
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { code } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periods = parseInt(searchParams.get('periods') || '6', 10);
    const includeTrend = searchParams.get('includeTrend') !== 'false';

    // Get KPI definition
    const definition = await kpiService.getKPIDefinition(code);
    if (!definition) {
      return NextResponse.json(
        { success: false, error: 'KPI not found' },
        { status: 404 }
      );
    }

    // Calculate KPI value with trend
    const value = await kpiService.calculateKPI(code, {
      includeTrend,
      trendPeriods: periods,
    });

    return NextResponse.json({
      success: true,
      data: {
        definition,
        value,
      },
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
