'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck, Search, Calendar, Package, ChevronRight, RefreshCw,
  MapPin, Clock, CheckCircle, ExternalLink, AlertCircle
} from 'lucide-react';
import {
  CustomerPortalEngine,
  CustomerDelivery
} from '@/lib/customer/customer-engine';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// CUSTOMER DELIVERIES PAGE
// Phase 9: Customer Portal
// =============================================================================

export default function CustomerDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<CustomerDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v2/customer?view=deliveries');
      const result = await response.json();
      if (result.success) {
        setDeliveries(result.data.deliveries || []);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch deliveries', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Filter deliveries
  const filteredDeliveries = deliveries.filter(delivery => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!delivery.deliveryNumber.toLowerCase().includes(query) &&
          !delivery.soNumber.toLowerCase().includes(query) &&
          !delivery.trackingNumber?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (statusFilter !== 'ALL' && delivery.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Get status icon
  const getStatusIcon = (status: CustomerDelivery['status']) => {
    switch (status) {
      case 'PREPARING': return <Package className="w-5 h-5 text-yellow-500" />;
      case 'READY': return <CheckCircle className="w-5 h-5 text-cyan-500" />;
      case 'SHIPPED': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'IN_TRANSIT': return <Truck className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'DELIVERED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'RETURNED': return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-purple-600" />
            Theo dõi Giao hàng
          </h1>
          <p className="text-gray-500 mt-1">Xem trạng thái giao hàng của bạn</p>
        </div>
        <button
          onClick={() => fetchDeliveries()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))]"
          aria-label="Làm mới"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-4 border border-gray-200 dark:border-[rgb(var(--border-primary))]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã giao hàng, SO, tracking..."
              aria-label="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Bộ lọc trạng thái"
            className="px-4 py-2 bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] rounded-xl focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PREPARING">Đang chuẩn bị</option>
            <option value="READY">Sẵn sàng</option>
            <option value="SHIPPED">Đã gửi</option>
            <option value="IN_TRANSIT">Đang vận chuyển</option>
            <option value="DELIVERED">Đã giao</option>
          </select>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-8 text-center border border-gray-200 dark:border-[rgb(var(--border-primary))]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl p-8 text-center border border-gray-200 dark:border-[rgb(var(--border-primary))]">
            <Truck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Không có giao hàng nào</p>
          </div>
        ) : (
          filteredDeliveries.map(delivery => (
            <div
              key={delivery.id}
              className={`bg-white dark:bg-[rgb(var(--bg-secondary))] rounded-2xl border overflow-hidden ${
                delivery.status === 'IN_TRANSIT' 
                  ? 'border-purple-300 dark:border-purple-600' 
                  : 'border-gray-200 dark:border-[rgb(var(--border-primary))]'
              }`}
            >
              {/* Delivery Header */}
              <div className="p-4 border-b border-gray-100 dark:border-[rgb(var(--border-primary))]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${CustomerPortalEngine.getDeliveryStatusColor(delivery.status)}`}>
                      {getStatusIcon(delivery.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{delivery.deliveryNumber}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CustomerPortalEngine.getDeliveryStatusColor(delivery.status)}`}>
                          {CustomerPortalEngine.getDeliveryStatusLabel(delivery.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Đơn hàng: <Link href={`/customer/orders/${delivery.soId}`} className="text-emerald-600 hover:underline">{delivery.soNumber}</Link>
                      </p>
                    </div>
                  </div>
                  {delivery.trackingNumber && (
                    <div className="text-right">
                      <p className="text-sm font-mono bg-gray-100 dark:bg-[rgb(var(--bg-tertiary))] px-3 py-1.5 rounded-lg">
                        {delivery.trackingNumber}
                      </p>
                      {delivery.carrier && (
                        <p className="text-sm text-gray-500 mt-1">{delivery.carrier}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      delivery.shipDate ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                    }`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Gửi hàng</p>
                    <p className="text-xs font-medium">{delivery.shipDate ? new Date(delivery.shipDate).toLocaleDateString('vi-VN') : '-'}</p>
                  </div>
                  
                  <div className={`flex-1 h-0.5 mx-4 ${delivery.shipDate ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      delivery.status === 'IN_TRANSIT' ? 'bg-purple-500 text-white animate-pulse' :
                      delivery.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                    }`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Vận chuyển</p>
                    <p className="text-xs font-medium">{delivery.expectedArrival ? new Date(delivery.expectedArrival).toLocaleDateString('vi-VN') : '-'}</p>
                  </div>
                  
                  <div className={`flex-1 h-0.5 mx-4 ${delivery.status === 'DELIVERED' ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      delivery.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Giao hàng</p>
                    <p className="text-xs font-medium">{delivery.actualArrival ? new Date(delivery.actualArrival).toLocaleDateString('vi-VN') : '-'}</p>
                  </div>
                </div>
              </div>

              {/* In Transit Alert */}
              {delivery.status === 'IN_TRANSIT' && (
                <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-gray-100 dark:border-[rgb(var(--border-primary))]">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Truck className="w-5 h-5 animate-bounce" />
                    <span className="font-medium">Đang trên đường giao đến bạn!</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                    Dự kiến đến: {delivery.expectedArrival ? new Date(delivery.expectedArrival).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'}
                  </p>
                </div>
              )}

              {/* Items */}
              <div className="p-4">
                <p className="text-sm font-medium mb-2">Danh sách hàng ({delivery.items.length})</p>
                <div className="space-y-2">
                  {delivery?.items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <span className="font-mono text-xs text-gray-500 mr-2">{item.productCode}</span>
                          <span>{item.productName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">SL: {item.shippedQty}</span>
                        {item.status === 'DELIVERED' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="px-4 pb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Địa chỉ giao hàng</p>
                      <p className="text-sm text-gray-500">{delivery.shippingAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex justify-end gap-2">
                {delivery.trackingNumber && (
                  <a
                    href={`https://tracking.example.com/${delivery.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-gray-600 dark:text-[rgb(var(--text-tertiary))] rounded-xl hover:bg-gray-100 dark:hover:bg-[rgb(var(--sidebar-item-hover))] flex items-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Theo dõi vận đơn
                  </a>
                )}
                {delivery.proofOfDelivery && (
                  <a
                    href={delivery.proofOfDelivery}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Xem biên nhận
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
