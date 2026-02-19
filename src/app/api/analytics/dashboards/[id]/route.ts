import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { dashboardService, widgetService } from '@/lib/analytics';
import type { UserRole } from '@/lib/roles';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// DASHBOARD API - GET, UPDATE, DELETE WITH ROLE-BASED ACCESS
// =============================================================================

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  layout: z.object({
    columns: z.number().optional(),
    rowHeight: z.number().optional(),
    margin: z.tuple([z.number(), z.number()]).optional(),
    containerPadding: z.tuple([z.number(), z.number()]).optional(),
    compactType: z.enum(['vertical', 'horizontal']).nullable().optional(),
  }).optional(),
  isPublic: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/analytics/dashboards/[id] - Get dashboard with widgets and data
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const userId = session.user.id;
    const userRole = session.user.role as UserRole || 'user';
    const permissions = dashboardService.getUserPermissions(userRole);

    const dashboard = await dashboardService.getDashboard(id);

    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Check access permission
    const isOwner = dashboard.userId === userId;
    const isPublic = dashboard.isPublic;
    const canViewAll = permissions.canViewAll;

    if (!isOwner && !isPublic && !canViewAll) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: Cannot access this dashboard' },
        { status: 403 }
      );
    }

    // Optionally fetch widget data
    const { searchParams } = new URL(request.url);
    const includeData = searchParams.get('includeData') === 'true';

    let widgetData = null;
    if (includeData && dashboard.widgets.length > 0) {
      widgetData = await widgetService.getMultipleWidgetsData(dashboard.widgets);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dashboard,
        widgetData,
      },
      permissions: {
        canEdit: isOwner && permissions.canEdit,
        canDelete: isOwner && permissions.canDelete,
        canShare: isOwner && permissions.canShare,
      },
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/dashboards/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
});

// PUT /api/analytics/dashboards/[id] - Update dashboard
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const userId = session.user.id;
    const userRole = session.user.role as UserRole || 'user';
    const permissions = dashboardService.getUserPermissions(userRole);

    // Check existence
    const existing = await dashboardService.getDashboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Check ownership and edit permission
    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You do not own this dashboard' },
        { status: 403 }
      );
    }

    if (!permissions.canEdit) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You cannot edit dashboards' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check share permission if trying to make public
    if (parsed.data.isPublic && !permissions.canShare) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You cannot share dashboards' },
        { status: 403 }
      );
    }

    const dashboard = await dashboardService.updateDashboard(id, parsed.data as unknown as import('@/lib/analytics/types').DashboardUpdateInput);

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/analytics/dashboards/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
});

// DELETE /api/analytics/dashboards/[id] - Delete dashboard
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const userId = session.user.id;
    const userRole = session.user.role as UserRole || 'user';
    const permissions = dashboardService.getUserPermissions(userRole);

    // Check existence
    const existing = await dashboardService.getDashboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Check ownership and delete permission
    if (existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You do not own this dashboard' },
        { status: 403 }
      );
    }

    if (!permissions.canDelete) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You cannot delete dashboards' },
        { status: 403 }
      );
    }

    await dashboardService.deleteDashboard(id);

    return NextResponse.json({
      success: true,
      message: 'Dashboard deleted',
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/analytics/dashboards/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
});
