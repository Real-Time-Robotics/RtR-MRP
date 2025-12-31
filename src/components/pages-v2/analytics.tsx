'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Factory,
  Users,
  Target,
  Calendar,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon,
  Activity,
} from 'lucide-react';

import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  KPICard,
  KPICardGroup,
  Badge,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
  ComposedChart,
  DataTable,
  Select,
} from '../ui-v2';
import {
  PageContainer,
  PageHeader,
  PageSection,
  Grid,
} from '../layout-v2';

// =============================================================================
// ANALYTICS DASHBOARD - COMPREHENSIVE DATA VISUALIZATION
// =============================================================================

// Mock Data
const overviewMetrics = {
  revenue: { value: 3450000, change: 15.3, target: 4000000 },
  profit: { value: 862500, change: 12.8, margin: 25 },
  orders: { value: 156, change: 8.5, avgValue: 22115 },
  customers: { value: 48, change: 6.2, active: 42 },
};

const revenueByMonth = [
  { month: 'Jan', revenue: 420000, profit: 105000, orders: 18 },
  { month: 'Feb', revenue: 380000, profit: 95000, orders: 16 },
  { month: 'Mar', revenue: 510000, profit: 127500, orders: 22 },
  { month: 'Apr', revenue: 470000, profit: 117500, orders: 20 },
  { month: 'May', revenue: 620000, profit: 155000, orders: 26 },
  { month: 'Jun', revenue: 580000, profit: 145000, orders: 24 },
  { month: 'Jul', revenue: 720000, profit: 180000, orders: 30 },
  { month: 'Aug', revenue: 750000, profit: 187500, orders: 32 },
];

const productMix = [
  { name: 'HERA-X8-PRO', value: 1100000, units: 22 },
  { name: 'HERA-X8-ENT', value: 960000, units: 16 },
  { name: 'HERA-X6-STD', value: 520000, units: 26 },
  { name: 'HERA-X4-EDU', value: 380000, units: 38 },
  { name: 'Accessories', value: 290000, units: 156 },
];

const customerSegments = [
  { name: 'Defense', value: 1200000, color: '#3B82F6' },
  { name: 'Agriculture', value: 850000, color: '#10B981' },
  { name: 'Survey', value: 620000, color: '#F59E0B' },
  { name: 'Logistics', value: 480000, color: '#8B5CF6' },
  { name: 'Education', value: 300000, color: '#06B6D4' },
];

const inventoryMetrics = {
  totalValue: { value: 1250000, change: 8.5 },
  turnover: { value: 4.2, change: 0.3 },
  accuracy: { value: 99.2, change: 0.5 },
  stockouts: { value: 5, change: -2 },
};

const inventoryTrend = [
  { month: 'Jan', value: 950000, turnover: 3.8 },
  { month: 'Feb', value: 1020000, turnover: 3.9 },
  { month: 'Mar', value: 1100000, turnover: 4.0 },
  { month: 'Apr', value: 1080000, turnover: 4.1 },
  { month: 'May', value: 1150000, turnover: 4.2 },
  { month: 'Jun', value: 1200000, turnover: 4.2 },
  { month: 'Jul', value: 1180000, turnover: 4.3 },
  { month: 'Aug', value: 1250000, turnover: 4.2 },
];

const categoryBreakdown = [
  { name: 'Propulsion', value: 450000, parts: 320 },
  { name: 'Electronics', value: 320000, parts: 185 },
  { name: 'Power', value: 280000, parts: 142 },
  { name: 'Sensors', value: 120000, parts: 89 },
  { name: 'Frame', value: 80000, parts: 64 },
];

const productionMetrics = {
  output: { value: 48, change: 12.5 },
  efficiency: { value: 92.5, change: 2.3 },
  fpy: { value: 98.8, change: -0.5 },
  onTime: { value: 95.2, change: 1.8 },
};

const productionByWeek = [
  { week: 'W1', planned: 12, actual: 11, efficiency: 91.7 },
  { week: 'W2', planned: 14, actual: 13, efficiency: 92.9 },
  { week: 'W3', planned: 10, actual: 10, efficiency: 100 },
  { week: 'W4', planned: 12, actual: 14, efficiency: 116.7 },
];

