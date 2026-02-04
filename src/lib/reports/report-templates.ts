// src/lib/reports/report-templates.ts
// Sprint 3 Report Templates - Pre-built templates for scheduled reports

export interface ReportTemplateConfig {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  icon: string;
  category: 'inventory' | 'purchasing' | 'production' | 'quality' | 'financial' | 'supplier';
  columns: { key: string; label: string; labelVi: string; type: 'string' | 'number' | 'date' | 'currency' | 'percent' }[];
  defaultFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  defaultTime: string;
  query: string;
  filters?: { key: string; label: string; type: 'select' | 'date' | 'number' }[];
}

export const SCHEDULED_REPORT_TEMPLATES: ReportTemplateConfig[] = [
  {
    id: 'inventory-summary',
    name: 'Inventory Summary',
    nameVi: 'Báo cáo Tồn kho',
    description: 'Current stock levels, value, and reorder alerts',
    descriptionVi: 'Tổng hợp tồn kho hiện tại, giá trị, sắp hết hàng',
    icon: 'Package',
    category: 'inventory',
    columns: [
      { key: 'partNumber', label: 'Part Number', labelVi: 'Mã SP', type: 'string' },
      { key: 'name', label: 'Name', labelVi: 'Tên', type: 'string' },
      { key: 'category', label: 'Category', labelVi: 'Nhóm', type: 'string' },
      { key: 'quantityOnHand', label: 'On Hand', labelVi: 'Tồn kho', type: 'number' },
      { key: 'unit', label: 'Unit', labelVi: 'ĐVT', type: 'string' },
      { key: 'unitCost', label: 'Unit Cost', labelVi: 'Đơn giá', type: 'currency' },
      { key: 'totalValue', label: 'Value', labelVi: 'Giá trị', type: 'currency' },
      { key: 'reorderPoint', label: 'ROP', labelVi: 'ROP', type: 'number' },
      { key: 'status', label: 'Status', labelVi: 'Trạng thái', type: 'string' },
    ],
    defaultFrequency: 'DAILY',
    defaultTime: '07:00',
    query: 'inventory-summary',
    filters: [
      { key: 'category', label: 'Nhóm hàng', type: 'select' },
      { key: 'status', label: 'Trạng thái', type: 'select' },
    ],
  },
  {
    id: 'po-summary',
    name: 'Purchase Order Summary',
    nameVi: 'Báo cáo Đơn mua hàng',
    description: 'PO summary by status, supplier, and value',
    descriptionVi: 'Tổng hợp PO theo trạng thái, NCC, giá trị',
    icon: 'ShoppingCart',
    category: 'purchasing',
    columns: [
      { key: 'poNumber', label: 'PO Number', labelVi: 'Số PO', type: 'string' },
      { key: 'supplierName', label: 'Supplier', labelVi: 'NCC', type: 'string' },
      { key: 'orderDate', label: 'Order Date', labelVi: 'Ngày đặt', type: 'date' },
      { key: 'totalAmount', label: 'Amount', labelVi: 'Tổng tiền', type: 'currency' },
      { key: 'status', label: 'Status', labelVi: 'Trạng thái', type: 'string' },
      { key: 'expectedDate', label: 'Expected', labelVi: 'Ngày giao DK', type: 'date' },
    ],
    defaultFrequency: 'WEEKLY',
    defaultTime: '08:00',
    query: 'po-summary',
    filters: [
      { key: 'status', label: 'Trạng thái', type: 'select' },
      { key: 'dateRange', label: 'Khoảng thời gian', type: 'date' },
    ],
  },
  {
    id: 'production-status',
    name: 'Production Status',
    nameVi: 'Báo cáo Sản xuất',
    description: 'Work order progress, output, and efficiency',
    descriptionVi: 'Tiến độ WO, sản lượng, hiệu suất',
    icon: 'Factory',
    category: 'production',
    columns: [
      { key: 'woNumber', label: 'WO Number', labelVi: 'Số WO', type: 'string' },
      { key: 'productName', label: 'Product', labelVi: 'Sản phẩm', type: 'string' },
      { key: 'plannedQty', label: 'Planned', labelVi: 'SL Kế hoạch', type: 'number' },
      { key: 'completedQty', label: 'Completed', labelVi: 'SL Hoàn thành', type: 'number' },
      { key: 'progress', label: 'Progress', labelVi: '% Tiến độ', type: 'percent' },
      { key: 'status', label: 'Status', labelVi: 'Trạng thái', type: 'string' },
    ],
    defaultFrequency: 'DAILY',
    defaultTime: '17:00',
    query: 'production-status',
  },
  {
    id: 'supplier-performance',
    name: 'Supplier Performance',
    nameVi: 'Đánh giá NCC',
    description: 'On-time delivery, quality, and pricing evaluation',
    descriptionVi: 'Đánh giá NCC: giao hàng đúng hạn, chất lượng, giá',
    icon: 'Star',
    category: 'supplier',
    columns: [
      { key: 'supplierName', label: 'Supplier', labelVi: 'NCC', type: 'string' },
      { key: 'poCount', label: 'PO Count', labelVi: 'Số PO', type: 'number' },
      { key: 'onTimeRate', label: 'On-Time %', labelVi: 'Giao đúng hạn %', type: 'percent' },
      { key: 'qualityRate', label: 'Quality %', labelVi: 'Đạt CL %', type: 'percent' },
      { key: 'avgPrice', label: 'Avg Price', labelVi: 'Giá TB', type: 'currency' },
      { key: 'score', label: 'Score', labelVi: 'Điểm tổng', type: 'number' },
    ],
    defaultFrequency: 'MONTHLY',
    defaultTime: '08:00',
    query: 'supplier-performance',
  },
  {
    id: 'low-stock-alert',
    name: 'Low Stock Alert',
    nameVi: 'Cảnh báo Hết hàng',
    description: 'Items below reorder point',
    descriptionVi: 'Danh sách SP dưới mức đặt hàng lại',
    icon: 'AlertTriangle',
    category: 'inventory',
    columns: [
      { key: 'partNumber', label: 'Part Number', labelVi: 'Mã SP', type: 'string' },
      { key: 'name', label: 'Name', labelVi: 'Tên', type: 'string' },
      { key: 'quantityOnHand', label: 'On Hand', labelVi: 'Tồn kho', type: 'number' },
      { key: 'reorderPoint', label: 'ROP', labelVi: 'ROP', type: 'number' },
      { key: 'shortage', label: 'Shortage', labelVi: 'Thiếu', type: 'number' },
      { key: 'primarySupplier', label: 'Supplier', labelVi: 'NCC chính', type: 'string' },
    ],
    defaultFrequency: 'DAILY',
    defaultTime: '07:30',
    query: 'low-stock-alert',
  },
  {
    id: 'quality-report',
    name: 'Quality Report',
    nameVi: 'Báo cáo Chất lượng',
    description: 'NCR, CAPA, pass rate, and common defects',
    descriptionVi: 'NCR, CAPA, tỷ lệ đạt, lỗi thường gặp',
    icon: 'CheckCircle',
    category: 'quality',
    columns: [
      { key: 'period', label: 'Period', labelVi: 'Kỳ', type: 'string' },
      { key: 'inspectionCount', label: 'Inspections', labelVi: 'Số kiểm tra', type: 'number' },
      { key: 'passCount', label: 'Pass', labelVi: 'Đạt', type: 'number' },
      { key: 'failCount', label: 'Fail', labelVi: 'Không đạt', type: 'number' },
      { key: 'passRate', label: 'Pass Rate', labelVi: 'Tỷ lệ %', type: 'percent' },
      { key: 'topDefects', label: 'Top Defects', labelVi: 'Top lỗi', type: 'string' },
    ],
    defaultFrequency: 'WEEKLY',
    defaultTime: '08:00',
    query: 'quality-report',
  },
];

/**
 * Get template by ID
 */
export function getReportTemplate(templateId: string): ReportTemplateConfig | undefined {
  return SCHEDULED_REPORT_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get scheduled templates by category
 */
export function getScheduledTemplatesByCategory(category: string): ReportTemplateConfig[] {
  return SCHEDULED_REPORT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(SCHEDULED_REPORT_TEMPLATES.map((t) => t.category))];
}

export default SCHEDULED_REPORT_TEMPLATES;
