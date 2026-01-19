// =============================================================================
// INTELLIGENT ALERTS - Type Definitions
// =============================================================================

// Alert Type Enum - All possible alert categories
export enum AlertType {
  // Inventory & Forecast Alerts
  STOCKOUT = 'STOCKOUT',                     // Imminent stockout (<3 days)
  REORDER = 'REORDER',                       // Reorder point reached
  SAFETY_STOCK_LOW = 'SAFETY_STOCK_LOW',     // Below safety stock

  // Quality Alerts
  QUALITY_CRITICAL = 'QUALITY_CRITICAL',     // Critical quality failure (Cpk < 1.0)
  QUALITY_DRIFT = 'QUALITY_DRIFT',           // Quality metrics declining
  QUALITY_RISK = 'QUALITY_RISK',             // Part at risk of quality issues

  // Supplier Alerts
  SUPPLIER_RISK = 'SUPPLIER_RISK',           // Supplier risk score high
  SUPPLIER_DELIVERY = 'SUPPLIER_DELIVERY',   // Delivery failure or delay
  SUPPLIER_QUALITY = 'SUPPLIER_QUALITY',     // Supplier quality issues

  // Auto-PO Alerts
  PO_PENDING = 'PO_PENDING',                 // PO suggestion awaiting approval
  PO_EXPIRED = 'PO_EXPIRED',                 // PO suggestion expired
  PO_EXECUTED = 'PO_EXECUTED',               // PO successfully executed

  // Auto-Schedule Alerts
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',   // Work order conflict
  DEADLINE_RISK = 'DEADLINE_RISK',           // Deadline at risk
  SCHEDULE_OPTIMIZED = 'SCHEDULE_OPTIMIZED', // Optimization available

  // Simulation Alerts
  SIMULATION_THRESHOLD = 'SIMULATION_THRESHOLD', // Simulation threshold exceeded
  SIMULATION_COMPLETE = 'SIMULATION_COMPLETE',   // Simulation completed

  // System Alerts
  SYSTEM_ERROR = 'SYSTEM_ERROR',             // System error
  SYSTEM_INFO = 'SYSTEM_INFO',               // System information
}

// Alert Priority Levels
export enum AlertPriority {
  CRITICAL = 'CRITICAL',   // Immediate action required
  HIGH = 'HIGH',           // Action within 24 hours
  MEDIUM = 'MEDIUM',       // Action within 1 week
  LOW = 'LOW',             // Informational
}

// Alert Sources - Which AI module generated the alert
export enum AlertSource {
  FORECAST = 'FORECAST',
  QUALITY = 'QUALITY',
  SUPPLIER_RISK = 'SUPPLIER_RISK',
  AUTO_PO = 'AUTO_PO',
  AUTO_SCHEDULE = 'AUTO_SCHEDULE',
  SIMULATION = 'SIMULATION',
  SYSTEM = 'SYSTEM',
}

// Alert Status
export enum AlertStatus {
  ACTIVE = 'ACTIVE',       // Alert is active
  READ = 'READ',           // User has read the alert
  DISMISSED = 'DISMISSED', // User dismissed the alert
  RESOLVED = 'RESOLVED',   // Issue has been resolved
  EXPIRED = 'EXPIRED',     // Alert expired without action
  ESCALATED = 'ESCALATED', // Alert has been escalated
}

// Action Types - What can be done from an alert
export enum AlertActionType {
  NAVIGATE = 'NAVIGATE',           // Navigate to a page
  APPROVE = 'APPROVE',             // Approve something (e.g., PO)
  REJECT = 'REJECT',               // Reject something
  APPLY = 'APPLY',                 // Apply a change (e.g., schedule)
  CREATE = 'CREATE',               // Create a record (e.g., NCR)
  CONTACT = 'CONTACT',             // Contact someone
  VIEW_DETAILS = 'VIEW_DETAILS',   // View more details
  SNOOZE = 'SNOOZE',               // Snooze the alert
  DISMISS = 'DISMISS',             // Dismiss the alert
}

// Alert Action Definition
export interface AlertAction {
  id: string;
  label: string;
  type: AlertActionType;
  icon?: string;
  url?: string;                    // For NAVIGATE actions
  handler?: string;                // Handler function name
  params?: Record<string, unknown>; // Parameters for the action
  isPrimary?: boolean;             // Is this the primary/recommended action
}

