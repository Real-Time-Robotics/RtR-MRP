'use client';

import React from 'react';
import {
  Package,
  DollarSign,
  ShoppingCart,
  Factory,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useDashboard } from '@/lib/hooks/use-data';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

// =============================================================================
// DASHBOARD PAGE - WITH REAL DATA
// =============================================================================

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: string; bg: string }> = {
    DRAFT: { color: 'text-slate-600', bg: 'bg-slate-100' },
    PENDING: { color: 'text-warning-600', bg: 'bg-warning-100' },
    CONFIRMED: { color: 'text-primary-600', bg: 'bg-primary-100' },
    IN_PROGRESS: { color: 'text-info-600', bg: 'bg-info-100' },
    SHIPPED: { color: 'text-purple-600', bg: 'bg-purple-100' },
    COMPLETED: { color: 'text-success-600', bg: 'bg-success-100' },
    RELEASED: { color: 'text-primary-600', bg: 'bg-primary-100' },
  };
  const { color, bg } = config[status] || config.DRAFT;

  return (
    <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', color, bg)}>
      {status}
    </span>
  );
};

// KPI Card component
const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}> = ({ title, value, subtitle, trend, icon, color = 'primary' }) => {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger: 'bg-danger-50 text-danger-600',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-success-600' : 'text-danger-600'
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 h-32">
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-600 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// Main Dashboard Component
export default function DashboardConnected() {
  const { data, isLoading, isError, refresh } = useDashboard();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-danger-700 dark:text-danger-400">Failed to load dashboard</h2>
          <p className="text-sm text-danger-600 dark:text-danger-500 mt-2">Please try again later</p>
          <button
            onClick={() => refresh()}
            className="mt-4 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpis, recentOrders, recentWorkOrders, inventoryByCategory } = data || {};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back! Here's what's happening today.</p>
        </div>
        <button
          onClick={() => refresh()}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Total Parts"
          value={formatNumber(kpis?.inventory?.totalParts || 0)}
          subtitle={`${kpis?.inventory?.lowStockParts || 0} low stock`}
          icon={<Package className="h-5 w-5" />}
          color="primary"
        />
        <KPICard
          title="Monthly Revenue"
          value={formatCurrency(kpis?.sales?.monthlyRevenue || 0)}
          trend={kpis?.sales?.revenueTrend}
          icon={<DollarSign className="h-5 w-5" />}
          color="success"
        />
        <KPICard
          title="Pending Orders"
          value={formatNumber(kpis?.sales?.pendingOrders || 0)}
          subtitle={`${kpis?.sales?.totalOrders || 0} total`}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="warning"
        />
        <KPICard
          title="Active Work Orders"
          value={formatNumber(kpis?.production?.activeWorkOrders || 0)}
          subtitle={`${kpis?.production?.completedMTD || 0} completed MTD`}
          icon={<Factory className="h-5 w-5" />}
          color="primary"
        />
      </div>

      {/* Alerts */}
      {((kpis?.inventory?.lowStockParts ?? 0) > 0 || (kpis?.quality?.openNCRs ?? 0) > 0) && (
        <div className="mb-6 space-y-2">
          {(kpis?.inventory?.lowStockParts ?? 0) > 0 && (
            <div className="flex items-center gap-3 p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              <span className="text-sm text-warning-700 dark:text-warning-400">
                {kpis?.inventory?.lowStockParts} parts are running low on stock
              </span>
              <a href="/v2/parts?stockStatus=LOW_STOCK" className="ml-auto text-sm text-warning-600 hover:underline flex items-center gap-1">
                View <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
          {(kpis?.quality?.openNCRs ?? 0) > 0 && (
            <div className="flex items-center gap-3 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-danger-600" />
              <span className="text-sm text-danger-700 dark:text-danger-400">
                {kpis?.quality?.openNCRs} open NCRs require attention
              </span>
              <a href="/v2/quality" className="ml-auto text-sm text-danger-600 hover:underline flex items-center gap-1">
                View <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Sales Orders</h2>
            <a href="/v2/sales" className="text-sm text-primary-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentOrders?.length === 0 && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No recent orders
              </div>
            )}
            {recentOrders?.map((order: any) => (
              <div key={order.id} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{order.soNumber}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(order.amount)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Recent Work Orders</h2>
            <a href="/v2/production" className="text-sm text-primary-600 hover:underline">View all</a>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recentWorkOrders?.length === 0 && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No recent work orders
              </div>
            )}
            {recentWorkOrders?.map((wo: any) => (
              <div key={wo.id} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{wo.woNumber}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{wo.product}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-900 dark:text-white">
                      <span className="font-mono">{wo.completed}</span>
                      <span className="text-slate-400">/{wo.quantity}</span>
                    </p>
                    <StatusBadge status={wo.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory by Category */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white">Inventory by Category</h2>
          </div>
          <div className="p-5">
            {inventoryByCategory?.length === 0 && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No inventory data
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {inventoryByCategory?.map((cat: any) => (
                <div key={cat.category} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{cat.count}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{cat.category}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
