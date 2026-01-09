'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Package, Users, ShoppingCart,
  DollarSign, AlertTriangle, CheckCircle, Clock, Truck, Factory,
  PieChart, Activity, Calendar, Filter, Download, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Box, Layers, Target,
  Zap, Award, AlertCircle, FileText, Wrench, Globe
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadialBarChart, RadialBar
} from 'recharts';
import { DataTable, Column } from "@/components/ui-v2/data-table";

// Types
interface DashboardMetrics {
  inventory: {
    totalParts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    turnoverRate: number;
    changePercent: number;
  };
  sales: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    avgOrderValue: number;
    changePercent: number;
  };
  production: {
    activeWorkOrders: number;
    completedThisMonth: number;
    onTimeDelivery: number;
    efficiency: number;
    pendingMaterials: number;
    changePercent: number;
  };
  quality: {
    totalNCRs: number;
    openNCRs: number;
    openCAPAs: number;
    defectRate: number;
    firstPassYield: number;
    changePercent: number;
  };
  suppliers: {
    totalSuppliers: number;
    activeSuppliers: number;
    ndaaCompliant: number;
    avgLeadTime: number;
    onTimeDelivery: number;
    changePercent: number;
  };
  compliance: {
    ndaaCompliantParts: number;
    itarControlledParts: number;
    rohsCompliantParts: number;
    expiringSoonCerts: number;
  };
}

