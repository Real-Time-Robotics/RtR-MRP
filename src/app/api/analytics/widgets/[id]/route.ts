import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { dashboardService, widgetService } from '@/lib/analytics';
import { DashboardWidget } from '@/lib/analytics/types';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// WIDGET API - UPDATE, DELETE, GET DATA
// =============================================================================

const updateWidgetSchema = z.object({
  widgetType: z.enum(['kpi', 'chart-line', 'chart-bar', 'chart-pie', 'chart-area', 'chart-donut', 'gauge', 'table', 'sparkline', 'heatmap']).optional(),
  title: z.string().min(1).max(100).optional(),
  titleVi: z.string().max(100).optional(),
  dataSource: z.enum(['inventory', 'sales', 'production', 'quality', 'financial', 'supplier', 'mrp', 'custom']).optional(),
  metric: z.string().optional(),
  queryConfig: z.object({
    metrics: z.array(z.string()).optional(),
    dimensions: z.array(z.string()).optional(),
    filters: z.array(z.any()).optional(),
    groupBy: z.array(z.string()).optional(),
    orderBy: z.array(z.any()).optional(),
    limit: z.number().optional(),
    dateRange: z.any().optional(),
  }).optional(),
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
  }).optional(),
  gridX: z.number().min(0).max(11).optional(),
  gridY: z.number().min(0).optional(),
  gridW: z.number().min(1).max(12).optional(),
  gridH: z.number().min(1).max(12).optional(),
  refreshInterval: z.number().min(0).optional(),
  drillDownConfig: z.any().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/analytics/widgets/[id] - Get widget data
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
// Get widget
    const widget = await prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!widget) {
      return NextResponse.json(
        { success: false, error: 'Widget not found' },
        { status: 404 }
      );
    }

    // Fetch widget data
    const widgetData = await widgetService.getWidgetData(widget as unknown as DashboardWidget);

    return NextResponse.json({
      success: true,
      data: widgetData,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/analytics/widgets/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch widget data' },
      { status: 500 }
    );
  }
});

// PUT /api/analytics/widgets/[id] - Update widget
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
// Get widget
    const widget = await prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!widget) {
      return NextResponse.json(
        { success: false, error: 'Widget not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateWidgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await dashboardService.updateWidget(id, parsed.data as Partial<DashboardWidget>);

    return NextResponse.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/analytics/widgets/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to update widget' },
      { status: 500 }
    );
  }
});

// DELETE /api/analytics/widgets/[id] - Delete widget
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
// Get widget
    const widget = await prisma.dashboardWidget.findUnique({
      where: { id },
    });

    if (!widget) {
      return NextResponse.json(
        { success: false, error: 'Widget not found' },
        { status: 404 }
      );
    }

    await dashboardService.removeWidget(id);

    return NextResponse.json({
      success: true,
      message: 'Widget deleted',
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/analytics/widgets/[id]' });
    return NextResponse.json(
      { success: false, error: 'Failed to delete widget' },
      { status: 500 }
    );
  }
});
