// =============================================================================
// API: /api/ai/alerts/[alertId]
// Single Alert Operations
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { unifiedAlertService, aiAlertAnalyzer } from '@/lib/ai/alerts';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
const alertPatchSchema = z.object({
  action: z.enum(['markAsRead', 'dismiss']),
  reason: z.string().optional(),
});

// =============================================================================
// GET: Get single alert with full details
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
const { alertId } = await context.params;
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
      { error: 'Failed to fetch alert' },
      { status: 500 }
    );
  }
});

// =============================================================================
// PATCH: Update alert (read, dismiss)
// =============================================================================

export const PATCH = withAuth(async (request, context, session) => {
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
const { alertId } = await context.params;
    const body = await request.json();
    const parsed = alertPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { action, reason } = parsed.data;

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
    }

    return NextResponse.json({
      success,
      data: unifiedAlertService.getAlert(alertId),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/ai/alerts/[alertId]' });
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
});

// =============================================================================
// DELETE: Dismiss/Remove alert
// =============================================================================

export const DELETE = withAuth(async (request, context, session) => {
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
const { alertId } = await context.params;
    const alert = unifiedAlertService.getAlert(alertId);

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const success = unifiedAlertService.markAsDismissed(alertId, 'Deleted by user');

    return NextResponse.json({ success });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/ai/alerts/[alertId]' });
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
});
