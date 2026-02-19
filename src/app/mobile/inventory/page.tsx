// =============================================================================
// 📱 MOBILE INVENTORY PAGE - Polished Version
// Professional mobile-first design with optimized UX
// =============================================================================

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
  MapPin,
  Loader2,
  X,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clientLogger } from '@/lib/client-logger';
import {
  MobileCard,
  MobileButton,
  MobileSearchBar,
  MobileBadge,
  MobileBottomSheet,
  MobileLoading,
  MobileEmptyState,
  haptic
} from '@/components/mobile/mobile-ui-kit';

// =============================================================================
// TYPES
// =============================================================================

interface PartInventory {
  id: string;
  partNumber: string;
  description: string;
  onHand: number;
  reserved: number;
  available: number;
  unit: string;
  locations: { code: string; qty: number }[];
}

// =============================================================================
// QUICK ACTION BUTTON
// =============================================================================

interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}

function QuickAction({ icon: Icon, label, href, color }: QuickActionProps) {
  const router = useRouter();
  
  return (
    <button
      onClick={() => {
        haptic.light();
        router.push(href);
      }}
      className="flex flex-col items-center gap-1.5 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 active:scale-95 transition-all min-h-[80px]"
    >
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        color
      )}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-full px-1">
        {label}
      </span>
    </button>
  );
}

// =============================================================================
// STOCK STATUS BADGE
// =============================================================================

function StockStatusBadge({ available, onHand }: { available: number; onHand: number }) {
  if (available <= 0) {
    return <MobileBadge variant="danger" size="sm">Hết hàng</MobileBadge>;
  }
  if (available < onHand * 0.2) {
    return <MobileBadge variant="warning" size="sm">Sắp hết</MobileBadge>;
  }
  return <MobileBadge variant="success" size="sm">Đủ hàng</MobileBadge>;
}

// =============================================================================
// PART CARD
// =============================================================================

interface PartCardProps {
  part: PartInventory;
  onClick: () => void;
}

function PartCard({ part, onClick }: PartCardProps) {
  return (
    <MobileCard onClick={onClick} padding="md" variant="default">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
              {part.partNumber}
            </span>
            <StockStatusBadge available={part.available} onHand={part.onHand} />
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {part.description}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-gray-500">
              Tồn: <span className="font-semibold text-gray-900 dark:text-white">{part.onHand}</span>
              <span className="text-gray-400 ml-0.5">{part.unit}</span>
            </span>
            {part.reserved > 0 && (
              <span className="text-orange-600">
                Đặt: <span className="font-semibold">{part.reserved}</span>
              </span>
            )}
            <span className="text-blue-600">
              KD: <span className="font-semibold">{part.available}</span>
            </span>
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
      </div>
    </MobileCard>
  );
}

// =============================================================================
// PART DETAIL SHEET
// =============================================================================

interface PartDetailSheetProps {
  part: PartInventory | null;
  onClose: () => void;
}

function PartDetailSheet({ part, onClose }: PartDetailSheetProps) {
  const router = useRouter();
  
  if (!part) return null;

  return (
    <MobileBottomSheet
      isOpen={!!part}
      onClose={onClose}
      title={part.partNumber}
      subtitle={part.description}
    >
      <div className="p-4 space-y-4">
        {/* Stock Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {part.onHand}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Tồn kho</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {part.reserved}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Đã đặt</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {part.available}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Khả dụng</div>
          </div>
        </div>
        
        {/* Locations */}
        {part.locations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Vị trí lưu trữ
            </h3>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {part.locations.map((loc, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3"
                >
                  <span className="font-mono text-sm text-gray-900 dark:text-white">
                    {loc.code}
                  </span>
                  <span className="font-semibold text-blue-600 text-sm">
                    {loc.qty} {part.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <MobileButton
            variant="success"
            size="lg"
            fullWidth
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => {
              onClose();
              router.push(`/mobile/inventory/adjust?part=${part.partNumber}&type=add`);
            }}
          >
            Thêm
          </MobileButton>
          <MobileButton
            variant="danger"
            size="lg"
            fullWidth
            leftIcon={<Minus className="w-5 h-5" />}
            onClick={() => {
              onClose();
              router.push(`/mobile/inventory/adjust?part=${part.partNumber}&type=remove`);
            }}
          >
            Giảm
          </MobileButton>
          <MobileButton
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<ArrowLeftRight className="w-5 h-5" />}
            onClick={() => {
              onClose();
              router.push(`/mobile/inventory/transfer?part=${part.partNumber}`);
            }}
            className="col-span-2"
          >
            Chuyển kho
          </MobileButton>
        </div>
      </div>
    </MobileBottomSheet>
  );
}

// =============================================================================
// PAGE CONTENT
// =============================================================================

function PageContent() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [parts, setParts] = useState<PartInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPart, setSelectedPart] = useState<PartInventory | null>(null);

  // Quick actions config
  const quickActions = [
    { icon: Plus, label: 'Thêm', href: '/mobile/inventory/adjust?type=add', color: 'bg-green-500' },
    { icon: Minus, label: 'Giảm', href: '/mobile/inventory/adjust?type=remove', color: 'bg-red-500' },
    { icon: ArrowLeftRight, label: 'Chuyển', href: '/mobile/inventory/transfer', color: 'bg-blue-500' },
    { icon: ClipboardCheck, label: 'Kiểm kê', href: '/mobile/inventory/count', color: 'bg-purple-500' },
  ];

  // Fetch inventory
  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/mobile/inventory?search=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setParts(data.data || []);
        }
      } catch (error) {
        clientLogger.error('Failed to fetch inventory', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchInventory, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Check for part param
  useEffect(() => {
    const partParam = searchParams.get('part');
    if (partParam) {
      setSearchQuery(partParam);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Search Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <MobileSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Tìm theo mã hoặc tên vật tư..."
        />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, i) => (
            <QuickAction key={i} {...action} />
          ))}
        </div>
      </div>

      {/* Parts List */}
      <div className="flex-1 px-4 pb-4">
        {isLoading ? (
          <MobileLoading text="Đang tải..." />
        ) : parts.length === 0 ? (
          <MobileEmptyState
            icon={<Package className="w-8 h-8" />}
            title="Không tìm thấy vật tư"
            description={searchQuery ? `Không có kết quả cho "${searchQuery}"` : 'Chưa có dữ liệu tồn kho'}
            action={searchQuery ? {
              label: 'Xóa tìm kiếm',
              onClick: () => setSearchQuery('')
            } : undefined}
          />
        ) : (
          <div className="space-y-2">
            {/* Results count */}
            <div className="text-xs text-gray-500 px-1 mb-2">
              {parts.length} vật tư
            </div>
            
            {parts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onClick={() => {
                  haptic.selection();
                  setSelectedPart(part);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Part Detail Sheet */}
      <PartDetailSheet
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
      />
    </div>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

export default function MobileInventoryPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageContent />
    </Suspense>
  );
}
