'use client';

import React, { useState } from 'react';
import {
  Package,
  DollarSign,
  ShoppingCart,
  Factory,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus,
  Download,
  Filter,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

// Import from UI system
import { cn } from '@/lib/utils';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  KPICard,
  KPICardGroup,
  Badge,
  StatusBadge,
  DataTable,
  AreaChart,
  BarChart,
  DonutChart,
  Sparkline,
} from '../ui-v2';
import {
  PageContainer,
  PageHeader,
  PageSection,
  Grid,
} from '../layout-v2';

// =============================================================================
// DASHBOARD PAGE - REDESIGNED
// Modern, data-dense command center with real-time metrics
// =============================================================================

// Mock data
const kpiData = {
  revenue: {
    value: 3450000,
    change: 15.3,
    sparkline: [2100, 2300, 2150, 2800, 2600, 3100, 3450],
  },
  inventory: {
    value: 1250000,
    change: 8.5,
    sparkline: [950, 1020, 1100, 1080, 1150, 1200, 1250],
  },
  orders: {
    value: 156,
    change: 12,
    pending: 8,
  },
  fpy: {
    value: 98.8,
    change: -2.1,
    target: 99.5,
  },
};

const revenueChartData = [
  { month: 'Jan', revenue: 420000, profit: 105000, target: 400000 },
  { month: 'Feb', revenue: 380000, profit: 95000, target: 420000 },
  { month: 'Mar', revenue: 510000, profit: 127500, target: 450000 },
  { month: 'Apr', revenue: 470000, profit: 117500, target: 480000 },
  { month: 'May', revenue: 620000, profit: 155000, target: 500000 },
  { month: 'Jun', revenue: 580000, profit: 145000, target: 550000 },
  { month: 'Jul', revenue: 720000, profit: 180000, target: 600000 },
  { month: 'Aug', revenue: 750000, profit: 187500, target: 650000 },
];

const orderStatusData = [
  { name: 'Completed', value: 144, color: '#10B981' },
  { name: 'In Progress', value: 8, color: '#3B82F6' },
  { name: 'Pending', value: 4, color: '#F59E0B' },
];

const topProductsData = [
  { name: 'HERA-X8-PRO', revenue: 1100000 },
  { name: 'HERA-X8-ENT', revenue: 960000 },
  { name: 'HERA-X6-STD', revenue: 520000 },
  { name: 'HERA-X4-EDU', revenue: 380000 },
  { name: 'Accessories', revenue: 290000 },
];

const recentOrdersData = [
  {
    id: 'SO-2024-0156',
    customer: 'VN Air Force',
    amount: 285000,
    status: 'in_progress',
    date: '2024-12-28',
  },
  {
    id: 'SO-2024-0155',
    customer: 'AgriTech Corp',
    amount: 142000,
    status: 'pending',
    date: '2024-12-28',
  },
  {
    id: 'SO-2024-0154',
    customer: 'Survey Systems',
    amount: 89000,
    status: 'completed',
    date: '2024-12-27',
  },
  {
    id: 'SO-2024-0153',
    customer: 'Logistics Plus',
    amount: 156000,
    status: 'completed',
    date: '2024-12-27',
  },
];

const alertsData = [
  {
    id: 1,
    type: 'danger',
    title: 'Low Stock Alert',
    message: '5 parts below minimum stock level',
    time: '2 hours ago',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Pending Purchase Orders',
    message: '3 POs awaiting approval',
    time: '4 hours ago',
  },
  {
    id: 3,
    type: 'info',
    title: 'Quality NCRs Open',
    message: '8 NCRs require attention',
    time: '1 day ago',
  },
];