// Related Entity Reference
export interface AlertEntity {
  type: 'part' | 'supplier' | 'work_order' | 'purchase_order' | 'product' | 'customer' | 'work_center';
  id: string;
  name?: string;
  code?: string;
}

// Alert Data - Type-specific data attached to alerts
export interface StockoutAlertData {
  partId: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  daysOfSupply: number;
  reorderPoint: number;
  safetyStock: number;
  demandRate: number;
  suggestedPOId?: string;
}

export interface QualityAlertData {
  partId: string;
  partNumber: string;
  partName: string;
  riskScore: number;
  cpk?: number;
  defectRate?: number;
  trend: 'improving' | 'stable' | 'declining';
  supplierId?: string;
  supplierName?: string;
}

export interface SupplierAlertData {
  supplierId: string;
  supplierName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  poId?: string;
  poNumber?: string;
  expectedDate?: Date;
  newEta?: Date;
  delayDays?: number;
  affectedWorkOrders?: string[];
}

export interface POAlertData {
  suggestionId: string;
  partId: string;
  partNumber: string;
  partName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  estimatedCost: number;
  confidenceScore: number;
  createdAt: Date;
  pendingHours?: number;
}

export interface ScheduleAlertData {
  workOrderId: string;
  woNumber: string;
  productName: string;
  conflictType?: 'overlap' | 'resource' | 'material' | 'capacity';
  conflictWith?: string[];
  workCenterId?: string;
  workCenterName?: string;
  plannedStart?: Date;
  plannedEnd?: Date;
  dueDate?: Date;
  daysUntilDue?: number;
  optimizationPotential?: number;
  suggestedScheduleId?: string;
}

export interface SimulationAlertData {
  simulationId: string;
  scenarioName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  thresholdType: 'above' | 'below';
  impact: string;
}

export type AlertData =
  | StockoutAlertData
  | QualityAlertData
  | SupplierAlertData
  | POAlertData
  | ScheduleAlertData
  | SimulationAlertData
  | Record<string, unknown>;

// Main Alert Interface
export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  source: AlertSource;
  status: AlertStatus;

  // Display information
  title: string;
  message: string;
  aiSuggestion?: string;          // AI-generated suggestion/explanation

  // Related entities
  entities: AlertEntity[];

  // Type-specific data
  data: AlertData;

  // Available actions
  actions: AlertAction[];

  // Timestamps
  createdAt: Date;
  readAt?: Date;
  dismissedAt?: Date;
  resolvedAt?: Date;
  expiresAt?: Date;

  // User tracking
  userId?: string;
  assignedTo?: string;

  // Escalation
  isEscalated: boolean;
  escalatedAt?: Date;
  escalatedTo?: string;
  escalationReason?: string;

  // Correlation
  correlationId?: string;         // Group related alerts
  parentAlertId?: string;         // For hierarchical alerts
  relatedAlertIds?: string[];

  // Metadata
  metadata?: Record<string, unknown>;
}

// Alert Group for correlation
export interface AlertGroup {
  correlationId: string;
  primaryAlert: Alert;
  relatedAlerts: Alert[];
  commonEntity?: AlertEntity;
  groupReason: string;
}

// Alert Summary Statistics
export interface AlertCounts {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unread: number;
  pendingAction: number;
  escalated: number;
}

// Alert Filter Options
export interface AlertFilter {
  types?: AlertType[];
  priorities?: AlertPriority[];
  sources?: AlertSource[];
  statuses?: AlertStatus[];
  entityType?: string;
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  isRead?: boolean;
  isEscalated?: boolean;
}

// Alert Sort Options
export interface AlertSort {
  field: 'createdAt' | 'priority' | 'type' | 'status';
  direction: 'asc' | 'desc';
}

// Urgency Prediction
export interface UrgencyPrediction {
  alertId: string;
  hoursUntilCritical: number;
  impactScore: number;
  impactDescription: string;
  recommendedAction: string;
  confidenceScore: number;
}

// AI Alert Digest
export interface AlertDigest {
  period: 'daily' | 'weekly';
  generatedAt: Date;
  summary: string;                 // AI-generated summary in Vietnamese
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topAlerts: Alert[];
  recommendations: string[];
  trends: {
    category: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    change: number;
  }[];
}

