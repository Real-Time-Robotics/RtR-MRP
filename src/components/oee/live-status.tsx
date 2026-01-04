'use client';

import { cn } from '@/lib/utils';
import { Activity, Pause, AlertTriangle, Wrench } from 'lucide-react';

type EquipmentStatus = 'running' | 'idle' | 'warning' | 'down';

interface LiveStatusIndicatorProps {
  isLive?: boolean;
  lastUpdate?: Date;
  className?: string;
}

export function LiveStatusIndicator({
  isLive = true,
  lastUpdate,
  className,
}: LiveStatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            isLive ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
        {isLive && (
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      <span className={cn('text-sm font-medium', isLive ? 'text-green-600' : 'text-gray-500')}>
        {isLive ? 'LIVE' : 'OFFLINE'}
      </span>
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Updated {formatTimeAgo(lastUpdate)}
        </span>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

interface ShiftInfoProps {
  shiftName: string;
  startTime: string;
  endTime: string;
  progress: number;
  className?: string;
}

export function ShiftInfo({ shiftName, startTime, endTime, progress, className }: ShiftInfoProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{shiftName}</span>
        <span className="text-sm text-muted-foreground">
          {startTime} - {endTime}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {progress.toFixed(0)}% of shift completed
      </div>
    </div>
  );
}

interface EquipmentStatusSummaryProps {
  running: number;
  idle: number;
  warning: number;
  down: number;
  className?: string;
}

export function EquipmentStatusSummary({
  running,
  idle,
  warning,
  down,
  className,
}: EquipmentStatusSummaryProps) {
  const statuses: Array<{ status: EquipmentStatus; count: number; icon: typeof Activity; color: string; bgColor: string }> = [
    { status: 'running', count: running, icon: Activity, color: 'text-green-600', bgColor: 'bg-green-100' },
    { status: 'idle', count: idle, icon: Pause, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { status: 'warning', count: warning, icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { status: 'down', count: down, icon: Wrench, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className="text-sm text-muted-foreground">Equipment:</span>
      {statuses.map(({ status, count, icon: Icon, color, bgColor }) => (
        <div key={status} className="flex items-center gap-1.5">
          <div className={cn('p-1 rounded', bgColor)}>
            <Icon className={cn('w-3.5 h-3.5', color)} />
          </div>
          <span className={cn('font-medium', color)}>{count}</span>
        </div>
      ))}
    </div>
  );
}

interface AlertBadgesProps {
  critical: number;
  warning: number;
  className?: string;
}

export function AlertBadges({ critical, warning, className }: AlertBadgesProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-sm text-muted-foreground">Alerts:</span>
      {critical > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">
            {critical} Critical
          </span>
        </div>
      )}
      {warning > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <AlertTriangle className="w-3 h-3 text-yellow-600" />
          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
            {warning} Warning
          </span>
        </div>
      )}
      {critical === 0 && warning === 0 && (
        <span className="text-xs text-green-600">All systems normal</span>
      )}
    </div>
  );
}
