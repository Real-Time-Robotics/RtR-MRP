'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import {
  ClipboardCheck,
  Package,
  MapPin,
  Scan,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// =============================================================================
// MOBILE CYCLE COUNT PAGE
// =============================================================================

interface CountItem {
  id: string;
  partNumber: string;
  description: string;
  location: string;
  systemQty: number;
  countedQty: number | null;
}

export default function MobileInventoryCountPage() {
  const router = useRouter();
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [currentItem, setCurrentItem] = useState<CountItem | null>(null);
  const [countedQty, setCountedQty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Add item to count
  const addItem = (partNumber: string, location: string, systemQty: number, description: string) => {
    const newItem: CountItem = {
      id: `item-${Date.now()}`,
      partNumber,
      description,
      location,
      systemQty,
      countedQty: null,
    };
    setCountItems([...countItems, newItem]);
  };

  // Update counted qty
  const updateCount = (id: string, qty: number) => {
    setCountItems(countItems.map(item => 
      item.id === id ? { ...item, countedQty: qty } : item
    ));
  };

  // Remove item
  const removeItem = (id: string) => {
    setCountItems(countItems.filter(item => item.id !== id));
  };

  // Submit count
  const handleSubmit = async () => {
    const itemsToSubmit = countItems.filter(item => item.countedQty !== null);
    if (itemsToSubmit.length === 0) {
      setError('Chưa có item nào được đếm');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/mobile/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'count',
          items: itemsToSubmit.map(item => ({
            partId: item.id,
            partNumber: item.partNumber,
            locationId: item.location,
            systemQty: item.systemQty,
            countedQty: item.countedQty,
            variance: (item.countedQty || 0) - item.systemQty,
          })),
        }),
      });

      if (response.ok) {
        setSuccess(true);
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        setTimeout(() => router.push('/mobile/inventory'), 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Lỗi khi gửi kiểm kê');
      }
    } catch (error) {
      clientLogger.error('Failed to submit inventory count', error);
      setError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isLoadingItems, setIsLoadingItems] = useState(true);

  // Fetch cycle count items from API
  useEffect(() => {
    async function fetchCycleCountItems() {
      try {
        const res = await fetch('/api/inventory/cycle-count?maxItems=20');
        if (!res.ok) throw new Error('Không thể tải danh sách kiểm kê');
        const json = await res.json();
        const items: CountItem[] = (json.data || []).map((item: { id: string; partNumber?: string; part?: { partNumber?: string; name?: string }; description?: string; locationCode?: string; quantity?: number; systemQty?: number }) => ({
          id: item.id,
          partNumber: item.partNumber || item.part?.partNumber || '',
          description: item.description || item.part?.name || '',
          location: item.locationCode || '',
          systemQty: item.quantity ?? item.systemQty ?? 0,
          countedQty: null,
        }));
        setCountItems(items);
      } catch (err) {
        toast.error('Lỗi tải danh sách kiểm kê');
      } finally {
        setIsLoadingItems(false);
      }
    }
    fetchCycleCountItems();
  }, []);

  if (success) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Kiểm kê hoàn tất!
          </h2>
          <p className="text-gray-500">
            Đã ghi nhận {countItems.filter(i => i.countedQty !== null).length} items
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Stats */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {countItems.length}
            </div>
            <div className="text-xs text-gray-500">Tổng items</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
            <div className="text-xl font-bold text-green-600">
              {countItems.filter(i => i.countedQty !== null).length}
            </div>
            <div className="text-xs text-gray-500">Đã đếm</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
            <div className="text-xl font-bold text-orange-600">
              {countItems.filter(i => i.countedQty !== null && i.countedQty !== i.systemQty).length}
            </div>
            <div className="text-xs text-gray-500">Chênh lệch</div>
          </div>
        </div>
      </div>

      {/* Count Items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {isLoadingItems ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Đang tải danh sách kiểm kê...</span>
          </div>
        ) : countItems.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Chưa có items để kiểm kê</p>
            <button
              onClick={() => router.push('/mobile/scan')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Quét để thêm
            </button>
          </div>
        ) : (
          countItems.map((item) => {
            const variance = item.countedQty !== null ? item.countedQty - item.systemQty : null;
            const hasVariance = variance !== null && variance !== 0;
            
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl p-4 border',
                  item.countedQty !== null 
                    ? hasVariance 
                      ? 'border-orange-200 dark:border-orange-800' 
                      : 'border-green-200 dark:border-green-800'
                    : 'border-gray-100 dark:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono font-bold text-gray-900 dark:text-white">
                      {item.partNumber}
                    </div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* System Qty */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Hệ thống</div>
                    <div className="text-lg font-semibold text-gray-400">
                      {item.systemQty}
                    </div>
                  </div>

                  {/* Count Input */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Thực tế</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCount(item.id, Math.max(0, (item.countedQty || item.systemQty) - 1))}
                        className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg text-lg font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.countedQty ?? ''}
                        onChange={(e) => updateCount(item.id, parseInt(e.target.value) || 0)}
                        placeholder={String(item.systemQty)}
                        aria-label="Số lượng kiểm đếm"
                        className="w-16 h-10 text-center text-lg font-bold bg-gray-100 dark:bg-gray-700 rounded-lg"
                      />
                      <button
                        onClick={() => updateCount(item.id, (item.countedQty || item.systemQty) + 1)}
                        className="w-10 h-10 bg-blue-600 text-white rounded-lg text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Variance */}
                  <div className="w-16 text-right">
                    {variance !== null && (
                      <div className={cn(
                        'text-lg font-bold',
                        variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-gray-400'
                      )}>
                        {variance > 0 ? '+' : ''}{variance}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Match Button */}
                {item.countedQty === null && (
                  <button
                    onClick={() => updateCount(item.id, item.systemQty)}
                    className="w-full mt-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Khớp ({item.systemQty})
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Actions */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/mobile/scan')}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || countItems.filter(i => i.countedQty !== null).length === 0}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Lưu kiểm kê
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
