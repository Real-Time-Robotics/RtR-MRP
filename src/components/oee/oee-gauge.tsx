'use client';

import { cn } from '@/lib/utils';

interface OEEGaugeProps {
  value: number;
  target?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showTarget?: boolean;
  className?: string;
}

export function OEEGauge({
  value,
  target = 85,
  size = 'md',
  label = 'OEE',
  showTarget = true,
  className,
}: OEEGaugeProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  const sizes = {
    sm: { width: 100, stroke: 8, fontSize: 'text-lg', labelSize: 'text-xs' },
    md: { width: 140, stroke: 10, fontSize: 'text-2xl', labelSize: 'text-sm' },
    lg: { width: 180, stroke: 12, fontSize: 'text-4xl', labelSize: 'text-base' },
  };

  const { width, stroke, fontSize, labelSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  const targetOffset = circumference - (target / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 85) return { stroke: '#22c55e', bg: 'bg-green-100', text: 'text-green-600' };
    if (val >= 70) return { stroke: '#30a46c', bg: 'bg-green-100', text: 'text-green-600' };
    if (val >= 50) return { stroke: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-600' };
    return { stroke: '#ef4444', bg: 'bg-red-100', text: 'text-red-600' };
  };

  const colors = getColor(safeValue);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
          viewBox={`0 0 ${width} ${width}`}
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />

          {/* Target indicator */}
          {showTarget && (
            <circle
              cx={width / 2}
              cy={width / 2}
              r={radius}
              fill="none"
              stroke="#d1d5db"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={targetOffset}
              strokeLinecap="round"
              className="opacity-50"
            />
          )}

          {/* Value arc */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', fontSize, colors.text)}>
            {safeValue.toFixed(1)}%
          </span>
          <span className={cn('text-muted-foreground', labelSize)}>{label}</span>
        </div>
      </div>

      {showTarget && (
        <div className="mt-2 text-xs text-muted-foreground">
          Target: {target}%
        </div>
      )}
    </div>
  );
}

interface OEEMiniGaugeProps {
  value: number;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

export function OEEMiniGauge({ value, label, color, className }: OEEMiniGaugeProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  const colors = {
    blue: { stroke: '#30a46c', text: 'text-green-600' },
    green: { stroke: '#22c55e', text: 'text-green-600' },
    purple: { stroke: '#a855f7', text: 'text-purple-600' },
    orange: { stroke: '#f97316', text: 'text-orange-600' },
  };

  const width = 80;
  const stroke = 6;
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
          viewBox={`0 0 ${width} ${width}`}
        >
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={colors[color].stroke}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold', colors[color].text)}>
            {safeValue.toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="mt-1 text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
