import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dashboardService } from '@/lib/analytics';
import { z } from 'zod';

// =============================================================================
// DASHBOARDS API - LIST & CREATE
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
});

// GET /api/analytics/dashboards - List user's dashboards
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dashboards = await dashboardService.getUserDashboards(session.user.id);

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createDashboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const dashboard = await dashboardService.createDashboard(session.user.id, parsed.data);

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
