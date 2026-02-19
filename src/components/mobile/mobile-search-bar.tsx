// =============================================================================
// MOBILE SEARCH BAR
// =============================================================================

'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from './mobile-tokens';

interface MobileSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = 'Tim kiem...',
  onSubmit,
  autoFocus = false,
  className,
}: MobileSearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full h-12 min-h-[48px] pl-11 pr-4 rounded-xl',
          'bg-gray-100 dark:bg-gray-800 border-0',
          'text-gray-900 dark:text-white placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-700',
          'transition-all duration-150'
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            haptic.light();
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
