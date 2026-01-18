// =============================================================================
// INVENTORY ALERTS CRON JOB
// GET /api/cron/inventory-alerts
// Called by external cron service (Vercel Cron, etc.) to check inventory levels
// Recommended schedule: Every 15 minutes during business hours
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getInventoryAlertService } from '@/lib/alerts/inventory-alert-service';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization (skip in development)
    if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const alertService = getInventoryAlertService();

    // Generate alerts
    const alerts = await alertService.generateAlerts();
    const summary = await alertService.getSummary();

    const duration = Date.now() - startTime;

    // Log for monitoring
    console.log(`[Cron:InventoryAlerts] Generated ${alerts.length} alerts in ${duration}ms`);
    console.log(`[Cron:InventoryAlerts] Summary: ${summary.critical} critical, ${summary.low} low, ${summary.warning} warning`);

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
    console.error('[Cron:InventoryAlerts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
