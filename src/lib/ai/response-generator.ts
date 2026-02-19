// =============================================================================
// AI RESPONSE GENERATOR
// Generates structured responses with actionable suggestions
// =============================================================================

import { QueryIntent, DetectedIntent } from './prompts';

// =============================================================================
// TYPES
// =============================================================================

/** Generic inventory item from data context */
interface InventoryAlertItem {
  partNumber: string;
  partName: string;
  onHand: number;
  minStock: number;
  safetyStock?: number;
  status: string;
  unit?: string;
}

/** Generic order item from data context */
interface OrderItem {
  orderNumber: string;
  customer?: string;
  value?: number;
  requiredDate?: string;
  status?: string;
}

/** Generic work order item from data context */
interface WorkOrderItem {
  orderNumber: string;
  product?: string;
  status: string;
  progress?: number;
}

/** Generic purchase suggestion from data context */
interface PurchaseSuggestionItem {
  partNumber: string;
  quantity: number;
  unit?: string;
  supplier?: string;
  totalCost?: number;
  priority: string;
}

/** Generic NCR item from data context */
interface NCRItem {
  ncrNumber: string;
  description?: string;
  status?: string;
  severity?: string;
}

export interface AIAction {
  id: string;
  type: 'create' | 'navigate' | 'export' | 'alert' | 'analyze';
  label: string;
  labelVi: string;
  description: string;
  descriptionVi: string;
  icon: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  payload: Record<string, unknown>;
  endpoint?: string;
  href?: string;
}

export interface StructuredResponse {
  summary: string;
  details: ResponseSection[];
  actions: AIAction[];
  alerts: ResponseAlert[];
  relatedQueries: string[];
  confidence: number;
}

export interface ResponseSection {
  title: string;
  type: 'stats' | 'table' | 'list' | 'chart';
  data: Record<string, unknown> | Record<string, unknown>[];
}

export interface ResponseAlert {
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
  action?: AIAction;
}

// =============================================================================
// ACTION GENERATORS
// =============================================================================

function generateInventoryActions(data: Record<string, unknown>): AIAction[] {
  const actions: AIAction[] = [];
  const alerts = data.alerts as InventoryAlertItem[] | undefined;
  const items = data.items as InventoryAlertItem[] | undefined;

  // Check for critical items
  const criticalItems = (alerts || items || []).filter(
    (item) => item.status === 'CRITICAL' || item.status === 'OUT'
  );

  if (criticalItems.length > 0) {
    // Action: Create PR for critical items
    actions.push({
      id: 'create-pr-critical',
      type: 'create',
      label: 'Create Purchase Requisition',
      labelVi: 'Tạo Yêu cầu mua hàng',
      description: `Create PR for ${criticalItems.length} critical items`,
      descriptionVi: `Tạo PR cho ${criticalItems.length} vật tư cấp bách`,
      icon: 'FileText',
      riskLevel: 'low',
      requiresApproval: false,
      payload: {
        items: criticalItems.map((item) => ({
          partNumber: item.partNumber,
          quantity: Math.max(item.minStock - item.onHand + (item.safetyStock || 0), 1),
        })),
        priority: 'URGENT',
      },
      href: '/purchasing/requisitions/new',
    });

    // Action: View critical items
    actions.push({
      id: 'view-critical',
      type: 'navigate',
      label: 'View Critical Items',
      labelVi: 'Xem vật tư cấp bách',
      description: 'Navigate to inventory with critical filter',
      descriptionVi: 'Đi đến trang tồn kho với bộ lọc cấp bách',
      icon: 'AlertTriangle',
      riskLevel: 'low',
      requiresApproval: false,
      payload: { filter: 'critical' },
      href: '/inventory?status=critical',
    });
  }

  // Check for low stock items
  const lowStockItems = (alerts || items || []).filter(
    (item) => item.status === 'LOW'
  );

  if (lowStockItems.length > 0) {
    actions.push({
      id: 'create-pr-low',
      type: 'create',
      label: 'Create PR for Low Stock',
      labelVi: 'Tạo PR cho hàng sắp hết',
      description: `Create PR for ${lowStockItems.length} low stock items`,
      descriptionVi: `Tạo PR cho ${lowStockItems.length} vật tư sắp hết`,
      icon: 'ShoppingCart',
      riskLevel: 'low',
      requiresApproval: false,
      payload: {
        items: lowStockItems.map((item) => ({
          partNumber: item.partNumber,
          quantity: Math.max(item.minStock - item.onHand, 1),
        })),
        priority: 'HIGH',
      },
      href: '/purchasing/requisitions/new',
    });
  }

  // Action: Export inventory report
  actions.push({
    id: 'export-inventory',
    type: 'export',
    label: 'Export Inventory Report',
    labelVi: 'Xuất báo cáo tồn kho',
    description: 'Download inventory report as Excel',
    descriptionVi: 'Tải báo cáo tồn kho dạng Excel',
    icon: 'Download',
    riskLevel: 'low',
    requiresApproval: false,
    payload: { format: 'xlsx' },
    endpoint: '/api/inventory/export',
  });

  return actions;
}

