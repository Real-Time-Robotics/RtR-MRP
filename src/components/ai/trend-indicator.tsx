"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  trend:
    | "increasing"
    | "stable"
    | "decreasing"
    | "IMPROVING"
    | "STABLE"
    | "DECLINING"
    | "faster"
    | "on_time"
    | "slower";
  value?: string | number;
  showIcon?: boolean;
}

export function TrendIndicator({
  trend,
  value,
  showIcon = true,
}: TrendIndicatorProps) {
  const normalized = trend.toLowerCase();

  const config: Record<
    string,
    {
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      bg: string;
    }
  > = {
    increasing: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    improving: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    faster: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    stable: { icon: Minus, color: "text-gray-600", bg: "bg-gray-100" },
    on_time: { icon: Minus, color: "text-gray-600", bg: "bg-gray-100" },
    decreasing: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100" },
    declining: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100" },
    slower: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100" },
  };

  const { icon: Icon, color, bg } = config[normalized] || config.stable;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${bg} ${color} text-sm`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {value && <span>{value}</span>}
    </span>
  );
}
