import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { dashboardService } from '@/lib/analytics';
import { DashboardWidget } from '@/lib/analytics/types';
import { z } from 'zod';
import { logger } from '@/lib/logger';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
const addWidgetSchema = z.object({
  widgetType: z.enum(['kpi', 'chart-line', 'chart-bar', 'chart-pie', 'chart-area', 'chart-donut', 'gauge', 'table', 'sparkline', 'heatmap']),
  title: z.string().min(1).max(100),
  titleVi: z.string().max(100).optional(),
  dataSource: z.enum(['inventory', 'sales', 'production', 'quality', 'financial', 'supplier', 'mrp', 'custom']),
  metric: z.string().optional(),
  queryConfig: z.any().optional(),
  displayConfig: z.any().optional(),
  gridX: z.number().min(0).max(11).default(0),
  gridY: z.number().min(0).default(0),
  gridW: z.number().min(1).max(12).default(4),
  gridH: z.number().min(1).max(12).default(3),
  refreshInterval: z.number().min(0).optional(),
  drillDownConfig: z.any().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();
  const { id } = await context.params;

  try {
const existing = await dashboardService.getDashboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = addWidgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const widget = await dashboardService.addWidget(id, parsed.data as Omit<DashboardWidget, 'id' | 'dashboardId'>);

    return NextResponse.json({
      success: true,
      data: widget,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/analytics/dashboards/[id]/widgets' });
    return NextResponse.json(
      { success: false, error: 'Failed to add widget' },
      { status: 500 }
    );
  }
});
