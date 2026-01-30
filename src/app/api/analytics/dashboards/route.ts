import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/analytics';
import { z } from 'zod';

// =============================================================================
// DASHBOARDS API - LIST & CREATE
// =============================================================================

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'demo-user';

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
});

// GET /api/analytics/dashboards - List user's dashboards
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const dashboards = await dashboardService.getUserDashboards(DEFAULT_USER_ID);

    return NextResponse.json({
      success: true,
      data: dashboards,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/dashboards - Create new dashboard
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const parsed = createDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const dashboard = await dashboardService.createDashboard(DEFAULT_USER_ID, parsed.data);

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}
