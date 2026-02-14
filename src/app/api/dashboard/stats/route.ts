// =============================================================================
// DASHBOARD API ROUTES
// Real data endpoints for Dashboard
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/data/data-service';
import { logger } from '@/lib/logger';

// =============================================================================
// GET /api/dashboard/stats
// Get dashboard statistics
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
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
}
