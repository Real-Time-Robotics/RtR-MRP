// =============================================================================
// EXPORT API ROUTE
// Handle export requests for various entities
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exportData, type ExportFormat, type ExportEntity } from '@/lib/export/export-service';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';

import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// POST /api/export
// Export data in specified format
// =============================================================================

export const POST = withAuth(async (request: NextRequest, context, session): Promise<Response> => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      format: z.enum(['xlsx', 'csv', 'pdf'] as const),
      entity: z.enum(['sales-orders', 'parts', 'inventory', 'suppliers', 'customers', 'work-orders', 'quality-records', 'mrp-results'] as const),
      title: z.string().optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
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
    const { format, entity, title, filters } = body;

    // Validate required fields
    if (!format || !entity) {
      return NextResponse.json(
        { success: false, error: 'Format and entity are required' },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats: ExportFormat[] = ['xlsx', 'csv', 'pdf'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { success: false, error: `Invalid format. Supported: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate entity
    const validEntities: ExportEntity[] = [
      'sales-orders', 'parts', 'inventory', 'suppliers', 
      'customers', 'work-orders', 'quality-records', 'mrp-results'
    ];
    if (!validEntities.includes(entity)) {
      return NextResponse.json(
        { success: false, error: `Invalid entity. Supported: ${validEntities.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate export
    const result = await exportData({
      format,
      entity,
      title,
      filters,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/export' });
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET /api/export
// Get available export options
// =============================================================================

export const GET = withAuth(async (request: NextRequest, context, session): Promise<Response> => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  return NextResponse.json({
    success: true,
    data: {
      formats: [
        { id: 'xlsx', label: 'Excel (.xls)', description: 'Microsoft Excel format' },
        { id: 'csv', label: 'CSV (.csv)', description: 'Comma-separated values' },
        { id: 'pdf', label: 'PDF (.html)', description: 'Printable HTML report' },
      ],
      entities: [
        { id: 'sales-orders', label: 'Đơn hàng', description: 'Danh sách đơn hàng bán' },
        { id: 'parts', label: 'Vật tư', description: 'Danh mục vật tư' },
        { id: 'inventory', label: 'Tồn kho', description: 'Báo cáo tồn kho' },
        { id: 'suppliers', label: 'Nhà cung cấp', description: 'Danh sách NCC' },
        { id: 'customers', label: 'Khách hàng', description: 'Danh sách khách hàng' },
        { id: 'work-orders', label: 'Lệnh sản xuất', description: 'Danh sách lệnh SX' },
        { id: 'quality-records', label: 'Chất lượng', description: 'Báo cáo NCR' },
      ],
    },
  });
});
