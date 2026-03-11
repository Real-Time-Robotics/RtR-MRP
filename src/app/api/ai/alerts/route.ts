// =============================================================================
// API: /api/ai/alerts
// Intelligent Alerts - List, Filter, Actions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import {
  unifiedAlertService,
  AlertFilter,
  AlertSort,
  AlertPriority,
  AlertStatus,
  AlertSource,
  AlertType,
} from '@/lib/ai/alerts';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const alertActionSchema = z.object({
  action: z.enum(['execute', 'markAsRead', 'dismiss', 'bulkMarkAsRead', 'bulkDismiss', 'bulkSnooze', 'refresh']),
  alertId: z.string().optional(),
  alertIds: z.array(z.string()).optional(),
  actionId: z.string().optional(),
  reason: z.string().optional(),
  durationHours: z.number().optional(),
});
// =============================================================================
// GET: List alerts with filters
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
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

    // Sort — validate direction
    const sortField = searchParams.get('sortField') as AlertSort['field'] | undefined;
    const rawSortDir = searchParams.get('sortDirection')?.toLowerCase();
    const sortDirection: AlertSort['direction'] = rawSortDir === 'asc' ? 'asc' : 'desc';
    const sort: AlertSort | undefined = sortField
      ? { field: sortField, direction: sortDirection }
      : undefined;

    // Refresh alerts first (collect new ones)
    const refresh = searchParams.get('refresh') === 'true';
    if (refresh) {
      await unifiedAlertService.refreshAlerts();
    }

    // Get alerts
    const alerts = unifiedAlertService.getAlerts(filter, sort);

    // Pagination — clamp negative/zero/NaN values
    const rawPage = parseInt(searchParams.get('page') || '1');
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
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
          totalPages: limit > 0 ? Math.ceil(alerts.length / limit) : 0,
        },
        counts,
        aiSummary,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/alerts' });
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST: Execute actions on alerts
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const rawBody = await request.json();
    const parseResult = alertActionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { action, alertId, alertIds, actionId, reason, durationHours } = parseResult.data;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/alerts' });
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
});
