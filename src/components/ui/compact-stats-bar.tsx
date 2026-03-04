'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CompactStat {
  label: string;
  value: string | number;
  color?: string;
}

interface CompactStatsBarProps {
  stats: CompactStat[];
  className?: string;
}

export function CompactStatsBar({ stats, className }: CompactStatsBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-3 py-1.5 bg-muted/50 rounded-md text-sm shrink-0',
        className
      )}
    >
      {stats.map((stat, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-muted-foreground/40">|</span>
          )}
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={cn('font-mono font-semibold', stat.color)}>
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
