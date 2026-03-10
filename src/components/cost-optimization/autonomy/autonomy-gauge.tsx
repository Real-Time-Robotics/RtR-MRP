"use client";

import { Card, CardContent } from "@/components/ui/card";

interface AutonomyGaugeProps {
  percent: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

export function AutonomyGauge({ percent, label, size = "md" }: AutonomyGaugeProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  const sizes = {
    sm: { r: 40, stroke: 6, text: "text-lg", sub: "text-[10px]" },
    md: { r: 55, stroke: 8, text: "text-2xl", sub: "text-xs" },
    lg: { r: 70, stroke: 10, text: "text-3xl", sub: "text-sm" },
  };

  const { r, stroke, text, sub } = sizes[size];
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - clampedPercent / 100);

  const color =
    clampedPercent >= 80
      ? "stroke-green-500"
      : clampedPercent >= 50
      ? "stroke-yellow-500"
      : "stroke-red-500";

  const svgSize = (r + stroke) * 2;

  return (
    <Card>
      <CardContent className="py-4 flex flex-col items-center">
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          {/* Progress arc */}
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={`${color} transition-all duration-700`}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="text-center -mt-2">
          <div className={`${text} font-bold`}>{clampedPercent.toFixed(1)}%</div>
          <div className={`${sub} text-muted-foreground`}>{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
