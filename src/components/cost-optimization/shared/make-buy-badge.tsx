"use client";

import { Factory, ShoppingCart, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MakeBuyBadgeProps {
  type: "MAKE" | "BUY" | "BOTH";
  size?: "sm" | "default";
}

const config = {
  MAKE: {
    label: "Make",
    icon: Factory,
    className: "text-blue-700 border-blue-300 bg-blue-50",
  },
  BUY: {
    label: "Buy",
    icon: ShoppingCart,
    className: "text-gray-700 border-gray-300 bg-gray-50",
  },
  BOTH: {
    label: "Both",
    icon: ArrowLeftRight,
    className: "text-purple-700 border-purple-300 bg-purple-50",
  },
};

export function MakeBuyBadge({ type, size = "default" }: MakeBuyBadgeProps) {
  const { label, icon: Icon, className } = config[type] || config.BUY;
  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <Badge variant="outline" className={className}>
      <Icon className={`${iconClass} mr-1`} />
      {label}
    </Badge>
  );
}
