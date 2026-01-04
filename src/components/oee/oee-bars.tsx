'use client';

import { cn } from '@/lib/utils';

interface OEEBarsProps {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  showLabels?: boolean;
  className?: string;
}

export function OEEBars({
  availability,
  performance,
  quality,
  oee,
  showLabels = true,
  className,
}: OEEBarsProps) {
  const bars = [
    { label: 'Availability', short: 'A', value: availability, color: 'bg-blue-500' },
    { label: 'Performance', short: 'P', value: performance, color: 'bg-green-500' },
    { label: 'Quality', short: 'Q', value: quality, color: 'bg-purple-500' },
    { label: 'OEE', short: 'OEE', value: oee, color: getOEEColor(oee) },
  ];

  function getOEEColor(val: number): string {
    if (val >= 85) return 'bg-green-600';
    if (val >= 70) return 'bg-blue-600';
    if (val >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  return (
    <div className={cn('space-y-3', className)}>
      {bars.map((bar) => (
        <div key={bar.short} className="space-y-1">
          {showLabels && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{bar.label}</span>
              <span className="font-medium">{bar.value.toFixed(1)}%</span>
            </div>
          )}
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', bar.color)}
              style={{ width: `${Math.min(100, bar.value)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface OEEHorizontalBarsProps {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  className?: string;
}

export function OEEHorizontalBars({
  availability,
  performance,
  quality,
  oee,
  className,
}: OEEHorizontalBarsProps) {
  const getStatusColor = (val: number) => {
    if (val >= 90) return 'text-green-600';
    if (val >= 80) return 'text-blue-600';
    if (val >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <div className="flex flex-col items-center">
        <span className={cn('text-2xl font-bold', getStatusColor(availability))}>
          {availability.toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground">Availability</span>
      </div>
      <span className="text-2xl text-muted-foreground">×</span>
      <div className="flex flex-col items-center">
        <span className={cn('text-2xl font-bold', getStatusColor(performance))}>
          {performance.toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground">Performance</span>
      </div>
      <span className="text-2xl text-muted-foreground">×</span>
      <div className="flex flex-col items-center">
        <span className={cn('text-2xl font-bold', getStatusColor(quality))}>
          {quality.toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground">Quality</span>
      </div>
      <span className="text-2xl text-muted-foreground">=</span>
      <div className="flex flex-col items-center">
        <span className={cn('text-3xl font-bold', getStatusColor(oee))}>
          {oee.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground font-medium">OEE</span>
      </div>
    </div>
  );
}
