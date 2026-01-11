"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "draft"
  | "confirmed"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Nháp",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  in_production: {
    label: "Đang sản xuất",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  ready: {
    label: "Sẵn sàng",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  shipped: {
    label: "Đã gửi hàng",
    className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  },
  delivered: {
    label: "Đã giao hàng",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };
  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
