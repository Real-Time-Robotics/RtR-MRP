// =============================================================================
// AI Chat Panel - Shared Types
// =============================================================================

export interface ResponseAlert {
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
  action?: AIAction;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
  suggestedActions?: AIAction[];
  dataUsed?: string[];
  warnings?: string[];
  feedback?: 'positive' | 'negative';
  isLoading?: boolean;
  // Structured response data
  alerts?: ResponseAlert[];
  relatedQueries?: string[];
}

export interface AIAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'navigate' | 'export' | 'notify';
  label: string;
  labelVi: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  payload?: Record<string, unknown>;
}

export interface AIContext {
  page: string;
  module: string;
  userId: string;
  userName: string;
  userRole: string;
  selectedItems?: Array<Record<string, unknown> & { id?: string; partNumber?: string; name?: string; type?: string }>;
  filters?: Record<string, unknown>;
  language: 'en' | 'vi';
}

export interface AIChatPanelProps {
  context: AIContext;
  isOpen: boolean;
  onClose: () => void;
  onActionExecute?: (action: AIAction) => void;
  position?: 'right' | 'left' | 'bottom';
  embedded?: boolean; // When true, renders without container/header
}

// Quick suggestions based on module
export const QUICK_SUGGESTIONS: Record<string, { en: string; vi: string }[]> = {
  inventory: [
    { en: 'What items are low in stock?', vi: 'Linh kiện nào sắp hết hàng?' },
    { en: 'Show inventory value by category', vi: 'Hiển thị giá trị tồn kho theo danh mục' },
    { en: 'Which parts need reordering?', vi: 'Parts nào cần đặt hàng lại?' },
    { en: 'Analyze inventory turnover', vi: 'Phân tích vòng quay tồn kho' },
  ],
  sales: [
    { en: 'Show sales summary this month', vi: 'Tổng hợp bán hàng tháng này' },
    { en: 'Which products sell best?', vi: 'Sản phẩm nào bán chạy nhất?' },
    { en: 'Compare sales Q3 vs Q4', vi: 'So sánh doanh số Q3 và Q4' },
    { en: 'Any pending orders to follow up?', vi: 'Có đơn hàng nào cần theo dõi?' },
  ],
  procurement: [
    { en: 'Which POs are overdue?', vi: 'PO nào đã quá hạn?' },
    { en: 'Analyze supplier performance', vi: 'Phân tích hiệu suất NCC' },
    { en: 'Suggest alternative suppliers', vi: 'Đề xuất NCC thay thế' },
    { en: 'What should I order this week?', vi: 'Tuần này nên đặt hàng gì?' },
  ],
  production: [
    { en: 'Active work orders status', vi: 'Trạng thái WO đang chạy' },
    { en: 'Any material shortages?', vi: 'Có thiếu vật tư không?' },
    { en: 'Production efficiency this month', vi: 'Hiệu suất sản xuất tháng này' },
    { en: 'Optimize production schedule', vi: 'Tối ưu lịch sản xuất' },
  ],
  quality: [
    { en: 'Open NCRs summary', vi: 'Tổng hợp NCR đang mở' },
    { en: 'Quality trends analysis', vi: 'Phân tích xu hướng chất lượng' },
    { en: 'Suppliers with quality issues', vi: 'NCC có vấn đề chất lượng' },
    { en: 'First pass yield report', vi: 'Báo cáo FPY' },
  ],
  analytics: [
    { en: 'Key metrics overview', vi: 'Tổng quan chỉ số chính' },
    { en: 'Revenue trend analysis', vi: 'Phân tích xu hướng doanh thu' },
    { en: 'Cost breakdown report', vi: 'Báo cáo phân tích chi phí' },
    { en: 'Forecast next quarter', vi: 'Dự báo quý tới' },
  ],
  default: [
    { en: 'How can I help you today?', vi: 'Tôi có thể giúp gì cho bạn?' },
    { en: 'Show system overview', vi: 'Hiển thị tổng quan hệ thống' },
    { en: 'What are today\'s alerts?', vi: 'Có cảnh báo gì hôm nay?' },
    { en: 'Generate daily report', vi: 'Tạo báo cáo hàng ngày' },
  ],
};
