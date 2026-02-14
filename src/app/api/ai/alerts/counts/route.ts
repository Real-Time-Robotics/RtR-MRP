// =============================================================================
// API: /api/ai/alerts/counts
// Alert counts by priority
// =============================================================================

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { unifiedAlertService } from '@/lib/ai/alerts';

// =============================================================================
// GET: Get alert counts
// =============================================================================

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const counts = unifiedAlertService.getAlertCounts();

    return NextResponse.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/alerts/counts' });
    return NextResponse.json(
      { error: 'Failed to fetch counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
