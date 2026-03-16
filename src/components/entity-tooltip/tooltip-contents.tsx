'use client';

import {
  Package, MapPin, Star, Clock, Truck,
  AlertTriangle, CheckCircle, XCircle, Pause,
  Wrench, ShoppingCart, Hash, User, CreditCard,
  Warehouse, Box, DollarSign, Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    active: { color: 'text-green-700 bg-white', icon: CheckCircle },
    completed: { color: 'text-green-700 bg-white', icon: CheckCircle },
    received: { color: 'text-green-700 bg-white', icon: CheckCircle },
    cancelled: { color: 'text-red-600 bg-white', icon: XCircle },
    pending: { color: 'text-amber-600 bg-white', icon: Pause },
    pending_approval: { color: 'text-amber-600 bg-white', icon: Pause },
    in_progress: { color: 'text-blue-600 bg-white', icon: Wrench },
    draft: { color: 'text-gray-600 bg-white', icon: Pause },
  };

  const s = config[status] || config.pending;
  const Icon = s?.icon || Pause;

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded', s?.color || 'text-gray-600 bg-gray-50')}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-yellow-300 flex items-center gap-1 font-medium">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className="font-medium text-right text-white">{value}</span>
    </div>
  );
}

export function PartTooltipContent({ data }: { data: Record<string, unknown> }) {
  const lowStock = (data.quantityOnHand as number) < (data.safetyStock as number);

  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.partNumber as string}</div>
        <div className="text-xs text-yellow-200">{data.name as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
        <span className="text-[10px] text-yellow-200">{data.category as string}</span>
      </div>
      <div className="border-t border-white/20 pt-2 space-y-1">
        <Row label="Tồn kho" value={
          <span className={cn(lowStock && 'text-red-600')}>
            {lowStock && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {data.quantityOnHand as number} {data.unit as string}
          </span>
        } icon={Package} />
        <Row label="Khả dụng" value={`${data.quantityAvailable} ${data.unit}`} />
        <Row label="Safety stock" value={data.safetyStock as number} />
        <Row label="Đơn giá" value={`$${(data.unitCost as number).toLocaleString()}`} />
        <Row label="Thời gian giao" value={`${data.leadTimeDays} ngày`} icon={Clock} />
      </div>
    </div>
  );
}

export function SupplierTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.name as string}</div>
        <div className="text-xs text-yellow-200">{data.code as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
      </div>
      <div className="border-t border-white/20 pt-2 space-y-1">
        <Row label="Quốc gia" value={data.country as string} icon={MapPin} />
        {data.rating ? (
          <Row label="Đánh giá" value={`${data.rating}/5`} icon={Star} />
        ) : null}
        <Row label="Thời gian giao" value={`${data.leadTimeDays} ngày`} icon={Clock} />
        <Row label="PO đang xử lý" value={data.activePOCount as number} icon={ShoppingCart} />
        {data.contactName ? (
          <Row label="Liên hệ" value={data.contactName as string} />
        ) : null}
      </div>
    </div>
  );
}

export function POTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.poNumber as string}</div>
        <div className="text-xs text-yellow-200">{data.supplierName as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t border-white/20 pt-2 space-y-1">
        <Row label="Tổng tiền" value={`${(data.totalAmount as number)?.toLocaleString()} ${data.currency || 'USD'}`} />
        <Row label="Số dòng" value={data.lineCount as number} icon={Hash} />
        {data.expectedDate ? (
          <Row label="Giao hàng" value={new Date(data.expectedDate as string).toLocaleDateString('vi-VN')} icon={Truck} />
        ) : null}
      </div>
    </div>
  );
}

export function SOTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.orderNumber as string}</div>
        <div className="text-xs text-yellow-200">{data.customerName as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t border-white/20 pt-2 space-y-1">
        <Row label="Tổng tiền" value={`${(data.totalAmount as number)?.toLocaleString()} ${data.currency || 'USD'}`} />
        <Row label="Số dòng" value={data.lineCount as number} icon={Hash} />
        {data.requiredDate ? (
          <Row label="Yêu cầu" value={new Date(data.requiredDate as string).toLocaleDateString('vi-VN')} icon={Clock} />
        ) : null}
      </div>
    </div>
  );
}

export function WOTooltipContent({ data }: { data: Record<string, unknown> }) {
  const progress = data.progress as number;

  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.woNumber as string}</div>
        <div className="text-xs text-yellow-200">{data.partNumber as string} - {data.partName as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
        {data.priority ? (
          <span className="text-[10px] text-yellow-200">{data.priority as string}</span>
        ) : null}
      </div>
      <div className="border-t border-white/20 pt-2 space-y-1">
        <Row label="Tiến độ" value={`${data.completedQuantity}/${data.quantity} (${progress}%)`} icon={Wrench} />
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className={cn(
              'h-full rounded-full',
              progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {data.dueDate ? (
          <Row label="Hạn" value={new Date(data.dueDate as string).toLocaleDateString('vi-VN')} icon={Clock} />
        ) : null}
      </div>
    </div>
  );
}

export function WarehouseTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.name as string}</div>
        <div className="text-xs text-yellow-200">{data.code as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
        {data.type ? (
          <span className="text-[10px] text-yellow-200">{data.type as string}</span>
        ) : null}
      </div>
      <div className="border-t border-white/20 pt-2 space-y-1">
        {data.location ? (
          <Row label="Vị trí" value={data.location as string} icon={MapPin} />
        ) : null}
        <Row label="Số items" value={data.itemCount as number} icon={Package} />
        <Row label="Tổng tồn" value={(data.totalStock as number).toLocaleString()} icon={Warehouse} />
      </div>
    </div>
  );
}

export function ProductTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.name as string}</div>
        <div className="text-xs text-yellow-200">{data.sku as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t border-white/20 pt-2 space-y-1">
        {data.basePrice != null && (
          <Row label="Giá" value={`$${(data.basePrice as number).toLocaleString()}`} icon={DollarSign} />
        )}
        {data.assemblyHours != null && (
          <Row label="Lắp ráp" value={`${data.assemblyHours} giờ`} icon={Wrench} />
        )}
        <Row label="WO đang xử lý" value={data.activeWOCount as number} icon={Factory} />
      </div>
    </div>
  );
}

export function CustomerTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm text-white">{data.name as string}</div>
        <div className="text-xs text-yellow-200">{data.code as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t border-white/20 pt-2 space-y-1">
        {data.country ? (
          <Row label="Quốc gia" value={data.country as string} icon={MapPin} />
        ) : null}
        {data.contactName ? (
          <Row label="Liên hệ" value={data.contactName as string} icon={User} />
        ) : null}
        {data.paymentTerms ? (
          <Row label="Thanh toán" value={data.paymentTerms as string} />
        ) : null}
        {data.creditLimit != null && (
          <Row label="Hạn mức" value={`$${(data.creditLimit as number).toLocaleString()}`} icon={CreditCard} />
        )}
        <Row label="SO đang xử lý" value={data.activeSOCount as number} icon={ShoppingCart} />
      </div>
    </div>
  );
}
