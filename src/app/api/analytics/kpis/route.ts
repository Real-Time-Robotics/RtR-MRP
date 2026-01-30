import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kpiService } from '@/lib/analytics';
import type { KPICategory } from '@/lib/analytics/types';

// =============================================================================
// KPIs API - LIST AND SEED
// =============================================================================

// GET /api/analytics/kpis - List KPI definitions
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as KPICategory | null;

    const definitions = await kpiService.getKPIDefinitions(category || undefined);

    return NextResponse.json({
      success: true,
      data: definitions,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching KPI definitions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI definitions' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/kpis - Seed system KPIs (admin only)
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

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await kpiService.seedSystemKPIs();

    return NextResponse.json({
      success: true,
      message: 'System KPIs seeded successfully',
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error seeding KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed KPIs' },
      { status: 500 }
    );
  }
}
