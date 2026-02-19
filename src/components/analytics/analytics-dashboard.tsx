'use client';

import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ShoppingCart,
  Package,
  Factory,
  CheckCircle,
  AlertTriangle,
  Users,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ChartContainer,
  RTRLineChart,
  RTRBarChart,
  RTRPieChart,
  RTRAreaChart,
  StatCardWithChart,
  chartColors,
} from '@/components/charts';

// =============================================================================
// ANALYTICS DASHBOARD
// Comprehensive reporting and analytics view
// =============================================================================

// =============================================================================
// MOCK DATA
// =============================================================================

// Revenue by month
const revenueData = [
  { month: 'T1', revenue: 2800, cost: 2100, profit: 700 },
  { month: 'T2', revenue: 3200, cost: 2400, profit: 800 },
  { month: 'T3', revenue: 2900, cost: 2200, profit: 700 },
  { month: 'T4', revenue: 3500, cost: 2600, profit: 900 },
  { month: 'T5', revenue: 3800, cost: 2800, profit: 1000 },
  { month: 'T6', revenue: 4200, cost: 3100, profit: 1100 },
  { month: 'T7', revenue: 3900, cost: 2900, profit: 1000 },
  { month: 'T8', revenue: 4500, cost: 3300, profit: 1200 },
  { month: 'T9', revenue: 4100, cost: 3000, profit: 1100 },
  { month: 'T10', revenue: 4800, cost: 3500, profit: 1300 },
  { month: 'T11', revenue: 5200, cost: 3800, profit: 1400 },
  { month: 'T12', revenue: 5500, cost: 4000, profit: 1500 },
];

// Orders by status
const ordersByStatus = [
  { name: 'Chờ xác nhận', value: 12, color: '#F59E0B' },
  { name: 'Đang sản xuất', value: 8, color: '#30a46c' },
  { name: 'Đã giao', value: 45, color: '#10B981' },
  { name: 'Hoàn thành', value: 85, color: '#8B5CF6' },
  { name: 'Đã hủy', value: 6, color: '#EF4444' },
];

// Inventory by category
const inventoryByCategory = [
  { name: 'Thành phẩm', value: 125000000 },
  { name: 'Linh kiện', value: 280000000 },
  { name: 'Nguyên vật liệu', value: 195000000 },
  { name: 'Vật tư tiêu hao', value: 45000000 },
  { name: 'Bao bì', value: 32000000 },
];

// Production efficiency by line
const productionByLine = [
  { name: 'Line 1', efficiency: 94, target: 95, output: 1250 },
  { name: 'Line 2', efficiency: 87, target: 95, output: 980 },
  { name: 'Line 3', efficiency: 96, target: 95, output: 1380 },
  { name: 'Line 4', efficiency: 91, target: 95, output: 1120 },
];

// Quality metrics over time
const qualityTrend = [
  { month: 'T7', passRate: 97.2, ncrCount: 5 },
  { month: 'T8', passRate: 98.1, ncrCount: 3 },
  { month: 'T9', passRate: 97.8, ncrCount: 4 },
  { month: 'T10', passRate: 98.5, ncrCount: 2 },
  { month: 'T11', passRate: 98.2, ncrCount: 3 },
  { month: 'T12', passRate: 98.8, ncrCount: 2 },
];

// Top products
const topProducts = [
  { name: 'Model A1', sales: 450, revenue: 6750000000 },
  { name: 'Model A2', sales: 320, revenue: 5920000000 },
  { name: 'Model B1', sales: 280, revenue: 3360000000 },
  { name: 'Model C1', sales: 150, revenue: 2250000000 },
  { name: 'Model D1', sales: 95, revenue: 1425000000 },
];

// Supplier performance
const supplierPerformance = [
  { name: 'SKF Vietnam', onTime: 96, quality: 98, leadTime: 7 },
  { name: 'Oriental Motor', onTime: 92, quality: 97, leadTime: 14 },
  { name: 'Thép VN Steel', onTime: 88, quality: 94, leadTime: 7 },
  { name: 'Nhôm Đông Á', onTime: 94, quality: 96, leadTime: 10 },
];

// Mini chart data
const revenueSparkline = [
  { value: 2800 }, { value: 3200 }, { value: 2900 }, { value: 3500 },
  { value: 3800 }, { value: 4200 }, { value: 3900 }, { value: 4500 },
  { value: 4100 }, { value: 4800 }, { value: 5200 }, { value: 5500 },
];

const ordersSparkline = [
  { value: 12 }, { value: 15 }, { value: 18 }, { value: 14 },
  { value: 22 }, { value: 19 }, { value: 25 }, { value: 28 },
];

// =============================================================================
// DATE RANGE SELECTOR
// =============================================================================

interface DateRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const options = [
    { value: '7d', label: '7 ngày' },
    { value: '30d', label: '30 ngày' },
    { value: '90d', label: '90 ngày' },
    { value: 'ytd', label: 'Năm nay' },
    { value: '1y', label: '12 tháng' },
  ];

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
            value === option.value
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// KPI SUMMARY ROW
// =============================================================================

