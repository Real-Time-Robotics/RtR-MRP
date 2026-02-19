'use client';

import React, { useState, useEffect } from 'react';
import { 
  Factory,
  Play,
  Pause,
  Check,
  ChevronRight,
  Loader2,
  Clock,
  AlertTriangle,
  X,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// MOBILE WORK ORDER PAGE
// =============================================================================

interface WorkOrder {
  id: string;
  woNumber: string;
  partNumber: string;
  partDescription: string;
  qty: number;
  qtyCompleted: number;
  status: string;
  priority: string;
  dueDate: string;
  currentOperation: {
    name: string;
    status: string;
  } | null;
}

export default function MobileWorkOrderPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [productionQty, setProductionQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch work orders
  useEffect(() => {
    const fetchWOs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/mobile/workorder');
        if (response.ok) {
          const data = await response.json();
          setWorkOrders(data.data || []);
        }
      } catch (err) {
        clientLogger.error('Failed to fetch work orders', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWOs();
  }, []);

  // Handle record production
  const handleRecordProduction = async () => {
    if (!selectedWO || productionQty <= 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/mobile/workorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          woId: selectedWO.id,
          action: 'record_production',
          data: { qtyGood: productionQty },
        }),
      });

      if (response.ok) {
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        setSelectedWO(null);
        // Refresh list
        const refreshResponse = await fetch('/api/mobile/workorder');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setWorkOrders(data.data || []);
        }
      }
    } catch (err) {
      clientLogger.error('Failed to record production', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Released': return 'bg-green-100 text-green-700';
      case 'Completed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
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
    <div className="p-4 space-y-3">
      {workOrders.length === 0 ? (
        <div className="text-center py-12">
          <Factory className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Không có lệnh sản xuất</p>
        </div>
      ) : (
        workOrders.map((wo) => {
          const progress = (wo.qtyCompleted / wo.qty) * 100;
          return (
            <button
              key={wo.id}
              onClick={() => {
                setSelectedWO(wo);
                setProductionQty(1);
              }}
              className={cn(
                'w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border text-left active:scale-[0.98] transition-transform',
                wo.priority === 'Rush' ? 'border-red-200' : 'border-gray-100 dark:border-gray-700'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-gray-900 dark:text-white font-mono flex items-center gap-2">
                    {wo.woNumber}
                    {wo.priority === 'Rush' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {wo.partDescription}
                  </div>
                </div>
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(wo.status)
                )}>
                  {wo.status}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Tiến độ</span>
                  <span className="font-medium">{wo.qtyCompleted}/{wo.qty}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              {wo.currentOperation && (
                <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {wo.currentOperation.name}
                </div>
              )}
            </button>
          );
        })
      )}

      {/* Production Modal */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setSelectedWO(null)}
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Ghi nhận sản lượng
                  </h2>
                  <div className="text-sm text-gray-500 font-mono">
                    {selectedWO.woNumber}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWO(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Product Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedWO.partDescription}
                  </div>
                  <div className="text-sm text-gray-500">
                    Còn lại: {selectedWO.qty - selectedWO.qtyCompleted}
                  </div>
                </div>
              </div>
              
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Số lượng hoàn thành
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setProductionQty(Math.max(1, productionQty - 1))}
                    className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={productionQty}
                    onChange={(e) => setProductionQty(Math.max(1, parseInt(e.target.value) || 1))}
                    aria-label="Số lượng sản xuất"
                    className="w-24 h-14 text-center text-2xl font-bold bg-gray-100 dark:bg-gray-700 rounded-xl border-0"
                  />
                  <button
                    onClick={() => setProductionQty(productionQty + 1)}
                    className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedWO(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRecordProduction}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Ghi nhận
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
