// =============================================================================
// MOBILE CARD
// =============================================================================

'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { haptic } from './mobile-tokens';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outlined' | 'elevated' | 'danger' | 'success' | 'warning';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function MobileCard({
  children,
  className,
  onClick,
  disabled = false,
  variant = 'default',
  padding = 'md',
}: MobileCardProps) {
  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
    danger: 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50',
    success: 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={() => {
        if (onClick && !disabled) {
          haptic.selection();
          onClick();
        }
      }}
      className={cn(
        'rounded-2xl transition-all duration-150 w-full overflow-hidden',
        variants[variant],
        paddings[padding],
        onClick && !disabled && 'cursor-pointer active:scale-[0.98] active:opacity-90',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
}
