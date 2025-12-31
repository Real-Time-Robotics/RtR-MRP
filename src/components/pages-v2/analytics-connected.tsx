'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Factory,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import {
  useOverviewAnalytics,
  useInventoryAnalytics,
  useSalesAnalytics,
  useProductionAnalytics,
  useQualityAnalytics,
} from '@/lib/hooks/use-data';

// =============================================================================
// ANALYTICS PAGE - CONNECTED TO API
// =============================================================================

type TabType = 'overview' | 'inventory' | 'sales' | 'production' | 'quality';

// Badge component
const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}> = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
    success: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
    danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
    info: 'bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', variants[variant])}>
      {children}
    </span>
  );
};

// Stat Card
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
  subtitle?: string;
}> = ({ title, value, icon, iconColor, subtitle }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
    <div className="flex items-center justify-between">
      <div className={cn('p-2 rounded-lg', iconColor)}>{icon}</div>
    </div>
    <div className="mt-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-32">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-6 w-32 bg-slate-100 dark:bg-slate-600 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// Overview Tab
const OverviewTab: React.FC<{ period: number }> = ({ period }) => {
  const { data, isLoading, isError, refresh } = useOverviewAnalytics(period);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <div className="text-center py-8 text-danger-600">Failed to load data</div>;

  const analytics = data as any;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics?.kpis?.totalRevenue || 0)}
          icon={<DollarSign className="h-5 w-5 text-success-600" />}
          iconColor="bg-success-100 dark:bg-success-900/30"
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(analytics?.kpis?.totalOrders || 0)}
          icon={<ShoppingCart className="h-5 w-5 text-primary-600" />}
          iconColor="bg-primary-100 dark:bg-primary-900/30"
        />
        <StatCard
          title="Completed WOs"
          value={formatNumber(analytics?.kpis?.completedWorkOrders || 0)}
          icon={<Factory className="h-5 w-5 text-info-600" />}
          iconColor="bg-info-100 dark:bg-info-900/30"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(analytics?.kpis?.inventoryValue || 0)}
          icon={<Package className="h-5 w-5 text-warning-600" />}
          iconColor="bg-warning-100 dark:bg-warning-900/30"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(analytics?.kpis?.avgOrderValue || 0)}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          iconColor="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Alerts */}
      {analytics?.alerts && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Alerts</h3>
          <div className="flex gap-4">
            {analytics.alerts.lowStock > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning-600" />
                <span className="text-sm text-warning-700 dark:text-warning-400">{analytics.alerts.lowStock} Low Stock</span>
              </div>
            )}
            {analytics.alerts.overdueOrders > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-danger-600" />
                <span className="text-sm text-danger-700 dark:text-danger-400">{analytics.alerts.overdueOrders} Overdue</span>
              </div>
            )}
            {analytics.alerts.openNCRs > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-info-50 dark:bg-info-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-info-600" />
                <span className="text-sm text-info-700 dark:text-info-400">{analytics.alerts.openNCRs} Open NCRs</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Orders</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {analytics?.recentOrders?.slice(0, 5).map((order: any) => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-primary-600 dark:text-primary-400">{order.soNumber}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-slate-900 dark:text-white">{formatCurrency(order.amount)}</p>
                  <Badge variant={order.status === 'COMPLETED' ? 'success' : 'info'}>{order.status}</Badge>
                </div>
              </div>
            ))}
            {(!analytics?.recentOrders || analytics.recentOrders.length === 0) && (
              <div className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">No recent orders</div>
            )}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Work Orders</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {analytics?.recentWorkOrders?.slice(0, 5).map((wo: any) => (
              <div key={wo.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-primary-600 dark:text-primary-400">{wo.woNumber}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{wo.product}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-900 dark:text-white">{wo.quantity} units</p>
                  <Badge variant={wo.status === 'COMPLETED' ? 'success' : 'info'}>{wo.status}</Badge>
                </div>
              </div>
            ))}
            {(!analytics?.recentWorkOrders || analytics.recentWorkOrders.length === 0) && (
              <div className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">No recent work orders</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory Tab
const InventoryTab: React.FC<{ period: number }> = ({ period }) => {
  const { data, isLoading, isError } = useInventoryAnalytics(period);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <div className="text-center py-8 text-danger-600">Failed to load data</div>;

  const analytics = data as any;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Value"
          value={formatCurrency(analytics?.summary?.totalValue || 0)}
          icon={<DollarSign className="h-5 w-5 text-success-600" />}
          iconColor="bg-success-100 dark:bg-success-900/30"
        />
        <StatCard
          title="Total Quantity"
          value={formatNumber(analytics?.summary?.totalQuantity || 0)}
          icon={<Package className="h-5 w-5 text-primary-600" />}
          iconColor="bg-primary-100 dark:bg-primary-900/30"
        />
        <StatCard
          title="Total Parts"
          value={formatNumber(analytics?.summary?.totalParts || 0)}
          icon={<BarChart3 className="h-5 w-5 text-info-600" />}
          iconColor="bg-info-100 dark:bg-info-900/30"
        />
      </div>

      {/* Stock Distribution */}
      {analytics?.stockDistribution && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Stock Distribution</h3>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(analytics.stockDistribution).map(([key, value]) => (
              <div key={key} className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{value as number}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Category */}
      {analytics?.byCategory && analytics.byCategory.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">By Category</h3>
          <div className="space-y-3">
            {analytics.byCategory.map((cat: any) => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{cat.category}</span>
                <span className="font-mono text-sm text-slate-900 dark:text-white">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Sales Tab
const SalesTab: React.FC<{ period: number }> = ({ period }) => {
  const { data, isLoading, isError } = useSalesAnalytics(period);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <div className="text-center py-8 text-danger-600">Failed to load data</div>;

  const analytics = data as any;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics?.summary?.totalRevenue || 0)}
          icon={<DollarSign className="h-5 w-5 text-success-600" />}
          iconColor="bg-success-100 dark:bg-success-900/30"
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(analytics?.summary?.totalOrders || 0)}
          icon={<ShoppingCart className="h-5 w-5 text-primary-600" />}
          iconColor="bg-primary-100 dark:bg-primary-900/30"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(analytics?.summary?.avgOrderValue || 0)}
          icon={<TrendingUp className="h-5 w-5 text-info-600" />}
          iconColor="bg-info-100 dark:bg-info-900/30"
        />
      </div>

      {/* By Status */}
      {analytics?.byStatus && analytics.byStatus.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">By Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.byStatus.map((item: any) => (
              <div key={item.status} className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">{item.count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.status}</p>
                <p className="text-xs text-success-600 font-mono mt-1">{formatCurrency(item.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Production Tab
const ProductionTab: React.FC<{ period: number }> = ({ period }) => {
  const { data, isLoading, isError } = useProductionAnalytics(period);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <div className="text-center py-8 text-danger-600">Failed to load data</div>;

  const analytics = data as any;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Work Orders"
          value={formatNumber(analytics?.summary?.totalWorkOrders || 0)}
          icon={<Factory className="h-5 w-5 text-primary-600" />}
          iconColor="bg-primary-100 dark:bg-primary-900/30"
        />
        <StatCard
          title="Completed Qty"
          value={formatNumber(analytics?.summary?.completedQuantity || 0)}
          icon={<Package className="h-5 w-5 text-success-600" />}
          iconColor="bg-success-100 dark:bg-success-900/30"
        />
        <StatCard
          title="Scrap Qty"
          value={formatNumber(analytics?.summary?.scrapQuantity || 0)}
          icon={<AlertTriangle className="h-5 w-5 text-danger-600" />}
          iconColor="bg-danger-100 dark:bg-danger-900/30"
        />
        <StatCard
          title="Yield Rate"
          value={analytics?.summary?.yieldRate || '0%'}
          icon={<TrendingUp className="h-5 w-5 text-info-600" />}
          iconColor="bg-info-100 dark:bg-info-900/30"
        />
      </div>

      {/* On-Time Delivery */}
      {analytics?.onTimeDelivery && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">On-Time Delivery</h3>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-success-600 font-mono">{analytics.onTimeDelivery.rate}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rate</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">{analytics.onTimeDelivery.onTime}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">On Time</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">{analytics.onTimeDelivery.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Quality Tab
const QualityTab: React.FC<{ period: number }> = ({ period }) => {
  const { data, isLoading, isError } = useQualityAnalytics(period);

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <div className="text-center py-8 text-danger-600">Failed to load data</div>;

  const analytics = data as any;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total NCRs"
          value={formatNumber(analytics?.summary?.totalNCRs || 0)}
          icon={<AlertTriangle className="h-5 w-5 text-danger-600" />}
          iconColor="bg-danger-100 dark:bg-danger-900/30"
        />
        <StatCard
          title="Qty Affected"
          value={formatNumber(analytics?.summary?.quantityAffected || 0)}
          icon={<Package className="h-5 w-5 text-warning-600" />}
          iconColor="bg-warning-100 dark:bg-warning-900/30"
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(analytics?.summary?.totalCost || 0)}
          icon={<DollarSign className="h-5 w-5 text-info-600" />}
          iconColor="bg-info-100 dark:bg-info-900/30"
        />
      </div>

      {/* By Source */}
      {analytics?.bySource && analytics.bySource.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">By Source</h3>
          <div className="space-y-3">
            {analytics.bySource.map((item: any) => (
              <div key={item.source} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.source}</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-slate-900 dark:text-white">{item.count}</span>
                  <span className="font-mono text-sm text-danger-600">{formatCurrency(item.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Analytics Page
export default function AnalyticsConnected() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState(30);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="h-4 w-4" /> },
    { id: 'sales', label: 'Sales', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 'production', label: 'Production', icon: <Factory className="h-4 w-4" /> },
    { id: 'quality', label: 'Quality', icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <nav className="mb-2">
                <ol className="flex items-center gap-2 text-sm">
                  <li><a href="/v2/dashboard" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">Dashboard</a></li>
                  <li className="text-slate-400">/</li>
                  <li className="text-slate-700 dark:text-slate-200 font-medium">Analytics</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Business insights and reporting</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab period={period} />}
        {activeTab === 'inventory' && <InventoryTab period={period} />}
        {activeTab === 'sales' && <SalesTab period={period} />}
        {activeTab === 'production' && <ProductionTab period={period} />}
        {activeTab === 'quality' && <QualityTab period={period} />}
      </div>
    </div>
  );
}
