"use client";

import { cn } from "@/lib/utils";

interface OEEGaugeProps {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

export function OEEGauge({
  oee,
  availability,
  performance,
  quality,
  size = "md",
  showDetails = true,
  className,
}: OEEGaugeProps) {
  const getColor = (value: number) => {
    if (value >= 85) return "text-green-600";
    if (value >= 70) return "text-blue-600";
    if (value >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatus = (value: number) => {
    if (value >= 85) return "World Class";
    if (value >= 70) return "Good";
    if (value >= 50) return "Average";
    return "Poor";
  };

  const sizeClasses = {
    sm: { container: "w-20 h-20", text: "text-lg", label: "text-[10px]" },
    md: { container: "w-28 h-28", text: "text-2xl", label: "text-xs" },
    lg: { container: "w-36 h-36", text: "text-3xl", label: "text-sm" },
  }[size];

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Main OEE Circle */}
      <div
        className={cn(
          "relative rounded-full border-4 flex items-center justify-center",
          sizeClasses.container,
          oee >= 85
            ? "border-green-500 bg-green-50"
            : oee >= 70
            ? "border-blue-500 bg-blue-50"
            : oee >= 50
            ? "border-yellow-500 bg-yellow-50"
            : "border-red-500 bg-red-50"
        )}
      >
        <div className="text-center">
          <div className={cn("font-bold", sizeClasses.text, getColor(oee))}>
            {Math.round(oee)}%
          </div>
          <div className={cn("text-muted-foreground", sizeClasses.label)}>OEE</div>
        </div>
      </div>

      {/* Status */}
      <div className={cn("mt-2 font-medium", getColor(oee))}>{getStatus(oee)}</div>

      {/* Detail breakdown */}
      {showDetails && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className={cn("font-semibold", getColor(availability))}>
              {Math.round(availability)}%
            </div>
            <div className="text-xs text-muted-foreground">Availability</div>
          </div>
          <div>
            <div className={cn("font-semibold", getColor(performance))}>
              {Math.round(performance)}%
            </div>
            <div className="text-xs text-muted-foreground">Performance</div>
          </div>
          <div>
            <div className={cn("font-semibold", getColor(quality))}>
              {Math.round(quality)}%
            </div>
            <div className="text-xs text-muted-foreground">Quality</div>
          </div>
        </div>
      )}
    </div>
  );
}
