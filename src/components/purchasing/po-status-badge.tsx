"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type POStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "partial"
  | "received"
  | "cancelled";

interface POStatusBadgeProps {
  status: POStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  partial: {
    label: "Partial",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  received: {
    label: "Received",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

export function POStatusBadge({ status, className }: POStatusBadgeProps) {
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
