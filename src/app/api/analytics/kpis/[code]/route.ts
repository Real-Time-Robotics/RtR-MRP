import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { kpiService } from '@/lib/analytics';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
interface RouteContext {
  params: Promise<{ code: string }>;
}

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/kpis/[code]' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI' },
      { status: 500 }
    );
  }
});
