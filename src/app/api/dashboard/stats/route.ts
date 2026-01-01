// =============================================================================
// DASHBOARD API ROUTES
// Real data endpoints for Dashboard
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/data/data-service';

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
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