function generateOrderActions(data: Record<string, unknown>): AIAction[] {
  const actions: AIAction[] = [];
  const pending = data.pending as OrderItem[] | undefined;

  if (pending && pending.length > 0) {
    // Action: View pending orders
    actions.push({
      id: 'view-pending-orders',
      type: 'navigate',
      label: 'View Pending Orders',
      labelVi: 'Xem đơn hàng chờ xử lý',
      description: `${pending.length} orders need attention`,
      descriptionVi: `${pending.length} đơn hàng cần xử lý`,
      icon: 'Clock',
      riskLevel: 'low',
      requiresApproval: false,
      payload: { status: 'pending' },
      href: '/orders?status=pending',
    });

    // Action: Process orders
    actions.push({
      id: 'process-orders',
      type: 'analyze',
      label: 'Run MRP for Pending',
      labelVi: 'Chạy MRP cho đơn chờ',
      description: 'Calculate material requirements for pending orders',
      descriptionVi: 'Tính toán nhu cầu vật tư cho đơn hàng chờ',
      icon: 'Calculator',
      riskLevel: 'low',
      requiresApproval: false,
      payload: { orderIds: pending.map((o) => o.orderNumber) },
      href: '/mrp/run',
    });
  }

  // Action: Create new order
  actions.push({
    id: 'create-order',
    type: 'create',
    label: 'Create Sales Order',
    labelVi: 'Tạo đơn hàng mới',
    description: 'Create a new sales order',
    descriptionVi: 'Tạo đơn hàng bán mới',
    icon: 'Plus',
    riskLevel: 'low',
    requiresApproval: false,
    payload: {},
    href: '/orders/new',
  });

  return actions;
}

function generateProductionActions(data: Record<string, unknown>): AIAction[] {
  const actions: AIAction[] = [];
  const workOrders = data.workOrders as WorkOrderItem[] | undefined;

  // Check for waiting material issues
  const waitingOrders = (workOrders || []).filter(
    (wo) => wo.status === 'Waiting Material' || wo.status === 'waiting_material'
  );

  if (waitingOrders.length > 0) {
    actions.push({
      id: 'resolve-material',
      type: 'analyze',
      label: 'Resolve Material Issues',
      labelVi: 'Giải quyết thiếu vật tư',
      description: `${waitingOrders.length} orders waiting for material`,
      descriptionVi: `${waitingOrders.length} lệnh đang chờ vật tư`,
      icon: 'Package',
      riskLevel: 'medium',
      requiresApproval: false,
      payload: { woNumbers: waitingOrders.map((wo) => wo.orderNumber) },
      href: '/production?status=waiting',
    });
  }

  // Action: View production schedule
  actions.push({
    id: 'view-schedule',
    type: 'navigate',
    label: 'View Production Schedule',
    labelVi: 'Xem lịch sản xuất',
    description: 'Open production scheduling view',
    descriptionVi: 'Mở giao diện lập lịch sản xuất',
    icon: 'Calendar',
    riskLevel: 'low',
    requiresApproval: false,
    payload: {},
    href: '/production/schedule',
  });

  return actions;
}

