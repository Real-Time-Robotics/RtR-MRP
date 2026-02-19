// =============================================================================
// DASHBOARD API ROUTES
// Real data endpoints for Dashboard
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/data/data-service';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit } from '@/lib/rate-limit';
import { withAuth } from '@/lib/api/with-auth';
// =============================================================================
// GET /api/dashboard/stats
// Get dashboard statistics
// =============================================================================

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const stats = await dataService.getDashboardStats();

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/dashboard/stats' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
});
