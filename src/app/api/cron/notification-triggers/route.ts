// =============================================================================
// NOTIFICATION TRIGGERS CRON JOB
// GET /api/cron/notification-triggers
// Checks for abandoned sessions, pending approvals, low stock, MRP suggestions
// Recommended schedule: Every 30 minutes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { runNotificationTriggers } from '@/lib/notifications/trigger-service';
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

    const results = await runNotificationTriggers();
    const totalCreated = results.reduce((sum, r) => sum + r.notificationsCreated, 0);
    const duration = Date.now() - startTime;

    logger.info(`[Cron:NotificationTriggers] Created ${totalCreated} notifications in ${duration}ms`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      data: {
        totalNotifications: totalCreated,
        triggers: results,
      },
    });
  } catch (error) {
    logger.logError(
      error instanceof Error ? error : new Error(String(error)),
      { context: '/api/cron/notification-triggers' }
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process notification triggers',
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