function generatePurchaseActions(data: Record<string, unknown>): AIAction[] {
  const actions: AIAction[] = [];
  const suggestions = data.suggestions as PurchaseSuggestionItem[] | undefined;

  if (suggestions && suggestions.length > 0) {
    // Group by priority
    const urgent = suggestions.filter((s) => s.priority === 'URGENT');
    const high = suggestions.filter((s) => s.priority === 'HIGH');

    if (urgent.length > 0) {
      actions.push({
        id: 'create-po-urgent',
        type: 'create',
        label: 'Create Urgent POs',
        labelVi: 'Tạo PO cấp bách',
        description: `Create ${urgent.length} urgent purchase orders`,
        descriptionVi: `Tạo ${urgent.length} đơn mua hàng cấp bách`,
        icon: 'AlertCircle',
        riskLevel: 'medium',
        requiresApproval: true,
        payload: {
          items: urgent,
          priority: 'URGENT',
        },
        href: '/purchasing/orders/new',
      });
    }

    // Action: Review all suggestions
    actions.push({
      id: 'review-suggestions',
      type: 'navigate',
      label: 'Review Purchase Suggestions',
      labelVi: 'Xem đề xuất mua hàng',
      description: `${suggestions.length} items need ordering`,
      descriptionVi: `${suggestions.length} vật tư cần đặt hàng`,
      icon: 'List',
      riskLevel: 'low',
      requiresApproval: false,
      payload: {},
      href: '/mrp/suggestions',
    });
  }

  return actions;
}

function generateQualityActions(data: Record<string, unknown>): AIAction[] {
  const actions: AIAction[] = [];
  const ncrs = data.ncrs as NCRItem[] | undefined;

  if (ncrs && ncrs.length > 0) {
    const criticalNCRs = ncrs.filter(
      (n) => n.severity === 'critical' || n.severity === 'high'
    );

    if (criticalNCRs.length > 0) {
      actions.push({
        id: 'view-critical-ncrs',
        type: 'navigate',
        label: 'View Critical NCRs',
        labelVi: 'Xem NCR nghiêm trọng',
        description: `${criticalNCRs.length} critical NCRs need attention`,
        descriptionVi: `${criticalNCRs.length} NCR nghiêm trọng cần xử lý`,
        icon: 'AlertOctagon',
        riskLevel: 'high',
        requiresApproval: false,
        payload: { severity: 'critical' },
        href: '/quality/ncr?severity=critical',
      });
    }

    // Action: Create CAPA
    actions.push({
      id: 'create-capa',
      type: 'create',
      label: 'Create CAPA',
      labelVi: 'Tạo CAPA',
      description: 'Create corrective action for NCR',
      descriptionVi: 'Tạo hành động khắc phục cho NCR',
      icon: 'Shield',
      riskLevel: 'low',
      requiresApproval: false,
      payload: {},
      href: '/quality/capa/new',
    });
  }

  return actions;
}

// =============================================================================
// ALERT GENERATORS
// =============================================================================