const qualityMetrics = {
  fpy: { value: 98.8, target: 99.5 },
  ncrs: { value: 12, open: 8 },
  capa: { value: 5, overdue: 1 },
  audits: { value: 2, passed: 2 },
};

const ncrTrend = [
  { month: 'Jan', opened: 5, closed: 4 },
  { month: 'Feb', opened: 3, closed: 5 },
  { month: 'Mar', opened: 6, closed: 4 },
  { month: 'Apr', opened: 4, closed: 6 },
  { month: 'May', opened: 2, closed: 3 },
  { month: 'Jun', opened: 4, closed: 4 },
  { month: 'Jul', opened: 3, closed: 5 },
  { month: 'Aug', opened: 2, closed: 4 },
];

// Time range selector component
const TimeRangeSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const ranges = ['1W', '1M', '3M', '6M', '1Y', 'YTD'];
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === range
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
};

// Metric card for tab headers
const MetricSummary: React.FC<{
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
}> = ({ label, value, change, prefix, suffix }) => (
  <div className="text-center px-4">
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    <p className="text-lg font-semibold text-slate-900 font-mono">
      {prefix}{typeof value === 'number' ? formatNumber(value) : value}{suffix}
    </p>
    {change !== undefined && (
      <p className={cn(
        'text-xs font-medium',
        change >= 0 ? 'text-success-600' : 'text-danger-600'
      )}>
        {change >= 0 ? '+' : ''}{change}%
      </p>
    )}
  </div>
);

