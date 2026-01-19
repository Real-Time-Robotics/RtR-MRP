'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface CapacityBarProps {
  workCenterName: string;
  utilization: number;
  scheduledHours: number;
  availableHours: number;
  previousUtilization?: number;
  className?: string;
}

// =============================================================================
// CAPACITY BAR COMPONENT
// =============================================================================

export function CapacityBar({
  workCenterName,
  utilization,
  scheduledHours,
  availableHours,
  previousUtilization,
  className,
}: CapacityBarProps) {
  const getUtilizationColor = (util: number): string => {
    if (util >= 100) return 'bg-red-500';
    if (util >= 90) return 'bg-orange-500';
    if (util >= 70) return 'bg-yellow-500';
    if (util >= 50) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getUtilizationLabel = (util: number): string => {
    if (util >= 100) return 'Quá tải';
    if (util >= 90) return 'Gần đầy';
    if (util >= 70) return 'Cao';
    if (util >= 50) return 'Vừa phải';
    return 'Thấp';
  };

  const getTrend = () => {
    if (previousUtilization === undefined) return null;
    const diff = utilization - previousUtilization;
    if (Math.abs(diff) < 1) return { icon: Minus, label: 'Không đổi', color: 'text-gray-500' };
    if (diff > 0) return { icon: TrendingUp, label: `+${diff.toFixed(0)}%`, color: 'text-red-500' };
    return { icon: TrendingDown, label: `${diff.toFixed(0)}%`, color: 'text-green-500' };
  };

  const trend = getTrend();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-3', className)}>
            <div className="flex-shrink-0 w-24 text-sm font-medium truncate">
              {workCenterName}
            </div>

            <div className="flex-1">
              <div className="relative h-6 bg-gray-100 rounded-md overflow-hidden">
                {/* Base bar */}
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-500',
                    getUtilizationColor(utilization)
                  )}
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />

                {/* Overflow indicator */}
                {utilization > 100 && (
                  <div
                    className="absolute inset-y-0 right-0 bg-red-600 opacity-75"
                    style={{ width: `${Math.min(utilization - 100, 20)}%` }}
                  />
                )}

                {/* Label overlay */}
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      utilization > 50 ? 'text-white' : 'text-gray-700'
                    )}
                  >
                    {utilization.toFixed(0)}%
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      utilization > 70 ? 'text-white/80' : 'text-gray-500'
                    )}
                  >
                    {getUtilizationLabel(utilization)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trend indicator */}
            {trend && (
              <div className={cn('flex items-center gap-1 text-xs', trend.color)}>
                <trend.icon className="h-3 w-3" />
                <span>{trend.label}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{workCenterName}</p>
            <div className="text-sm text-gray-500">
              <p>Đã lên lịch: {scheduledHours.toLocaleString()} giờ</p>
              <p>Công suất: {availableHours.toLocaleString()} giờ</p>
              <p>Hiệu suất: {utilization.toFixed(1)}%</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// CAPACITY OVERVIEW COMPONENT
// =============================================================================

export interface CapacityOverviewProps {
  workCenters: Array<{
    id: string;
    name: string;
    utilization: number;
    scheduledHours: number;
    availableHours: number;
    previousUtilization?: number;
  }>;
  className?: string;
}

export function CapacityOverview({ workCenters, className }: CapacityOverviewProps) {
  const avgUtilization =
    workCenters.length > 0
      ? workCenters.reduce((sum, wc) => sum + wc.utilization, 0) / workCenters.length
      : 0;

  const overloaded = workCenters.filter((wc) => wc.utilization >= 100);
  const highUtil = workCenters.filter((wc) => wc.utilization >= 90 && wc.utilization < 100);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold">{avgUtilization.toFixed(0)}%</div>
          <div className="text-xs text-gray-500">Hiệu suất TB</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{overloaded.length}</div>
          <div className="text-xs text-gray-500">Quá tải</div>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{highUtil.length}</div>
          <div className="text-xs text-gray-500">Gần đầy</div>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        {workCenters.map((wc) => (
          <CapacityBar
            key={wc.id}
            workCenterName={wc.name}
            utilization={wc.utilization}
            scheduledHours={wc.scheduledHours}
            availableHours={wc.availableHours}
            previousUtilization={wc.previousUtilization}
          />
        ))}
      </div>
    </div>
  );
}

export default CapacityBar;
