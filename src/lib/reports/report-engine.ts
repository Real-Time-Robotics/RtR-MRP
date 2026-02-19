// =============================================================================
// REPORT ENGINE
// Core logic for manufacturing reports and analytics
// =============================================================================

export type ReportType =
  | 'PRODUCTION_SUMMARY'
  | 'OEE_ANALYSIS'
  | 'INVENTORY_STATUS'
  | 'QUALITY_METRICS'
  | 'MAINTENANCE_SUMMARY'
  | 'DOWNTIME_ANALYSIS'
  | 'CAPACITY_UTILIZATION'
  | 'SALES_PERFORMANCE';

export type ReportPeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'THIS_YEAR'
  | 'CUSTOM';

export type ReportCategory = 'PRODUCTION' | 'INVENTORY' | 'QUALITY' | 'MAINTENANCE' | 'PLANNING' | 'SALES';

export type ChartType = 'LINE' | 'BAR' | 'PIE' | 'DONUT' | 'AREA' | 'GAUGE' | 'HEATMAP' | 'TABLE';

export type InsightType = 'SUCCESS' | 'WARNING' | 'INFO' | 'RECOMMENDATION';

export type TrendDirection = 'UP' | 'DOWN' | 'STABLE';

export interface ReportMetric {
  id: string;
  name: string;
  nameVi: string;
  value: number;
  previousValue?: number;
  target?: number;
  unit?: string;
  format?: 'number' | 'percent' | 'currency' | 'duration';
  trend?: TrendDirection;
  change?: number;
}

export interface ReportSummaryCard {
  id: string;
  title: string;
  value: string;
  change?: number;
  trend?: TrendDirection;
  icon: string;
  color: string;
}

export interface ReportChartData {
  id: string;
  type: ChartType;
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
}

export interface ReportTableData {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ReportInsight {
  type: InsightType;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  target?: number;
}

export interface ReportTemplate {
  type: ReportType;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  category: ReportCategory;
  icon: string;
  metrics: string[];
  charts: ChartType[];
}

export interface ReportData {
  id: string;
  type: ReportType;
  title: string;
  subtitle: string;
  generatedAt: string;
  period: {
    type: ReportPeriod;
    startDate: string;
    endDate: string;
    label: string;
  };
  summary: ReportSummaryCard[];
  charts: ReportChartData[];
  tables?: ReportTableData[];
  insights?: ReportInsight[];
  metadata: {
    generationTime: number;
    dataPoints: number;
  };
}

// =============================================================================
// REPORT TEMPLATES
// =============================================================================

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    type: 'PRODUCTION_SUMMARY',
    name: 'Production Summary',
    nameVi: 'Báo cáo Sản xuất',
    description: 'Overview of production output, quality, and efficiency',
    descriptionVi: 'Tổng quan sản lượng, chất lượng và hiệu suất sản xuất',
    category: 'PRODUCTION',
    icon: 'factory',
    metrics: ['output', 'goodUnits', 'defectRate', 'oee'],
    charts: ['BAR', 'LINE', 'PIE'],
  },
  {
    type: 'OEE_ANALYSIS',
    name: 'OEE Analysis',
    nameVi: 'Phân tích OEE',
    description: 'Detailed OEE breakdown with availability, performance, quality',
    descriptionVi: 'Phân tích chi tiết OEE: Availability, Performance, Quality',
    category: 'PRODUCTION',
    icon: 'gauge',
    metrics: ['oee', 'availability', 'performance', 'quality', 'losses'],
    charts: ['GAUGE', 'BAR', 'PIE'],
  },
  {
    type: 'INVENTORY_STATUS',
    name: 'Inventory Status',
    nameVi: 'Báo cáo Tồn kho',
    description: 'Stock levels, value, and reorder alerts',
    descriptionVi: 'Mức tồn kho, giá trị và cảnh báo đặt hàng',
    category: 'INVENTORY',
    icon: 'package',
    metrics: ['totalSKUs', 'totalValue', 'lowStock', 'stockout'],
    charts: ['BAR', 'PIE', 'TABLE'],
  },
  {
    type: 'QUALITY_METRICS',
    name: 'Quality Metrics',
    nameVi: 'Báo cáo Chất lượng',
    description: 'First pass yield, defects, NCRs and CAPAs',
    descriptionVi: 'First Pass Yield, lỗi, NCR và CAPA',
    category: 'QUALITY',
    icon: 'check-circle',
    metrics: ['fpy', 'defectRate', 'ncrCount', 'capaCount'],
    charts: ['LINE', 'BAR', 'PIE'],
  },
  {
    type: 'MAINTENANCE_SUMMARY',
    name: 'Maintenance Summary',
    nameVi: 'Báo cáo Bảo trì',
    description: 'Work orders, MTBF, MTTR, PM compliance',
    descriptionVi: 'Lệnh công việc, MTBF, MTTR, tuân thủ PM',
    category: 'MAINTENANCE',
    icon: 'wrench',
    metrics: ['workOrders', 'mtbf', 'mttr', 'pmCompliance'],
    charts: ['BAR', 'LINE', 'PIE'],
  },
  {
    type: 'DOWNTIME_ANALYSIS',
    name: 'Downtime Analysis',
    nameVi: 'Phân tích Downtime',
    description: 'Planned vs unplanned downtime, root causes',
    descriptionVi: 'Thời gian ngừng có kế hoạch và ngoài kế hoạch',
    category: 'MAINTENANCE',
    icon: 'clock',
    metrics: ['totalDowntime', 'planned', 'unplanned', 'mttr'],
    charts: ['PIE', 'BAR', 'LINE'],
  },
  {
    type: 'CAPACITY_UTILIZATION',
    name: 'Capacity Utilization',
    nameVi: 'Báo cáo Công suất',
    description: 'Resource utilization and capacity planning',
    descriptionVi: 'Sử dụng tài nguyên và kế hoạch công suất',
    category: 'PLANNING',
    icon: 'trending-up',
    metrics: ['avgUtilization', 'peakUtilization', 'bottleneck', 'availableCapacity'],
    charts: ['GAUGE', 'BAR', 'HEATMAP'],
  },
];

