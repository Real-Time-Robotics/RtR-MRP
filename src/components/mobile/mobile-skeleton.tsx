// =============================================================================
// MOBILE SKELETON
// =============================================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function MobileSkeleton({ className, width, height }: {
  className?: string;
  width?: string | number;
  height?: string | number;
}) {
  return (
    <div
      className={cn('bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl', className)}
      style={{ width, height }}
    />
  );
}
