// =============================================================================
// API: /api/ai/alerts/counts
// Alert counts by priority
// =============================================================================

import { NextResponse } from 'next/server';
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
    console.error('[Counts API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
