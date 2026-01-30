import { NextRequest, NextResponse } from 'next/server';
import { dashboardService } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const templates = await dashboardService.getTemplates();

    return NextResponse.json({
      success: true,
      data: templates,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await dashboardService.seedTemplates();

    return NextResponse.json({
      success: true,
      message: 'Templates seeded successfully',
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Error seeding templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed templates' },
      { status: 500 }
    );
  }
}
