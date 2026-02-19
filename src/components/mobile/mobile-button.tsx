// =============================================================================
// MOBILE BUTTON
// =============================================================================

'use client';

import React, { forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from './mobile-tokens';

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const MobileButton = forwardRef<HTMLButtonElement, MobileButtonProps>(({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  onClick,
  ...props
}, ref) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-lg shadow-blue-600/25',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200',
    outline: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25',
  };

  const sizes = {
    sm: 'h-10 min-h-[40px] px-4 text-sm gap-1.5 rounded-xl',
    md: 'h-12 min-h-[48px] px-5 text-base gap-2 rounded-xl',
    lg: 'h-14 min-h-[56px] px-6 text-lg gap-2 rounded-2xl',
    xl: 'h-16 min-h-[64px] px-8 text-xl gap-3 rounded-2xl',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onClick={(e) => {
        if (!disabled && !loading) {
          haptic.light();
          onClick?.(e);
        }
      }}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          <span className="truncate">{children}</span>
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

MobileButton.displayName = 'MobileButton';
