'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import {
  Truck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  AlertTriangle,
  ChevronRight,
  Edit,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { excelPortalStyles } from '@/components/ui-v2/excel';

// =============================================================================
// SUPPLIER DELIVERIES PAGE
// Track and update delivery status
// =============================================================================

type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';

interface DeliveryItem {
  partCode: string;
  partName: string;
  orderedQty: number;
  deliveredQty: number;
  unit: string;
}

interface Delivery {
  id: string;
  deliveryNumber: string;
  orderId: string;
  poNumber: string;
  scheduledDate: string;
  actualDate?: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
}

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: 'Đã lên lịch', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: <Clock className="w-4 h-4" /> },
  IN_TRANSIT: { label: 'Đang vận chuyển', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: <Truck className="w-4 h-4" /> },
  DELIVERED: { label: 'Đã giao', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  DELAYED: { label: 'Trễ hạn', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20', icon: <AlertTriangle className="w-4 h-4" /> },
  CANCELLED: { label: 'Đã hủy', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20', icon: <X className="w-4 h-4" /> },
};

const CARRIERS = ['Viettel Post', 'GHTK', 'GHN', 'J&T', 'Ninja Van', 'Kerry Express'];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

function SupplierDeliveriesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as DeliveryStatus | null;

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'ALL'>(initialStatus || 'ALL');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ trackingNumber: '', carrier: '', estimatedDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  async function fetchDeliveries() {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? '/api/v2/supplier?view=deliveries'
        : `/api/v2/supplier?view=deliveries&status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setDeliveries(json.data.deliveries);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch deliveries', error);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(delivery: Delivery) {
    setEditingDelivery(delivery.id);
    setEditForm({
      trackingNumber: delivery.trackingNumber || '',
      carrier: delivery.carrier || '',
      estimatedDate: delivery.scheduledDate,
    });
  }

  async function handleSaveDelivery(deliveryId: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/v2/supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_delivery',
          data: { deliveryId, ...editForm },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDeliveries(prev => prev.map(d =>
          d.id === deliveryId
            ? { ...d, trackingNumber: editForm.trackingNumber, carrier: editForm.carrier, status: 'IN_TRANSIT' as DeliveryStatus }
            : d
        ));
        setEditingDelivery(null);
      }
    } catch (error) {
      clientLogger.error('Failed to update delivery', error);
    } finally {
      setSaving(false);
    }
  }

  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (delivery.trackingNumber && delivery.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Giao hàng</h1>
          <p className="text-gray-500 dark:text-gray-400">Theo dõi và cập nhật trạng thái giao hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredDeliveries.length} lô hàng
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã giao hàng, PO hoặc tracking..."
            aria-label="Tìm kiếm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | 'ALL')}
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

      {/* Deliveries List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Không có lô giao hàng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => {
            const statusConfig = STATUS_CONFIG[delivery.status];
            const isEditing = editingDelivery === delivery.id;

            return (
              <div
                key={delivery.id}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
                  delivery.status === 'DELAYED' && 'border-red-300 dark:border-red-800'
                )}
              >
                {/* Delivery Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className={cn('p-2 rounded-lg', statusConfig.bgColor)}>
                      <Truck className={cn('w-5 h-5', statusConfig.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{delivery.deliveryNumber}</h3>
                        {delivery.status === 'DELAYED' && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Trễ hạn
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        PO: {delivery.poNumber} • Dự kiến: {formatDate(delivery.scheduledDate)}
                        {delivery.actualDate && ` • Thực tế: ${formatDate(delivery.actualDate)}`}
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

                    {delivery.status === 'SCHEDULED' && !isEditing && (
                      <button
                        onClick={() => startEdit(delivery)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                        Cập nhật
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedDelivery(selectedDelivery?.id === delivery.id ? null : delivery)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <ChevronRight className={cn(
                        'w-5 h-5 text-gray-400 transition-transform',
                        selectedDelivery?.id === delivery.id && 'rotate-90'
                      )} />
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-4">Cập nhật thông tin giao hàng</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Đơn vị vận chuyển
                        </label>
                        <select
                          value={editForm.carrier}
                          onChange={(e) => setEditForm(prev => ({ ...prev, carrier: e.target.value }))}
                          aria-label="Đơn vị vận chuyển"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="">Chọn đơn vị</option>
                          {CARRIERS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Mã vận đơn
                        </label>
                        <input
                          type="text"
                          value={editForm.trackingNumber}
                          onChange={(e) => setEditForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                          placeholder="Nhập mã tracking"
                          aria-label="Mã vận đơn"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Ngày giao dự kiến
                        </label>
                        <input
                          type="date"
                          value={editForm.estimatedDate}
                          onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDate: e.target.value }))}
                          aria-label="Ngày giao dự kiến"
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleSaveDelivery(delivery.id)}
                        disabled={saving || !editForm.carrier || !editForm.trackingNumber}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                      <button
                        onClick={() => setEditingDelivery(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {/* Delivery Info */}
                <div className="p-4 flex flex-wrap items-center gap-6 text-sm">
                  {delivery.carrier && (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{delivery.carrier}</span>
                    </div>
                  )}
                  {delivery.trackingNumber && (
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-gray-900 dark:text-white">{delivery.trackingNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {delivery.items.length} mặt hàng •{' '}
                      {delivery.items.reduce((sum, item) => sum + item.orderedQty, 0).toLocaleString()} đơn vị
                    </span>
                  </div>
                  {delivery.notes && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{delivery.notes}</span>
                    </div>
                  )}
                </div>

                {/* Delivery Items (Expandable) - Excel Style */}
                {selectedDelivery?.id === delivery.id && (
                  <div className="border-t border-[#217346]/30 dark:border-[#70AD47]/30 bg-white dark:bg-slate-950">
                    <table className={excelPortalStyles.table}>
                      <thead className={excelPortalStyles.thead}>
                        <tr>
                          <th className={excelPortalStyles.th}>Mã SP</th>
                          <th className={excelPortalStyles.th}>Tên sản phẩm</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Đặt hàng</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Đã giao</th>
                          <th className={`${excelPortalStyles.th} ${excelPortalStyles.thRight}`}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className={excelPortalStyles.tbody}>
                        {delivery?.items?.map((item, idx) => {
                          const fulfilled = item.deliveredQty >= item.orderedQty;
                          const partial = item.deliveredQty > 0 && item.deliveredQty < item.orderedQty;

                          return (
                            <tr key={idx} className={excelPortalStyles.tr}>
                              <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdMono}`}>{item.partCode}</td>
                              <td className={excelPortalStyles.td}>{item.partName}</td>
                              <td className={excelPortalStyles.tdNumber}>
                                {item.orderedQty.toLocaleString()} {item.unit}
                              </td>
                              <td className={excelPortalStyles.tdNumber}>
                                {item.deliveredQty.toLocaleString()} {item.unit}
                              </td>
                              <td className={`${excelPortalStyles.td} ${excelPortalStyles.tdRight}`}>
                                {fulfilled ? (
                                  <span className="text-[#217346] dark:text-[#70AD47] flex items-center justify-end gap-1 font-medium">
                                    <CheckCircle2 className="w-4 h-4" /> Đủ
                                  </span>
                                ) : partial ? (
                                  <span className="text-amber-600 flex items-center justify-end gap-1">
                                    <AlertTriangle className="w-4 h-4" /> Thiếu {item.orderedQty - item.deliveredQty}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Chưa giao</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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

export default function SupplierDeliveriesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SupplierDeliveriesContent />
    </Suspense>
  );
}
