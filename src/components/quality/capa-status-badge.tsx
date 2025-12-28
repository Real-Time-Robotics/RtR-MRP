"use client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-800" },
  root_cause_analysis: { label: "RCA", className: "bg-purple-100 text-purple-800" },
  action_planning: { label: "Planning", className: "bg-amber-100 text-amber-800" },
  implementation: { label: "In Progress", className: "bg-orange-100 text-orange-800" },
  verification: { label: "Verification", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-800" },
};

export function CAPAStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.open;
  return <Badge className={config.className}>{config.label}</Badge>;
}
