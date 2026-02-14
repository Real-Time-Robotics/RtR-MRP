// =============================================================================
// API: /api/ai/alerts/[alertId]
// Single Alert Operations
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { unifiedAlertService, aiAlertAnalyzer } from '@/lib/ai/alerts';

// =============================================================================
// GET: Get single alert with full details
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await params;
    const alert = unifiedAlertService.getAlert(alertId);

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Get urgency prediction
    const urgency = await aiAlertAnalyzer.predictUrgency(alert);

    // Get related alerts
    const allAlerts = unifiedAlertService.getAlerts();
    const alertGroups = await aiAlertAnalyzer.correlateAlerts(allAlerts);
    const relatedGroup = alertGroups.find(g =>
      g.primaryAlert.id === alertId ||
      g.relatedAlerts.some(r => r.id === alertId)
    );

    return NextResponse.json({
      success: true,
      data: {
        alert,
        urgency,
        relatedAlerts: relatedGroup?.relatedAlerts || [],
        groupReason: relatedGroup?.groupReason,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/alerts/[alertId]' });
    return NextResponse.json(
      { error: 'Failed to fetch alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH: Update alert (read, dismiss)
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await params;
    const body = await request.json();
    const { action, reason } = body;

    const alert = unifiedAlertService.getAlert(alertId);
    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    let success = false;

    switch (action) {
      case 'markAsRead':
        success = unifiedAlertService.markAsRead(alertId);
        break;

      case 'dismiss':
        success = unifiedAlertService.markAsDismissed(alertId, reason);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success,
      data: unifiedAlertService.getAlert(alertId),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/ai/alerts/[alertId]' });
    return NextResponse.json(
      { error: 'Failed to update alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Dismiss/Remove alert
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await params;
    const alert = unifiedAlertService.getAlert(alertId);

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const success = unifiedAlertService.markAsDismissed(alertId, 'Deleted by user');

    return NextResponse.json({ success });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/ai/alerts/[alertId]' });
    return NextResponse.json(
      { error: 'Failed to delete alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