function generateAlerts(
  intent: QueryIntent,
  data: Record<string, unknown>
): ResponseAlert[] {
  const alerts: ResponseAlert[] = [];

  switch (intent) {
    case 'inventory_status':
    case 'inventory_shortage': {
      const invItems = (data.alerts || data.items) as InventoryAlertItem[] | undefined;
      const criticalCount = (invItems || []).filter(
        (i) => i.status === 'CRITICAL' || i.status === 'OUT'
      ).length;

      if (criticalCount > 0) {
        alerts.push({
          type: 'critical',
          message: `🔴 ${criticalCount} vật tư ở mức tồn kho nguy hiểm! Cần đặt hàng ngay.`,
          action: {
            id: 'quick-pr',
            type: 'create',
            label: 'Quick PR',
            labelVi: 'Tạo PR nhanh',
            description: 'Create PR for critical items',
            descriptionVi: 'Tạo PR cho vật tư cấp bách',
            icon: 'Zap',
            riskLevel: 'low',
            requiresApproval: false,
            payload: { priority: 'URGENT' },
            href: '/purchasing/requisitions/new?priority=urgent',
          },
        });
      }

      const lowCount = (invItems || []).filter((i) => i.status === 'LOW').length;
      if (lowCount > 0) {
        alerts.push({
          type: 'warning',
          message: `🟡 ${lowCount} vật tư sắp hết. Nên lên kế hoạch đặt hàng.`,
        });
      }
      break;
    }

    case 'order_status':
    case 'order_summary': {
      const orderPending = data.pending as OrderItem[] | undefined;
      if (orderPending && orderPending.length > 5) {
        alerts.push({
          type: 'warning',
          message: `⚠️ Có ${orderPending.length} đơn hàng chờ xử lý. Cân nhắc xử lý sớm để không bị trễ.`,
        });
      }
      break;
    }

    case 'production_status': {
      const prodSummary = data.summary as Record<string, number> | undefined;
      const waitingCount = prodSummary?.waitingCount;
      const efficiency = prodSummary?.efficiency;
      if (waitingCount && waitingCount > 0) {
        alerts.push({
          type: 'warning',
          message: `⚠️ ${waitingCount} lệnh sản xuất đang chờ vật tư. Cần kiểm tra tồn kho.`,
        });
      }
      if (efficiency && efficiency < 80) {
        alerts.push({
          type: 'info',
          message: `📊 Hiệu suất sản xuất ${efficiency.toFixed(1)}% - dưới mục tiêu 80%.`,
        });
      }
      break;
    }

    case 'quality_report': {
      const qualSummary = data.summary as Record<string, number> | undefined;
      const openNCRs = qualSummary?.openNCRs;
      const passRate = qualSummary?.passRate;
      if (openNCRs && openNCRs > 5) {
        alerts.push({
          type: 'warning',
          message: `⚠️ Có ${openNCRs} NCR đang mở. Cần xử lý để đảm bảo chất lượng.`,
        });
      }
      if (passRate && passRate < 95) {
        alerts.push({
          type: 'critical',
          message: `🔴 Tỷ lệ đạt chất lượng ${passRate.toFixed(1)}% - dưới ngưỡng 95%!`,
        });
      }
      break;
    }
  }

  return alerts;
}

// =============================================================================
// RELATED QUERIES
// =============================================================================

function getRelatedQueries(intent: QueryIntent): string[] {
  const queryMap: Record<QueryIntent, string[]> = {
    inventory_status: [
      'Vật tư nào sắp hết?',
      'Đề xuất mua hàng tháng này',
      'Giá trị tồn kho theo danh mục',
    ],
    inventory_shortage: [
      'Tạo PR cho vật tư thiếu',
      'Nhà cung cấp nào có hàng sẵn?',
      'Lead time trung bình của vật tư',
    ],
    order_status: [
      'Tiến độ sản xuất cho đơn này',
      'Đủ vật tư cho đơn hàng không?',
      'Lịch sử đơn hàng của khách này',
    ],
    order_summary: [
      'So sánh với tháng trước',
      'Top 10 khách hàng tháng này',
      'Dự báo doanh thu tháng sau',
    ],
    production_status: [
      'Lệnh nào cần ưu tiên?',
      'Công suất nhà máy tuần này',
      'Vật tư nào đang chờ?',
    ],
    mrp_calculation: [
      'Tổng giá trị cần mua',
      'Nhà cung cấp nào rẻ nhất?',
      'Lead time dài nhất là gì?',
    ],
    purchase_suggestion: [
      'Tạo PO tự động',
      'So sánh giá nhà cung cấp',
      'Lịch sử giá vật tư',
    ],
    quality_report: [
      'NCR nào cần xử lý gấp?',
      'Trend chất lượng 3 tháng',
      'Nhà cung cấp nào có lỗi nhiều?',
    ],
    supplier_info: [
      'Performance rating của họ',
      'Lead time trung bình',
      'Đơn hàng gần đây với họ',
    ],
    analytics: [
      'So sánh với năm trước',
      'Dự báo quý sau',
      'Top sản phẩm bán chạy',
    ],
    help: [
      'Tồn kho có gì đáng lo?',
      'Đơn hàng hôm nay',
      'Tiến độ sản xuất',
    ],
    general: [
      'Tổng quan hệ thống',
      'Cảnh báo quan trọng',
      'Việc cần làm hôm nay',
    ],
  };

  return queryMap[intent] || queryMap.general;
}

