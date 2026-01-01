'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff,
  DollarSign,
  ShoppingCart,
  Package,
  Factory,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/lib/realtime/use-socket';
import { type DashboardStatsPayload } from '@/lib/realtime/events';

// =============================================================================
// REAL-TIME STATS
// Live updating KPI cards
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: {
    value: number;
    label: string;
  };
  isUpdating?: boolean;
  lastUpdate?: Date;
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  trend,
  isUpdating,
  lastUpdate,
}: StatCardProps) {
  const [flash, setFlash] = useState(false);

  // Flash effect when updating
  useEffect(() => {
    if (isUpdating) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isUpdating, value]);

  const TrendIcon = trend 
    ? trend.value > 0 
      ? TrendingUp 
      : trend.value < 0 
        ? TrendingDown 
        : Minus
    : null;

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl border p-5 transition-all duration-300',
        flash
          ? 'border-purple-400 dark:border-purple-500 ring-2 ring-purple-500/20 scale-[1.02]'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-3 rounded-xl', iconBg)}>
          {icon}
        </div>
        {isUpdating && (
          <RefreshCw className="w-4 h-4 text-purple-500 animate-spin" />
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={cn(
            'text-2xl font-bold text-gray-900 dark:text-white transition-all duration-300',
            flash && 'text-purple-600 dark:text-purple-400'
          )}>
            {value}
          </p>
          {subtitle && (
            <span className="text-sm text-gray-500">{subtitle}</span>
          )}
        </div>

        {trend && TrendIcon && (
          <div className="flex items-center gap-1 mt-2">
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.value > 0 
                ? 'text-green-600' 
                : trend.value < 0 
                  ? 'text-red-600' 
                  : 'text-gray-500'
            )}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
            <span className="text-xs text-gray-500">{trend.label}</span>
          </div>
        )}
      </div>

      {lastUpdate && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400" suppressHydrationWarning>
            Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// REAL-TIME STATS COMPONENT
// =============================================================================

interface RealTimeStatsProps {
  initialStats?: DashboardStatsPayload;
  className?: string;
  showConnectionStatus?: boolean;
}

export function RealTimeStats({
  initialStats,
  className,
  showConnectionStatus = true,
}: RealTimeStatsProps) {
  const [stats, setStats] = useState<DashboardStatsPayload>(initialStats || {});
  const [updatingFields, setUpdatingFields] = useState<Set<string>>(new Set());
  const [lastUpdates, setLastUpdates] = useState<Record<string, Date>>({});

  const { subscribe, isConnected } = useSocket();

  // Subscribe to dashboard updates
  useEffect(() => {
    const unsubscribe = subscribe<DashboardStatsPayload>('dashboard:stats_updated', (event) => {
      const payload = event.payload;
      const changedFields = new Set<string>();

      // Track which fields changed
      if (payload.revenue) changedFields.add('revenue');
      if (payload.orders) changedFields.add('orders');
      if (payload.inventory) changedFields.add('inventory');
      if (payload.production) changedFields.add('production');
      if (payload.quality) changedFields.add('quality');

      setUpdatingFields(changedFields);
      setStats(prev => ({ ...prev, ...payload }));

      // Update timestamps
      const now = new Date();
      const newUpdates: Record<string, Date> = {};
      changedFields.forEach(field => {
        newUpdates[field] = now;
      });
      setLastUpdates(prev => ({ ...prev, ...newUpdates }));

      // Clear updating state after animation
      setTimeout(() => {
        setUpdatingFields(new Set());
      }, 500);
    });

    return unsubscribe;
  }, [subscribe]);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)} tỷ`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} triệu`;
    }
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <div className={className}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chỉ số real-time
          </h2>
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
            isConnected
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          )}>
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Đang kết nối</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Mất kết nối</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <StatCard
          title="Doanh thu"
          value={formatCurrency(stats.revenue?.current || 0)}
          subtitle="VND"
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100 dark:bg-green-900/30"
          trend={stats.revenue ? { value: stats.revenue.growth, label: 'so với tháng trước' } : undefined}
          isUpdating={updatingFields.has('revenue')}
          lastUpdate={lastUpdates.revenue}
        />

        {/* Orders */}
        <StatCard
          title="Đơn hàng"
          value={stats.orders?.total || 0}
          subtitle={stats.orders?.pending ? `${stats.orders.pending} chờ xử lý` : undefined}
          icon={<ShoppingCart className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          trend={stats.orders ? { value: 8.2, label: 'so với tuần trước' } : undefined}
          isUpdating={updatingFields.has('orders')}
          lastUpdate={lastUpdates.orders}
        />

        {/* Production */}
        <StatCard
          title="Hiệu suất SX"
          value={`${(stats.production?.efficiency || 0).toFixed(1)}%`}
          subtitle={stats.production?.running ? `${stats.production.running} đang chạy` : undefined}
          icon={<Factory className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          isUpdating={updatingFields.has('production')}
          lastUpdate={lastUpdates.production}
        />

        {/* Quality */}
        <StatCard
          title="Chất lượng"
          value={`${(stats.quality?.passRate || 0).toFixed(1)}%`}
          subtitle={stats.quality?.openNCRs ? `${stats.quality.openNCRs} NCR mở` : undefined}
          icon={<CheckCircle className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          isUpdating={updatingFields.has('quality')}
          lastUpdate={lastUpdates.quality}
        />
      </div>

      {/* Inventory Alerts */}
      {stats.inventory && (stats.inventory.lowStock > 0 || stats.inventory.outOfStock > 0) && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Cảnh báo tồn kho</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            {stats.inventory.outOfStock > 0 && (
              <span className="text-red-600 dark:text-red-400">
                🚨 {stats.inventory.outOfStock} hết hàng
              </span>
            )}
            {stats.inventory.lowStock > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                ⚠️ {stats.inventory.lowStock} sắp hết
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MINI STAT BADGE (for headers/compact views)
// =============================================================================

interface MiniStatBadgeProps {
  label: string;
  value: string | number;
  type?: 'default' | 'success' | 'warning' | 'error';
  pulse?: boolean;
}

export function MiniStatBadge({ label, value, type = 'default', pulse }: MiniStatBadgeProps) {
  const colors = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm', colors[type])}>
      <span className="font-medium">{label}:</span>
      <span className="font-bold">{value}</span>
      {pulse && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
    </div>
  );
}

export default RealTimeStats;
