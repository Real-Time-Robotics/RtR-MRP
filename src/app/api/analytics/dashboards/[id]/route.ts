import { NextRequest, NextResponse } from 'next/server';
import { dashboardService, widgetService } from '@/lib/analytics';
import { z } from 'zod';

// =============================================================================
// DASHBOARD API - GET, UPDATE, DELETE
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
export async function GET(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id } = await context.params;

  try {
    const dashboard = await dashboardService.getDashboard(id);

    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
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
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

// PUT /api/analytics/dashboards/[id] - Update dashboard
export async function PUT(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id } = await context.params;

  try {
    // Check existence
    const existing = await dashboardService.getDashboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
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

    const dashboard = await dashboardService.updateDashboard(id, parsed.data as any);

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

// DELETE /api/analytics/dashboards/[id] - Delete dashboard
export async function DELETE(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id } = await context.params;

  try {
    // Check existence
    const existing = await dashboardService.getDashboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
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
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}