// =============================================================================
// PERIOD OPTIONS
// =============================================================================

export const PERIOD_OPTIONS: { value: ReportPeriod; label: string; labelVi: string }[] = [
  { value: 'TODAY', label: 'Today', labelVi: 'Hôm nay' },
  { value: 'YESTERDAY', label: 'Yesterday', labelVi: 'Hôm qua' },
  { value: 'THIS_WEEK', label: 'This Week', labelVi: 'Tuần này' },
  { value: 'LAST_WEEK', label: 'Last Week', labelVi: 'Tuần trước' },
  { value: 'THIS_MONTH', label: 'This Month', labelVi: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Last Month', labelVi: 'Tháng trước' },
  { value: 'THIS_QUARTER', label: 'This Quarter', labelVi: 'Quý này' },
  { value: 'THIS_YEAR', label: 'This Year', labelVi: 'Năm nay' },
  { value: 'CUSTOM', label: 'Custom', labelVi: 'Tùy chỉnh' },
];

// =============================================================================
// CATEGORY CONFIG
// =============================================================================

export const CATEGORY_CONFIG: Record<ReportCategory, {
  label: string;
  labelVi: string;
  color: string;
  bgColor: string;
}> = {
  PRODUCTION: {
    label: 'Production',
    labelVi: 'Sản xuất',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  INVENTORY: {
    label: 'Inventory',
    labelVi: 'Tồn kho',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  QUALITY: {
    label: 'Quality',
    labelVi: 'Chất lượng',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    labelVi: 'Bảo trì',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  PLANNING: {
    label: 'Planning',
    labelVi: 'Kế hoạch',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  SALES: {
    label: 'Sales',
    labelVi: 'Bán hàng',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function generateReportId(): string {
  return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getTemplate(type: ReportType): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find((t) => t.type === type);
}

export function getTemplatesByCategory(category: ReportCategory): ReportTemplate[] {
  return REPORT_TEMPLATES.filter((t) => t.category === category);
}

export function getPeriodDates(period: ReportPeriod, customStart?: string, customEnd?: string): {
  startDate: Date;
  endDate: Date;
  label: string;
  labelVi: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate: Date;
  let endDate: Date = now;
  let label: string;
  let labelVi: string;

  switch (period) {
    case 'TODAY':
      startDate = today;
      label = 'Today';
      labelVi = 'Hôm nay';
      break;
    case 'YESTERDAY':
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      endDate = new Date(today.getTime() - 1);
      label = 'Yesterday';
      labelVi = 'Hôm qua';
      break;
    case 'THIS_WEEK':
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(today.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
      label = 'This Week';
      labelVi = 'Tuần này';
      break;
    case 'LAST_WEEK':
      const lastWeekEnd = new Date(today.getTime() - (today.getDay() === 0 ? 7 : today.getDay()) * 24 * 60 * 60 * 1000);
      startDate = new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
      endDate = lastWeekEnd;
      label = 'Last Week';
      labelVi = 'Tuần trước';
      break;
    case 'THIS_MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      label = 'This Month';
      labelVi = 'Tháng này';
      break;
    case 'LAST_MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      label = 'Last Month';
      labelVi = 'Tháng trước';
      break;
    case 'THIS_QUARTER':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      label = `Q${quarter + 1} ${now.getFullYear()}`;
      labelVi = `Quý ${quarter + 1} ${now.getFullYear()}`;
      break;
    case 'THIS_YEAR':
      startDate = new Date(now.getFullYear(), 0, 1);
      label = `${now.getFullYear()}`;
      labelVi = `Năm ${now.getFullYear()}`;
      break;
    case 'CUSTOM':
      startDate = customStart ? new Date(customStart) : today;
      endDate = customEnd ? new Date(customEnd) : now;
      label = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      labelVi = `${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}`;
      break;
    default:
      startDate = today;
      label = 'Today';
      labelVi = 'Hôm nay';
  }

  return { startDate, endDate, label, labelVi };
}

export function formatValue(value: number, format?: string, unit?: string): string {
  let formatted: string;

  switch (format) {
    case 'percent':
      formatted = `${value.toFixed(1)}%`;
      break;
    case 'currency':
      formatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(value);
      break;
    case 'duration':
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      formatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      break;
    default:
      formatted = new Intl.NumberFormat('vi-VN').format(value);
  }

  if (unit && format !== 'percent' && format !== 'currency') {
    formatted += ` ${unit}`;
  }

  return formatted;
}

export function calculateChange(current: number, previous: number): {
  change: number;
  trend: TrendDirection;
} {
  if (previous === 0) {
    return { change: 0, trend: 'STABLE' };
  }

  const change = ((current - previous) / previous) * 100;
  const trend: TrendDirection = change > 1 ? 'UP' : change < -1 ? 'DOWN' : 'STABLE';

  return { change: Math.round(change * 10) / 10, trend };
}

export function generateInsights(
  metrics: ReportMetric[],
  template: ReportTemplate
): ReportInsight[] {
  const insights: ReportInsight[] = [];

  metrics.forEach((metric) => {
    // Check for target achievement
    if (metric.target !== undefined) {
      const achievement = (metric.value / metric.target) * 100;
      if (achievement >= 100) {
        insights.push({
          type: 'SUCCESS',
          title: `${metric.nameVi} đạt mục tiêu`,
          description: `${formatValue(metric.value, metric.format, metric.unit)} (mục tiêu: ${formatValue(metric.target, metric.format, metric.unit)})`,
          metric: metric.name,
          value: metric.value,
          target: metric.target,
        });
      } else if (achievement < 90) {
        insights.push({
          type: 'WARNING',
          title: `${metric.nameVi} dưới mục tiêu`,
          description: `Đạt ${achievement.toFixed(0)}% mục tiêu`,
          metric: metric.name,
          value: metric.value,
          target: metric.target,
        });
      }
    }

    // Check for significant changes
    if (metric.change !== undefined && Math.abs(metric.change) > 5) {
      insights.push({
        type: metric.change > 0 ? 'SUCCESS' : 'WARNING',
        title: `${metric.nameVi} ${metric.change > 0 ? 'tăng' : 'giảm'} ${Math.abs(metric.change).toFixed(1)}%`,
        description: 'So với kỳ trước',
        metric: metric.name,
        value: metric.value,
      });
    }
  });

  // Add recommendations based on template type
  if (template.type === 'OEE_ANALYSIS') {
    const oee = metrics.find((m) => m.name === 'oee');
    if (oee && oee.value < 85) {
      insights.push({
        type: 'RECOMMENDATION',
        title: 'Cải thiện OEE',
        description: 'Tập trung vào giảm thời gian setup và tăng tốc độ vận hành',
      });
    }
  }

  return insights;
}

// =============================================================================
// MOCK DATA GENERATOR
// =============================================================================

export function generateMockReportData(type: ReportType, period: ReportPeriod): ReportData {
  const template = getTemplate(type);
  if (!template) {
    throw new Error(`Unknown report type: ${type}`);
  }

  const periodDates = getPeriodDates(period);
  const startTime = Date.now();

  // Generate mock data based on template type
  let summary: ReportSummaryCard[] = [];
  let charts: ReportChartData[] = [];
  let insights: ReportInsight[] = [];

  switch (type) {
    case 'PRODUCTION_SUMMARY':
      summary = [
        { id: 'output', title: 'Sản lượng', value: '12,450', change: 5.2, trend: 'UP', icon: 'package', color: 'blue' },
        { id: 'good', title: 'Đạt chất lượng', value: '12,120', change: 3.8, trend: 'UP', icon: 'check', color: 'green' },
        { id: 'defect', title: 'Tỷ lệ lỗi', value: '2.6%', change: -0.4, trend: 'DOWN', icon: 'x', color: 'red' },
        { id: 'oee', title: 'OEE', value: '82.5%', change: 1.5, trend: 'UP', icon: 'gauge', color: 'purple' },
      ];
      charts = [
        {
          id: 'daily-output',
          type: 'BAR',
          title: 'Sản lượng theo ngày',
          data: {
            labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            datasets: [
              { label: 'Sản lượng', data: [1850, 1920, 1780, 1890, 1950, 1600, 1460], color: '#30a46c' },
            ],
          },
        },
        {
          id: 'quality-breakdown',
          type: 'PIE',
          title: 'Phân bổ chất lượng',
          data: {
            labels: ['Đạt', 'Sửa lại', 'Phế phẩm'],
            datasets: [
              { label: 'Số lượng', data: [12120, 280, 50], color: '#10B981' },
            ],
          },
        },
      ];
      insights = [
        { type: 'SUCCESS', title: 'Sản lượng tăng 5.2%', description: 'So với tuần trước' },
        { type: 'INFO', title: 'OEE cải thiện', description: 'Đạt 82.5%, gần mục tiêu 85%' },
      ];
      break;

    case 'OEE_ANALYSIS':
      summary = [
        { id: 'oee', title: 'OEE', value: '82.5%', change: 1.5, trend: 'UP', icon: 'gauge', color: 'purple' },
        { id: 'availability', title: 'Availability', value: '92.3%', change: 0.8, trend: 'UP', icon: 'clock', color: 'blue' },
        { id: 'performance', title: 'Performance', value: '94.1%', change: -0.5, trend: 'DOWN', icon: 'zap', color: 'orange' },
        { id: 'quality', title: 'Quality', value: '95.2%', change: 1.2, trend: 'UP', icon: 'check', color: 'green' },
      ];
      charts = [
        {
          id: 'oee-trend',
          type: 'LINE',
          title: 'Xu hướng OEE',
          data: {
            labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            datasets: [
              { label: 'OEE', data: [80.2, 81.5, 82.1, 81.8, 83.5, 82.5, 82.5], color: '#8B5CF6' },
              { label: 'Mục tiêu', data: [85, 85, 85, 85, 85, 85, 85], color: '#94A3B8' },
            ],
          },
        },
        {
          id: 'losses',
          type: 'PIE',
          title: 'Phân tích tổn thất',
          data: {
            labels: ['Downtime', 'Speed loss', 'Defects'],
            datasets: [
              { label: 'Phần trăm', data: [7.7, 5.9, 4.8], color: '#EF4444' },
            ],
          },
        },
      ];
      insights = [
        { type: 'WARNING', title: 'OEE dưới mục tiêu', description: 'Cần đạt 85%, hiện tại 82.5%' },
        { type: 'RECOMMENDATION', title: 'Tập trung giảm downtime', description: 'Chiếm 7.7% tổn thất' },
      ];
      break;

    case 'INVENTORY_STATUS':
      summary = [
        { id: 'skus', title: 'Tổng SKU', value: '2,847', change: 2.1, trend: 'UP', icon: 'package', color: 'blue' },
        { id: 'value', title: 'Giá trị tồn', value: '₫12.5B', change: 4.3, trend: 'UP', icon: 'dollar', color: 'green' },
        { id: 'lowstock', title: 'Tồn thấp', value: '45', change: -5, trend: 'DOWN', icon: 'alert', color: 'orange' },
        { id: 'stockout', title: 'Hết hàng', value: '8', change: 2, trend: 'UP', icon: 'x', color: 'red' },
      ];
      charts = [
        {
          id: 'inventory-by-category',
          type: 'BAR',
          title: 'Tồn kho theo danh mục',
          data: {
            labels: ['Raw Material', 'Components', 'Finished Goods', 'Packaging'],
            datasets: [
              { label: 'Giá trị (tỷ VND)', data: [4.2, 3.8, 3.5, 1.0], color: '#10B981' },
            ],
          },
        },
      ];
      insights = [
        { type: 'WARNING', title: '8 SKU hết hàng', description: 'Cần đặt hàng gấp' },
        { type: 'INFO', title: '45 SKU tồn thấp', description: 'Xem xét bổ sung' },
      ];
      break;

    case 'MAINTENANCE_SUMMARY':
      summary = [
        { id: 'wo', title: 'Work Orders', value: '156', change: 8.2, trend: 'UP', icon: 'wrench', color: 'blue' },
        { id: 'mtbf', title: 'MTBF', value: '245h', change: 12.5, trend: 'UP', icon: 'clock', color: 'green' },
        { id: 'mttr', title: 'MTTR', value: '2.5h', change: -8.3, trend: 'DOWN', icon: 'timer', color: 'orange' },
        { id: 'pm', title: 'PM Compliance', value: '94%', change: 2.1, trend: 'UP', icon: 'check', color: 'purple' },
      ];
      charts = [
        {
          id: 'wo-by-type',
          type: 'PIE',
          title: 'Work Orders theo loại',
          data: {
            labels: ['PM', 'CM', 'Emergency', 'Inspection'],
            datasets: [
              { label: 'Số lượng', data: [78, 45, 12, 21], color: '#30a46c' },
            ],
          },
        },
      ];
      insights = [
        { type: 'SUCCESS', title: 'MTBF cải thiện 12.5%', description: 'Độ tin cậy thiết bị tăng' },
        { type: 'SUCCESS', title: 'PM Compliance đạt 94%', description: 'Gần mục tiêu 95%' },
      ];
      break;

    case 'DOWNTIME_ANALYSIS':
      summary = [
        { id: 'total', title: 'Tổng Downtime', value: '48h', change: -5.2, trend: 'DOWN', icon: 'clock', color: 'red' },
        { id: 'planned', title: 'Có kế hoạch', value: '32h', change: 0, trend: 'STABLE', icon: 'calendar', color: 'blue' },
        { id: 'unplanned', title: 'Ngoài KH', value: '16h', change: -12.5, trend: 'DOWN', icon: 'alert', color: 'orange' },
        { id: 'mttr', title: 'MTTR', value: '2.5h', change: -8.3, trend: 'DOWN', icon: 'timer', color: 'green' },
      ];
      charts = [
        {
          id: 'downtime-by-cause',
          type: 'BAR',
          title: 'Downtime theo nguyên nhân',
          data: {
            labels: ['Điện', 'Cơ khí', 'Phần mềm', 'Vật liệu', 'Khác'],
            datasets: [
              { label: 'Giờ', data: [8, 12, 4, 6, 2], color: '#EF4444' },
            ],
          },
        },
      ];
      insights = [
        { type: 'SUCCESS', title: 'Downtime giảm 5.2%', description: 'So với tuần trước' },
        { type: 'RECOMMENDATION', title: 'Tập trung vào lỗi cơ khí', description: 'Chiếm 25% tổng downtime' },
      ];
      break;

    case 'CAPACITY_UTILIZATION':
      summary = [
        { id: 'avg', title: 'Trung bình', value: '78%', change: 3.2, trend: 'UP', icon: 'gauge', color: 'blue' },
        { id: 'peak', title: 'Peak', value: '95%', change: 0, trend: 'STABLE', icon: 'trending-up', color: 'orange' },
        { id: 'bottleneck', title: 'Bottleneck', value: 'CNC-002', change: 0, trend: 'STABLE', icon: 'alert', color: 'red' },
        { id: 'available', title: 'Khả dụng', value: '220h', change: -5, trend: 'DOWN', icon: 'clock', color: 'green' },
      ];
      charts = [
        {
          id: 'utilization-by-wc',
          type: 'BAR',
          title: 'Công suất theo Work Center',
          data: {
            labels: ['CNC-001', 'CNC-002', 'Assembly', 'Packaging', 'QC'],
            datasets: [
              { label: '%', data: [82, 95, 75, 68, 72], color: '#30a46c' },
            ],
          },
        },
      ];
      insights = [
        { type: 'WARNING', title: 'CNC-002 quá tải', description: 'Công suất 95%, cần cân nhắc tăng ca hoặc outsource' },
        { type: 'INFO', title: 'Packaging còn dư 32%', description: 'Có thể nhận thêm đơn hàng' },
      ];
      break;

    default:
      summary = [];
      charts = [];
      insights = [];
  }

  const endTime = Date.now();

  return {
    id: generateReportId(),
    type,
    title: template.nameVi,
    subtitle: periodDates.labelVi,
    generatedAt: new Date().toISOString(),
    period: {
      type: period,
      startDate: periodDates.startDate.toISOString(),
      endDate: periodDates.endDate.toISOString(),
      label: periodDates.labelVi,
    },
    summary,
    charts,
    insights,
    metadata: {
      generationTime: endTime - startTime,
      dataPoints: summary.length * 7 + charts.reduce((acc, c) => acc + c.data.labels.length, 0),
    },
  };
}
