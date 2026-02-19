import { NextRequest, NextResponse } from 'next/server';import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { z } from 'zod';

import {
  ReportType,
  ReportPeriod,
  ReportCategory,
  REPORT_TEMPLATES,
  CATEGORY_CONFIG,
  getTemplate,
  getTemplatesByCategory,
  generateMockReportData,
} from '@/lib/reports/report-engine';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// GET /api/v2/reports
// Query params:
//   - view: 'templates' | 'categories' (default: 'templates')
//   - category: ReportCategory filter
// =============================================================================
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'templates';
    const category = searchParams.get('category') as ReportCategory | null;

    if (view === 'categories') {
      // Return category list with counts
      const categories = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
        id: key,
        ...config,
        count: REPORT_TEMPLATES.filter((t) => t.category === key).length,
      }));

      return NextResponse.json({
        success: true,
        data: categories,
      });
    }

    // Return templates
    let templates = REPORT_TEMPLATES;

    if (category) {
      templates = getTemplatesByCategory(category);
    }

    // Define type for grouped templates
    interface GroupedCategory {
      category: ReportCategory;
      label: string;
      labelVi: string;
      color: string;
      bgColor: string;
      templates: {
        type: ReportType;
        name: string;
        nameVi: string;
        description: string;
        descriptionVi: string;
        icon: string;
      }[];
    }

    // Group by category
    const grouped = templates.reduce((acc, template) => {
      const cat = template.category;
      if (!acc[cat]) {
        acc[cat] = {
          category: cat,
          ...CATEGORY_CONFIG[cat],
          templates: [],
        };
      }
      acc[cat].templates.push({
        type: template.type,
        name: template.name,
        nameVi: template.nameVi,
        description: template.description,
        descriptionVi: template.descriptionVi,
        icon: template.icon,
      });
      return acc;
    }, {} as Record<string, GroupedCategory>);

    return NextResponse.json({
      success: true,
      data: {
        templates: Object.values(grouped),
        total: templates.length,
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/reports' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report templates' },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST /api/v2/reports
// Body:
//   - type: ReportType (required)
//   - period: ReportPeriod (default: 'THIS_WEEK')
//   - startDate: string (for CUSTOM period)
//   - endDate: string (for CUSTOM period)
// =============================================================================
export const POST = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      type: z.string(),
      period: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { type, period = 'THIS_WEEK', startDate, endDate } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Report type is required' },
        { status: 400 }
      );
    }

    const template = getTemplate(type as ReportType);
    if (!template) {
      return NextResponse.json(
        { success: false, error: `Unknown report type: ${type}` },
        { status: 400 }
      );
    }

    // Generate report data
    const reportData = generateMockReportData(type as ReportType, period as ReportPeriod);

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/reports' });
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
});
