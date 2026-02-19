'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Minus,
  Package,
  MapPin,
  Check,
  Loader2,
  Scan,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// MOBILE INVENTORY ADJUST PAGE
// =============================================================================

export default function MobileInventoryAdjustPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <MobileInventoryAdjustContent />
    </Suspense>
  );
}

function MobileInventoryAdjustContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [partNumber, setPartNumber] = useState('');
  const [partInfo, setPartInfo] = useState<{
    id: string;
    partNumber: string;
    description: string;
    onHand: number;
    locations?: Array<{ code: string; qty: number }>;
  } | null>(null);
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reason options
  const reasons = adjustType === 'add' 
    ? ['Nhận từ sản xuất', 'Tìm thấy', 'Điều chỉnh kiểm kê', 'Trả hàng', 'Khác']
    : ['Hư hỏng', 'Mất mát', 'Điều chỉnh kiểm kê', 'Xuất sử dụng nội bộ', 'Khác'];

  // Get params from URL
  useEffect(() => {
    const part = searchParams.get('part');
    const type = searchParams.get('type');
    
    if (part) setPartNumber(part);
    if (type === 'add' || type === 'remove') setAdjustType(type);
  }, [searchParams]);

  // Fetch part info when part number changes
  useEffect(() => {
    if (!partNumber) {
      setPartInfo(null);
      return;
    }

    const fetchPart = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/mobile/inventory?search=${partNumber}`);
        if (response.ok) {
          const data = await response.json();
          const found = data.data?.find((p: { partNumber: string }) =>
            p.partNumber.toLowerCase() === partNumber.toLowerCase()
          );
          if (found) {
            setPartInfo(found);
            if (found.locations?.[0]) {
              setLocation(found.locations[0].code);
            }
          } else {
            setPartInfo(null);
            setError('Không tìm thấy vật tư');
          }
        }
      } catch (err) {
        setError('Lỗi khi tải thông tin');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPart, 500);
    return () => clearTimeout(debounce);
  }, [partNumber]);

  // Handle submit
  const handleSubmit = async () => {
    if (!partInfo || !location || !reason) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (quantity <= 0) {
      setError('Số lượng phải lớn hơn 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/mobile/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust',
          partId: partInfo.id,
          partNumber: partInfo.partNumber,
          locationId: location,
          adjustmentType: adjustType,
          quantity,
          reason,
          notes,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        // Vibrate on success
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        // Redirect after delay
        setTimeout(() => {
          router.push('/mobile/inventory');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Lỗi khi điều chỉnh');
      }
    } catch (err) {
      setError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Điều chỉnh thành công!
          </h2>
          <p className="text-gray-500">
            Đã {adjustType === 'add' ? 'thêm' : 'giảm'} {quantity} {partInfo?.partNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Type Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          onClick={() => setAdjustType('add')}
          className={cn(
            'py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
            adjustType === 'add' 
              ? 'bg-green-500 text-white' 
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          <Plus className="w-5 h-5" />
          Thêm
        </button>
        <button
          onClick={() => setAdjustType('remove')}
          className={cn(
            'py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
            adjustType === 'remove' 
              ? 'bg-red-500 text-white' 
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          <Minus className="w-5 h-5" />
          Giảm
        </button>
      </div>

      {/* Part Number Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Mã vật tư
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
            placeholder="VD: RTR-MOTOR-001"
            aria-label="Mã vật tư"
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            onClick={() => router.push('/mobile/scan?returnTo=/mobile/inventory/adjust')}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl"
          >
            <Scan className="w-5 h-5" />
          </button>
        </div>
        
        {/* Part Info */}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tìm...
          </div>
        )}
        
        {partInfo && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {partInfo.description}
                </div>
                <div className="text-sm text-gray-500">
                  Tồn hiện tại: <span className="font-semibold text-blue-600">{partInfo.onHand}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Vị trí
        </label>
        {partInfo?.locations && partInfo.locations.length > 0 ? (
          <div className="space-y-2">
            {partInfo.locations.map((loc: { code: string; qty: number }, i: number) => (
              <button
                key={i}
                onClick={() => setLocation(loc.code)}
                className={cn(
                  'w-full p-3 rounded-xl border-2 flex items-center justify-between transition-colors',
                  location === loc.code
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <MapPin className={cn(
                    'w-5 h-5',
                    location === loc.code ? 'text-blue-600' : 'text-gray-400'
                  )} />
                  <span className="font-mono">{loc.code}</span>
                </div>
                <span className="text-gray-500">Qty: {loc.qty}</span>
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value.toUpperCase())}
            placeholder="VD: WH-01-R01-C01-S01"
            aria-label="Vị trí"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 font-mono"
          />
        )}
      </div>

      {/* Quantity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Số lượng
        </label>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            aria-label="Số lượng"
            className="w-24 h-14 text-center text-2xl font-bold bg-gray-100 dark:bg-gray-700 rounded-xl border-0"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Reason */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Lý do
        </label>
        <div className="flex flex-wrap gap-2">
          {reasons.map((r, i) => (
            <button
              key={i}
              onClick={() => setReason(r)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                reason === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ghi chú (tùy chọn)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Thêm ghi chú..."
          aria-label="Ghi chú"
          rows={2}
          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!partInfo || !location || !reason || isSubmitting}
        className={cn(
          'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
          adjustType === 'add' ? 'bg-green-600' : 'bg-red-600',
          'text-white',
          (!partInfo || !location || !reason || isSubmitting) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            {adjustType === 'add' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            Xác nhận {adjustType === 'add' ? 'thêm' : 'giảm'} {quantity}
          </>
        )}
      </button>
    </div>
  );
}
