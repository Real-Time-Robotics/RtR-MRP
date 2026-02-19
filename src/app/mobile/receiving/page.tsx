'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package,
  Truck,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  Scan,
  MapPin,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// MOBILE RECEIVING PAGE
// =============================================================================

interface POLine {
  id: string;
  partNumber: string;
  description: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyRemaining: number;
  unitCost: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  expectedDate: string;
  lines: POLine[];
}

export default function MobileReceivingPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [selectedLine, setSelectedLine] = useState<POLine | null>(null);
  const [receiveQty, setReceiveQty] = useState(0);
  const [location, setLocation] = useState('WH-03-RECV-001');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch POs
  useEffect(() => {
    const fetchPOs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/mobile/receiving');
        if (response.ok) {
          const data = await response.json();
          setPurchaseOrders(data.data || []);
        }
      } catch (err) {
        clientLogger.error('Failed to fetch purchase orders', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPOs();
  }, []);

  // Handle receive
  const handleReceive = async () => {
    if (!selectedPO || !selectedLine || receiveQty <= 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/mobile/receiving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId: selectedPO.id,
          lineId: selectedLine.id,
          qtyReceived: receiveQty,
          locationId: location,
        }),
      });

      if (response.ok) {
        // Vibrate on success
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        
        // Update local state
        const updatedLines = selectedPO.lines.map(line => 
          line.id === selectedLine.id 
            ? { ...line, qtyReceived: line.qtyReceived + receiveQty, qtyRemaining: line.qtyRemaining - receiveQty }
            : line
        );
        
        setSelectedPO({ ...selectedPO, lines: updatedLines });
        setSelectedLine(null);
        setReceiveQty(0);
        
        // Refresh PO list
        const refreshResponse = await fetch('/api/mobile/receiving');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setPurchaseOrders(data.data || []);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Lỗi khi nhận hàng');
      }
    } catch (err) {
      setError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'Partial': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-green-100 text-green-700';
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
    <div className="h-full flex flex-col">
      {/* PO List or Selected PO */}
      {!selectedPO ? (
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có đơn hàng chờ nhận</p>
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <button
                key={po.id}
                onClick={() => setSelectedPO(po)}
                className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white font-mono">
                      {po.poNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {po.supplier}
                    </div>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(po.status)
                  )}>
                    {po.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {po.lines.length} dòng • Hạn: {po.expectedDate}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* PO Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg text-gray-900 dark:text-white font-mono">
                  {selectedPO.poNumber}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedPO.supplier}
                </div>
              </div>
              <button 
                onClick={() => setSelectedPO(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* PO Lines */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {selectedPO.lines.map((line) => {
              const isComplete = line.qtyRemaining === 0;
              return (
                <button
                  key={line.id}
                  onClick={() => {
                    if (!isComplete) {
                      setSelectedLine(line);
                      setReceiveQty(line.qtyRemaining);
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
                      isComplete ? 'bg-green-100' : 'bg-blue-100'
                    )}>
                      {isComplete ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Package className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-medium text-gray-900 dark:text-white">
                        {line.partNumber}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {line.description}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-500">
                          Đặt: <span className="font-semibold">{line.qtyOrdered}</span>
                        </span>
                        <span className="text-green-600">
                          Nhận: <span className="font-semibold">{line.qtyReceived}</span>
                        </span>
                        {!isComplete && (
                          <span className="text-orange-600">
                            Còn: <span className="font-semibold">{line.qtyRemaining}</span>
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

      {/* Receive Modal */}
      {selectedLine && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setSelectedLine(null)}
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nhận hàng
              </h2>
              <div className="text-sm text-gray-500 font-mono mt-1">
                {selectedLine.partNumber} - {selectedLine.description}
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Số lượng nhận
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setReceiveQty(Math.max(1, receiveQty - 1))}
                    className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(Math.min(selectedLine.qtyRemaining, Math.max(1, parseInt(e.target.value) || 1)))}
                    aria-label="Số lượng nhận hàng"
                    className="w-24 h-14 text-center text-2xl font-bold bg-gray-100 dark:bg-gray-700 rounded-xl border-0"
                  />
                  <button
                    onClick={() => setReceiveQty(Math.min(selectedLine.qtyRemaining, receiveQty + 1))}
                    className="w-14 h-14 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="text-center text-sm text-gray-500 mt-2">
                  Tối đa: {selectedLine.qtyRemaining}
                </div>
              </div>
              
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Vị trí nhập kho
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value.toUpperCase())}
                  aria-label="Vị trí nhập kho"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 font-mono"
                />
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
                  onClick={() => setSelectedLine(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReceive}
                  disabled={isSubmitting || receiveQty <= 0}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Nhận {receiveQty}
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
