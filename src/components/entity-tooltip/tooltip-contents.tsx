'use client';

import {
  Package, MapPin, Star, Clock, Truck,
  AlertTriangle, CheckCircle, XCircle, Pause,
  Wrench, ShoppingCart, Hash, User, CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    active: { color: 'text-green-600 bg-green-50', icon: CheckCircle },
    completed: { color: 'text-green-600 bg-green-50', icon: CheckCircle },
    received: { color: 'text-green-600 bg-green-50', icon: CheckCircle },
    cancelled: { color: 'text-red-600 bg-red-50', icon: XCircle },
    pending: { color: 'text-amber-600 bg-amber-50', icon: Pause },
    pending_approval: { color: 'text-amber-600 bg-amber-50', icon: Pause },
    in_progress: { color: 'text-blue-600 bg-blue-50', icon: Wrench },
    draft: { color: 'text-gray-600 bg-gray-50', icon: Pause },
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
      <span className="text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function PartTooltipContent({ data }: { data: Record<string, unknown> }) {
  const lowStock = (data.quantityOnHand as number) < (data.safetyStock as number);

  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm">{data.partNumber as string}</div>
        <div className="text-xs text-muted-foreground">{data.name as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
        <span className="text-[10px] text-muted-foreground">{data.category as string}</span>
      </div>
      <div className="border-t pt-2 space-y-1">
        <Row label="Ton kho" value={
          <span className={cn(lowStock && 'text-red-600')}>
            {lowStock && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {data.quantityOnHand as number} {data.unit as string}
          </span>
        } icon={Package} />
        <Row label="Kha dung" value={`${data.quantityAvailable} ${data.unit}`} />
        <Row label="Safety stock" value={data.safetyStock as number} />
        <Row label="Don gia" value={`${(data.unitCost as number).toLocaleString()} VND`} />
        <Row label="Lead time" value={`${data.leadTimeDays} ngay`} icon={Clock} />
      </div>
    </div>
  );
}

export function SupplierTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm">{data.name as string}</div>
        <div className="text-xs text-muted-foreground">{data.code as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
      </div>
      <div className="border-t pt-2 space-y-1">
        <Row label="Quoc gia" value={data.country as string} icon={MapPin} />
        {data.rating ? (
          <Row label="Rating" value={`${data.rating}/5`} icon={Star} />
        ) : null}
        <Row label="Lead time" value={`${data.leadTimeDays} ngay`} icon={Clock} />
        <Row label="PO dang xu ly" value={data.activePOCount as number} icon={ShoppingCart} />
        {data.contactName ? (
          <Row label="Lien he" value={data.contactName as string} />
        ) : null}
      </div>
    </div>
  );
}

export function POTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm">{data.poNumber as string}</div>
        <div className="text-xs text-muted-foreground">{data.supplierName as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t pt-2 space-y-1">
        <Row label="Tong tien" value={`${(data.totalAmount as number)?.toLocaleString()} ${data.currency || 'VND'}`} />
        <Row label="So dong" value={data.lineCount as number} icon={Hash} />
        {data.expectedDate ? (
          <Row label="Giao hang" value={new Date(data.expectedDate as string).toLocaleDateString('vi-VN')} icon={Truck} />
        ) : null}
      </div>
    </div>
  );
}

export function SOTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm">{data.orderNumber as string}</div>
        <div className="text-xs text-muted-foreground">{data.customerName as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t pt-2 space-y-1">
        <Row label="Tong tien" value={`${(data.totalAmount as number)?.toLocaleString()} ${data.currency || 'VND'}`} />
        <Row label="So dong" value={data.lineCount as number} icon={Hash} />
        {data.requiredDate ? (
          <Row label="Yeu cau" value={new Date(data.requiredDate as string).toLocaleDateString('vi-VN')} icon={Clock} />
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
        <div className="font-semibold text-sm">{data.woNumber as string}</div>
        <div className="text-xs text-muted-foreground">{data.partNumber as string} - {data.partName as string}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={data.status as string} />
        {data.priority ? (
          <span className="text-[10px] text-muted-foreground">{data.priority as string}</span>
        ) : null}
      </div>
      <div className="border-t pt-2 space-y-1">
        <Row label="Tien do" value={`${data.completedQuantity}/${data.quantity} (${progress}%)`} icon={Wrench} />
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
          <Row label="Han" value={new Date(data.dueDate as string).toLocaleDateString('vi-VN')} icon={Clock} />
        ) : null}
      </div>
    </div>
  );
}

export function CustomerTooltipContent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 min-w-[200px]">
      <div>
        <div className="font-semibold text-sm">{data.name as string}</div>
        <div className="text-xs text-muted-foreground">{data.code as string}</div>
      </div>
      <StatusBadge status={data.status as string} />
      <div className="border-t pt-2 space-y-1">
        {data.country ? (
          <Row label="Quoc gia" value={data.country as string} icon={MapPin} />
        ) : null}
        {data.contactName ? (
          <Row label="Lien he" value={data.contactName as string} icon={User} />
        ) : null}
        {data.paymentTerms ? (
          <Row label="Thanh toan" value={data.paymentTerms as string} />
        ) : null}
        {data.creditLimit != null && (
          <Row label="Han muc" value={`${(data.creditLimit as number).toLocaleString()} VND`} icon={CreditCard} />
        )}
        <Row label="SO dang xu ly" value={data.activeSOCount as number} icon={ShoppingCart} />
      </div>
    </div>
  );
}
