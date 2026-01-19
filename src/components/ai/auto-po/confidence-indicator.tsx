'use client';

// =============================================================================
// CONFIDENCE INDICATOR - Visual gauge for AI confidence score
// Color coded: green (>80), yellow (60-80), red (<60)
// =============================================================================

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CircleCheck, CircleAlert, CircleX, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConfidenceBreakdown {
  demandScore?: number;
  supplierScore?: number;
  priceScore?: number;
  historyScore?: number;
  riskScore?: number;
}

interface ConfidenceIndicatorProps {
  score: number; // 0-1 or 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  breakdown?: ConfidenceBreakdown;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function ConfidenceIndicator({
  score,
  size = 'md',
  showLabel = true,
  showIcon = true,
  breakdown,
  trend,
  className,
}: ConfidenceIndicatorProps) {
  // Normalize score to 0-100
  const normalizedScore = score <= 1 ? Math.round(score * 100) : Math.round(score);

  // Determine color and status
  const getStatus = () => {
    if (normalizedScore >= 80) return { color: 'green', label: 'Cao', labelEn: 'High' };
    if (normalizedScore >= 60) return { color: 'yellow', label: 'Trung bình', labelEn: 'Medium' };
    return { color: 'red', label: 'Thấp', labelEn: 'Low' };
  };

  const status = getStatus();

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'h-6 w-16',
      bar: 'h-1.5',
      text: 'text-xs',
      icon: 'h-3 w-3',
    },
    md: {
      container: 'h-8 w-24',
      bar: 'h-2',
      text: 'text-sm',
      icon: 'h-4 w-4',
    },
    lg: {
      container: 'h-10 w-32',
      bar: 'h-2.5',
      text: 'text-base',
      icon: 'h-5 w-5',
    },
  };

  const classes = sizeClasses[size];

  // Color classes
  const colorClasses = {
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      bar: 'bg-green-500',
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-600',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      bar: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: 'text-yellow-600',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      bar: 'bg-red-500',
      text: 'text-red-700 dark:text-red-400',
      icon: 'text-red-600',
    },
  };

  const colors = colorClasses[status.color as keyof typeof colorClasses];

  const Icon = status.color === 'green' ? CircleCheck : status.color === 'yellow' ? CircleAlert : CircleX;
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const indicator = (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && <Icon className={cn(classes.icon, colors.icon)} />}
      <div className="flex flex-col gap-1">
        {showLabel && (
          <div className="flex items-center gap-1">
            <span className={cn(classes.text, 'font-medium', colors.text)}>
              {normalizedScore}%
            </span>
            {trend && (
              <TrendIcon className={cn('h-3 w-3', trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400')} />
            )}
          </div>
        )}
        <div className={cn('w-full rounded-full', colors.bg, classes.bar === 'h-1.5' ? 'h-1.5' : classes.bar === 'h-2' ? 'h-2' : 'h-2.5')}>
          <div
            className={cn('h-full rounded-full transition-all duration-300', colors.bar)}
            style={{ width: `${normalizedScore}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (!breakdown) return indicator;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Độ tin cậy</span>
              <span className={cn('font-bold', colors.text)}>{normalizedScore}% - {status.label}</span>
            </div>
            <div className="space-y-1.5 text-sm">
              {breakdown.demandScore !== undefined && (
                <BreakdownItem label="Nhu cầu" value={breakdown.demandScore} />
              )}
              {breakdown.supplierScore !== undefined && (
                <BreakdownItem label="Nhà cung cấp" value={breakdown.supplierScore} />
              )}
              {breakdown.priceScore !== undefined && (
                <BreakdownItem label="Giá cả" value={breakdown.priceScore} />
              )}
              {breakdown.historyScore !== undefined && (
                <BreakdownItem label="Lịch sử" value={breakdown.historyScore} />
              )}
              {breakdown.riskScore !== undefined && (
                <BreakdownItem label="Rủi ro" value={breakdown.riskScore} />
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  const normalizedValue = value <= 1 ? Math.round(value * 100) : Math.round(value);
  const color = normalizedValue >= 80 ? 'text-green-600' : normalizedValue >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1 bg-muted rounded-full">
          <div
            className={cn('h-full rounded-full', normalizedValue >= 80 ? 'bg-green-500' : normalizedValue >= 60 ? 'bg-yellow-500' : 'bg-red-500')}
            style={{ width: `${normalizedValue}%` }}
          />
        </div>
        <span className={cn('font-medium w-8 text-right', color)}>{normalizedValue}%</span>
      </div>
    </div>
  );
}

export default ConfidenceIndicator;
