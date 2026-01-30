import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dashboardService } from '@/lib/analytics';
import { z } from 'zod';

// =============================================================================
// DASHBOARD WIDGETS API - ADD WIDGETS
// =============================================================================

const addWidgetSchema = z.object({
  widgetType: z.enum(['kpi', 'chart-line', 'chart-bar', 'chart-pie', 'chart-area', 'chart-donut', 'gauge', 'table', 'sparkline', 'heatmap']),
  title: z.string().min(1).max(100),
  titleVi: z.string().max(100).optional(),
  dataSource: z.enum(['inventory', 'sales', 'production', 'quality', 'financial', 'supplier', 'mrp', 'custom']),
  metric: z.string().optional(),
  queryConfig: z.object({
    metrics: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    filters: z.array(z.object({
      field: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'contains', 'between']),
      value: z.any(),
    })).optional(),
    groupBy: z.array(z.string()).optional(),
    orderBy: z.array(z.object({
      field: z.string(),
      direction: z.enum(['asc', 'desc']),
    })).optional(),
    limit: z.number().optional(),
    dateRange: z.object({
      type: z.enum(['preset', 'custom']),
      preset: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
  }).optional().default({}),
  displayConfig: z.object({
    colors: z.array(z.string()).optional(),
    showLegend: z.boolean().optional(),
    legendPosition: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    showGrid: z.boolean().optional(),
    showLabels: z.boolean().optional(),
    showValues: z.boolean().optional(),
    showTrend: z.boolean().optional(),
    formatter: z.enum(['number', 'currency', 'percent']).optional(),
    animation: z.boolean().optional(),
    stacked: z.boolean().optional(),
    curved: z.boolean().optional(),
  }).optional().default({}),
  gridX: z.number().min(0).max(11).default(0),
  gridY: z.number().min(0).default(0),
  gridW: z.number().min(1).max(12).default(4),
  gridH: z.number().min(1).max(12).default(3),
  refreshInterval: z.number().min(0).optional(),
  drillDownConfig: z.object({
    enabled: z.boolean(),
    targetDashboard: z.string().optional(),
    targetWidget: z.string().optional(),
    filterField: z.string().optional(),
    openInModal: z.boolean().optional(),
  }).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/analytics/dashboards/[id]/widgets - Add widget to dashboard
export async function POST(request: NextRequest, context: RouteContext) {
  const startTime = Date.now();
  const { id: dashboardId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check dashboard ownership
    const dashboard = await dashboardService.getDashboard(dashboardId);
    if (!dashboard) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    if (dashboard.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = addWidgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const widget = await dashboardService.addWidget(dashboardId, parsed.data as any);

    return NextResponse.json({
      success: true,
      data: widget,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding widget:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add widget' },
      { status: 500 }
    );
  }
}