// =============================================================================
// MAIN RESPONSE GENERATOR
// =============================================================================

export function generateStructuredResponse(
  intent: DetectedIntent,
  data: Record<string, unknown>
): StructuredResponse {
  const { intent: queryIntent, confidence } = intent;

  // Generate actions based on intent
  let actions: AIAction[] = [];
  switch (queryIntent) {
    case 'inventory_status':
    case 'inventory_shortage':
      actions = generateInventoryActions(data);
      break;
    case 'order_status':
    case 'order_summary':
      actions = generateOrderActions(data);
      break;
    case 'production_status':
      actions = generateProductionActions(data);
      break;
    case 'purchase_suggestion':
    case 'mrp_calculation':
      actions = generatePurchaseActions(data);
      break;
    case 'quality_report':
      actions = generateQualityActions(data);
      break;
    default:
      // General actions
      actions = [
        {
          id: 'view-dashboard',
          type: 'navigate',
          label: 'Go to Dashboard',
          labelVi: 'Đi đến Dashboard',
          description: 'View system overview',
          descriptionVi: 'Xem tổng quan hệ thống',
          icon: 'LayoutDashboard',
          riskLevel: 'low',
          requiresApproval: false,
          payload: {},
          href: '/dashboard',
        },
      ];
  }

  // Generate alerts
  const alerts = generateAlerts(queryIntent, data);

  // Generate summary
  const summary = generateSummary(queryIntent, data);

  // Generate details sections
  const details = generateDetailSections(queryIntent, data);

  // Get related queries
  const relatedQueries = getRelatedQueries(queryIntent);

  return {
    summary,
    details,
    actions: actions.slice(0, 4), // Limit to 4 actions
    alerts,
    relatedQueries,
    confidence,
  };
}

// =============================================================================
// SUMMARY GENERATOR
// =============================================================================

function generateSummary(intent: QueryIntent, data: Record<string, unknown>): string {
  switch (intent) {
    case 'inventory_status': {
      const summary = data.summary as Record<string, number> | undefined;
      if (!summary) return 'Không có dữ liệu tồn kho.';
      return `📦 **Tồn kho**: ${summary.totalItems} vật tư | 🟢 OK: ${summary.okCount} | 🟡 Sắp hết: ${summary.lowCount} | 🔴 Nguy hiểm: ${summary.outCount}`;
    }
    case 'inventory_shortage': {
      const critical = data.critical as unknown[] | undefined;
      const low = data.low as unknown[] | undefined;
      const criticalCount = critical?.length || 0;
      const lowCount = low?.length || 0;
      return `⚠️ **Cảnh báo tồn kho**: ${criticalCount} vật tư nguy hiểm, ${lowCount} vật tư sắp hết cần chú ý.`;
    }
    case 'order_status':
    case 'order_summary': {
      const summary = data.summary as Record<string, number> | undefined;
      if (!summary) return 'Không có dữ liệu đơn hàng.';
      return `📋 **Đơn hàng**: Tổng ${summary.totalOrders} | Chờ xử lý: ${summary.pendingCount} | Đang xử lý: ${summary.processingCount} | Hoàn thành: ${summary.completedCount}`;
    }
    case 'production_status': {
      const summary = data.summary as Record<string, number> | undefined;
      if (!summary) return 'Không có dữ liệu sản xuất.';
      return `🏭 **Sản xuất**: Hiệu suất ${summary.efficiency?.toFixed(1)}% | Đang chạy: ${summary.runningCount} | Chờ vật tư: ${summary.waitingCount}`;
    }
    case 'quality_report': {
      const summary = data.summary as Record<string, number> | undefined;
      if (!summary) return 'Không có dữ liệu chất lượng.';
      return `✅ **Chất lượng**: Tỷ lệ đạt ${summary.passRate?.toFixed(1)}% | NCR mở: ${summary.openNCRs} | Kiểm tra hôm nay: ${summary.inspectionsToday}`;
    }
    default:
      return 'Đây là kết quả phân tích từ hệ thống.';
  }
}

