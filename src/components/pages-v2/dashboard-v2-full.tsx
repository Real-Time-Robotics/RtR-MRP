'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Factory,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MoreHorizontal,
  Clock,
  User,
  Zap,
  Sparkles,
  FileText,
  Bell,
  X,
  Activity,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Truck,
  Settings,
  ExternalLink,
  Eye,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDashboardStats,
  useRecentOrders,
  useAlerts,
  useActivities,
  useChartData,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatTimeAgo,
  getStatusColor,
  getStatusLabel,
  type AlertItem,
  type ActivityItem,
  type RecentOrder,
  type ChartDataPoint,
} from '@/lib/hooks/use-dashboard-data';

// =============================================================================
// DASHBOARD V2 - PRODUCTION READY
// Integrated với Process-Flow Sidebar design
// =============================================================================

// =============================================================================
// MINI CHART COMPONENTS
// =============================================================================

function SparklineChart({ data, color = '#8B5CF6', height = 40 }: { data: ChartDataPoint[]; color?: string; height?: number }) {
  if (!data.length) return null;
  
  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#gradient-${color.replace('#', '')})`} points={areaPoints} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BarChart({ data, height = 60 }: { data: ChartDataPoint[]; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t transition-all duration-500 hover:opacity-80"
            style={{
              height: `${(item.value / max) * 100}%`,
              backgroundColor: item.color || '#8B5CF6',
              minHeight: 4,
            }}
          />
          <span className="text-[10px] text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, size = 80 }: { data: ChartDataPoint[]; size?: number }) {
  if (!data.length) return null;
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {data.map((item, index) => {
        const percentage = item.value / total;
        const strokeDasharray = `${percentage * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += percentage * circumference;

        return (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={item.color || '#8B5CF6'}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
}

// =============================================================================
// KPI CARD COMPONENT
// =============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  trend?: { value: number; label?: string };
  chart?: ChartDataPoint[];
  chartColor?: string;
  href?: string;
  isLoading?: boolean;
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBg,
  trend,
  chart,
  chartColor,
  href,
  isLoading,
}: KPICardProps) {
  const cardClassName = cn(
    'bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5',
    'transition-all duration-200',
    href && 'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer group'
  );

  const cardContent = (
    <>
      {isLoading ? (
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <div className={cn('p-2.5 rounded-xl', iconBg)}>
              <span className={iconColor}>{icon}</span>
            </div>
            {trend && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                trend.value >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              )}>
                {trend.value >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </div>
            )}
          </div>

          {chart && (
            <div className="mb-3">
              <SparklineChart data={chart} color={chartColor} height={32} />
            </div>
          )}

          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>

          {href && (
            <div className="flex items-center gap-1 mt-3 text-sm text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <span>Xem chi tiết</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={cardClassName}>
      {cardContent}
    </div>
  );
}

// =============================================================================
// ALERT BANNER COMPONENT
// =============================================================================

interface AlertBannerProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  isLoading?: boolean;
}

function AlertBanner({ alerts, onDismiss, onDismissAll, isLoading }: AlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="flex-1">
            <div className="w-48 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="w-64 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.type === 'critical').length;
  const warningCount = alerts.filter((a) => a.type === 'warning').length;
  const visibleAlerts = isExpanded ? alerts : alerts.slice(0, 2);

  const typeConfig = {
    critical: { icon: <XCircle className="w-5 h-5" />, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' },
    warning: { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400' },
    info: { icon: <Info className="w-5 h-5" />, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' },
    success: { icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400' },
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {alerts.length} thông báo
            </span>
          </div>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
              <Zap className="w-3 h-3" />
              {criticalCount} khẩn cấp
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {warningCount} cảnh báo
            </span>
          )}
        </div>
        <button
          onClick={onDismissAll}
          className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Bỏ qua tất cả
        </button>
      </div>

      {/* Alert items */}
      <div className="space-y-2">
        {visibleAlerts.map((alert) => {
          const config = typeConfig[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                config.bg,
                config.border
              )}
            >
              <div className={config.text}>{config.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium text-sm', config.text)}>{alert.title}</p>
                {alert.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{alert.description}</p>
                )}
              </div>
              {alert.actionLabel && alert.actionHref && (
                <Link
                  href={alert.actionHref}
                  className={cn('text-xs font-medium flex items-center gap-1 hover:underline', config.text)}
                >
                  {alert.actionLabel}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
              <button
                onClick={() => onDismiss(alert.id)}
                className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          );
        })}
      </div>

      {alerts.length > 2 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {isExpanded ? 'Thu gọn' : `Xem thêm ${alerts.length - 2} thông báo`}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// RECENT ORDERS COMPONENT
// =============================================================================

interface RecentOrdersProps {
  orders: RecentOrder[];
  isLoading?: boolean;
}

function RecentOrdersList({ orders, isLoading }: RecentOrdersProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1">
              <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {orders.map((order) => {
        const statusColors = getStatusColor(order.status);
        return (
          <Link
            key={order.id}
            href={`/sales/${order.id}`}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                  {order.orderNumber}
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium',
                  statusColors.bg,
                  statusColors.text
                )}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{order.customer}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {formatCurrency(order.value)}
              </p>
              <p className="text-xs text-gray-400">{order.items} items</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        );
      })}
    </div>
  );
}

// =============================================================================
// ACTIVITY FEED COMPONENT
// =============================================================================

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const typeIcons: Record<string, React.ReactNode> = {
    order: <ShoppingCart className="w-4 h-4" />,
    inventory: <Package className="w-4 h-4" />,
    production: <Factory className="w-4 h-4" />,
    quality: <CheckCircle className="w-4 h-4" />,
    system: <Settings className="w-4 h-4" />,
  };

  const typeColors: Record<string, string> = {
    order: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    inventory: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    production: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    quality: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    system: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1">
              <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', typeColors[activity.type])}>
            {typeIcons[activity.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-medium">{activity.action}</span>
              {' - '}
              <span className="text-gray-600 dark:text-gray-400">{activity.description}</span>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{activity.user}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// AI INSIGHT CARD
// =============================================================================

function AIInsightCard() {
  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-800/50 p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              AI Insight
            </span>
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded text-[10px] font-medium">
              Mới
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white">Đề xuất tối ưu tồn kho</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Dựa trên xu hướng 3 tháng gần đây, bạn nên tăng tồn kho Motor DC 12V thêm 20% để đáp ứng nhu cầu Q1/2025.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1">
              Xem phân tích
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Bỏ qua
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function DashboardV2() {
  const { stats, isLoading: statsLoading, refetch } = useDashboardStats();
  const { orders, isLoading: ordersLoading } = useRecentOrders(5);
  const { alerts, isLoading: alertsLoading, dismissAlert, dismissAll } = useAlerts();
  const { activities, isLoading: activitiesLoading } = useActivities(5);
  const { revenue: revenueChart, inventory: inventoryChart, production: productionChart, isLoading: chartsLoading } = useChartData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const isLoading = statsLoading || chartsLoading;

  return (
    <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              Tổng quan
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Chào mừng bạn trở lại! Đây là tình hình hôm nay.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500" suppressHydrationWarning>
              Cập nhật: {lastUpdated || '--:--:--'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'p-2 rounded-xl border border-gray-200 dark:border-gray-700',
                'hover:bg-white dark:hover:bg-gray-800 transition-colors',
                isRefreshing && 'animate-spin'
              )}
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        <AlertBanner
          alerts={alerts}
          onDismiss={dismissAlert}
          onDismissAll={dismissAll}
          isLoading={alertsLoading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Doanh thu tháng"
            value={stats ? formatCurrency(stats.revenue.current) : '---'}
            subtitle="So với tháng trước"
            icon={<DollarSign className="w-5 h-5" />}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-100 dark:bg-green-900/30"
            trend={stats ? { value: stats.revenue.growth } : undefined}
            chart={revenueChart}
            chartColor="#22C55E"
            href="/analytics"
            isLoading={isLoading}
          />
          <KPICard
            title="Đơn hàng"
            value={stats ? formatNumber(stats.orders.total) : '---'}
            subtitle={stats ? `${stats.orders.pending} đơn chờ xử lý` : ''}
            icon={<ShoppingCart className="w-5 h-5" />}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            trend={stats ? { value: stats.orders.growth } : undefined}
            href="/sales"
            isLoading={isLoading}
          />
          <KPICard
            title="Hiệu suất SX"
            value={stats ? formatPercent(stats.production.efficiency) : '---'}
            subtitle={stats ? `${stats.production.running} lệnh đang chạy` : ''}
            icon={<Factory className="w-5 h-5" />}
            iconColor="text-orange-600 dark:text-orange-400"
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            chart={productionChart}
            chartColor="#F97316"
            href="/production"
            isLoading={isLoading}
          />
          <KPICard
            title="Chất lượng"
            value={stats ? formatPercent(stats.quality.passRate) : '---'}
            subtitle={stats ? `${stats.quality.openNCRs} NCR đang mở` : ''}
            icon={<CheckCircle className="w-5 h-5" />}
            iconColor="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-100 dark:bg-teal-900/30"
            href="/quality"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Hành động nhanh</h3>
                </div>
                <span className="text-xs text-gray-400">Nhấn phím tắt để thực hiện nhanh</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: <Plus className="w-5 h-5" />, label: 'Tạo đơn hàng', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/sales/new', shortcut: 'N' },
                  { icon: <Package className="w-5 h-5" />, label: 'Nhập kho', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', href: '/inventory/receive', shortcut: 'I' },
                  { icon: <Target className="w-5 h-5" />, label: 'Chạy MRP', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', href: '/mrp', shortcut: 'M' },
                  { icon: <BarChart3 className="w-5 h-5" />, label: 'Báo cáo', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/analytics', shortcut: 'R' },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl',
                      'border border-transparent hover:border-gray-200 dark:hover:border-gray-600',
                      'hover:shadow-lg transition-all duration-200 group',
                      action.bg
                    )}
                  >
                    <div className={cn('p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm', action.color)}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
                    <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600 text-gray-500">
                      ⌘{action.shortcut}
                    </kbd>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Đơn hàng gần đây</h3>
                </div>
                <Link href="/sales" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  Xem tất cả
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <RecentOrdersList orders={orders} isLoading={ordersLoading} />
            </div>

            {/* AI Insight */}
            <AIInsightCard />
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            
            {/* Inventory Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Tình trạng tồn kho</h3>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <DonutChart data={inventoryChart} size={80} />
                <div className="flex-1 space-y-2">
                  {inventoryChart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {stats && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tổng giá trị</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(stats.inventory.totalValue)}
                    </span>
                  </div>
                </div>
              )}

              <Link
                href="/inventory"
                className="flex items-center justify-center gap-1 w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                Xem chi tiết
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Activity Feed */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Hoạt động gần đây</h3>
                </div>
                <Link href="/activity" className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  Xem tất cả
                </Link>
              </div>
              <ActivityFeed activities={activities} isLoading={activitiesLoading} />
            </div>

          </div>
        </div>

    </div>
  );
}
