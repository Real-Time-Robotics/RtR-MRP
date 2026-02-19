'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Truck,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  Package,
  DollarSign,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// SUPPLIER DASHBOARD
// Overview of orders, deliveries, invoices, and performance
// =============================================================================

interface DashboardSummary {
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  deliveries: {
    total: number;
    scheduled: number;
    inTransit: number;
    delivered: number;
  };
  invoices: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    overdue: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    growth: number;
  };
  performance: {
    rating: string;
    onTimeDelivery: number;
    qualityRate: number;
  };
  notifications: {
    id: string;
    type: string;
    message: string;
    time: string;
    urgent: boolean;
  }[];
}

export default function SupplierDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/v2/supplier?view=dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        clientLogger.error('Error fetching dashboard', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không thể tải dữ liệu</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tổng quan</h1>
        <p className="text-gray-500 dark:text-gray-400">Chào mừng bạn quay lại, ABC Components Co., Ltd</p>
      </div>

      {/* Urgent Notifications */}
      {data?.notifications?.filter(n => n.urgent).length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Thông báo quan trọng</h3>
          </div>
          <div className="space-y-2">
            {data?.notifications?.filter(n => n.urgent).map((notif) => (
              <div key={notif.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-700 dark:text-amber-300">{notif.message}</span>
                <span className="text-amber-500 text-xs">{notif.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders Card */}
        <Link href="/supplier/orders" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                {data.orders.pending} chờ xác nhận
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.orders.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Đơn hàng</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {data.orders.inProgress} đang xử lý
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> {data.orders.completed} hoàn thành
              </span>
            </div>
          </div>
        </Link>

        {/* Deliveries Card */}
        <Link href="/supplier/deliveries" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                {data.deliveries.inTransit} đang vận chuyển
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.deliveries.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Giao hàng</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {data.deliveries.scheduled} lên lịch
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> {data.deliveries.delivered} đã giao
              </span>
            </div>
          </div>
        </Link>

        {/* Invoices Card */}
        <Link href="/supplier/invoices" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              {data.invoices.overdue > 0 && (
                <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
                  {data.invoices.overdue} quá hạn
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.invoices.total}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Hóa đơn</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {data.invoices.pending} chờ duyệt
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-green-600">
                <DollarSign className="w-3 h-3" /> {data.invoices.paid} đã thanh toán
              </span>
            </div>
          </div>
        </Link>

        {/* Revenue Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <span className={cn(
              'text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1',
              data.revenue.growth >= 0
                ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                : 'text-red-600 bg-red-50 dark:bg-red-900/30'
            )}>
              {data.revenue.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(data.revenue.growth)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data.revenue.thisMonth)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Doanh thu tháng này</p>
          <div className="mt-3 text-xs text-gray-500">
            Năm nay: {formatCurrency(data.revenue.thisYear)}
          </div>
        </div>
      </div>

      {/* Performance & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Summary */}
        <Link href="/supplier/performance" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Hiệu suất</h3>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>

            {/* Rating Badge */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{data.performance.rating}</span>
                </div>
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Giao hàng đúng hạn</span>
                  <span className="font-medium text-gray-900 dark:text-white">{data.performance.onTimeDelivery}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${data.performance.onTimeDelivery}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Tỷ lệ chất lượng</span>
                  <span className="font-medium text-gray-900 dark:text-white">{data.performance.qualityRate}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${data.performance.qualityRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Recent Notifications */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Hoạt động gần đây</h3>
            <Bell className="w-4 h-4 text-gray-400" />
          </div>

          <div className="space-y-4">
            {data?.notifications?.map((notif) => (
              <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className={cn(
                  'p-2 rounded-lg shrink-0',
                  notif.type === 'order' && 'bg-blue-100 dark:bg-blue-900/30',
                  notif.type === 'delivery' && 'bg-green-100 dark:bg-green-900/30',
                  notif.type === 'invoice' && 'bg-purple-100 dark:bg-purple-900/30',
                  notif.type === 'info' && 'bg-gray-100 dark:bg-gray-700'
                )}>
                  {notif.type === 'order' && <ShoppingCart className="w-4 h-4 text-blue-600" />}
                  {notif.type === 'delivery' && <Truck className="w-4 h-4 text-green-600" />}
                  {notif.type === 'invoice' && <FileText className="w-4 h-4 text-purple-600" />}
                  {notif.type === 'info' && <Bell className="w-4 h-4 text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm',
                    notif.urgent ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                </div>
                {notif.urgent && (
                  <span className="shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/supplier/orders?status=PENDING"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Xác nhận đơn hàng</span>
          </Link>
          <Link
            href="/supplier/deliveries?status=SCHEDULED"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <Truck className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Cập nhật giao hàng</span>
          </Link>
          <Link
            href="/supplier/invoices?status=DRAFT"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <FileText className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Gửi hóa đơn</span>
          </Link>
          <Link
            href="/supplier/performance"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Xem hiệu suất</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
