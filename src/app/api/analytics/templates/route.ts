import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dashboardService } from '@/lib/analytics';
import { z } from 'zod';

// =============================================================================
// DASHBOARD TEMPLATES API
// =============================================================================

const createFromTemplateSchema = z.object({
  templateId: z.string(),
  name: z.string().min(1).max(100).optional(),
});

// GET /api/analytics/templates - List dashboard templates
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
    const category = searchParams.get('category') || undefined;

    const templates = await dashboardService.getTemplates(category);

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

// POST /api/analytics/templates - Create dashboard from template
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
    const parsed = createFromTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const dashboard = await dashboardService.createFromTemplate(
      session.user.id,
      parsed.data.templateId,
      parsed.data.name
    );

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
      took: Date.now() - startTime,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating from template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create dashboard from template' },
      { status: 500 }
    );
  }
}
