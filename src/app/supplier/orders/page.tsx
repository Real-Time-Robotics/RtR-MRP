'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import {
  ShoppingCart,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { excelPortalStyles } from '@/components/ui-v2/excel';

// =============================================================================
// SUPPLIER ORDERS PAGE
// View and manage purchase orders from RTR
// =============================================================================

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  partCode: string;
  partName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface Order {
  id: string;
  poNumber: string;
  orderDate: string;
  requiredDate: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  notes?: string;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Chờ xác nhận', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: <Clock className="w-4 h-4" /> },
  CONFIRMED: { label: 'Đã xác nhận', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  IN_PRODUCTION: { label: 'Đang sản xuất', color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20', icon: <Package className="w-4 h-4" /> },
  READY: { label: 'Sẵn sàng giao', color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20', icon: <Package className="w-4 h-4" /> },
  SHIPPED: { label: 'Đã gửi hàng', color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', icon: <Truck className="w-4 h-4" /> },
  DELIVERED: { label: 'Đã giao', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  CANCELLED: { label: 'Đã hủy', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: <XCircle className="w-4 h-4" /> },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

function SupplierOrdersContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as OrderStatus | null;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>(initialStatus || 'ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? '/api/v2/supplier?view=orders'
        : `/api/v2/supplier?view=orders&status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch supplier orders', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmOrder(orderId: string) {
    setConfirming(orderId);
    try {
      const res = await fetch('/api/v2/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_order', data: { orderId } }),
      });
      const json = await res.json();
      if (json.success) {
        // Update local state
        setOrders(prev => prev.map(o =>
          o.id === orderId ? { ...o, status: 'CONFIRMED' as OrderStatus } : o
        ));
      }
    } catch (error) {
      clientLogger.error('Failed to confirm order', error);
    } finally {
      setConfirming(null);
    }
  }

  const filteredOrders = orders.filter(order =>
    order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items.some(item => item.partName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const isOverdue = (requiredDate: string, status: OrderStatus) => {
    if (['DELIVERED', 'CANCELLED'].includes(status)) return false;
    return new Date(requiredDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Đơn hàng</h1>
          <p className="text-gray-500 dark:text-gray-400">Quản lý đơn đặt hàng từ RTR</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredOrders.length} đơn hàng
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã PO hoặc tên sản phẩm..."
            aria-label="Tìm kiếm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
            aria-label="Bộ lọc trạng thái"
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Không có đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const overdue = isOverdue(order.requiredDate, order.status);

            return (
              <div
                key={order.id}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
                  overdue && 'border-red-300 dark:border-red-800'
                )}
              >
                {/* Order Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className={cn('p-2 rounded-lg', statusConfig.bgColor)}>
                      <ShoppingCart className={cn('w-5 h-5', statusConfig.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{order.poNumber}</h3>
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Quá hạn
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Ngày đặt: {formatDate(order.orderDate)} • Yêu cầu: {formatDate(order.requiredDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                      statusConfig.bgColor, statusConfig.color
                    )}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>

                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleConfirmOrder(order.id)}
                        disabled={confirming === order.id}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {confirming === order.id ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Xác nhận
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <ChevronRight className={cn(
                        'w-5 h-5 text-gray-400 transition-transform',
                        selectedOrder?.id === order.id && 'rotate-90'
                      )} />
                    </button>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="p-4 flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Số mặt hàng:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{order.items.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tổng số lượng:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tổng giá trị:</span>
                    <span className="ml-2 font-bold text-blue-600">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  {order.notes && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{order.notes}</span>
                    </div>
                  )}
                </div>

                {/* Order Items (Expandable) - Excel Style */}
                {selectedOrder?.id === order.id && (
                  <div className="border-t border-[#217346]/30 dark:border-[#70AD47]/30 bg-white dark:bg-slate-950">
                    <table className={excelPortalStyles.table}>
                      <thead className={excelPortalStyles.thead}>
                        <tr>
                          <th className={excelPortalStyles.th}>Mã SP</th>
                          <th className={excelPortalStyles.th}>Tên sản phẩm</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Số lượng</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Đơn giá</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className={excelPortalStyles.tbody}>
                        {order?.items?.map((item, idx) => (
                          <tr key={idx} className={excelPortalStyles.tr}>
                            <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdMono}`}>{item.partCode}</td>
                            <td className={excelPortalStyles.td}>{item.partName}</td>
                            <td className={excelPortalStyles.tdNumber}>
                              {item.quantity.toLocaleString()} {item.unit}
                            </td>
                            <td className={excelPortalStyles.tdNumber}>
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className={excelPortalStyles.tdCurrency}>
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SupplierOrdersPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupplierOrdersContent />
    </Suspense>
  );
}
