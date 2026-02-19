'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Package, MapPin, Scan, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';

export default function MobileInventoryTransferPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <MobileInventoryTransferContent />
    </Suspense>
  );
}

function MobileInventoryTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [partNumber, setPartNumber] = useState('');
  const [partInfo, setPartInfo] = useState<{
    id: string;
    partNumber: string;
    description: string;
    onHand: number;
    locations?: Array<{ code: string; qty: number }>;
  } | null>(null);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const part = searchParams.get('part');
    if (part) setPartNumber(part);
  }, [searchParams]);

  useEffect(() => {
    if (!partNumber) { setPartInfo(null); return; }
    
    const fetchPart = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/mobile/inventory?search=${partNumber}`);
        if (response.ok) {
          const data = await response.json();
          const found = data.data?.find((p: { partNumber: string }) => p.partNumber.toLowerCase() === partNumber.toLowerCase());
          if (found) {
            setPartInfo(found);
            if (found.locations?.[0]) setFromLocation(found.locations[0].code);
          }
        }
      } catch (err) { clientLogger.error('Failed to fetch part info', err); }
      finally { setIsLoading(false); }
    };
    setTimeout(fetchPart, 500);
  }, [partNumber]);

  const handleSubmit = async () => {
    if (!partInfo || !fromLocation || !toLocation || fromLocation === toLocation) {
      setError('Vui lòng điền đầy đủ và chọn vị trí khác nhau');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/mobile/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          partId: partInfo.id,
          partNumber: partInfo.partNumber,
          fromLocationId: fromLocation,
          toLocationId: toLocation,
          quantity,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        setTimeout(() => router.push('/mobile/inventory'), 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Lỗi khi chuyển kho');
      }
    } catch (error) { clientLogger.error('Failed to transfer inventory', error); setError('Lỗi kết nối'); }
    finally { setIsSubmitting(false); }
  };

  if (success) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Chuyển kho thành công!</h2>
          <p className="text-gray-500">Đã chuyển {quantity} {partInfo?.partNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Part Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mã vật tư</label>
        <div className="flex gap-2">
          <input type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value.toUpperCase())} placeholder="RTR-MOTOR-001" aria-label="Mã vật tư" className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-mono" />
          <button onClick={() => router.push('/mobile/scan')} className="px-4 py-3 bg-blue-600 text-white rounded-xl"><Scan className="w-5 h-5" /></button>
        </div>
        {partInfo && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <div className="font-medium">{partInfo.description}</div>
              <div className="text-sm text-gray-500">Tồn: {partInfo.onHand}</div>
            </div>
          </div>
        )}
      </div>

      {/* From Location */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Từ vị trí</label>
        {partInfo?.locations && partInfo.locations.length > 0 ? (
          <div className="space-y-2">
            {partInfo.locations.map((loc: { code: string; qty: number }, i: number) => (
              <button key={i} onClick={() => setFromLocation(loc.code)}
                className={cn('w-full p-3 rounded-xl border-2 flex justify-between', fromLocation === loc.code ? 'border-blue-500 bg-blue-50' : 'border-gray-200')}>
                <span className="font-mono">{loc.code}</span>
                <span className="text-gray-500">Qty: {loc.qty}</span>
              </button>
            ))}
          </div>
        ) : (
          <input type="text" value={fromLocation} onChange={(e) => setFromLocation(e.target.value.toUpperCase())} aria-label="Từ vị trí" className="w-full px-4 py-3 bg-gray-100 rounded-xl font-mono" />
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-center"><ArrowRight className="w-8 h-8 text-gray-400" /></div>

      {/* To Location */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium">Đến vị trí</label>
        <input type="text" value={toLocation} onChange={(e) => setToLocation(e.target.value.toUpperCase())} placeholder="WH-01-R02-C01-S01" aria-label="Đến vị trí" className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-mono" />
      </div>

      {/* Quantity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium">Số lượng</label>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-14 h-14 bg-gray-100 rounded-full text-2xl font-bold">-</button>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} aria-label="Số lượng" className="w-24 h-14 text-center text-2xl font-bold bg-gray-100 rounded-xl" />
          <button onClick={() => setQuantity(quantity + 1)} className="w-14 h-14 bg-blue-600 text-white rounded-full text-2xl font-bold">+</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" /><span>{error}</span>
        </div>
      )}

      <button onClick={handleSubmit} disabled={!partInfo || !fromLocation || !toLocation || isSubmitting}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <ArrowRight className="w-5 h-5" />
            Xác nhận chuyển
          </>
        )}
      </button>
    </div>
  );
}
