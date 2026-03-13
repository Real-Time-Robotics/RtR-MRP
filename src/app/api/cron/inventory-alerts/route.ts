// =============================================================================
// INVENTORY ALERTS CRON JOB
// GET /api/cron/inventory-alerts
// Called by external cron service (Vercel Cron, etc.) to check inventory levels
// Recommended schedule: Every 15 minutes during business hours
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getInventoryAlertService } from '@/lib/alerts/inventory-alert-service';
import { logger } from '@/lib/logger';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

// Verify cron secret for security
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

    // Rate limiting (heavy endpoint - alert generation is resource-intensive)
    const rateLimitCheck = await checkHeavyEndpointLimit(request);
    if (!rateLimitCheck.success) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitCheck.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitCheck.limit),
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
            'X-RateLimit-Reset': String(rateLimitCheck.reset),
          },
        }
      );
    }

    const alertService = getInventoryAlertService();

    // Generate alerts
    const alerts = await alertService.generateAlerts();
    const summary = await alertService.getSummary();

    const duration = Date.now() - startTime;

    // Log for monitoring
    logger.info(`[Cron:InventoryAlerts] Generated ${alerts.length} alerts in ${duration}ms`);
    logger.info(`[Cron:InventoryAlerts] Summary: ${summary.critical} critical, ${summary.low} low, ${summary.warning} warning`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      data: {
        alertsGenerated: alerts.length,
        summary: {
          critical: summary.critical,
          low: summary.low,
          warning: summary.warning,
          totalItems: summary.items.length,
          totalValue: summary.totalValue,
        },
        // Include top 5 critical items for quick reference
        topCritical: summary.items
          .filter((i) => i.status === 'CRITICAL')
          .slice(0, 5)
          .map((i) => ({
            partNumber: i.partNumber,
            currentStock: i.currentStock,
            reorderPoint: i.reorderPoint,
          })),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/cron/inventory-alerts' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process inventory alerts',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