interface ChartData {
  revenueByMonth: { month: string; revenue: number; cost: number; profit: number }[];
  inventoryByCategory: { category: string; value: number; quantity: number }[];
  ordersByStatus: { status: string; count: number; color: string }[];
  productionTrend: { week: string; planned: number; actual: number; efficiency: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  topParts: { name: string; quantity: number; value: number }[];
  qualityTrend: { month: string; ncr: number; capa: number; fpy: number }[];
  supplierPerformance: { name: string; onTime: number; quality: number; score: number }[];
}

// Color palette
const COLORS = {
  primary: '#1e3a5f',
  secondary: '#2c5282',
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  info: '#3182ce',
  purple: '#805ad5',
  pink: '#d53f8c',
  cyan: '#00b5d8',
  orange: '#dd6b20',
};

const PIE_COLORS = ['#1e3a5f', '#2c5282', '#38a169', '#d69e2e', '#e53e3e', '#805ad5'];

// Mock data generator (will be replaced with API call)
const generateMockData = (): { metrics: DashboardMetrics; charts: ChartData } => {
  return {
    metrics: {
      inventory: {
        totalParts: 2847,
        totalValue: 1250000,
        lowStockItems: 23,
        outOfStockItems: 5,
        turnoverRate: 4.2,
        changePercent: 8.5,
      },
      sales: {
        totalOrders: 156,
        totalRevenue: 3450000,
        pendingOrders: 12,
        completedOrders: 144,
        avgOrderValue: 22115,
        changePercent: 15.3,
      },
      production: {
        activeWorkOrders: 8,
        completedThisMonth: 24,
        onTimeDelivery: 94.5,
        efficiency: 87.2,
        pendingMaterials: 3,
        changePercent: 5.2,
      },
      quality: {
        totalNCRs: 47,
        openNCRs: 8,
        openCAPAs: 5,
        defectRate: 1.2,
        firstPassYield: 98.8,
        changePercent: -2.1,
      },
      suppliers: {
        totalSuppliers: 45,
        activeSuppliers: 38,
        ndaaCompliant: 42,
        avgLeadTime: 18,
        onTimeDelivery: 91.3,
        changePercent: 3.7,
      },
      compliance: {
        ndaaCompliantParts: 2680,
        itarControlledParts: 156,
        rohsCompliantParts: 2790,
        expiringSoonCerts: 12,
      },
    },
    charts: {
      revenueByMonth: [
        { month: 'T7', revenue: 420000, cost: 310000, profit: 110000 },
        { month: 'T8', revenue: 380000, cost: 290000, profit: 90000 },
        { month: 'T9', revenue: 520000, cost: 380000, profit: 140000 },
        { month: 'T10', revenue: 480000, cost: 350000, profit: 130000 },
        { month: 'T11', revenue: 650000, cost: 470000, profit: 180000 },
        { month: 'T12', revenue: 720000, cost: 510000, profit: 210000 },
      ],
      inventoryByCategory: [
        { category: 'Propulsion', value: 450000, quantity: 320 },
        { category: 'Frame', value: 280000, quantity: 180 },
        { category: 'Electronics', value: 320000, quantity: 450 },
        { category: 'Power', value: 150000, quantity: 280 },
        { category: 'AI Computing', value: 180000, quantity: 95 },
        { category: 'Sensors', value: 120000, quantity: 380 },
      ],
      ordersByStatus: [
        { status: 'Hoàn thành', count: 144, color: COLORS.success },
        { status: 'Đang xử lý', count: 8, color: COLORS.info },
        { status: 'Chờ xác nhận', count: 4, color: COLORS.warning },
        { status: 'Hủy', count: 2, color: COLORS.danger },
      ],
      productionTrend: [
        { week: 'W1', planned: 6, actual: 5, efficiency: 83 },
        { week: 'W2', planned: 8, actual: 7, efficiency: 87 },
        { week: 'W3', planned: 7, actual: 7, efficiency: 100 },
        { week: 'W4', planned: 9, actual: 8, efficiency: 89 },
      ],
      topProducts: [
        { name: 'HERA-X8-PRO', quantity: 45, revenue: 1125000 },
        { name: 'HERA-X8-ENT', quantity: 32, revenue: 960000 },
        { name: 'HERA-X4-PRO', quantity: 28, revenue: 420000 },
        { name: 'HERA-X8-GOV', quantity: 18, revenue: 720000 },
        { name: 'HERA-X4-STD', quantity: 15, revenue: 180000 },
      ],
      topParts: [
        { name: 'Motor U15 II KV100', quantity: 384, value: 149376 },
        { name: 'Pixhawk 6X', quantity: 95, value: 56905 },
        { name: 'Carbon Frame X8', quantity: 48, value: 60000 },
        { name: 'Battery 22000mAh', quantity: 186, value: 74400 },
        { name: 'ESC 80A FOC', quantity: 384, value: 46080 },
      ],
      qualityTrend: [
        { month: 'T7', ncr: 8, capa: 3, fpy: 97.5 },
        { month: 'T8', ncr: 12, capa: 5, fpy: 96.8 },
        { month: 'T9', ncr: 6, capa: 2, fpy: 98.2 },
        { month: 'T10', ncr: 9, capa: 4, fpy: 97.9 },
        { month: 'T11', ncr: 7, capa: 3, fpy: 98.5 },
        { month: 'T12', ncr: 5, capa: 2, fpy: 98.8 },
      ],
      supplierPerformance: [
        { name: 'KDE Direct', onTime: 96, quality: 99, score: 97.5 },
        { name: 'Holybro', onTime: 94, quality: 98, score: 96.0 },
        { name: 'Tattu', onTime: 92, quality: 97, score: 94.5 },
        { name: 'T-Motor', onTime: 95, quality: 96, score: 95.5 },
        { name: 'Foxtech', onTime: 88, quality: 95, score: 91.5 },
      ],
    },
  };
};

// Components
const MetricCard = ({
  title, value, subtitle, icon: Icon, color, trend, trendValue
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">{subtitle}</p>}
        {trend && trendValue && (
          <div className={`flex items-center mt-2 text-sm ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> :
             trend === 'down' ? <ArrowDownRight className="h-4 w-4" /> :
             <Minus className="h-4 w-4" />}
            <span className="ml-1">{trendValue}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${color}15` }}>
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number | string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-neutral-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Main Dashboard Component
export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('6m');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{ metrics: DashboardMetrics; charts: ChartData } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'sales' | 'production' | 'quality'>('overview');

  useEffect(() => {
    // Simulate API call - can be replaced with real API call
    setIsLoading(true);
    setTimeout(() => {
      setData(generateMockData());
      setIsLoading(false);
    }, 1000);
  }, [dateRange]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-neutral-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  // Column definitions for tables
  const topProductsColumns: Column<{ name: string; quantity: number; revenue: number }>[] = useMemo(() => [
    {
      key: 'rank',
      header: '#',
      width: '50px',
      align: 'center',
      render: (_, row, index) => (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
          index === 0 ? 'bg-yellow-100 text-yellow-700' :
          index === 1 ? 'bg-gray-100 text-gray-700' :
          index === 2 ? 'bg-orange-100 text-orange-700' :
          'bg-gray-50 text-gray-500'
        }`}>
          {(index || 0) + 1}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Sản phẩm',
      width: '150px',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'quantity',
      header: 'SL',
      width: '70px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      width: '100px',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-medium text-green-600">{formatCurrency(value)}</span>,
    },
  ], []);

  const supplierPerformanceColumns: Column<{ name: string; onTime: number; quality: number; score: number }>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Nhà cung cấp',
      width: '120px',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'onTime',
      header: 'Đúng hạn',
      width: '90px',
      align: 'center',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value >= 95 ? 'bg-green-100 text-green-700' :
          value >= 90 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'quality',
      header: 'Chất lượng',
      width: '90px',
      align: 'center',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value >= 98 ? 'bg-green-100 text-green-700' :
          value >= 95 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Điểm',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-end">
          <div className="w-16 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full mr-2">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
          </div>
          <span className="text-sm font-medium">{value}</span>
        </div>
      ),
    },
  ], []);

  const topPartsColumns: Column<{ name: string; quantity: number; value: number }>[] = useMemo(() => [
    {
      key: 'rank',
      header: '#',
      width: '50px',
      align: 'center',
      render: (_, row, index) => <span className="text-sm font-medium text-gray-500">{(index || 0) + 1}</span>,
    },
    {
      key: 'name',
      header: 'Linh kiện',
      width: '180px',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'quantity',
      header: 'Số lượng',
      width: '80px',
      align: 'right',
      sortable: true,
      render: (value) => <span className="text-gray-600 dark:text-neutral-400">{formatNumber(value)}</span>,
    },
    {
      key: 'value',
      header: 'Giá trị',
      width: '100px',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-medium text-blue-600">{formatCurrency(value)}</span>,
    },
    {
      key: 'percent',
      header: '% Tổng',
      width: '120px',
      align: 'right',
      render: (_, row) => {
        const percent = (row.value / metrics.inventory.totalValue) * 100;
        return (
          <div className="flex items-center justify-end">
            <div className="w-16 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full mr-2">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm text-gray-600 dark:text-neutral-400">{percent.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ], [metrics.inventory.totalValue]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
                <p className="text-xs text-gray-500 dark:text-neutral-400">RTRobotics MRP Insights</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="1m">1 tháng</option>
                <option value="3m">3 tháng</option>
                <option value="6m">6 tháng</option>
                <option value="1y">1 năm</option>
                <option value="all">Tất cả</option>
              </select>

              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="h-5 w-5" />
              </button>

              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 pb-2">
            {[
              { key: 'overview', label: 'Tổng quan', icon: Activity },
              { key: 'inventory', label: 'Tồn kho', icon: Package },
              { key: 'sales', label: 'Bán hàng', icon: ShoppingCart },
              { key: 'production', label: 'Sản xuất', icon: Factory },
              { key: 'quality', label: 'Chất lượng', icon: Award },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'overview' | 'inventory' | 'sales' | 'production' | 'quality')}
                className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-b-2 border-blue-600'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Doanh thu tháng này"
                value={formatCurrency(metrics.sales.totalRevenue)}
                subtitle={`${metrics.sales.totalOrders} đơn hàng`}
                icon={DollarSign}
                color={COLORS.success}
                trend="up"
                trendValue={`+${metrics.sales.changePercent}%`}
              />
              <MetricCard
                title="Giá trị tồn kho"
                value={formatCurrency(metrics.inventory.totalValue)}
                subtitle={`${formatNumber(metrics.inventory.totalParts)} linh kiện`}
                icon={Package}
                color={COLORS.info}
                trend="up"
                trendValue={`+${metrics.inventory.changePercent}%`}
              />
              <MetricCard
                title="Work Orders Active"
                value={metrics.production.activeWorkOrders}
                subtitle={`${metrics.production.completedThisMonth} hoàn thành tháng này`}
                icon={Factory}
                color={COLORS.purple}
                trend="up"
                trendValue={`+${metrics.production.changePercent}%`}
              />
              <MetricCard
                title="First Pass Yield"
                value={`${metrics.quality.firstPassYield}%`}
                subtitle={`${metrics.quality.openNCRs} NCR đang mở`}
                icon={Award}
                color={COLORS.warning}
                trend={metrics.quality.changePercent < 0 ? 'down' : 'up'}
                trendValue={`${metrics.quality.changePercent}%`}
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <ChartCard title="Doanh thu & Lợi nhuận" action={
                <span className="text-sm text-gray-500">6 tháng gần nhất</span>
              }>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={charts.revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v/1000}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Doanh thu" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cost" name="Chi phí" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke={COLORS.success} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Orders by Status */}
              <ChartCard title="Đơn hàng theo trạng thái">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={charts.ordersByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                        label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {charts.ordersByStatus.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {charts.ordersByStatus.map((item, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.status}: {item.count}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Compliance Overview */}
              <ChartCard title="Compliance Status">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-green-600 mr-3" />
                      <span className="font-medium">NDAA Compliant</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {((metrics.compliance.ndaaCompliantParts / metrics.inventory.totalParts) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-600 mr-3" />
                      <span className="font-medium">RoHS Compliant</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {((metrics.compliance.rohsCompliantParts / metrics.inventory.totalParts) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-purple-600 mr-3" />
                      <span className="font-medium">ITAR Controlled</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {metrics.compliance.itarControlledParts}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                      <span className="font-medium">Certs Expiring Soon</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      {metrics.compliance.expiringSoonCerts}
                    </span>
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Production Trend */}
              <ChartCard title="Tiến độ sản xuất (Tháng này)">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.productionTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="planned" name="Kế hoạch" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name="Thực tế" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Quality Trend */}
              <ChartCard title="Xu hướng chất lượng">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={charts.qualityTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[95, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="ncr" name="NCR" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="capa" name="CAPA" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="fpy" name="FPY %" stroke={COLORS.success} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <ChartCard title="Top 5 Sản phẩm bán chạy">
                <DataTable
                  data={charts.topProducts}
                  columns={topProductsColumns}
                  keyField="name"
                  emptyMessage="No product data"
                  searchable={false}
                  excelMode={{
                    enabled: true,
                    showRowNumbers: false,
                    columnHeaderStyle: 'field-names',
                    gridBorders: true,
                    showFooter: true,
                    sheetName: 'Top Products',
                    compactMode: true,
                  }}
                />
              </ChartCard>

              {/* Supplier Performance */}
              <ChartCard title="Hiệu suất nhà cung cấp">
                <DataTable
                  data={charts.supplierPerformance}
                  columns={supplierPerformanceColumns}
                  keyField="name"
                  emptyMessage="No supplier data"
                  searchable={false}
                  excelMode={{
                    enabled: true,
                    showRowNumbers: false,
                    columnHeaderStyle: 'field-names',
                    gridBorders: true,
                    showFooter: true,
                    sheetName: 'Supplier Performance',
                    compactMode: true,
                  }}
                />
              </ChartCard>
            </div>

            {/* Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Low Stock Alert */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Cảnh báo tồn kho thấp</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {metrics.inventory.lowStockItems} linh kiện dưới mức tồn tối thiểu
                    </p>
                    <button className="text-sm text-yellow-700 underline mt-2">Xem chi tiết →</button>
                  </div>
                </div>
              </div>

              {/* Out of Stock */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Hết hàng</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {metrics.inventory.outOfStockItems} linh kiện đang hết hàng
                    </p>
                    <button className="text-sm text-red-700 underline mt-2">Tạo PO ngay →</button>
                  </div>
                </div>
              </div>

              {/* Pending Work Orders */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Chờ vật tư</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {metrics.production.pendingMaterials} Work Orders đang chờ vật tư
                    </p>
                    <button className="text-sm text-blue-700 underline mt-2">Kiểm tra →</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Inventory KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Tổng linh kiện"
                value={formatNumber(metrics.inventory.totalParts)}
                icon={Package}
                color={COLORS.info}
              />
              <MetricCard
                title="Giá trị tồn kho"
                value={formatCurrency(metrics.inventory.totalValue)}
                icon={DollarSign}
                color={COLORS.success}
              />
              <MetricCard
                title="Tồn kho thấp"
                value={metrics.inventory.lowStockItems}
                icon={AlertTriangle}
                color={COLORS.warning}
              />
              <MetricCard
                title="Hết hàng"
                value={metrics.inventory.outOfStockItems}
                icon={AlertCircle}
                color={COLORS.danger}
              />
              <MetricCard
                title="Inventory Turnover"
                value={`${metrics.inventory.turnoverRate}x`}
                icon={RefreshCw}
                color={COLORS.purple}
              />
            </div>

            {/* Inventory by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Giá trị tồn kho theo danh mục">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.inventoryByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v/1000}K`} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Giá trị" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Số lượng theo danh mục">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={charts.inventoryByCategory}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="quantity"
                        label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {charts.inventoryByCategory.map((entry, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Top Parts by Value */}
            <ChartCard title="Top 5 Linh kiện theo giá trị tồn kho">
              <DataTable
                data={charts.topParts}
                columns={topPartsColumns}
                keyField="name"
                emptyMessage="No parts data"
                searchable={false}
                excelMode={{
                  enabled: true,
                  showRowNumbers: false,
                  columnHeaderStyle: 'field-names',
                  gridBorders: true,
                  showFooter: true,
                  sheetName: 'Top Parts',
                  compactMode: true,
                }}
              />
            </ChartCard>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Tổng đơn hàng"
                value={metrics.sales.totalOrders}
                icon={ShoppingCart}
                color={COLORS.info}
                trend="up"
                trendValue={`+${metrics.sales.changePercent}%`}
              />
              <MetricCard
                title="Doanh thu"
                value={formatCurrency(metrics.sales.totalRevenue)}
                icon={DollarSign}
                color={COLORS.success}
              />
              <MetricCard
                title="Đơn chờ xử lý"
                value={metrics.sales.pendingOrders}
                icon={Clock}
                color={COLORS.warning}
              />
              <MetricCard
                title="Hoàn thành"
                value={metrics.sales.completedOrders}
                icon={CheckCircle}
                color={COLORS.success}
              />
              <MetricCard
                title="Giá trị TB/đơn"
                value={formatCurrency(metrics.sales.avgOrderValue)}
                icon={Target}
                color={COLORS.purple}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Doanh thu theo tháng">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v/1000}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="Doanh thu" fill={COLORS.info} fillOpacity={0.3} stroke={COLORS.info} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Top sản phẩm bán chạy">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="quantity" name="Số lượng" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {/* Production Tab */}
        {activeTab === 'production' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="WO Đang chạy"
                value={metrics.production.activeWorkOrders}
                icon={Factory}
                color={COLORS.info}
              />
              <MetricCard
                title="Hoàn thành tháng này"
                value={metrics.production.completedThisMonth}
                icon={CheckCircle}
                color={COLORS.success}
              />
              <MetricCard
                title="Đúng hạn"
                value={`${metrics.production.onTimeDelivery}%`}
                icon={Clock}
                color={COLORS.success}
              />
              <MetricCard
                title="Hiệu suất"
                value={`${metrics.production.efficiency}%`}
                icon={Zap}
                color={COLORS.warning}
              />
              <MetricCard
                title="Chờ vật tư"
                value={metrics.production.pendingMaterials}
                icon={Package}
                color={COLORS.danger}
              />
            </div>

            <ChartCard title="Tiến độ sản xuất theo tuần">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={charts.productionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="planned" name="Kế hoạch" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="actual" name="Thực tế" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Hiệu suất %" stroke={COLORS.warning} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Quality Tab */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Tổng NCR"
                value={metrics.quality.totalNCRs}
                icon={FileText}
                color={COLORS.info}
              />
              <MetricCard
                title="NCR Đang mở"
                value={metrics.quality.openNCRs}
                icon={AlertCircle}
                color={COLORS.danger}
              />
              <MetricCard
                title="CAPA Đang mở"
                value={metrics.quality.openCAPAs}
                icon={Wrench}
                color={COLORS.warning}
              />
              <MetricCard
                title="Tỷ lệ lỗi"
                value={`${metrics.quality.defectRate}%`}
                icon={AlertTriangle}
                color={COLORS.danger}
              />
              <MetricCard
                title="First Pass Yield"
                value={`${metrics.quality.firstPassYield}%`}
                icon={Award}
                color={COLORS.success}
              />
            </div>

            <ChartCard title="Xu hướng chất lượng theo tháng">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={charts.qualityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[95, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="ncr" name="NCR" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="capa" name="CAPA" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="fpy" name="FPY %" stroke={COLORS.success} strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
