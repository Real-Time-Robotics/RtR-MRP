'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  ClipboardCheck,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// MOBILE QUALITY PAGE
// =============================================================================

interface Inspection {
  id: string;
  inspectionNumber: string;
  type: string;
  partNumber: string;
  partDescription: string;
  qtyToInspect: number;
  qtyInspected: number;
  status: string;
  priority: string;
}

export default function MobileQualityPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInsp, setSelectedInsp] = useState<Inspection | null>(null);
  const [qtyPassed, setQtyPassed] = useState(0);
  const [qtyFailed, setQtyFailed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInspections = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/mobile/quality');
        if (response.ok) {
          const data = await response.json();
          setInspections(data.data || []);
        }
      } catch (err) {
        clientLogger.error('Failed to fetch quality inspections', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInspections();
  }, []);

  const handleSubmitInspection = async () => {
    if (!selectedInsp) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/mobile/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectionId: selectedInsp.id,
          qtyPassed,
          qtyFailed,
        }),
      });

      if (response.ok) {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        setSelectedInsp(null);
        // Refresh
        const refreshResponse = await fetch('/api/mobile/quality');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setInspections(data.data || []);
        }
      }
    } catch (err) {
      clientLogger.error('Failed to submit inspection', err);
    } finally {
      setIsSubmitting(false);
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
      {inspections.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Không có kiểm tra chờ xử lý</p>
        </div>
      ) : (
        inspections.map((insp) => (
          <button
            key={insp.id}
            onClick={() => {
              setSelectedInsp(insp);
              const remaining = insp.qtyToInspect - insp.qtyInspected;
              setQtyPassed(remaining);
              setQtyFailed(0);
            }}
            className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-gray-900 dark:text-white font-mono">
                  {insp.inspectionNumber}
                </div>
                <div className="text-sm text-gray-500">
                  {insp.partNumber} - {insp.partDescription}
                </div>
              </div>
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                insp.priority === 'Rush' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              )}>
                {insp.type}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Đã kiểm: {insp.qtyInspected}/{insp.qtyToInspect}
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        ))
      )}

      {/* Inspection Modal */}
      {selectedInsp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedInsp(null)} />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedInsp.inspectionNumber}</h2>
                <div className="text-sm text-gray-500">{selectedInsp.partNumber}</div>
              </div>
              <button onClick={() => setSelectedInsp(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-center text-sm text-gray-500">
                Còn lại: {selectedInsp.qtyToInspect - selectedInsp.qtyInspected}
              </div>
              
              {/* Pass Qty */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Đạt
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setQtyPassed(Math.max(0, qtyPassed - 1))} className="w-12 h-12 bg-green-100 rounded-full text-xl font-bold">-</button>
                  <input type="number" value={qtyPassed} onChange={(e) => setQtyPassed(parseInt(e.target.value) || 0)} aria-label="Số lượng đạt" className="w-20 h-12 text-center text-xl font-bold bg-white rounded-lg" />
                  <button onClick={() => setQtyPassed(qtyPassed + 1)} className="w-12 h-12 bg-green-600 text-white rounded-full text-xl font-bold">+</button>
                </div>
              </div>
              
              {/* Fail Qty */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-700 flex items-center gap-2">
                    <XCircle className="w-5 h-5" /> Không đạt
                  </span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setQtyFailed(Math.max(0, qtyFailed - 1))} className="w-12 h-12 bg-red-100 rounded-full text-xl font-bold">-</button>
                  <input type="number" value={qtyFailed} onChange={(e) => setQtyFailed(parseInt(e.target.value) || 0)} aria-label="Số lượng không đạt" className="w-20 h-12 text-center text-xl font-bold bg-white rounded-lg" />
                  <button onClick={() => setQtyFailed(qtyFailed + 1)} className="w-12 h-12 bg-red-600 text-white rounded-full text-xl font-bold">+</button>
                </div>
              </div>
              
              <button
                onClick={handleSubmitInspection}
                disabled={isSubmitting || (qtyPassed + qtyFailed <= 0)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Ghi nhận kết quả'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
