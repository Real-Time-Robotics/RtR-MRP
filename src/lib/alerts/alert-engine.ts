// =============================================================================
// ALERT ENGINE
// Core logic for manufacturing alerts and notifications
// =============================================================================

export type AlertType =
  | 'LOW_STOCK'
  | 'STOCKOUT'
  | 'LOW_OEE'
  | 'EQUIPMENT_DOWN'
  | 'MAINTENANCE_DUE'
  | 'MAINTENANCE_OVERDUE'
  | 'QUALITY_ISSUE'
  | 'HIGH_DEFECT_RATE'
  | 'ORDER_DELAYED'
  | 'ORDER_AT_RISK'
  | 'CAPACITY_OVERLOAD'
  | 'MRP_SHORTAGE'
  | 'SUPPLIER_LATE'
  | 'INSPECTION_FAILED'
  | 'NCR_OPEN'
  | 'SYSTEM_ERROR';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  entityType?: string; // Equipment, Order, Part, etc.
  entityId?: string;
  entityCode?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  expiresAt?: Date;
}

export interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  threshold?: number;
  cooldownMinutes?: number; // Prevent duplicate alerts within this period
}

// Default alert rules configuration
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  { type: 'STOCKOUT', severity: 'CRITICAL', enabled: true, cooldownMinutes: 60 },
  { type: 'LOW_STOCK', severity: 'WARNING', enabled: true, threshold: 10, cooldownMinutes: 120 },
  { type: 'LOW_OEE', severity: 'WARNING', enabled: true, threshold: 65, cooldownMinutes: 60 },
  { type: 'EQUIPMENT_DOWN', severity: 'CRITICAL', enabled: true, cooldownMinutes: 5 },
  { type: 'MAINTENANCE_DUE', severity: 'INFO', enabled: true, cooldownMinutes: 1440 }, // 24h
  { type: 'MAINTENANCE_OVERDUE', severity: 'WARNING', enabled: true, cooldownMinutes: 720 }, // 12h
  { type: 'QUALITY_ISSUE', severity: 'WARNING', enabled: true, cooldownMinutes: 30 },
  { type: 'HIGH_DEFECT_RATE', severity: 'CRITICAL', enabled: true, threshold: 5, cooldownMinutes: 60 },
  { type: 'ORDER_DELAYED', severity: 'CRITICAL', enabled: true, cooldownMinutes: 240 },
  { type: 'ORDER_AT_RISK', severity: 'WARNING', enabled: true, cooldownMinutes: 480 },
  { type: 'CAPACITY_OVERLOAD', severity: 'WARNING', enabled: true, threshold: 95, cooldownMinutes: 120 },
  { type: 'MRP_SHORTAGE', severity: 'WARNING', enabled: true, cooldownMinutes: 240 },
  { type: 'SUPPLIER_LATE', severity: 'WARNING', enabled: true, cooldownMinutes: 480 },
  { type: 'INSPECTION_FAILED', severity: 'CRITICAL', enabled: true, cooldownMinutes: 30 },
  { type: 'NCR_OPEN', severity: 'WARNING', enabled: true, cooldownMinutes: 1440 },
  { type: 'SYSTEM_ERROR', severity: 'CRITICAL', enabled: true, cooldownMinutes: 5 },
];

// Alert type configurations
export const ALERT_TYPE_CONFIG: Record<AlertType, {
  label: string;
  labelVi: string;
  icon: string;
  defaultSeverity: AlertSeverity;
  category: string;
}> = {
  LOW_STOCK: {
    label: 'Low Stock',
    labelVi: 'Tồn kho thấp',
    icon: 'package',
    defaultSeverity: 'WARNING',
    category: 'inventory',
  },
  STOCKOUT: {
    label: 'Stock Out',
    labelVi: 'Hết hàng',
    icon: 'package-x',
    defaultSeverity: 'CRITICAL',
    category: 'inventory',
  },
  LOW_OEE: {
    label: 'Low OEE',
    labelVi: 'OEE thấp',
    icon: 'gauge',
    defaultSeverity: 'WARNING',
    category: 'production',
  },
  EQUIPMENT_DOWN: {
    label: 'Equipment Down',
    labelVi: 'Thiết bị ngừng',
    icon: 'alert-triangle',
    defaultSeverity: 'CRITICAL',
    category: 'equipment',
  },
  MAINTENANCE_DUE: {
    label: 'Maintenance Due',
    labelVi: 'Cần bảo trì',
    icon: 'wrench',
    defaultSeverity: 'INFO',
    category: 'maintenance',
  },
  MAINTENANCE_OVERDUE: {
    label: 'Maintenance Overdue',
    labelVi: 'Bảo trì quá hạn',
    icon: 'clock',
    defaultSeverity: 'WARNING',
    category: 'maintenance',
  },
  QUALITY_ISSUE: {
    label: 'Quality Issue',
    labelVi: 'Vấn đề chất lượng',
    icon: 'shield-alert',
    defaultSeverity: 'WARNING',
    category: 'quality',
  },
  HIGH_DEFECT_RATE: {
    label: 'High Defect Rate',
    labelVi: 'Tỷ lệ lỗi cao',
    icon: 'x-circle',
    defaultSeverity: 'CRITICAL',
    category: 'quality',
  },
  ORDER_DELAYED: {
    label: 'Order Delayed',
    labelVi: 'Đơn hàng trễ',
    icon: 'clock',
    defaultSeverity: 'CRITICAL',
    category: 'orders',
  },
  ORDER_AT_RISK: {
    label: 'Order At Risk',
    labelVi: 'Đơn hàng có rủi ro',
    icon: 'alert-circle',
    defaultSeverity: 'WARNING',
    category: 'orders',
  },
  CAPACITY_OVERLOAD: {
    label: 'Capacity Overload',
    labelVi: 'Quá tải công suất',
    icon: 'trending-up',
    defaultSeverity: 'WARNING',
    category: 'production',
  },
  MRP_SHORTAGE: {
    label: 'MRP Shortage',
    labelVi: 'Thiếu hụt MRP',
    icon: 'calculator',
    defaultSeverity: 'WARNING',
    category: 'planning',
  },
  SUPPLIER_LATE: {
    label: 'Supplier Late',
    labelVi: 'NCC giao trễ',
    icon: 'truck',
    defaultSeverity: 'WARNING',
    category: 'purchasing',
  },
  INSPECTION_FAILED: {
    label: 'Inspection Failed',
    labelVi: 'Kiểm tra không đạt',
    icon: 'x-square',
    defaultSeverity: 'CRITICAL',
    category: 'quality',
  },
  NCR_OPEN: {
    label: 'NCR Open',
    labelVi: 'NCR đang mở',
    icon: 'file-warning',
    defaultSeverity: 'WARNING',
    category: 'quality',
  },
  SYSTEM_ERROR: {
    label: 'System Error',
    labelVi: 'Lỗi hệ thống',
    icon: 'server-crash',
    defaultSeverity: 'CRITICAL',
    category: 'system',
  },
};

