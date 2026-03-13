// =============================================================================
// DAILY DIGEST CRON JOB
// GET /api/cron/daily-digest
// Sends daily digest emails to all eligible users
// Recommended schedule: Daily at 8:00 AM
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendDailyDigests } from '@/lib/notifications/daily-digest';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization (skip in development)
    if (process.env.NODE_ENV === 'production') {
      if (!CRON_SECRET) {
        return NextResponse.json(
          { success: false, error: 'CRON_SECRET not configured. Cron endpoints are disabled.' },
          { status: 503 }
        );
      }
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const result = await sendDailyDigests();
    const duration = Date.now() - startTime;

    logger.info(
      `[Cron:DailyDigest] Sent ${result.sent}, skipped ${result.skipped}, errors ${result.errors} in ${duration}ms`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      data: result,
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: '/api/cron/daily-digest' }
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send daily digests',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
