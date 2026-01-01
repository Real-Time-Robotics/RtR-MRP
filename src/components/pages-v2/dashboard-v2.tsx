'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Factory,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Box,
  Truck,
  BarChart3,
  PieChart,
  Calendar,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  Activity,
  AlertCircle,
  XCircle,
  Timer,
  FileText,
  Layers,
  Settings,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { AlertBanner, AlertStrip, TodayPriorities, type AlertItem } from '@/components/ui/alert-banner';
import { QuickActionBar, StatCard, WelcomeBanner, MetricRow } from '@/components/ui/quick-actions';

// =============================================================================
// DASHBOARD V2 - MODERN REDESIGN
// Giao diện trực quan, đơn giản, dễ sử dụng
// =============================================================================

// Mock data
const mockAlerts: AlertItem[] = [
  {
    id: '1',
    type: 'critical',
    category: 'inventory',
    title: '2 vật tư thiếu hụt nghiêm trọng',
    description: 'CMP-BRG-002, CMP-MOT-001 cần đặt hàng gấp',
    action: { label: 'Xem chi tiết', onClick: () => {} },
  },
  {
    id: '2',
    type: 'warning',
    category: 'orders',
    title: '5 đơn hàng chờ xác nhận',
    description: 'Đơn hàng từ ABC Manufacturing, XYZ Industries...',
    action: { label: 'Xử lý', onClick: () => {} },
  },
  {
    id: '3',
    type: 'info',
    category: 'production',
    title: 'Máy CNC-02 bảo trì lúc 14:00',
    description: 'Bảo trì định kỳ, ước tính 2 giờ',
  },
];

const priorityItems = [
  {
    id: '1',
    icon: <AlertTriangle className="w-4 h-4" />,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Vật tư thiếu nghiêm trọng',
    value: '2 items',
    action: { label: 'Xem', onClick: () => {} },
  },
  {
    id: '2',
    icon: <ShoppingCart className="w-4 h-4" />,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Đơn hàng chờ xử lý',
    value: '5 đơn',
    trend: 'down' as const,
    trendValue: '-2',
    action: { label: 'Xem', onClick: () => {} },
  },
  {
    id: '3',
    icon: <Factory className="w-4 h-4" />,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Lệnh sản xuất đang chạy',
    value: '8 lệnh',
    trend: 'up' as const,
    trendValue: '+3',
  },
];

const quickActions = [
  {
    id: 'new-order',
    icon: <ShoppingCart className="w-5 h-5" />,
    labelKey: 'quickActions.newOrder',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    shortcut: 'N',
  },
  {
    id: 'inventory',
    icon: <Package className="w-5 h-5" />,
    labelKey: 'quickActions.inventory',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50',
    shortcut: 'I',
  },
  {
    id: 'mrp',
    icon: <Layers className="w-5 h-5" />,
    labelKey: 'quickActions.runMRP',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50',
    shortcut: 'M',
  },
  {
    id: 'report',
    icon: <BarChart3 className="w-5 h-5" />,
    labelKey: 'quickActions.report',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50',
    shortcut: 'R',
  },
];

// =============================================================================
// MINI CHART COMPONENTS
// =============================================================================

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 50" className="w-full h-12">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
      <polygon
        fill={`url(#gradient-${color})`}
        points={`0,50 ${points} 100,50`}
      />
    </svg>
  );
}

