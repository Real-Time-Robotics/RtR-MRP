'use client';

import { useState, useMemo } from 'react';
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

// =============================================================================
// This file contains the chart-heavy analytics content, dynamically imported
// by the analytics page to reduce initial bundle size (recharts ~500KB).
// =============================================================================

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
            trend === 'up' ? 'text-success-600' : trend === 'down' ? 'text-danger-600' : 'text-gray-500'
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

// Props for the charts content component
export interface AnalyticsChartsContentProps {
  data: { metrics: DashboardMetrics; charts: ChartData };
  activeTab: 'overview' | 'inventory' | 'sales' | 'production' | 'quality';
}

export default function AnalyticsChartsContent({ data, activeTab }: AnalyticsChartsContentProps) {
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
      render: (_, row, index) => (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
          index === 0 ? 'bg-warning-100 text-warning-700' :
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
      header: 'San pham',
      width: '150px',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'quantity',
      header: 'SL',
      width: '70px',
      sortable: true,
    },
    {
      key: 'revenue',
      header: 'Doanh thu',
      width: '100px',
      sortable: true,
      render: (value) => <span className="font-medium text-success-600">{formatCurrency(value)}</span>,
    },
  ], []);

  const supplierPerformanceColumns: Column<{ name: string; onTime: number; quality: number; score: number }>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Nha cung cap',
      width: '120px',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'onTime',
      header: 'Dung han',
      width: '90px',
      sortable: true,
      cellClassName: (value) => {
        if (value >= 95) return 'bg-success-50 dark:bg-success-950/30';
        if (value >= 90) return 'bg-warning-50 dark:bg-warning-950/30';
        return 'bg-danger-50 dark:bg-danger-950/30';
      },
      render: (value) => (
        <span className={`text-xs font-medium ${
          value >= 95 ? 'text-success-700 dark:text-success-300' :
          value >= 90 ? 'text-warning-700 dark:text-warning-300' :
          'text-danger-700 dark:text-danger-300'
        }`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'quality',
      header: 'Chat luong',
      width: '90px',
      sortable: true,
      cellClassName: (value) => {
        if (value >= 98) return 'bg-success-50 dark:bg-success-950/30';
        if (value >= 95) return 'bg-warning-50 dark:bg-warning-950/30';
        return 'bg-danger-50 dark:bg-danger-950/30';
      },
      render: (value) => (
        <span className={`text-xs font-medium ${
          value >= 98 ? 'text-success-700 dark:text-success-300' :
          value >= 95 ? 'text-warning-700 dark:text-warning-300' :
          'text-danger-700 dark:text-danger-300'
        }`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'score',
      header: 'Diem',
      width: '120px',
      sortable: true,
      render: (value) => (
        <div className="flex items-center justify-end">
          <div className="w-16 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full mr-2">
            <div className="h-full rounded-full bg-primary-600" style={{ width: `${value}%` }} />
          </div>
          <span className="text-sm font-medium">{value}</span>
        </div>
      ),
    },
  ], []);

  const inventoryTotalValue = metrics.inventory.totalValue || 1;

  const topPartsColumns: Column<{ name: string; quantity: number; value: number }>[] = useMemo(() => [
    {
      key: 'rank',
      header: '#',
      width: '50px',
      render: (_, row, index) => <span className="text-sm font-medium text-gray-500">{(index || 0) + 1}</span>,
    },
    {
      key: 'name',
      header: 'Linh kien',
      width: '180px',
      sortable: true,
      render: (value) => <span className="font-medium text-gray-900 dark:text-white">{value}</span>,
    },
    {
      key: 'quantity',
      header: 'So luong',
      width: '80px',
      sortable: true,
      render: (value) => <span className="text-gray-600 dark:text-neutral-400">{formatNumber(value)}</span>,
    },
    {
      key: 'value',
      header: 'Gia tri',
      width: '100px',
      sortable: true,
      render: (value) => <span className="font-medium text-primary-600">{formatCurrency(value)}</span>,
    },
    {
      key: 'percent',
      header: '% Tong',
      width: '120px',
      render: (_, row) => {
        const percent = (row.value / inventoryTotalValue) * 100;
        return (
          <div className="flex items-center justify-end">
            <div className="w-16 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full mr-2">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm text-gray-600 dark:text-neutral-400">{percent.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ], [inventoryTotalValue]);

  return (
    <>
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Doanh thu thang nay"
              value={formatCurrency(metrics.sales.totalRevenue)}
              subtitle={`${metrics.sales.totalOrders} don hang`}
              icon={DollarSign}
              color={COLORS.success}
              trend="up"
              trendValue={`+${metrics.sales.changePercent}%`}
            />
            <MetricCard
              title="Gia tri ton kho"
              value={formatCurrency(metrics.inventory.totalValue)}
              subtitle={`${formatNumber(metrics.inventory.totalParts)} linh kien`}
              icon={Package}
              color={COLORS.info}
              trend="up"
              trendValue={`+${metrics.inventory.changePercent}%`}
            />
            <MetricCard
              title="Work Orders Active"
              value={metrics.production.activeWorkOrders}
              subtitle={`${metrics.production.completedThisMonth} hoan thanh thang nay`}
              icon={Factory}
              color={COLORS.purple}
              trend="up"
              trendValue={`+${metrics.production.changePercent}%`}
            />
            <MetricCard
              title="First Pass Yield"
              value={`${metrics.quality.firstPassYield}%`}
              subtitle={`${metrics.quality.openNCRs} NCR dang mo`}
              icon={Award}
              color={COLORS.warning}
              trend={metrics.quality.changePercent < 0 ? 'down' : 'up'}
              trendValue={`${metrics.quality.changePercent}%`}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Chart */}
            <ChartCard title="Doanh thu & Loi nhuan" action={
              <span className="text-sm text-gray-500">6 thang gan nhat</span>
            }>
              <div className="h-72">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={charts.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v/1000}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Doanh thu" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name="Chi phi" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="profit" name="Loi nhuan" stroke={COLORS.success} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Orders by Status */}
            <ChartCard title="Don hang theo trang thai">
              <div className="h-72">
                <ResponsiveContainer width="100%" height={280}>
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
                <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-success-600 mr-3" />
                    <span className="font-medium">NDAA Compliant</span>
                  </div>
                  <span className="text-lg font-bold text-success-600">
                    {((metrics.compliance.ndaaCompliantParts / metrics.inventory.totalParts) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="font-medium">RoHS Compliant</span>
                  </div>
                  <span className="text-lg font-bold text-primary-600">
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
                <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-warning-600 mr-3" />
                    <span className="font-medium">Certs Expiring Soon</span>
                  </div>
                  <span className="text-lg font-bold text-warning-600">
                    {metrics.compliance.expiringSoonCerts}
                  </span>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Production Trend */}
            <ChartCard title="Tien do san xuat (Thang nay)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.productionTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="planned" name="Ke hoach" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Thuc te" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Quality Trend */}
            <ChartCard title="Xu huong chat luong">
              <div className="h-64">
                <ResponsiveContainer width="100%" height={280}>
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
            <ChartCard title="Top 5 San pham ban chay">
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
            <ChartCard title="Hieu suat nha cung cap">
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
            <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-warning-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-warning-800">Canh bao ton kho thap</h4>
                  <p className="text-sm text-warning-700 mt-1">
                    {metrics.inventory.lowStockItems} linh kien duoi muc ton toi thieu
                  </p>
                  <button className="text-sm text-warning-700 underline mt-2">Xem chi tiet &rarr;</button>
                </div>
              </div>
            </div>

            {/* Out of Stock */}
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-danger-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-danger-800">Het hang</h4>
                  <p className="text-sm text-danger-700 mt-1">
                    {metrics.inventory.outOfStockItems} linh kien dang het hang
                  </p>
                  <button className="text-sm text-danger-700 underline mt-2">Tao PO ngay &rarr;</button>
                </div>
              </div>
            </div>

            {/* Pending Work Orders */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary-800">Cho vat tu</h4>
                  <p className="text-sm text-primary-700 mt-1">
                    {metrics.production.pendingMaterials} Work Orders dang cho vat tu
                  </p>
                  <button className="text-sm text-primary-700 underline mt-2">Kiem tra &rarr;</button>
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
              title="Tong linh kien"
              value={formatNumber(metrics.inventory.totalParts)}
              icon={Package}
              color={COLORS.info}
            />
            <MetricCard
              title="Gia tri ton kho"
              value={formatCurrency(metrics.inventory.totalValue)}
              icon={DollarSign}
              color={COLORS.success}
            />
            <MetricCard
              title="Ton kho thap"
              value={metrics.inventory.lowStockItems}
              icon={AlertTriangle}
              color={COLORS.warning}
            />
            <MetricCard
              title="Het hang"
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
            <ChartCard title="Gia tri ton kho theo danh muc">
              <div className="h-80">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.inventoryByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v/1000}K`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Gia tri" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="So luong theo danh muc">
              <div className="h-80">
                <ResponsiveContainer width="100%" height={280}>
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
          <ChartCard title="Top 5 Linh kien theo gia tri ton kho">
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
              title="Tong don hang"
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
              title="Don cho xu ly"
              value={metrics.sales.pendingOrders}
              icon={Clock}
              color={COLORS.warning}
            />
            <MetricCard
              title="Hoan thanh"
              value={metrics.sales.completedOrders}
              icon={CheckCircle}
              color={COLORS.success}
            />
            <MetricCard
              title="Gia tri TB/don"
              value={formatCurrency(metrics.sales.avgOrderValue)}
              icon={Target}
              color={COLORS.purple}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Doanh thu theo thang">
              <div className="h-72">
                <ResponsiveContainer width="100%" height={280}>
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

            <ChartCard title="Top san pham ban chay">
              <div className="h-72">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="quantity" name="So luong" fill={COLORS.success} radius={[0, 4, 4, 0]} />
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
              title="WO Dang chay"
              value={metrics.production.activeWorkOrders}
              icon={Factory}
              color={COLORS.info}
            />
            <MetricCard
              title="Hoan thanh thang nay"
              value={metrics.production.completedThisMonth}
              icon={CheckCircle}
              color={COLORS.success}
            />
            <MetricCard
              title="Dung han"
              value={`${metrics.production.onTimeDelivery}%`}
              icon={Clock}
              color={COLORS.success}
            />
            <MetricCard
              title="Hieu suat"
              value={`${metrics.production.efficiency}%`}
              icon={Zap}
              color={COLORS.warning}
            />
            <MetricCard
              title="Cho vat tu"
              value={metrics.production.pendingMaterials}
              icon={Package}
              color={COLORS.danger}
            />
          </div>

          <ChartCard title="Tien do san xuat theo tuan">
            <div className="h-80">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={charts.productionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="planned" name="Ke hoach" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="actual" name="Thuc te" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Hieu suat %" stroke={COLORS.warning} strokeWidth={2} />
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
              title="Tong NCR"
              value={metrics.quality.totalNCRs}
              icon={FileText}
              color={COLORS.info}
            />
            <MetricCard
              title="NCR Dang mo"
              value={metrics.quality.openNCRs}
              icon={AlertCircle}
              color={COLORS.danger}
            />
            <MetricCard
              title="CAPA Dang mo"
              value={metrics.quality.openCAPAs}
              icon={Wrench}
              color={COLORS.warning}
            />
            <MetricCard
              title="Ty le loi"
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

          <ChartCard title="Xu huong chat luong theo thang">
            <div className="h-80">
              <ResponsiveContainer width="100%" height={280}>
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
    </>
  );
}
