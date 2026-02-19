// =============================================================================
// MOBILE LIST ITEM
// =============================================================================

'use client';

import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from './mobile-tokens';

interface MobileListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MobileListItem({
  title,
  subtitle,
  meta,
  leftContent,
  rightContent,
  onClick,
  chevron = false,
  disabled = false,
  className,
}: MobileListItemProps) {
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
        'flex items-center gap-3 px-4 py-3.5 min-h-[56px]',
        'bg-white dark:bg-gray-800',
        'border-b border-gray-100 dark:border-gray-700/50 last:border-b-0',
        onClick && !disabled && 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {leftContent && <div className="flex-shrink-0">{leftContent}</div>}

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      {meta && <div className="flex-shrink-0 text-sm text-gray-400">{meta}</div>}
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      {chevron && onClick && (
        <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      )}
    </div>
  );
}