// Severity configurations
export const SEVERITY_CONFIG: Record<AlertSeverity, {
  label: string;
  labelVi: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  CRITICAL: {
    label: 'Critical',
    labelVi: 'Nghiêm trọng',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-500',
  },
  WARNING: {
    label: 'Warning',
    labelVi: 'Cảnh báo',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-500',
  },
  INFO: {
    label: 'Info',
    labelVi: 'Thông tin',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-500',
  },
};

// Status configurations
export const STATUS_CONFIG: Record<AlertStatus, {
  label: string;
  labelVi: string;
  color: string;
  bgColor: string;
}> = {
  ACTIVE: {
    label: 'Active',
    labelVi: 'Đang hoạt động',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
  },
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    labelVi: 'Đã xác nhận',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
  },
  RESOLVED: {
    label: 'Resolved',
    labelVi: 'Đã xử lý',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
  },
  DISMISSED: {
    label: 'Dismissed',
    labelVi: 'Đã bỏ qua',
    color: 'text-gray-600',
    bgColor: 'bg-gray-500',
  },
};

// Helper functions
export function generateAlertId(): string {
  return `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createAlert(params: {
  type: AlertType;
  title: string;
  message: string;
  severity?: AlertSeverity;
  entityType?: string;
  entityId?: string;
  entityCode?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}): Alert {
  const config = ALERT_TYPE_CONFIG[params.type];
  return {
    id: generateAlertId(),
    type: params.type,
    severity: params.severity || config.defaultSeverity,
    status: 'ACTIVE',
    title: params.title,
    message: params.message,
    entityType: params.entityType,
    entityId: params.entityId,
    entityCode: params.entityCode,
    metadata: params.metadata,
    createdAt: new Date(),
    expiresAt: params.expiresAt,
  };
}

export function formatAlertTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  if (hours < 24) return `${hours} giờ`;
  if (days < 7) return `${days} ngày`;
  return date.toLocaleDateString('vi-VN');
}

export function getAlertPriority(alert: Alert): number {
  const severityWeight: Record<AlertSeverity, number> = {
    CRITICAL: 100,
    WARNING: 50,
    INFO: 10,
  };
  const statusWeight: Record<AlertStatus, number> = {
    ACTIVE: 1000,
    ACKNOWLEDGED: 100,
    RESOLVED: 10,
    DISMISSED: 1,
  };
  return severityWeight[alert.severity] + statusWeight[alert.status];
}

export function sortAlertsByPriority(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const priorityDiff = getAlertPriority(b) - getAlertPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

// Mock data generator for testing
export function generateMockAlerts(): Alert[] {
  const now = new Date();
  return [
    createAlert({
      type: 'EQUIPMENT_DOWN',
      title: 'ROBOT-001 dừng hoạt động',
      message: 'Welding Robot ngừng do lỗi servo motor arm #2',
      entityType: 'Equipment',
      entityId: '3',
      entityCode: 'ROBOT-001',
      metadata: { location: 'Bay B2', downSince: new Date(now.getTime() - 15 * 60000) },
    }),
    createAlert({
      type: 'HIGH_DEFECT_RATE',
      title: 'Tỷ lệ lỗi cao tại CNC-002',
      message: 'Defect rate 8.5% (ngưỡng: 5%)',
      severity: 'WARNING',
      entityType: 'Equipment',
      entityId: '2',
      entityCode: 'CNC-002',
      metadata: { defectRate: 8.5, threshold: 5, shift: 'Ca sáng' },
    }),
    createAlert({
      type: 'MAINTENANCE_DUE',
      title: 'Bảo trì định kỳ TEST-001',
      message: 'PM scheduled trong 2 ngày',
      entityType: 'Equipment',
      entityId: '1',
      entityCode: 'TEST-001',
      metadata: { scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60000) },
    }),
    createAlert({
      type: 'LOW_STOCK',
      title: 'Tồn kho thấp: Bearing SKF-6205',
      message: 'Còn 5 units (Min: 20)',
      entityType: 'Part',
      entityId: 'P001',
      entityCode: 'SKF-6205',
      metadata: { currentStock: 5, minStock: 20 },
    }),
    createAlert({
      type: 'ORDER_AT_RISK',
      title: 'SO-2026-001 có nguy cơ trễ',
      message: 'Thiếu nguyên liệu cho sản xuất',
      entityType: 'Order',
      entityId: 'SO001',
      entityCode: 'SO-2026-001',
      metadata: { dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60000), missingParts: 3 },
    }),
  ];
}
