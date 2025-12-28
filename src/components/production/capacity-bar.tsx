"use client";

import { cn } from "@/lib/utils";

interface CapacityBarProps {
  utilization: number;
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
  className?: string;
}

export function CapacityBar({
  utilization,
  showLabel = true,
  height = "md",
  className,
}: CapacityBarProps) {
  const getColor = () => {
    if (utilization > 100) return "bg-red-500";
    if (utilization > 85) return "bg-green-500";
    if (utilization > 50) return "bg-blue-500";
    return "bg-gray-400";
  };

  const heightClass = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }[height];

  const displayValue = Math.min(utilization, 100);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", heightClass)}>
        <div
          className={cn("transition-all duration-300 rounded-full", getColor(), heightClass)}
          style={{ width: `${displayValue}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{Math.round(utilization)}%</span>
          {utilization > 100 && (
            <span className="text-red-600 font-medium">Over capacity!</span>
          )}
        </div>
      )}
    </div>
  );
}
