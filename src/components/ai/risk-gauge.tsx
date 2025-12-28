"use client";

interface RiskGaugeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
}

export function RiskGauge({ score, size = "md" }: RiskGaugeProps) {
  const sizes = {
    sm: { width: 80, height: 50, strokeWidth: 8, fontSize: "text-lg" },
    md: { width: 120, height: 70, strokeWidth: 10, fontSize: "text-2xl" },
    lg: { width: 160, height: 90, strokeWidth: 12, fontSize: "text-3xl" },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const getLabel = (score: number) => {
    if (score >= 80) return "Low Risk";
    if (score >= 60) return "Medium";
    if (score >= 40) return "High Risk";
    return "Critical";
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height}>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
          fill="none"
          stroke={getColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>

      <div className="text-center -mt-4">
        <span className={`${fontSize} font-bold`}>{score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <span className="text-sm font-medium" style={{ color: getColor(score) }}>
        {getLabel(score)}
      </span>
    </div>
  );
}
