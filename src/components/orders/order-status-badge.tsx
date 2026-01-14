"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
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
  pending: {
    label: "Chờ xử lý",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  in_progress: {
    label: "Đang xử lý",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
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
