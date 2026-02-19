'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, Truck, FileText, MessageSquare, Bell,
  Clock, CheckCircle, Package, ChevronRight, RefreshCw,
  Star, Calendar, DollarSign, Award, TrendingUp, Eye
} from 'lucide-react';
import {
  CustomerPortalEngine,
  CustomerDashboard,
  SalesOrder
} from '@/lib/customer/customer-engine';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// CUSTOMER DASHBOARD
// Phase 9: Customer Portal
// =============================================================================

export default function CustomerDashboardPage() {
  const [dashboard, setDashboard] = useState<CustomerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/customer?view=dashboard');
      const result = await response.json();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch dashboard', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading || !dashboard) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const { customer, summary, recentOrders, upcomingDeliveries, pendingInvoices, notifications } = dashboard;

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Xin chào, {customer.contactPerson}!</h1>
            <p className="text-emerald-100 mt-1">{customer.name}</p>
            <div className="flex items-center gap-4 mt-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                customer.tier === 'PLATINUM' ? 'bg-purple-100 text-purple-700' :
                customer.tier === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                customer.tier === 'SILVER' ? 'bg-slate-100 text-slate-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <Award className="w-4 h-4 inline mr-1" />
                {customer.tier}
              </span>
              <span className="text-sm text-emerald-200">|</span>
              <span className="text-sm text-emerald-100">Mã: {customer.code}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-200">Tổng chi tiêu</p>
            <p className="text-3xl font-bold">
              {CustomerPortalEngine.formatCurrency(summary.totalSpent)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/customer/orders">
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))] hover:border-emerald-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              {summary.activeOrders > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  Đang xử lý
                </span>
              )}
            </div>
            <p className="text-3xl font-bold mt-3">{summary.activeOrders}</p>
            <p className="text-sm text-gray-500">Đơn hàng đang xử lý</p>
          </div>
        </Link>

        <Link href="/customer/deliveries">
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))] hover:border-emerald-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold mt-3">{summary.pendingDeliveries}</p>
            <p className="text-sm text-gray-500">Đang giao hàng</p>
          </div>
        </Link>

        <Link href="/customer/invoices">
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))] hover:border-emerald-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
              {summary.unpaidInvoices > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  Chưa TT
                </span>
              )}
            </div>
            <p className="text-3xl font-bold mt-3">{summary.unpaidInvoices}</p>
            <p className="text-sm text-gray-500">Hóa đơn chưa TT</p>
          </div>
        </Link>

        <Link href="/customer/support">
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))] hover:border-emerald-300 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold mt-3">{summary.openTickets}</p>
            <p className="text-sm text-gray-500">Ticket hỗ trợ</p>
          </div>
        </Link>
      </div>

      {/* Notifications */}
      {notifications.filter(n => !n.read).length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Thông báo mới</h3>
          </div>
          <div className="space-y-2">
            {notifications.filter(n => !n.read).map(notif => (
              <Link key={notif.id} href={notif.actionUrl || '#'}>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-xl hover:bg-gray-50 dark:hover:bg-[rgb(var(--sidebar-item-hover))]">
                  <div className="flex items-center gap-3">
                    {notif.type === 'ORDER_STATUS' && <Package className="w-5 h-5 text-blue-500" />}
                    {notif.type === 'DELIVERY_UPDATE' && <Truck className="w-5 h-5 text-purple-500" />}
                    {notif.type === 'INVOICE_DUE' && <FileText className="w-5 h-5 text-yellow-500" />}
                    {notif.type === 'TICKET_REPLY' && <MessageSquare className="w-5 h-5 text-green-500" />}
                    <div>
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-gray-500">{notif.message}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <div className="p-4 border-b border-gray-200 dark:border-[rgb(var(--border-primary))] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Đơn hàng gần đây
            </h3>
            <Link href="/customer/orders">
              <span className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentOrders.slice(0, 4).map(order => (
              <Link key={order.id} href={`/customer/orders/${order.id}`}>
                <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{order.soNumber}</p>
                      <p className="text-sm text-gray-500">{order.items.length} sản phẩm</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CustomerPortalEngine.getSOStatusColor(order.status)}`}>
                        {CustomerPortalEngine.getSOStatusLabel(order.status)}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {CustomerPortalEngine.formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                  {order.status === 'IN_PRODUCTION' && order.productionProgress !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Tiến độ sản xuất</span>
                        <span>{order.productionProgress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full" 
                          style={{ width: `${order.productionProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Đặt: {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Giao: {new Date(order.requestedDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Deliveries */}
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <div className="p-4 border-b border-gray-200 dark:border-[rgb(var(--border-primary))] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-500" />
              Giao hàng sắp đến
            </h3>
            <Link href="/customer/deliveries">
              <span className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {upcomingDeliveries.length > 0 ? upcomingDeliveries.map(delivery => (
              <div key={delivery.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{delivery.deliveryNumber}</p>
                    <p className="text-sm text-gray-500">PO: {delivery.soNumber}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${CustomerPortalEngine.getDeliveryStatusColor(delivery.status)}`}>
                    {CustomerPortalEngine.getDeliveryStatusLabel(delivery.status)}
                  </span>
                </div>
                {delivery.trackingNumber && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-500">Mã vận đơn</p>
                    <p className="font-mono text-sm">{delivery.trackingNumber}</p>
                    {delivery.carrier && (
                      <p className="text-xs text-gray-500 mt-1">{delivery.carrier}</p>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dự kiến: {delivery.expectedArrival ? new Date(delivery.expectedArrival).toLocaleDateString('vi-VN') : '-'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-400">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Không có giao hàng sắp đến</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))]">
          <div className="p-4 border-b border-gray-200 dark:border-[rgb(var(--border-primary))] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-yellow-500" />
              Hóa đơn chờ thanh toán
            </h3>
            <Link href="/customer/invoices">
              <span className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr className="text-left text-sm text-gray-500">
                  <th className="px-4 py-3 font-medium">Số hóa đơn</th>
                  <th className="px-4 py-3 font-medium">Đơn hàng</th>
                  <th className="px-4 py-3 font-medium">Hạn thanh toán</th>
                  <th className="px-4 py-3 font-medium text-right">Số tiền</th>
                  <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pendingInvoices.map(invoice => {
                  const dueInfo = CustomerPortalEngine.getDaysUntilDue(invoice.dueDate);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-500">{invoice.soNumber}</td>
                      <td className="px-4 py-3">
                        <div className={`text-sm ${
                          dueInfo.status === 'OVERDUE' ? 'text-red-600' :
                          dueInfo.status === 'DUE_SOON' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {new Date(invoice.dueDate).toLocaleDateString('vi-VN')}
                          {dueInfo.status === 'OVERDUE' && (
                            <span className="block text-xs">Quá hạn {Math.abs(dueInfo.days)} ngày</span>
                          )}
                          {dueInfo.status === 'DUE_SOON' && (
                            <span className="block text-xs">Còn {dueInfo.days} ngày</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {CustomerPortalEngine.formatCurrency(invoice.balance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CustomerPortalEngine.getInvoiceStatusColor(invoice.status)}`}>
                          {CustomerPortalEngine.getInvoiceStatusLabel(invoice.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))] p-4">
        <h3 className="font-semibold mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/customer/orders">
            <button className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Eye className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Theo dõi đơn hàng</p>
            </button>
          </Link>
          <Link href="/customer/deliveries">
            <button className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <Truck className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Theo dõi giao hàng</p>
            </button>
          </Link>
          <Link href="/customer/invoices">
            <button className="w-full p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
              <DollarSign className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Thanh toán</p>
            </button>
          </Link>
          <Link href="/customer/support">
            <button className="w-full p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Liên hệ hỗ trợ</p>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
