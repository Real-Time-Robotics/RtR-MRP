import { NextRequest, NextResponse } from 'next/server';import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { z } from 'zod';

import {
  Alert,
  AlertStatus,
  AlertSeverity,
  AlertType,
  generateMockAlerts,
  createAlert,
  sortAlertsByPriority,
  ALERT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
} from '@/lib/alerts/alert-engine';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// In-memory storage for demo (replace with database in production)
let alertsStore: Alert[] = generateMockAlerts();

// =============================================================================
// GET /api/v2/alerts
// Query params:
//   - view: 'summary' | 'list' (default: 'list')
//   - status: AlertStatus filter
//   - severity: AlertSeverity filter
//   - type: AlertType filter
//   - limit: number (default: 50)
//   - offset: number (default: 0)
// =============================================================================
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'list';
    const status = searchParams.get('status') as AlertStatus | null;
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const type = searchParams.get('type') as AlertType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Filter alerts
    let filteredAlerts = [...alertsStore];

    if (status) {
      filteredAlerts = filteredAlerts.filter((a) => a.status === status);
    }
    if (severity) {
      filteredAlerts = filteredAlerts.filter((a) => a.severity === severity);
    }
    if (type) {
      filteredAlerts = filteredAlerts.filter((a) => a.type === type);
    }

    // Sort by priority
    filteredAlerts = sortAlertsByPriority(filteredAlerts);

    if (view === 'summary') {
      // Return summary statistics
      const allAlerts = alertsStore;
      const activeAlerts = allAlerts.filter((a) => a.status === 'ACTIVE');

      const summary = {
        total: allAlerts.length,
        active: activeAlerts.length,
        acknowledged: allAlerts.filter((a) => a.status === 'ACKNOWLEDGED').length,
        resolved: allAlerts.filter((a) => a.status === 'RESOLVED').length,
        dismissed: allAlerts.filter((a) => a.status === 'DISMISSED').length,
        bySeverity: {
          critical: activeAlerts.filter((a) => a.severity === 'CRITICAL').length,
          warning: activeAlerts.filter((a) => a.severity === 'WARNING').length,
          info: activeAlerts.filter((a) => a.severity === 'INFO').length,
        },
        byType: Object.keys(ALERT_TYPE_CONFIG).reduce((acc, type) => {
          acc[type] = activeAlerts.filter((a) => a.type === type).length;
          return acc;
        }, {} as Record<string, number>),
        unread: activeAlerts.length,
        latestAlerts: sortAlertsByPriority(activeAlerts).slice(0, 5),
      };

      return NextResponse.json({
        success: true,
        data: summary,
      });
    }

    // Return paginated list
    const total = filteredAlerts.length;
    const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/alerts' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST /api/v2/alerts
// Actions:
//   - action: 'create' - Create new alert
//   - action: 'acknowledge' - Acknowledge alert(s)
//   - action: 'resolve' - Resolve alert(s)
//   - action: 'dismiss' - Dismiss alert(s)
//   - action: 'acknowledge_all' - Acknowledge all active alerts
//   - action: 'resolve_all' - Resolve all acknowledged alerts
// =============================================================================
export const POST = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      action: z.enum(['create', 'acknowledge', 'resolve', 'dismiss', 'acknowledge_all', 'resolve_all']),
      type: z.string().optional(),
      title: z.string().optional(),
      message: z.string().optional(),
      severity: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      entityCode: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      alertIds: z.array(z.string()).optional(),
      userId: z.string().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { action } = body;

    switch (action) {
      case 'create': {
        const { type, title, message, severity, entityType, entityId, entityCode, metadata } = body;

        if (!type || !title || !message) {
          return NextResponse.json(
            { success: false, error: 'type, title, and message are required' },
            { status: 400 }
          );
        }

        const newAlert = createAlert({
          type: type as AlertType,
          title,
          message,
          severity: severity as AlertSeverity | undefined,
          entityType,
          entityId,
          entityCode,
          metadata,
        });

        alertsStore.unshift(newAlert);

        return NextResponse.json({
          success: true,
          data: newAlert,
          message: 'Alert created successfully',
        });
      }

      case 'acknowledge': {
        const { alertIds, userId = 'system' } = body;

        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { success: false, error: 'alertIds array is required' },
            { status: 400 }
          );
        }

        let count = 0;
        alertsStore = alertsStore.map((alert) => {
          if (alertIds.includes(alert.id) && alert.status === 'ACTIVE') {
            count++;
            return {
              ...alert,
              status: 'ACKNOWLEDGED' as AlertStatus,
              acknowledgedAt: new Date(),
              acknowledgedBy: userId,
            };
          }
          return alert;
        });

        return NextResponse.json({
          success: true,
          message: `${count} alert(s) acknowledged`,
          count,
        });
      }

      case 'resolve': {
        const { alertIds, userId = 'system' } = body;

        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { success: false, error: 'alertIds array is required' },
            { status: 400 }
          );
        }

        let count = 0;
        alertsStore = alertsStore.map((alert) => {
          if (alertIds.includes(alert.id) && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
            count++;
            return {
              ...alert,
              status: 'RESOLVED' as AlertStatus,
              resolvedAt: new Date(),
              resolvedBy: userId,
            };
          }
          return alert;
        });

        return NextResponse.json({
          success: true,
          message: `${count} alert(s) resolved`,
          count,
        });
      }

      case 'dismiss': {
        const { alertIds } = body;

        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { success: false, error: 'alertIds array is required' },
            { status: 400 }
          );
        }

        let count = 0;
        alertsStore = alertsStore.map((alert) => {
          if (alertIds.includes(alert.id) && alert.status !== 'RESOLVED') {
            count++;
            return {
              ...alert,
              status: 'DISMISSED' as AlertStatus,
            };
          }
          return alert;
        });

        return NextResponse.json({
          success: true,
          message: `${count} alert(s) dismissed`,
          count,
        });
      }

      case 'acknowledge_all': {
        const { userId = 'system' } = body;

        let count = 0;
        alertsStore = alertsStore.map((alert) => {
          if (alert.status === 'ACTIVE') {
            count++;
            return {
              ...alert,
              status: 'ACKNOWLEDGED' as AlertStatus,
              acknowledgedAt: new Date(),
              acknowledgedBy: userId,
            };
          }
          return alert;
        });

        return NextResponse.json({
          success: true,
          message: `${count} alert(s) acknowledged`,
          count,
        });
      }

      case 'resolve_all': {
        const { userId = 'system' } = body;

        let count = 0;
        alertsStore = alertsStore.map((alert) => {
          if (['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
            count++;
            return {
              ...alert,
              status: 'RESOLVED' as AlertStatus,
              resolvedAt: new Date(),
              resolvedBy: userId,
            };
          }
          return alert;
        });

        return NextResponse.json({
          success: true,
          message: `${count} alert(s) resolved`,
          count,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/alerts' });
    return NextResponse.json(
      { success: false, error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
});
