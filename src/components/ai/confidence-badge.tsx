"use client";

import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

interface ConfidenceBadgeProps {
  confidence: number; // 0-1
  showLabel?: boolean;
}

export function ConfidenceBadge({
  confidence,
  showLabel = true,
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);

  const color =
    percentage >= 85
      ? "bg-green-100 text-green-800"
      : percentage >= 70
        ? "bg-blue-100 text-blue-800"
        : percentage >= 50
          ? "bg-amber-100 text-amber-800"
          : "bg-gray-100 text-gray-800";

  return (
    <Badge className={`${color} gap-1`}>
      <Brain className="h-3 w-3" />
      {showLabel && "AI "}
      {percentage}%
    </Badge>
  );
}
