import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { dashboardService } from '@/lib/analytics';
import type { UserRole } from '@/lib/roles';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// DASHBOARDS API - LIST & CREATE WITH ROLE-BASED ACCESS
// =============================================================================

const createDashboardSchema = z.object({
  name: z.string().min(1).max(100),
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
  fromTemplateId: z.string().optional(),
});

// GET /api/analytics/dashboards - List user's dashboards
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
const userId = session.user.id;
    const userRole = session.user.role as UserRole || 'user';

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get templates filtered by role
    if (action === 'templates') {
      const category = searchParams.get('category') || undefined;
      const templates = await dashboardService.getTemplatesForRole(userRole, category);
      return NextResponse.json({
        success: true,
        data: templates,
        timestamp: new Date().toISOString(),
        took: Date.now() - startTime,
      });
    }

    // Get user permissions
    if (action === 'permissions') {
      const permissions = dashboardService.getUserPermissions(userRole);
      const features = dashboardService.getUserFeatures(userRole);
      const canCreate = await dashboardService.canUserCreateDashboard(userId, userRole);

      return NextResponse.json({
        success: true,
        data: {
          permissions,
          features,
          canCreate,
        },
        timestamp: new Date().toISOString(),
        took: Date.now() - startTime,
      });
    }

    // Get default dashboard (auto-provision if needed)
    if (action === 'default') {
      const dashboard = await dashboardService.getDefaultDashboardForRole(userId, userRole);
      return NextResponse.json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        took: Date.now() - startTime,
      });
    }

    // List dashboards with role-based filtering
    const dashboards = await dashboardService.getUserDashboardsWithRole(userId, userRole);

    return NextResponse.json({
      success: true,
      data: dashboards,
      permissions: dashboardService.getUserPermissions(userRole),
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/dashboards' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
});

// POST /api/analytics/dashboards - Create new dashboard
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
const userId = session.user.id;
    const userRole = session.user.role as UserRole || 'user';

    // Check if user can create dashboards
    const canCreate = await dashboardService.canUserCreateDashboard(userId, userRole);
    if (!canCreate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Permission denied: You cannot create more dashboards',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    let dashboard;

    // If creating from template
    if (parsed.data.fromTemplateId) {
      // Check if user can access this template
      if (!dashboardService.canUserAccessTemplate(userRole, parsed.data.fromTemplateId)) {
        return NextResponse.json(
          { success: false, error: 'Permission denied: Cannot access this template' },
          { status: 403 }
        );
      }

      dashboard = await dashboardService.createFromTemplate(
        userId,
        parsed.data.fromTemplateId,
        parsed.data.name
      );
    } else {
      dashboard = await dashboardService.createDashboard(userId, {
        name: parsed.data.name,
        description: parsed.data.description,
        layout: parsed.data.layout,
        isPublic: parsed.data.isPublic,
        isDefault: parsed.data.isDefault,
      });
    }

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/analytics/dashboards' });
    return NextResponse.json(
      { success: false, error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
});