function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value));
  
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: `${(item.value / max) * 100}%`,
              backgroundColor: item.color,
              minHeight: '4px',
            }}
          />
          <span className="text-[8px] text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ percentage, color, size = 48 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-700"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000"
      />
    </svg>
  );
}

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function DashboardV2Page() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  const visibleAlerts = mockAlerts.filter((a) => !dismissedAlerts.includes(a.id));

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Sample data for charts
  const revenueData = [45, 52, 49, 63, 58, 72, 68, 75, 82, 78, 85, 92];
  const inventoryData = [
    { label: 'T2', value: 85, color: '#3B82F6' },
    { label: 'T3', value: 72, color: '#3B82F6' },
    { label: 'T4', value: 90, color: '#3B82F6' },
    { label: 'T5', value: 65, color: '#3B82F6' },
    { label: 'T6', value: 88, color: '#3B82F6' },
    { label: 'T7', value: 75, color: '#3B82F6' },
    { label: 'CN', value: 60, color: '#3B82F6' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* Header with Welcome & Date */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutDashboard className="w-7 h-7 text-blue-600" />
              Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Tổng quan hoạt động sản xuất kinh doanh
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400" suppressHydrationWarning>
              Cập nhật: {lastUpdated || '--:--:--'}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'p-2 rounded-lg border border-gray-200 dark:border-gray-700',
                'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                isRefreshing && 'animate-spin'
              )}
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        {visibleAlerts.length > 0 && (
          <AlertBanner
            alerts={visibleAlerts}
            onDismiss={handleDismissAlert}
            maxVisible={2}
          />
        )}

        {/* KPI Cards - Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-100 dark:bg-green-900/30"
            label="Doanh thu tháng"
            value={formatCurrency(3450000000)}
            trend={{ value: '+15.3%', direction: 'up' }}
          />
          <StatCard
            icon={<ShoppingCart className="w-5 h-5" />}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            label="Đơn hàng"
            value="156"
            subValue="28 đơn trong tháng"
            trend={{ value: '+8.2%', direction: 'up' }}
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            label="Hiệu suất SX"
            value="94.5%"
            trend={{ value: '+2.1%', direction: 'up' }}
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            label="Chất lượng"
            value="98.2%"
            subValue="Tỷ lệ đạt chuẩn"
            trend={{ value: '+0.5%', direction: 'up' }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <QuickActionBar actions={quickActions} />

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Revenue Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Doanh thu</h3>
                    <p className="text-sm text-gray-500">12 tháng gần nhất</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    +15.3%
                  </div>
                </div>
                <MiniLineChart data={revenueData} color="#10B981" />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(3450000000)}
                  </span>
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    Chi tiết <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Production Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Sản xuất</h3>
                    <p className="text-sm text-gray-500">Tiến độ trong tuần</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                    Đúng tiến độ
                  </span>
                </div>
                <MiniBarChart data={inventoryData} />
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">8</p>
                    <p className="text-xs text-gray-500">Đang chạy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">15</p>
                    <p className="text-xs text-gray-500">Hoàn thành</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">3</p>
                    <p className="text-xs text-gray-500">Chờ vật tư</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Đơn hàng gần đây</h3>
                </div>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  Xem tất cả <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { id: 'SO-2025-001', customer: 'ABC Manufacturing', amount: 285000000, status: 'processing', statusColor: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
                  { id: 'SO-2025-002', customer: 'XYZ Industries', amount: 452000000, status: 'pending', statusColor: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
                  { id: 'SO-2024-155', customer: 'AgriTech Corp', amount: 128000000, status: 'completed', statusColor: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
                  { id: 'SO-2024-154', customer: 'Tech Solutions', amount: 95000000, status: 'completed', statusColor: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
                ].map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{order.id}</p>
                        <p className="text-sm text-gray-500">{order.customer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(order.amount)}
                      </span>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium capitalize',
                        order.statusColor
                      )}>
                        {order.status === 'processing' ? 'Đang xử lý' : order.status === 'pending' ? 'Chờ xác nhận' : 'Hoàn thành'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            
            {/* Today's Priorities */}
            <TodayPriorities items={priorityItems} />

            {/* Inventory Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Tồn kho</h3>
              </div>
              
              <div className="space-y-4">
                {/* Status breakdown */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <DonutChart percentage={75} color="#10B981" size={64} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">75%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Tình trạng tốt</p>
                    <p className="text-xs text-gray-500">1,234 / 1,645 vật tư đủ hàng</p>
                  </div>
                </div>

                {/* Status list */}
                <div className="space-y-2">
                  {[
                    { label: 'Đủ hàng', count: 1234, color: 'bg-green-500', textColor: 'text-green-600' },
                    { label: 'Sắp hết', count: 45, color: 'bg-amber-500', textColor: 'text-amber-600' },
                    { label: 'Hết hàng', count: 8, color: 'bg-red-500', textColor: 'text-red-600' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', item.color)} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                      <span className={cn('text-sm font-medium', item.textColor)}>{item.count}</span>
                    </div>
                  ))}
                </div>

                <button className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1">
                  Xem chi tiết <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Chất lượng</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">98.2%</p>
                  <p className="text-xs text-green-700 dark:text-green-400">Tỷ lệ đạt</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">3</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">NCR mở</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Kiểm tra hôm nay</span>
                  <span className="font-medium text-gray-900 dark:text-white">24 lô</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500">Đạt / Không đạt</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    <span className="text-green-600">23</span> / <span className="text-red-600">1</span>
                  </span>
                </div>
              </div>
            </div>

            {/* AI Insight Card */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    AI Insight
                  </span>
                  <h4 className="font-medium text-gray-900 dark:text-white">Đề xuất tối ưu</h4>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Dựa trên xu hướng đơn hàng, bạn nên tăng tồn kho Motor DC 12V thêm 20% trong tháng tới.
              </p>
              <button className="text-sm text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1">
                Xem phân tích <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
