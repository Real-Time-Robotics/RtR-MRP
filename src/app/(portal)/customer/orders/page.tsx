'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, Search, Filter, Calendar, Truck, ChevronRight,
  Clock, RefreshCw, Eye, Package, CheckCircle, AlertTriangle,
  X, Factory
} from 'lucide-react';
import {
  CustomerPortalEngine,
  SalesOrder,
  SOStatus
} from '@/lib/customer/customer-engine';
import { clientLogger } from '@/lib/client-logger';
import { excelPortalStyles } from '@/components/ui-v2/excel';

// =============================================================================
// CUSTOMER ORDERS PAGE
// Phase 9: Customer Portal
// =============================================================================

const statusFilters: { value: SOStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'IN_PRODUCTION', label: 'Đang sản xuất' },
  { value: 'READY', label: 'Sẵn sàng giao' },
  { value: 'SHIPPED', label: 'Đã gửi' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
];

const orderSteps = [
  { label: 'Đặt hàng', icon: ShoppingCart },
  { label: 'Xác nhận', icon: CheckCircle },
  { label: 'Sản xuất', icon: Factory },
  { label: 'Sẵn sàng', icon: Package },
  { label: 'Vận chuyển', icon: Truck },
  { label: 'Giao hàng', icon: CheckCircle },
];

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SOStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = '/api/v2/customer?view=orders';
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data.orders || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch orders', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders by search
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.soNumber.toLowerCase().includes(query) ||
      order.items.some(item => item.productCode.toLowerCase().includes(query) || item.productName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-600" />
            Đơn hàng của tôi
          </h1>
          <p className="text-gray-500 mt-1">Theo dõi trạng thái đơn hàng</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))]"
          aria-label="Làm mới"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))]">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã SO, sản phẩm..."
              aria-label="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {statusFilters.slice(0, 5).map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] text-gray-600 dark:text-[rgb(var(--text-tertiary))] hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-8 text-center border border-gray-200 dark:border-[rgb(var(--border-primary))]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-8 text-center border border-gray-200 dark:border-[rgb(var(--border-primary))]">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Không có đơn hàng nào</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const currentStep = CustomerPortalEngine.getOrderStep(order.status);
            
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border border-gray-200 dark:border-[rgb(var(--border-primary))] overflow-hidden"
              >
                {/* Order Header */}
                <div className="p-4 border-b border-gray-100 dark:border-[rgb(var(--border-primary))]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{order.soNumber}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CustomerPortalEngine.getSOStatusColor(order.status)}`}>
                            {CustomerPortalEngine.getSOStatusLabel(order.status)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CustomerPortalEngine.getPriorityColor(order.priority)}`}>
                            {order.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Đặt: {new Date(order.orderDate).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            Yêu cầu giao: {new Date(order.requestedDate).toLocaleDateString('vi-VN')}
                          </span>
                          {order.promisedDate && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-4 h-4" />
                              Cam kết: {new Date(order.promisedDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">
                        {CustomerPortalEngine.formatCurrency(order.total)}
                      </p>
                      <p className="text-sm text-gray-500">{order.items.length} sản phẩm</p>
                    </div>
                  </div>
                </div>

                {/* Progress Steps */}
                {order.status !== 'CANCELLED' && currentStep >= 0 && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-[rgb(var(--border-primary))]">
                    <div className="flex items-center justify-between">
                      {orderSteps.map((step, idx) => {
                        const isCompleted = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        const StepIcon = step.icon;
                        
                        return (
                          <React.Fragment key={step.label}>
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isCompleted 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                              } ${isCurrent ? 'ring-2 ring-emerald-300' : ''}`}>
                                <StepIcon className="w-4 h-4" />
                              </div>
                              <span className={`text-xs mt-1 ${isCompleted ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                                {step.label}
                              </span>
                            </div>
                            {idx < orderSteps.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-2 ${
                                idx < currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'
                              }`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Production Progress */}
                {order.status === 'IN_PRODUCTION' && order.productionProgress !== undefined && (
                  <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-100 dark:border-[rgb(var(--border-primary))]">
                    <div className="flex items-center gap-4">
                      <Factory className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-purple-700 dark:text-purple-400 font-medium">Tiến độ sản xuất</span>
                          <span className="text-purple-600 font-bold">{order.productionProgress}%</span>
                        </div>
                        <div className="h-2 bg-purple-100 dark:bg-purple-900/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full transition-all" 
                            style={{ width: `${order.productionProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items - Excel Style */}
                <div className="p-4">
                  <div className="border border-[#217346]/30 dark:border-[#70AD47]/30 rounded-lg overflow-hidden">
                    <table className={excelPortalStyles.table}>
                      <thead className={excelPortalStyles.thead}>
                        <tr>
                          <th className={excelPortalStyles.th}>Mã SP</th>
                          <th className={excelPortalStyles.th}>Tên sản phẩm</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>SL đặt</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>SL SX</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>SL giao</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Đơn giá</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className={excelPortalStyles.tbody}>
                        {order?.items?.map(item => (
                          <tr key={item.id} className={excelPortalStyles.tr}>
                            <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdMono}`}>{item.productCode}</td>
                            <td className={excelPortalStyles.td}>{item.productName}</td>
                            <td className={excelPortalStyles.tdNumber}>{item.quantity}</td>
                            <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdRight}`}>
                              <span className={item.producedQty >= item.quantity ? 'text-[#217346] dark:text-[#70AD47] font-medium' : 'text-slate-500'}>
                                {item.producedQty}
                              </span>
                            </td>
                            <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdRight}`}>
                              <span className={item.shippedQty >= item.quantity ? 'text-[#217346] dark:text-[#70AD47] font-medium' : 'text-slate-500'}>
                                {item.shippedQty}
                              </span>
                            </td>
                            <td className={excelPortalStyles.tdNumber}>{item.unitPrice.toLocaleString('vi-VN')}</td>
                            <td className={excelPortalStyles.tdCurrency}>{item.amount.toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className={excelPortalStyles.tfoot}>
                        <tr>
                          <td colSpan={6} className={`${excelPortalStyles.tfootTd} text-right text-slate-500`}>Tạm tính:</td>
                          <td className={`${excelPortalStyles.tfootTd} text-right`}>{order.subtotal.toLocaleString('vi-VN')}</td>
                        </tr>
                        {order.discount > 0 && (
                          <tr>
                            <td colSpan={6} className={`${excelPortalStyles.tfootTd} text-right text-slate-500`}>Chiết khấu:</td>
                            <td className={`${excelPortalStyles.tfootTd} text-right text-red-500`}>-{order.discount.toLocaleString('vi-VN')}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={6} className={`${excelPortalStyles.tfootTd} text-right text-slate-500`}>VAT (10%):</td>
                          <td className={`${excelPortalStyles.tfootTd} text-right`}>{order.tax.toLocaleString('vi-VN')}</td>
                        </tr>
                        <tr className="bg-[#E2EFDA]/50 dark:bg-[#217346]/20">
                          <td colSpan={6} className={`${excelPortalStyles.tfootTd} text-right font-bold text-[#217346] dark:text-[#70AD47]`}>Tổng cộng:</td>
                          <td className={`${excelPortalStyles.tfootTd} text-right font-bold text-[#217346] dark:text-[#70AD47]`}>{order.total.toLocaleString('vi-VN')} ₫</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <p className="text-sm text-gray-500">Ghi chú: {order.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Địa chỉ giao: {order.shippingAddress}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/customer/support?so=${order.soNumber}`}>
                        <button className="px-4 py-2 text-gray-600 dark:text-[rgb(var(--text-tertiary))] rounded-xl hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))] flex items-center gap-2 text-sm">
                          Liên hệ hỗ trợ
                        </button>
                      </Link>
                      <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium">
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
