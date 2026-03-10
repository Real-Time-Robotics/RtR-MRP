"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NdaaBadgeProps {
  compliant: boolean;
  size?: "sm" | "default";
}

export function NdaaBadge({ compliant, size = "default" }: NdaaBadgeProps) {
  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  if (compliant) {
    return (
      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
        <ShieldCheck className={`${iconClass} mr-1`} />
        NDAA
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
      <ShieldAlert className={`${iconClass} mr-1`} />
      Non-NDAA
    </Badge>
  );
}
