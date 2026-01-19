// =============================================================================
// API: /api/ai/alerts/digest
// Alert digest (daily/weekly)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { unifiedAlertService } from '@/lib/ai/alerts';

// =============================================================================
// GET: Get digest
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';

    let digest;
    if (period === 'weekly') {
      digest = await unifiedAlertService.getWeeklyReport();
    } else {
      digest = await unifiedAlertService.getDailyDigest();
    }

    return NextResponse.json({
      success: true,
      data: digest,
    });
  } catch (error) {
    console.error('[Digest API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate digest', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