// Alert item component
const AlertItem: React.FC<{
  type: string;
  title: string;
  message: string;
  time: string;
}> = ({ type, title, message, time }) => {
  const colors = {
    danger: 'bg-danger-50 border-danger-200 text-danger-700',
    warning: 'bg-warning-50 border-warning-200 text-warning-700',
    info: 'bg-info-50 border-info-200 text-info-700',
  };

  const icons = {
    danger: <AlertTriangle className="h-4 w-4" />,
    warning: <Clock className="h-4 w-4" />,
    info: <CheckCircle className="h-4 w-4" />,
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        colors[type as keyof typeof colors]
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icons[type as keyof typeof icons]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs opacity-80 mt-0.5">{message}</p>
          <p className="text-xs opacity-60 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const DashboardPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <PageContainer maxWidth="2xl" padding="md">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening today."
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              New Order
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <PageSection>
        <KPICardGroup columns={4}>
          <KPICard
            title="Total Revenue"
            value={kpiData.revenue.value}
            valueFormat="currency"
            change={kpiData.revenue.change}
            changePeriod="vs last month"
            icon={<DollarSign className="h-5 w-5" />}
            iconColor="success"
            sparkline={kpiData.revenue.sparkline}
            sparklineColor="success"
          />
          <KPICard
            title="Inventory Value"
            value={kpiData.inventory.value}
            valueFormat="currency"
            change={kpiData.inventory.change}
            changePeriod="vs last month"
            icon={<Package className="h-5 w-5" />}
            iconColor="primary"
            sparkline={kpiData.inventory.sparkline}
            sparklineColor="primary"
          />
          <KPICard
            title="Active Orders"
            value={kpiData.orders.value}
            change={kpiData.orders.change}
            changePeriod="vs last month"
            icon={<ShoppingCart className="h-5 w-5" />}
            iconColor="warning"
            subtitle={`${kpiData.orders.pending} pending`}
          />
          <KPICard
            title="First Pass Yield"
            value={`${kpiData.fpy.value}%`}
            change={kpiData.fpy.change}
            changePeriod="vs last month"
            icon={<CheckCircle className="h-5 w-5" />}
            iconColor={kpiData.fpy.change >= 0 ? 'success' : 'danger'}
            progress={kpiData.fpy.value}
            progressTarget={kpiData.fpy.target}
          />
        </KPICardGroup>
      </PageSection>

      {/* Charts Row */}
      <PageSection>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <AreaChart
              title="Revenue & Profit Trend"
              subtitle="Monthly performance over time"
              data={revenueChartData}
              dataKey={['revenue', 'profit']}
              xAxisKey="month"
              colors={['#3B82F6', '#10B981']}
              showLegend
              height={300}
              formatter={(value) => formatCurrency(value)}
              actions={
                <div className="flex items-center gap-1">
                  {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded',
                        timeRange === range
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              }
            />
          </div>

          {/* Order Status Donut */}
          <DonutChart
            title="Order Status"
            subtitle="Current distribution"
            data={orderStatusData}
            centerValue={156}
            centerLabel="Total"
            height={300}
            innerRadius={50}
            outerRadius={80}
          />
        </div>
      </PageSection>

      {/* Second Row */}
      <PageSection>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts */}
          <Card>
            <CardHeader
              title="Alerts"
              actions={
                <Badge variant="danger" dot pulse>
                  {alertsData.length} Active
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              {alertsData.map((alert) => (
                <AlertItem key={alert.id} {...alert} />
              ))}
              <Button variant="ghost" size="sm" fullWidth rightIcon={<ArrowRight className="h-4 w-4" />}>
                View All Alerts
              </Button>
            </CardBody>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader
              title="Top Products"
              subtitle="By revenue"
              actions={
                <button className="p-1 text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              }
            />
            <CardBody className="space-y-3">
              {topProductsData.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-medium text-slate-400">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {product.name}
                    </p>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{
                          width: `${(product.revenue / topProductsData[0].revenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono text-slate-600">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader title="Quick Stats" subtitle="Real-time metrics" />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Work Orders Active</p>
                  <p className="text-xl font-semibold text-slate-900 font-mono">12</p>
                </div>
                <Factory className="h-8 w-8 text-slate-300" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Parts to Reorder</p>
                  <p className="text-xl font-semibold text-slate-900 font-mono">23</p>
                </div>
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Overdue Deliveries</p>
                  <p className="text-xl font-semibold text-danger-600 font-mono">3</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-danger-200" />
              </div>
            </CardBody>
          </Card>
        </div>
      </PageSection>

      {/* Recent Orders Table */}
      <PageSection title="Recent Orders" description="Latest sales orders">
        <Card>
          <DataTable
            data={recentOrdersData}
            keyField="id"
            columns={[
              {
                key: 'id',
                header: 'Order #',
                width: '150px',
                render: (value) => (
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-700">
                    {value}
                  </a>
                ),
              },
              {
                key: 'customer',
                header: 'Customer',
              },
              {
                key: 'amount',
                header: 'Amount',
                type: 'currency',
                align: 'right',
                render: (value) => (
                  <span className="font-mono">{formatCurrency(value)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (value) => <StatusBadge status={value} />,
              },
              {
                key: 'date',
                header: 'Date',
                type: 'date',
              },
              {
                key: 'actions',
                header: '',
                width: '50px',
                render: () => (
                  <button className="p-1 text-slate-400 hover:text-slate-600">
                    <ExternalLink className="h-4 w-4" />
                  </button>
                ),
              },
            ]}
            pagination={false}
            searchable={false}
          />
        </Card>
      </PageSection>

      {/* AI Insights Banner */}
      <PageSection>
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI Insight</h3>
                <p className="text-primary-100 text-sm mt-1">
                  Based on current trends, revenue is projected to hit $4.2M by Q1 2025.
                  Motor U15 II stock needs attention - consider reordering.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              View Analysis
            </Button>
          </div>
        </div>
      </PageSection>
    </PageContainer>
  );
};

export default DashboardPage;
