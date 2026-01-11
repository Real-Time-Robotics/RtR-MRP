"use client";

import { Badge } from "@/components/ui/badge";

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Thấp", className: "bg-gray-100 text-gray-800" },
  medium: { label: "Trung bình", className: "bg-blue-100 text-blue-800" },
  high: { label: "Cao", className: "bg-orange-100 text-orange-800" },
  critical: { label: "Cấp bách", className: "bg-red-100 text-red-800" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  return <Badge className={config.className}>{config.label}</Badge>;
}
