"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-context";

type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "partially_shipped"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  confirmed: "bg-green-100 text-green-800 hover:bg-green-100",
  in_progress: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  completed: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  partially_shipped: "bg-violet-100 text-violet-800 hover:bg-violet-100",
  shipped: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  delivered: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
};

const statusKeyMap: Record<string, string> = {
  draft: "orderStatus.draft",
  pending: "orderStatus.pending",
  confirmed: "orderStatus.confirmed",
  in_progress: "orderStatus.inProgress",
  completed: "orderStatus.completed",
  partially_shipped: "orderStatus.partiallyShipped",
  shipped: "orderStatus.shipped",
  delivered: "orderStatus.delivered",
  cancelled: "orderStatus.cancelled",
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const { t } = useLanguage();
  const style = statusStyles[status] || "bg-gray-100 text-gray-800";
  const label = statusKeyMap[status] ? t(statusKeyMap[status]) : status;

  return (
    <Badge variant="secondary" className={cn(style, className)}>
      {label}
    </Badge>
  );
}