// Notification Preferences
export interface NotificationPreferences {
  userId: string;
  inApp: {
    enabled: boolean;
    criticalOnly: boolean;
    soundEnabled: boolean;
  };
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    criticalImmediate: boolean;
    digestTime?: string;           // Time for daily digest (e.g., "09:00")
  };
  sources: {
    [key in AlertSource]?: {
      enabled: boolean;
      minPriority: AlertPriority;
    };
  };
  quietHours?: {
    enabled: boolean;
    start: string;                 // "22:00"
    end: string;                   // "07:00"
    exceptCritical: boolean;
  };
}

// Escalation Rule
export interface EscalationRule {
  id: string;
  name: string;
  alertTypes: AlertType[];
  priority: AlertPriority;
  condition: {
    unreadForHours?: number;
    noDismissForHours?: number;
    customCondition?: string;
  };
  escalateTo: string[];            // User IDs or role names
  notifyVia: ('inApp' | 'email')[];
  isActive: boolean;
}

// Alert Action Result
export interface AlertActionResult {
  success: boolean;
  alertId: string;
  actionId: string;
  message: string;
  resultData?: Record<string, unknown>;
  error?: string;
}

// Alert Creation Input
export interface CreateAlertInput {
  type: AlertType;
  priority?: AlertPriority;        // Will be auto-assigned if not provided
  source: AlertSource;
  title: string;
  message: string;
  aiSuggestion?: string;
  entities?: AlertEntity[];
  data: AlertData;
  actions?: Partial<AlertAction>[];
  expiresAt?: Date;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

// Priority Assignment Rules
export const PRIORITY_RULES: Record<AlertType, {
  default: AlertPriority;
  conditions: Array<{
    priority: AlertPriority;
    condition: (data: AlertData) => boolean;
  }>;
}> = {
  [AlertType.STOCKOUT]: {
    default: AlertPriority.CRITICAL,
    conditions: [
      { priority: AlertPriority.CRITICAL, condition: (d) => (d as StockoutAlertData).daysOfSupply <= 3 },
      { priority: AlertPriority.HIGH, condition: (d) => (d as StockoutAlertData).daysOfSupply <= 7 },
      { priority: AlertPriority.MEDIUM, condition: () => true },
    ],
  },
  [AlertType.REORDER]: {
    default: AlertPriority.MEDIUM,
    conditions: [],
  },
  [AlertType.SAFETY_STOCK_LOW]: {
    default: AlertPriority.MEDIUM,
    conditions: [],
  },
  [AlertType.QUALITY_CRITICAL]: {
    default: AlertPriority.CRITICAL,
    conditions: [
      { priority: AlertPriority.CRITICAL, condition: (d) => (d as QualityAlertData).cpk !== undefined && (d as QualityAlertData).cpk! < 1.0 },
    ],
  },
  [AlertType.QUALITY_DRIFT]: {
    default: AlertPriority.HIGH,
    conditions: [],
  },
  [AlertType.QUALITY_RISK]: {
    default: AlertPriority.MEDIUM,
    conditions: [
      { priority: AlertPriority.HIGH, condition: (d) => (d as QualityAlertData).riskScore >= 70 },
    ],
  },
  [AlertType.SUPPLIER_RISK]: {
    default: AlertPriority.MEDIUM,
    conditions: [
      { priority: AlertPriority.CRITICAL, condition: (d) => (d as SupplierAlertData).riskLevel === 'critical' },
      { priority: AlertPriority.HIGH, condition: (d) => (d as SupplierAlertData).riskLevel === 'high' },
    ],
  },
  [AlertType.SUPPLIER_DELIVERY]: {
    default: AlertPriority.HIGH,
    conditions: [
      { priority: AlertPriority.CRITICAL, condition: (d) => ((d as SupplierAlertData).delayDays ?? 0) > 5 },
    ],
  },
  [AlertType.SUPPLIER_QUALITY]: {
    default: AlertPriority.HIGH,
    conditions: [],
  },
  [AlertType.PO_PENDING]: {
    default: AlertPriority.MEDIUM,
    conditions: [
      { priority: AlertPriority.HIGH, condition: (d) => ((d as POAlertData).pendingHours ?? 0) > 24 },
    ],
  },
  [AlertType.PO_EXPIRED]: {
    default: AlertPriority.HIGH,
    conditions: [],
  },
  [AlertType.PO_EXECUTED]: {
    default: AlertPriority.LOW,
    conditions: [],
  },
  [AlertType.SCHEDULE_CONFLICT]: {
    default: AlertPriority.HIGH,
    conditions: [
      { priority: AlertPriority.CRITICAL, condition: (d) => (d as ScheduleAlertData).conflictType === 'overlap' },
    ],
  },
  [AlertType.DEADLINE_RISK]: {
    default: AlertPriority.HIGH,
    conditions: [
      { priority: AlertPriority.CRITICAL, condition: (d) => ((d as ScheduleAlertData).daysUntilDue ?? 999) <= 2 },
    ],
  },
  [AlertType.SCHEDULE_OPTIMIZED]: {
    default: AlertPriority.MEDIUM,
    conditions: [
      { priority: AlertPriority.HIGH, condition: (d) => ((d as ScheduleAlertData).optimizationPotential ?? 0) > 20 },
    ],
  },
  [AlertType.SIMULATION_THRESHOLD]: {
    default: AlertPriority.MEDIUM,
    conditions: [],
  },
  [AlertType.SIMULATION_COMPLETE]: {
    default: AlertPriority.LOW,
    conditions: [],
  },
  [AlertType.SYSTEM_ERROR]: {
    default: AlertPriority.HIGH,
    conditions: [],
  },
  [AlertType.SYSTEM_INFO]: {
    default: AlertPriority.LOW,
    conditions: [],
  },
};

// Helper function to get priority color
export function getPriorityColor(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL: return 'red';
    case AlertPriority.HIGH: return 'orange';
    case AlertPriority.MEDIUM: return 'yellow';
    case AlertPriority.LOW: return 'green';
    default: return 'gray';
  }
}

