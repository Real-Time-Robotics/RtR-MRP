'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { DataFreshnessBadge } from './data-freshness-badge';

/**
 * LivePanel — Panel wrapper with World Monitor-style header:
 * Title + icon + data freshness badge + optional action.
 *
 * Replaces plain div-with-header patterns across dashboard panels.
 */
export function LivePanel({
  title,
  icon,
  lastUpdated,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  icon?: React.ReactNode;
  lastUpdated?: Date | null;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn('bg-white dark:bg-gunmetal border border-gray-200 dark:border-mrp-border', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border">
        <h2 className="text-[11px] font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
          {icon}
          {title}
          {lastUpdated !== undefined && (
            <DataFreshnessBadge lastUpdated={lastUpdated} />
          )}
        </h2>
        {action}
      </div>

      {/* Content */}
      <div className={cn('p-2', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
