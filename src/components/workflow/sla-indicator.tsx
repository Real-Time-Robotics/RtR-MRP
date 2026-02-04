'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';

export type SLAStatus = 'pending' | 'warning' | 'overdue' | 'completed';

export interface SLAIndicatorProps {
  dueDate: Date | string | null;
  status?: SLAStatus;
  showCountdown?: boolean;
  completedAt?: Date | string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function calculateSLAStatus(dueDate: Date | null, completedAt: Date | null): SLAStatus {
  if (completedAt) return 'completed';
  if (!dueDate) return 'pending';

  const now = new Date();
  const hoursRemaining = differenceInHours(dueDate, now);

  if (hoursRemaining < 0) return 'overdue';
  if (hoursRemaining < 4) return 'warning';
  return 'pending';
}

function formatCountdown(dueDate: Date): string {
  const now = new Date();
  const hoursRemaining = differenceInHours(dueDate, now);
  const minutesRemaining = differenceInMinutes(dueDate, now) % 60;

  if (hoursRemaining < 0) {
    const hoursOverdue = Math.abs(hoursRemaining);
    const minutesOverdue = Math.abs(minutesRemaining);
    if (hoursOverdue > 24) {
      return `Quá hạn ${Math.floor(hoursOverdue / 24)}d ${hoursOverdue % 24}h`;
    }
    return `Quá hạn ${hoursOverdue}h ${minutesOverdue}m`;
  }

  if (hoursRemaining > 24) {
    return `Còn ${Math.floor(hoursRemaining / 24)}d ${hoursRemaining % 24}h`;
  }

  return `Còn ${hoursRemaining}h ${minutesRemaining}m`;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    badgeVariant: 'outline' as const,
    borderColor: 'border-green-500',
    label: 'Đúng hạn',
  },
  warning: {
    icon: Timer,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    badgeVariant: 'outline' as const,
    borderColor: 'border-amber-500',
    label: 'Sắp đến hạn',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    badgeVariant: 'destructive' as const,
    borderColor: 'border-red-500',
    label: 'Quá hạn',
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    badgeVariant: 'secondary' as const,
    borderColor: 'border-gray-400',
    label: 'Hoàn thành',
  },
};

const sizeConfig = {
  sm: {
    badge: 'text-[10px] px-1.5 py-0.5',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'text-xs px-2 py-1',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    badge: 'text-sm px-3 py-1.5',
    icon: 'w-4 h-4',
  },
};

export function SLAIndicator({
  dueDate,
  status: providedStatus,
  showCountdown = true,
  completedAt,
  size = 'md',
  className,
}: SLAIndicatorProps) {
  const [countdown, setCountdown] = useState<string>('');
  const [calculatedStatus, setCalculatedStatus] = useState<SLAStatus>('pending');

  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const parsedCompletedAt = completedAt ? new Date(completedAt) : null;

  useEffect(() => {
    const status = providedStatus || calculateSLAStatus(parsedDueDate, parsedCompletedAt);
    setCalculatedStatus(status);

    if (parsedDueDate && status !== 'completed') {
      setCountdown(formatCountdown(parsedDueDate));

      // Update countdown every minute
      const interval = setInterval(() => {
        setCountdown(formatCountdown(parsedDueDate));
        setCalculatedStatus(calculateSLAStatus(parsedDueDate, parsedCompletedAt));
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [dueDate, providedStatus, completedAt, parsedDueDate, parsedCompletedAt]);

  const config = statusConfig[calculatedStatus];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (!parsedDueDate && calculatedStatus !== 'completed') {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={config.badgeVariant}
          className={cn(
            sizes.badge,
            config.color,
            calculatedStatus === 'warning' && 'animate-pulse',
            calculatedStatus === 'overdue' && 'animate-pulse',
            className
          )}
        >
          <Icon className={cn(sizes.icon, 'mr-1')} />
          {showCountdown && countdown ? countdown : config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium">{config.label}</p>
          {parsedDueDate && (
            <p className="text-muted-foreground">
              Hạn: {formatDistanceToNow(parsedDueDate, { addSuffix: true, locale: vi })}
            </p>
          )}
          {parsedCompletedAt && (
            <p className="text-muted-foreground">
              Hoàn thành: {formatDistanceToNow(parsedCompletedAt, { addSuffix: true, locale: vi })}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Compact version for lists
export function SLABadge({
  dueDate,
  completedAt,
  className,
}: {
  dueDate: Date | string | null;
  completedAt?: Date | string | null;
  className?: string;
}) {
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const parsedCompletedAt = completedAt ? new Date(completedAt) : null;
  const status = calculateSLAStatus(parsedDueDate, parsedCompletedAt);

  if (!parsedDueDate && status !== 'completed') return null;

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        status === 'pending' && 'text-green-600',
        status === 'warning' && 'text-amber-600 animate-pulse',
        status === 'overdue' && 'text-red-600 animate-pulse',
        status === 'completed' && 'text-gray-500',
        className
      )}
    >
      {status === 'overdue' && <AlertTriangle className="w-3 h-3" />}
      {status === 'warning' && <Timer className="w-3 h-3" />}
      {parsedDueDate && status !== 'completed' && formatCountdown(parsedDueDate)}
    </span>
  );
}

// Timeline dot with SLA status
export function SLATimelineDot({
  dueDate,
  completedAt,
  className,
}: {
  dueDate: Date | string | null;
  completedAt?: Date | string | null;
  className?: string;
}) {
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  const parsedCompletedAt = completedAt ? new Date(completedAt) : null;
  const status = calculateSLAStatus(parsedDueDate, parsedCompletedAt);

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            config.color,
            (status === 'warning' || status === 'overdue') && 'animate-pulse',
            className
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
        {parsedDueDate && status !== 'completed' && (
          <p className="text-xs text-muted-foreground">
            {formatCountdown(parsedDueDate)}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default SLAIndicator;