// Main Analytics Page
const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('3M');

  return (
    <PageContainer maxWidth="2xl" padding="md">
      {/* Header */}
      <PageHeader
        title="Analytics Dashboard"
        description="Comprehensive business intelligence and performance metrics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' },
        ]}
        actions={
          <>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export Report
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <TabList className="border-b border-slate-200 px-4">
            <Tab id="overview"><span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Overview</span></Tab>
            <Tab id="inventory"><span className="flex items-center gap-2"><Package className="h-4 w-4" />Inventory</span></Tab>
            <Tab id="sales"><span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Sales</span></Tab>
            <Tab id="production"><span className="flex items-center gap-2"><Factory className="h-4 w-4" />Production</span></Tab>
            <Tab id="quality"><span className="flex items-center gap-2"><Target className="h-4 w-4" />Quality</span></Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel id="overview">
              <div className="p-6">
                {/* KPI Summary */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <KPICard
                    title="Total Revenue"
                    value={overviewMetrics.revenue.value}
                    valueFormat="currency"
                    change={overviewMetrics.revenue.change}
                    changePeriod="vs last period"
                    icon={<DollarSign className="h-5 w-5" />}
                    iconColor="success"
                    progress={overviewMetrics.revenue.value}
                    progressTarget={overviewMetrics.revenue.target}
                  />
                  <KPICard
                    title="Gross Profit"
                    value={overviewMetrics.profit.value}
                    valueFormat="currency"
                    change={overviewMetrics.profit.change}
                    subtitle={`${overviewMetrics.profit.margin}% margin`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    iconColor="primary"
                  />
                  <KPICard
                    title="Total Orders"
                    value={overviewMetrics.orders.value}
                    change={overviewMetrics.orders.change}
                    subtitle={`Avg ${formatCurrency(overviewMetrics.orders.avgValue)}`}
                    icon={<ShoppingCart className="h-5 w-5" />}
                    iconColor="warning"
                  />
                  <KPICard
                    title="Active Customers"
                    value={overviewMetrics.customers.value}
                    change={overviewMetrics.customers.change}
                    subtitle={`${overviewMetrics.customers.active} active`}
                    icon={<Users className="h-5 w-5" />}
                    iconColor="info"
                  />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2">
                    <ComposedChart
                      title="Revenue & Profit Trend"
                      data={revenueByMonth}
                      xAxisKey="month"
                      barKeys={['revenue']}
                      lineKeys={['profit']}
                      barColors={['#3B82F6']}
                      lineColors={['#10B981']}
                      showLegend
                      height={300}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </div>
                  <DonutChart
                    title="Revenue by Segment"
                    data={customerSegments}
                    height={300}
                    centerValue={formatCurrency(3450000)}
                    centerLabel="Total"
                    formatter={(value) => formatCurrency(value)}
                  />
                </div>

                {/* Products Table */}
                <div className="mt-6">
                  <Card>
                    <CardHeader title="Top Products by Revenue" />
                    <DataTable
                      data={productMix}
                      keyField="name"
                      pagination={false}
                      searchable={false}
                      columns={[
                        { key: 'name', header: 'Product', sortable: true },
                        {
                          key: 'units',
                          header: 'Units Sold',
                          align: 'right',
                          render: (v) => <span className="font-mono">{v}</span>,
                        },
                        {
                          key: 'value',
                          header: 'Revenue',
                          align: 'right',
                          render: (v) => <span className="font-mono">{formatCurrency(v)}</span>,
                        },
                        {
                          key: 'share',
                          header: 'Share',
                          width: '150px',
                          render: (_, row) => {
                            const total = productMix.reduce((sum, p) => sum + p.value, 0);
                            const pct = (row.value / total) * 100;
                            return (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary-500 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 w-10">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            );
                          },
                        },
                      ]}
                    />
                  </Card>
                </div>
              </div>
            </TabPanel>

            {/* Inventory Tab */}
            <TabPanel id="inventory">
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <KPICard
                    title="Inventory Value"
                    value={inventoryMetrics.totalValue.value}
                    valueFormat="currency"
                    change={inventoryMetrics.totalValue.change}
                    icon={<Package className="h-5 w-5" />}
                    iconColor="primary"
                    variant="compact"
                  />
                  <KPICard
                    title="Turnover Rate"
                    value={`${inventoryMetrics.turnover.value}x`}
                    change={inventoryMetrics.turnover.change}
                    icon={<RefreshCw className="h-5 w-5" />}
                    iconColor="success"
                    variant="compact"
                  />
                  <KPICard
                    title="Accuracy"
                    value={`${inventoryMetrics.accuracy.value}%`}
                    change={inventoryMetrics.accuracy.change}
                    icon={<Target className="h-5 w-5" />}
                    iconColor="info"
                    variant="compact"
                  />
                  <KPICard
                    title="Stockouts"
                    value={inventoryMetrics.stockouts.value}
                    change={inventoryMetrics.stockouts.change}
                    icon={<Activity className="h-5 w-5" />}
                    iconColor="danger"
                    variant="compact"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2">
                    <AreaChart
                      title="Inventory Value Trend"
                      data={inventoryTrend}
                      dataKey="value"
                      xAxisKey="month"
                      height={300}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </div>
                  <BarChart
                    title="Value by Category"
                    data={categoryBreakdown}
                    dataKey="value"
                    xAxisKey="name"
                    horizontal
                    height={300}
                    formatter={(value) => formatCurrency(value)}
                  />
                </div>
              </div>
            </TabPanel>

            {/* Sales Tab */}
            <TabPanel id="sales">
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <KPICard
                    title="Total Sales"
                    value={3450000}
                    valueFormat="currency"
                    change={15.3}
                    icon={<DollarSign className="h-5 w-5" />}
                    iconColor="success"
                    variant="compact"
                  />
                  <KPICard
                    title="Orders"
                    value={156}
                    change={8.5}
                    icon={<ShoppingCart className="h-5 w-5" />}
                    iconColor="primary"
                    variant="compact"
                  />
                  <KPICard
                    title="Avg Order Value"
                    value={22115}
                    valueFormat="currency"
                    change={6.2}
                    icon={<TrendingUp className="h-5 w-5" />}
                    iconColor="info"
                    variant="compact"
                  />
                  <KPICard
                    title="Customers"
                    value={48}
                    change={4.3}
                    icon={<Users className="h-5 w-5" />}
                    iconColor="warning"
                    variant="compact"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <LineChart
                    title="Monthly Order Volume"
                    data={revenueByMonth}
                    dataKey="orders"
                    xAxisKey="month"
                    height={300}
                    colors={['#3B82F6']}
                  />
                  <DonutChart
                    title="Sales by Segment"
                    data={customerSegments}
                    height={300}
                    formatter={(value) => formatCurrency(value)}
                  />
                </div>
              </div>
            </TabPanel>

            {/* Production Tab */}
            <TabPanel id="production">
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <KPICard
                    title="Units Produced"
                    value={productionMetrics.output.value}
                    change={productionMetrics.output.change}
                    icon={<Factory className="h-5 w-5" />}
                    iconColor="primary"
                    variant="compact"
                  />
                  <KPICard
                    title="Efficiency"
                    value={`${productionMetrics.efficiency.value}%`}
                    change={productionMetrics.efficiency.change}
                    icon={<Activity className="h-5 w-5" />}
                    iconColor="success"
                    variant="compact"
                  />
                  <KPICard
                    title="First Pass Yield"
                    value={`${productionMetrics.fpy.value}%`}
                    change={productionMetrics.fpy.change}
                    icon={<Target className="h-5 w-5" />}
                    iconColor={productionMetrics.fpy.change >= 0 ? 'success' : 'warning'}
                    variant="compact"
                  />
                  <KPICard
                    title="On-Time Delivery"
                    value={`${productionMetrics.onTime.value}%`}
                    change={productionMetrics.onTime.change}
                    icon={<Calendar className="h-5 w-5" />}
                    iconColor="info"
                    variant="compact"
                  />
                </div>

                <Card>
                  <CardHeader title="Weekly Production Performance" />
                  <DataTable
                    data={productionByWeek}
                    keyField="week"
                    pagination={false}
                    searchable={false}
                    columns={[
                      { key: 'week', header: 'Week' },
                      {
                        key: 'planned',
                        header: 'Planned',
                        align: 'right',
                        render: (v) => <span className="font-mono">{v}</span>,
                      },
                      {
                        key: 'actual',
                        header: 'Actual',
                        align: 'right',
                        render: (v) => <span className="font-mono">{v}</span>,
                      },
                      {
                        key: 'efficiency',
                        header: 'Efficiency',
                        align: 'right',
                        render: (v) => (
                          <Badge
                            variant={v >= 100 ? 'success' : v >= 90 ? 'warning' : 'danger'}
                          >
                            {v.toFixed(1)}%
                          </Badge>
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>
            </TabPanel>

            {/* Quality Tab */}
            <TabPanel id="quality">
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <KPICard
                    title="First Pass Yield"
                    value={`${qualityMetrics.fpy.value}%`}
                    subtitle={`Target: ${qualityMetrics.fpy.target}%`}
                    progress={qualityMetrics.fpy.value}
                    progressTarget={qualityMetrics.fpy.target}
                    icon={<Target className="h-5 w-5" />}
                    iconColor="success"
                    variant="compact"
                  />
                  <KPICard
                    title="Open NCRs"
                    value={qualityMetrics.ncrs.open}
                    subtitle={`${qualityMetrics.ncrs.value} total`}
                    icon={<Activity className="h-5 w-5" />}
                    iconColor="warning"
                    variant="compact"
                  />
                  <KPICard
                    title="Active CAPAs"
                    value={qualityMetrics.capa.value}
                    subtitle={`${qualityMetrics.capa.overdue} overdue`}
                    icon={<CheckCircle className="h-5 w-5" />}
                    iconColor={qualityMetrics.capa.overdue > 0 ? 'danger' : 'success'}
                    variant="compact"
                  />
                  <KPICard
                    title="Audits Passed"
                    value={`${qualityMetrics.audits.passed}/${qualityMetrics.audits.value}`}
                    icon={<CheckCircle className="h-5 w-5" />}
                    iconColor="success"
                    variant="compact"
                  />
                </div>

                <BarChart
                  title="NCR Trend"
                  data={ncrTrend}
                  dataKey={['opened', 'closed']}
                  xAxisKey="month"
                  colors={['#EF4444', '#10B981']}
                  showLegend
                  height={300}
                />
              </div>
            </TabPanel>
          </TabPanels>
        </div>
      </Tabs>
    </PageContainer>
  );
};

// Missing import
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default AnalyticsPage;
