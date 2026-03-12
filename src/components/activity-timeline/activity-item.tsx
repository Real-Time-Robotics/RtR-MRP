'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  FileEdit, CheckCircle, Eye, Rocket, Package,
  ShoppingCart, Wrench, BarChart3, AlertTriangle,
  ExternalLink, Printer, Truck, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TimelineActivity } from '@/hooks/use-activity-timeline';

interface ActivityItemProps {
  activity: TimelineActivity;
  isLast?: boolean;
}

type LucideIcon = React.ComponentType<{ className?: string }>;

const ACTION_ICONS: Record<string, LucideIcon> = {
  PO_STATUS_CHANGE: FileEdit,
  PO_PRINT_PDF: Printer,
  PO_CREATED: Rocket,
  SO_SHIP: Truck,
  SO_DELIVERY_CONFIRMED: CheckCircle,
  SO_CREATED: Rocket,
  WO_STATUS_CHANGE: FileEdit,
  WO_ALLOCATE: Wrench,
  WO_COMPLETED: CheckCircle,
  MRP_APPROVE: CheckCircle,
  MRP_REJECT: XCircle,
  MRP_CREATE_PO: Rocket,
  VIEW: Eye,
};

const ENTITY_ICONS: Record<string, LucideIcon> = {
  PO: Package,
  SO: ShoppingCart,
  MRP_RUN: BarChart3,
  WORK_ORDER: Wrench,
};

const ACTION_COLORS: Record<string, string> = {
  PO_CREATED: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
  SO_CREATED: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
  MRP_CREATE_PO: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30',
  MRP_APPROVE: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  SO_DELIVERY_CONFIRMED: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  WO_COMPLETED: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
  MRP_REJECT: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30',
  PO_STATUS_CHANGE: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30',
  WO_STATUS_CHANGE: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30',
  SO_SHIP: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30',
  WO_ALLOCATE: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30',
  PO_PRINT_PDF: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800',
};

const DEFAULT_COLOR = 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30';

export function ActivityItem({ activity, isLast = false }: ActivityItemProps) {
  const Icon = ACTION_ICONS[activity.action] || ENTITY_ICONS[activity.entityType] || Eye;
  const colorClass = ACTION_COLORS[activity.action] || DEFAULT_COLOR;

  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
    addSuffix: false,
    locale: vi,
  });

  const timeFormatted = format(new Date(activity.timestamp), 'HH:mm', { locale: vi });

  return (
    <div className="flex gap-4 py-3 group">
      {/* Time */}
      <div className="w-14 text-right shrink-0">
        <span className="text-sm font-medium text-muted-foreground">{timeFormatted}</span>
      </div>

      {/* Timeline line + icon */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{activity.entityNumber}</span>
          <span className="text-xs text-muted-foreground">{timeAgo} truoc</span>
        </div>

        <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>

        {/* Metadata note */}
        {activity.metadata && (activity.metadata as Record<string, unknown>).note ? (
          <div className="text-xs text-muted-foreground mb-2">
            <span>{String((activity.metadata as Record<string, unknown>).note)}</span>
          </div>
        ) : null}

        {/* Action link */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          asChild
        >
          <Link href={activity.entityUrl}>
            Mo {activity.entityType === 'PO' ? 'PO' : activity.entityType === 'SO' ? 'SO' : activity.entityType === 'WORK_ORDER' ? 'WO' : activity.entityType}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
