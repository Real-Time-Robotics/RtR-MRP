'use client';

import { useState, useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEntityTooltip } from '@/hooks/use-entity-tooltip';
import { TooltipSkeleton } from './tooltip-skeleton';
import {
  PartTooltipContent,
  SupplierTooltipContent,
  POTooltipContent,
  SOTooltipContent,
  WOTooltipContent,
  CustomerTooltipContent,
  WarehouseTooltipContent,
  ProductTooltipContent,
} from './tooltip-contents';

interface EntityTooltipProps {
  type: 'part' | 'supplier' | 'po' | 'so' | 'wo' | 'customer' | 'warehouse' | 'product';
  id: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const CONTENT_MAP: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  part: PartTooltipContent,
  supplier: SupplierTooltipContent,
  po: POTooltipContent,
  so: SOTooltipContent,
  wo: WOTooltipContent,
  customer: CustomerTooltipContent,
  warehouse: WarehouseTooltipContent,
  product: ProductTooltipContent,
};

export function EntityTooltip({ type, id, children, side = 'top' }: EntityTooltipProps) {
  const [hovered, setHovered] = useState(false);
  const { data, isLoading, error } = useEntityTooltip({
    type,
    id,
    enabled: hovered,
  });

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) setHovered(true);
  }, []);

  const ContentComponent = CONTENT_MAP[type];

  return (
    <TooltipProvider>
      <Tooltip delayDuration={400} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="p-3 max-w-[280px]">
          {isLoading ? (
            <TooltipSkeleton />
          ) : error || !data ? (
            <div className="text-xs text-yellow-300">Không thể tải dữ liệu</div>
          ) : (
            ContentComponent && <ContentComponent data={data} />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
