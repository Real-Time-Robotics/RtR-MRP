'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package,
  ShoppingCart,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  X,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// MOBILE PICKING PAGE
// =============================================================================

interface PickItem {
  id: string;
  partNumber: string;
  description: string;
  qtyToPick: number;
  qtyPicked: number;
  location: string;
  binQty: number;
}

interface PickList {
  id: string;
  pickNumber: string;
  soNumber: string;
  customer: string;
  status: string;
  priority: string;
  dueDate: string;
  items: PickItem[];
}

export default function MobilePickingPage() {
  const router = useRouter();
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPick, setSelectedPick] = useState<PickList | null>(null);
  const [selectedItem, setSelectedItem] = useState<PickItem | null>(null);
  const [pickQty, setPickQty] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pick lists
  useEffect(() => {
    const fetchPicks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/mobile/picking');
        if (response.ok) {
          const data = await response.json();
          setPickLists(data.data || []);
        }
      } catch (err) {
        clientLogger.error('Failed to fetch picks', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPicks();
  }, []);

  // Handle pick
  const handlePick = async () => {
    if (!selectedPick || !selectedItem || pickQty <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/mobile/picking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickId: selectedPick.id,
          itemId: selectedItem.id,
          qtyPicked: pickQty,
          location: selectedItem.location,
        }),
      });

      if (response.ok) {
        // Vibrate on success
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        
        // Update local state
        const updatedItems = selectedPick?.items?.map(item => 
          item.id === selectedItem.id 
            ? { ...item, qtyPicked: item.qtyPicked + pickQty }
            : item
        );
        
        setSelectedPick({ ...selectedPick, items: updatedItems });
        setSelectedItem(null);
        setPickQty(0);
        
        // Refresh list
        const refreshResponse = await fetch('/api/mobile/picking');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setPickLists(data.data || []);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Lỗi khi xuất hàng');
      }
    } catch (err) {
      setError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Rush': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Pick Lists or Selected Pick */}
      {!selectedPick ? (
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {pickLists.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có đơn chờ xuất</p>
            </div>
          ) : (
            pickLists.map((pick) => (
              <button
                key={pick.id}
                onClick={() => setSelectedPick(pick)}
                className={cn(
                  'w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border text-left active:scale-[0.98] transition-transform',
                  pick.priority === 'Rush' ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white font-mono flex items-center gap-2">
                      {pick.pickNumber}
                      {pick.priority === 'Rush' && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {pick.customer}
                    </div>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getPriorityColor(pick.priority)
                  )}>
                    {pick.priority}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {pick.items.length} items • Hạn: {pick.dueDate}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Pick Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg text-gray-900 dark:text-white font-mono flex items-center gap-2">
                  {selectedPick.pickNumber}
                  {selectedPick.priority === 'Rush' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">GẤP</span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedPick.customer}
                </div>
              </div>
              <button 
                onClick={() => setSelectedPick(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Pick Items */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {selectedPick?.items?.map((item) => {
              const remaining = item.qtyToPick - item.qtyPicked;
              const isComplete = remaining === 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isComplete) {
                      setSelectedItem(item);
                      setPickQty(remaining);
                    }
                  }}
                  disabled={isComplete}
                  className={cn(
                    'w-full bg-white dark:bg-gray-800 rounded-xl p-4 border text-left transition-all',
                    isComplete 
                      ? 'border-green-200 dark:border-green-800 opacity-60' 
                      : 'border-gray-100 dark:border-gray-700 active:scale-[0.98]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isComplete ? 'bg-green-100' : 'bg-orange-100'
                    )}>
                      {isComplete ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Package className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium text-gray-900 dark:text-white">
                        {item.partNumber}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {item.description}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {item.location}
                        </span>
                        <span className="text-xs text-gray-500">
                          Có: {item.binQty}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-500">
                          Cần: <span className="font-semibold">{item.qtyToPick}</span>
                        </span>
                        <span className="text-green-600">
                          Đã lấy: <span className="font-semibold">{item.qtyPicked}</span>
                        </span>
                        {!isComplete && (
                          <span className="text-orange-600">
                            Còn: <span className="font-semibold">{remaining}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {!isComplete && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pick Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setSelectedItem(null)}
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Xuất hàng
              </h2>
              <div className="text-sm text-gray-500 font-mono mt-1">
                {selectedItem.partNumber}
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Location Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <MapPin className="w-5 h-5" />
                  <span className="font-mono font-semibold">{selectedItem.location}</span>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Số lượng tại vị trí: {selectedItem.binQty}
                </div>
              </div>
              
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Số lượng lấy
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPickQty(Math.max(1, pickQty - 1))}
                    className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={pickQty}
                    onChange={(e) => {
                      const max = Math.min(selectedItem.qtyToPick - selectedItem.qtyPicked, selectedItem.binQty);
                      setPickQty(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)));
                    }}
                    aria-label="Số lượng lấy hàng"
                    className="w-24 h-14 text-center text-2xl font-bold bg-gray-100 dark:bg-gray-700 rounded-xl border-0"
                  />
                  <button
                    onClick={() => {
                      const max = Math.min(selectedItem.qtyToPick - selectedItem.qtyPicked, selectedItem.binQty);
                      setPickQty(Math.min(max, pickQty + 1));
                    }}
                    className="w-14 h-14 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">
                  Cần lấy: {selectedItem.qtyToPick - selectedItem.qtyPicked}
                </div>
              </div>
              
              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePick}
                  disabled={isSubmitting || pickQty <= 0}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Lấy {pickQty}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
