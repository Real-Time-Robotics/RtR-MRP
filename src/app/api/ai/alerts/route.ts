// =============================================================================
// API: /api/ai/alerts
// Intelligent Alerts - List, Filter, Actions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  unifiedAlertService,
  AlertFilter,
  AlertSort,
  AlertPriority,
  AlertStatus,
  AlertSource,
  AlertType,
} from '@/lib/ai/alerts';

// =============================================================================
// GET: List alerts with filters
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Build filter from query params
    const filter: AlertFilter = {};

    // Priority filter
    const priorities = searchParams.get('priorities');
    if (priorities) {
      filter.priorities = priorities.split(',') as AlertPriority[];
    }

    // Status filter
    const statuses = searchParams.get('statuses');
    if (statuses) {
      filter.statuses = statuses.split(',') as AlertStatus[];
    }

    // Source filter
    const sources = searchParams.get('sources');
    if (sources) {
      filter.sources = sources.split(',') as AlertSource[];
    }

    // Type filter
    const types = searchParams.get('types');
    if (types) {
      filter.types = types.split(',') as AlertType[];
    }

    // Entity filter
    const entityType = searchParams.get('entityType');
    if (entityType) filter.entityType = entityType;

    const entityId = searchParams.get('entityId');
    if (entityId) filter.entityId = entityId;

    // Date filter
    const fromDate = searchParams.get('fromDate');
    if (fromDate) filter.fromDate = new Date(fromDate);

    const toDate = searchParams.get('toDate');
    if (toDate) filter.toDate = new Date(toDate);

    // Read status filter
    const isRead = searchParams.get('isRead');
    if (isRead !== null) filter.isRead = isRead === 'true';

    // Search
    const search = searchParams.get('search');
    if (search) filter.search = search;

    // Sort
    const sortField = searchParams.get('sortField') as AlertSort['field'] | undefined;
    const sortDirection = searchParams.get('sortDirection') as AlertSort['direction'] | undefined;
    const sort: AlertSort | undefined = sortField
      ? { field: sortField, direction: sortDirection || 'desc' }
      : undefined;

    // Refresh alerts first (collect new ones)
    const refresh = searchParams.get('refresh') === 'true';
    if (refresh) {
      await unifiedAlertService.refreshAlerts();
    }

    // Get alerts
    const alerts = unifiedAlertService.getAlerts(filter, sort);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startIndex = (page - 1) * limit;
    const paginatedAlerts = alerts.slice(startIndex, startIndex + limit);

    // Get counts
    const counts = unifiedAlertService.getAlertCounts(filter);

    // Get AI summary if requested
    let aiSummary: string | undefined;
    if (searchParams.get('includeSummary') === 'true') {
      aiSummary = await unifiedAlertService.getAISummary(alerts);
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          page,
          limit,
          total: alerts.length,
          totalPages: Math.ceil(alerts.length / limit),
        },
        counts,
        aiSummary,
      },
    });
  } catch (error) {
    console.error('[Alerts API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Execute actions on alerts
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, alertId, alertIds, actionId, reason, durationHours } = body;

    switch (action) {
      case 'execute': {
        if (!alertId || !actionId) {
          return NextResponse.json(
            { error: 'Missing alertId or actionId' },
            { status: 400 }
          );
        }

        const result = await unifiedAlertService.executeAction(
          alertId,
          actionId,
          session.user.id
        );

        return NextResponse.json({
          success: result.success,
          data: result,
        });
      }

      case 'markAsRead': {
        if (!alertId) {
          return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
        }

        const success = unifiedAlertService.markAsRead(alertId);
        return NextResponse.json({ success });
      }

      case 'dismiss': {
        if (!alertId) {
          return NextResponse.json({ error: 'Missing alertId' }, { status: 400 });
        }

        const success = unifiedAlertService.markAsDismissed(alertId, reason);
        return NextResponse.json({ success });
      }

      case 'bulkMarkAsRead': {
        if (!alertIds?.length) {
          return NextResponse.json({ error: 'Missing alertIds' }, { status: 400 });
        }

        const count = unifiedAlertService.bulkMarkAsRead(alertIds);
        return NextResponse.json({ success: true, count });
      }

      case 'bulkDismiss': {
        if (!alertIds?.length) {
          return NextResponse.json({ error: 'Missing alertIds' }, { status: 400 });
        }

        const result = await unifiedAlertService.bulkDismiss(alertIds, session.user.id);
        return NextResponse.json({
          success: true,
          data: { dismissed: result.success, failed: result.failed }
        });
      }

      case 'bulkSnooze': {
        if (!alertIds?.length) {
          return NextResponse.json({ error: 'Missing alertIds' }, { status: 400 });
        }

        const { alertActionExecutor } = await import('@/lib/ai/alerts');
        const result = await alertActionExecutor.bulkSnooze(
          alertIds,
          durationHours || 4,
          session.user.id
        );
        return NextResponse.json({
          success: true,
          data: { snoozed: result.success, failed: result.failed }
        });
      }

      case 'refresh': {
        const alerts = await unifiedAlertService.refreshAlerts();
        return NextResponse.json({
          success: true,
          data: { count: alerts.length },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Alerts API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
