"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StockStatus } from "@/types";

interface StockStatusBadgeProps {
  status: StockStatus;
  className?: string;
}

const statusConfig: Record<
  StockStatus,
  { label: string; className: string }
> = {
  OK: {
    label: "OK",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  REORDER: {
    label: "Reorder",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  CRITICAL: {
    label: "Critical",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  OUT_OF_STOCK: {
    label: "Out of Stock",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