// =============================================================================
// DETAIL SECTIONS GENERATOR
// =============================================================================

function generateDetailSections(
  intent: QueryIntent,
  data: Record<string, unknown>
): ResponseSection[] {
  const sections: ResponseSection[] = [];

  switch (intent) {
    case 'inventory_status':
    case 'inventory_shortage': {
      const invAlerts = data.alerts as InventoryAlertItem[] | undefined;
      const invItems = data.items as InventoryAlertItem[] | undefined;
      const invSummary = data.summary as Record<string, number> | undefined;

      if (invSummary) {
        sections.push({
          title: 'Thống kê tồn kho',
          type: 'stats',
          data: {
            'Tổng vật tư': invSummary.totalItems,
            'Đủ hàng': invSummary.okCount,
            'Sắp hết': invSummary.lowCount,
            'Nguy hiểm': invSummary.outCount,
            'Giá trị': formatCurrency(invSummary.totalValue),
          },
        });
      }

      const criticalItems = (invAlerts || invItems || [])
        .filter((i) => i.status === 'CRITICAL' || i.status === 'OUT')
        .slice(0, 10);

      if (criticalItems.length > 0) {
        sections.push({
          title: 'Vật tư cần đặt gấp',
          type: 'table',
          data: criticalItems.map((item) => ({
            'Mã vật tư': item.partNumber,
            'Tên': item.partName,
            'Tồn kho': item.onHand,
            'Tối thiểu': item.minStock,
            'Trạng thái': item.status,
          })),
        });
      }
      break;
    }

    case 'order_status':
    case 'order_summary': {
      const orderPending = data.pending as OrderItem[] | undefined;

      if (orderPending && orderPending.length > 0) {
        sections.push({
          title: 'Đơn hàng chờ xử lý',
          type: 'table',
          data: orderPending.slice(0, 5).map((o) => ({
            'Mã đơn': o.orderNumber,
            'Khách hàng': o.customer,
            'Giá trị': formatCurrency(o.value || 0),
            'Hạn giao': o.requiredDate,
          })),
        });
      }
      break;
    }

    case 'purchase_suggestion': {
      const purchSuggestions = data.suggestions as PurchaseSuggestionItem[] | undefined;
      const totalValue = data.totalValue as number | undefined;

      if (totalValue) {
        sections.push({
          title: 'Tổng hợp đề xuất',
          type: 'stats',
          data: {
            'Tổng giá trị': formatCurrency(totalValue),
            'Số vật tư': purchSuggestions?.length || 0,
          },
        });
      }

      if (purchSuggestions && purchSuggestions.length > 0) {
        sections.push({
          title: 'Chi tiết đề xuất mua',
          type: 'table',
          data: purchSuggestions.slice(0, 10).map((s) => ({
            'Vật tư': s.partNumber,
            'Số lượng': `${s.quantity} ${s.unit}`,
            'Nhà CC': s.supplier,
            'Giá trị': formatCurrency(s.totalCost || 0),
            'Ưu tiên': s.priority,
          })),
        });
      }
      break;
    }
  }

  return sections;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

// =============================================================================
// EXPORT
// =============================================================================

export default {
  generateStructuredResponse,
};
