"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface OperationStatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-800" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  ready: { label: "Ready", color: "bg-cyan-100 text-cyan-800" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
  paused: { label: "Paused", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

export function OperationStatusBadge({
  status,
  className,
}: OperationStatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;

  return (
    <Badge className={cn(config.color, className)}>{config.label}</Badge>
  );
}