function KPISummary() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCardWithChart
        title="Doanh thu"
        value="5.5 tỷ"
        subtitle="VND tháng này"
        trend={{ value: 15.3, label: 'vs tháng trước' }}
        chartData={revenueSparkline}
        chartColor="#10B981"
        icon={<DollarSign className="w-5 h-5 text-green-600" />}
      />
      <StatCardWithChart
        title="Đơn hàng"
        value="156"
        subtitle="đơn trong tháng"
        trend={{ value: 8.2, label: 'vs tháng trước' }}
        chartData={ordersSparkline}
        chartColor="#30a46c"
        icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
      />
      <StatCardWithChart
        title="Hiệu suất SX"
        value="92.5%"
        subtitle="trung bình các line"
        trend={{ value: 2.1, label: 'vs tháng trước' }}
        chartColor="#F59E0B"
        icon={<Factory className="w-5 h-5 text-orange-600" />}
      />
      <StatCardWithChart
        title="Chất lượng"
        value="98.8%"
        subtitle="tỷ lệ đạt"
        trend={{ value: 0.6, label: 'vs tháng trước' }}
        chartColor="#8B5CF6"
        icon={<CheckCircle className="w-5 h-5 text-purple-600" />}
      />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('1y');
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} tỷ`;
    return `${value} triệu`;
  };

  const formatPercent = (value: number) => `${value}%`;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Phân tích & Báo cáo
          </h1>
          <p className="text-gray-500 mt-1">
            Tổng quan hiệu suất kinh doanh và sản xuất
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="Làm mới"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <KPISummary />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <ChartContainer
          title="Xu hướng Doanh thu & Lợi nhuận"
          subtitle="12 tháng gần nhất (đơn vị: triệu VND)"
          onRefresh={handleRefresh}
          loading={loading}
        >
          <RTRLineChart
            data={revenueData}
            dataKey={['revenue', 'cost', 'profit']}
            xAxisKey="month"
            colors={['#10B981', '#EF4444', '#8B5CF6']}
            height={280}
            valueFormatter={formatCurrency}
          />
        </ChartContainer>

        {/* Orders by Status */}
        <ChartContainer
          title="Đơn hàng theo trạng thái"
          subtitle="Phân bổ đơn hàng hiện tại"
        >
          <RTRPieChart
            data={ordersByStatus}
            dataKey="value"
            nameKey="name"
            colors={ordersByStatus.map(o => o.color)}
            height={280}
            innerRadius={60}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Efficiency */}
        <ChartContainer
          title="Hiệu suất sản xuất"
          subtitle="So sánh giữa các dây chuyền"
        >
          <RTRBarChart
            data={productionByLine}
            dataKey={['efficiency', 'target']}
            xAxisKey="name"
            colors={['#8B5CF6', '#E5E7EB']}
            height={250}
            valueFormatter={formatPercent}
          />
        </ChartContainer>

        {/* Inventory by Category */}
        <ChartContainer
          title="Giá trị tồn kho"
          subtitle="Phân bổ theo danh mục"
        >
          <RTRPieChart
            data={inventoryByCategory}
            dataKey="value"
            nameKey="name"
            colors={chartColors.mixed}
            height={250}
            valueFormatter={(v) => `${(v / 1000000).toFixed(0)} triệu`}
          />
        </ChartContainer>

        {/* Quality Trend */}
        <ChartContainer
          title="Xu hướng chất lượng"
          subtitle="Tỷ lệ đạt & NCR 6 tháng"
        >
          <RTRAreaChart
            data={qualityTrend}
            dataKey="passRate"
            xAxisKey="month"
            colors={['#10B981']}
            height={250}
            valueFormatter={formatPercent}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <ChartContainer
          title="Top sản phẩm bán chạy"
          subtitle="Theo doanh thu"
        >
          <RTRBarChart
            data={topProducts}
            dataKey="revenue"
            xAxisKey="name"
            colors={chartColors.primary}
            height={300}
            horizontal
            valueFormatter={(v) => `${(v / 1000000000).toFixed(1)} tỷ`}
          />
        </ChartContainer>

        {/* Supplier Performance */}
        <ChartContainer
          title="Hiệu suất nhà cung cấp"
          subtitle="Đúng hẹn & Chất lượng (%)"
        >
          <RTRBarChart
            data={supplierPerformance}
            dataKey={['onTime', 'quality']}
            xAxisKey="name"
            colors={['#30a46c', '#10B981']}
            height={300}
            valueFormatter={formatPercent}
          />
        </ChartContainer>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          title="Khách hàng mới"
          value="12"
          change={+3}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
        />
        <InsightCard
          title="Giao hàng đúng hẹn"
          value="94.2%"
          change={+2.1}
          icon={<Truck className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100 dark:bg-green-900/30"
        />
        <InsightCard
          title="NCR mở"
          value="3"
          change={-2}
          isNegativeGood
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
        />
        <InsightCard
          title="Vòng quay tồn kho"
          value="8.5x"
          change={+0.5}
          icon={<Package className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>
    </div>
  );
}

// =============================================================================
// INSIGHT CARD
// =============================================================================

interface InsightCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
  isNegativeGood?: boolean;
}

function InsightCard({ title, value, change, icon, iconBg, isNegativeGood }: InsightCardProps) {
  const isPositiveChange = isNegativeGood ? change < 0 : change > 0;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <div className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              isPositiveChange ? 'text-green-600' : 'text-red-600'
            )}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(change)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
