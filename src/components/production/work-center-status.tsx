"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface WorkCenterStatusProps {
  status: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800",
    dotColor: "bg-green-500",
  },
  running: {
    label: "Running",
    color: "bg-blue-100 text-blue-800",
    dotColor: "bg-blue-500 animate-pulse",
  },
  idle: {
    label: "Idle",
    color: "bg-yellow-100 text-yellow-800",
    dotColor: "bg-yellow-500",
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-red-100 text-red-800",
    dotColor: "bg-red-500",
  },
  inactive: {
    label: "Inactive",
    color: "bg-gray-100 text-gray-800",
    dotColor: "bg-gray-500",
  },
  down: {
    label: "Down",
    color: "bg-red-100 text-red-800",
    dotColor: "bg-red-500 animate-pulse",
  },
};

export function WorkCenterStatus({ status, className }: WorkCenterStatusProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.inactive;

  return (
    <Badge className={cn(config.color, "flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
      {config.label}
    </Badge>
  );
}