// Helper function to get priority label in Vietnamese
export function getPriorityLabel(priority: AlertPriority): string {
  switch (priority) {
    case AlertPriority.CRITICAL: return 'Khẩn cấp';
    case AlertPriority.HIGH: return 'Cao';
    case AlertPriority.MEDIUM: return 'Trung bình';
    case AlertPriority.LOW: return 'Thấp';
    default: return 'Không xác định';
  }
}

// Helper function to get source label
export function getSourceLabel(source: AlertSource): string {
  switch (source) {
    case AlertSource.FORECAST: return 'Dự báo';
    case AlertSource.QUALITY: return 'Chất lượng';
    case AlertSource.SUPPLIER_RISK: return 'Rủi ro NCC';
    case AlertSource.AUTO_PO: return 'Đặt hàng tự động';
    case AlertSource.AUTO_SCHEDULE: return 'Lịch trình tự động';
    case AlertSource.SIMULATION: return 'Mô phỏng';
    case AlertSource.SYSTEM: return 'Hệ thống';
    default: return 'Khác';
  }
}

// Helper function to get type label
export function getTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    [AlertType.STOCKOUT]: 'Sắp hết hàng',
    [AlertType.REORDER]: 'Cần đặt hàng',
    [AlertType.SAFETY_STOCK_LOW]: 'Tồn kho an toàn thấp',
    [AlertType.QUALITY_CRITICAL]: 'Lỗi chất lượng nghiêm trọng',
    [AlertType.QUALITY_DRIFT]: 'Chất lượng suy giảm',
    [AlertType.QUALITY_RISK]: 'Rủi ro chất lượng',
    [AlertType.SUPPLIER_RISK]: 'Rủi ro nhà cung cấp',
    [AlertType.SUPPLIER_DELIVERY]: 'Giao hàng trễ',
    [AlertType.SUPPLIER_QUALITY]: 'Chất lượng NCC',
    [AlertType.PO_PENDING]: 'PO chờ duyệt',
    [AlertType.PO_EXPIRED]: 'PO hết hạn',
    [AlertType.PO_EXECUTED]: 'PO đã thực hiện',
    [AlertType.SCHEDULE_CONFLICT]: 'Xung đột lịch trình',
    [AlertType.DEADLINE_RISK]: 'Rủi ro trễ deadline',
    [AlertType.SCHEDULE_OPTIMIZED]: 'Có thể tối ưu lịch',
    [AlertType.SIMULATION_THRESHOLD]: 'Ngưỡng mô phỏng',
    [AlertType.SIMULATION_COMPLETE]: 'Mô phỏng hoàn thành',
    [AlertType.SYSTEM_ERROR]: 'Lỗi hệ thống',
    [AlertType.SYSTEM_INFO]: 'Thông tin hệ thống',
  };
  return labels[type] || type;
}
