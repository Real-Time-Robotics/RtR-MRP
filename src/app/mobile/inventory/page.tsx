'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Package,
  Plus,
  Minus,
  ArrowLeftRight,
  ClipboardCheck,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Filter,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// MOBILE INVENTORY PAGE
// =============================================================================

interface PartInventory {
  id: string;
  partNumber: string;
  description: string;
  onHand: number;
  reserved: number;
  available: number;
  locations: { code: string; qty: number }[];
}

export default function MobileInventoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <MobileInventoryContent />
    </Suspense>
  );
}

function MobileInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [parts, setParts] = useState<PartInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState<PartInventory | null>(null);

  // Quick actions
  const quickActions = [
    { icon: Plus, label: 'Thêm', href: '/mobile/inventory/adjust?type=add', color: 'bg-green-500' },
    { icon: Minus, label: 'Giảm', href: '/mobile/inventory/adjust?type=remove', color: 'bg-red-500' },
    { icon: ArrowLeftRight, label: 'Chuyển', href: '/mobile/inventory/transfer', color: 'bg-blue-500' },
    { icon: ClipboardCheck, label: 'Kiểm kê', href: '/mobile/inventory/count', color: 'bg-purple-500' },
  ];

  // Fetch inventory data
  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/mobile/inventory?search=${searchQuery}`);
        if (response.ok) {
          const data = await response.json();
          setParts(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchInventory, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Check if part from URL
  useEffect(() => {
    const partParam = searchParams.get('part');
    if (partParam) {
      setSearchQuery(partParam);
    }
  }, [searchParams]);

  // Get stock status
  const getStockStatus = (part: PartInventory) => {
    if (part.available <= 0) {
      return { status: 'out', label: 'Hết hàng', color: 'text-red-600 bg-red-50' };
    }
    if (part.available < part.onHand * 0.2) {
      return { status: 'low', label: 'Sắp hết', color: 'text-yellow-600 bg-yellow-50' };
    }
    return { status: 'ok', label: 'Đủ hàng', color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã hoặc tên..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 grid grid-cols-4 gap-2">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center gap-1 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', action.color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Parts List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : parts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Không tìm thấy vật tư</p>
          </div>
        ) : (
          <div className="space-y-2">
            {parts.map((part) => {
              const stock = getStockStatus(part);
              return (
                <button
                  key={part.id}
                  onClick={() => setSelectedPart(part)}
                  className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white font-mono">
                          {part.partNumber}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          stock.color
                        )}>
                          {stock.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {part.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-500">
                          Tồn: <span className="font-semibold text-gray-900 dark:text-white">{part.onHand}</span>
                        </span>
                        {part.reserved > 0 && (
                          <span className="text-orange-600">
                            Đặt: {part.reserved}
                          </span>
                        )}
                        <span className="text-blue-600">
                          Khả dụng: <span className="font-semibold">{part.available}</span>
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Part Detail Modal */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setSelectedPart(null)}
          />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg text-gray-900 dark:text-white font-mono">
                    {selectedPart.partNumber}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedPart.description}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPart(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Stock Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPart.onHand}
                  </div>
                  <div className="text-xs text-gray-500">Tồn kho</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedPart.reserved}
                  </div>
                  <div className="text-xs text-gray-500">Đã đặt</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedPart.available}
                  </div>
                  <div className="text-xs text-gray-500">Khả dụng</div>
                </div>
              </div>
              
              {/* Locations */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Vị trí lưu trữ
                </h3>
                <div className="space-y-2">
                  {selectedPart.locations.map((loc, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                    >
                      <span className="font-mono text-gray-900 dark:text-white">
                        {loc.code}
                      </span>
                      <span className="font-semibold text-blue-600">
                        {loc.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => router.push(`/mobile/inventory/adjust?part=${selectedPart.partNumber}&type=add`)}
                  className="py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Thêm
                </button>
                <button
                  onClick={() => router.push(`/mobile/inventory/adjust?part=${selectedPart.partNumber}&type=remove`)}
                  className="py-3 bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Minus className="w-5 h-5" />
                  Giảm
                </button>
                <button
                  onClick={() => router.push(`/mobile/inventory/transfer?part=${selectedPart.partNumber}`)}
                  className="py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 col-span-2"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  Chuyển kho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
