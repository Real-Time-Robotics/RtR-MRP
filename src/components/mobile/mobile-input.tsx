// =============================================================================
// MOBILE INPUT
// =============================================================================

'use client';

import React, { forwardRef, ReactNode } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from './mobile-tokens';

interface MobileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  onClear?: () => void;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(({
  className,
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  inputSize = 'md',
  onClear,
  value,
  ...props
}, ref) => {
  const sizes = {
    sm: 'h-10 min-h-[40px] text-sm',
    md: 'h-12 min-h-[48px] text-base',
    lg: 'h-14 min-h-[56px] text-lg',
  };

  const showClear = onClear && value && String(value).length > 0;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          value={value}
          className={cn(
            'w-full rounded-xl border transition-all duration-150',
            'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-800',
            error
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-200 dark:border-gray-700 focus:ring-blue-500/20 focus:border-blue-500',
            sizes[inputSize],
            leftIcon ? 'pl-11' : 'pl-4',
            (rightIcon || showClear) ? 'pr-11' : 'pr-4',
            className
          )}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onClear?.();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {rightIcon && !showClear && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

MobileInput.displayName = 'MobileInput';
