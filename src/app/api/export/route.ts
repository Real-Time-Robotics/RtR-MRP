// =============================================================================
// EXPORT API ROUTE
// Handle export requests for various entities
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { exportData, type ExportFormat, type ExportEntity } from '@/lib/export/export-service';

// =============================================================================
// POST /api/export
// Export data in specified format
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
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

    console.log(`[Export API] Exporting ${entity} as ${format}`);

    // Generate export
    const result = await exportData({
      format,
      entity,
      title,
      filters,
    });

    console.log(`[Export API] Generated ${result.filename} (${result.size} bytes)`);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Export API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/export
// Get available export options
// =============================================================================

export async function GET(): Promise<NextResponse> {
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
}
