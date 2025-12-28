"use client";

import { Badge } from "@/components/ui/badge";
import { Download, Cog, CheckSquare } from "lucide-react";

const typeConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  RECEIVING: {
    label: "Receiving",
    className: "bg-blue-100 text-blue-800",
    icon: Download,
  },
  IN_PROCESS: {
    label: "In-Process",
    className: "bg-purple-100 text-purple-800",
    icon: Cog,
  },
  FINAL: {
    label: "Final",
    className: "bg-green-100 text-green-800",
    icon: CheckSquare,
  },
};

export function InspectionTypeBadge({ type }: { type: string }) {
  const config = typeConfig[type] || typeConfig.RECEIVING;
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
