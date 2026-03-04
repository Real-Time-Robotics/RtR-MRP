'use client';

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// BUTTON COMPONENT
// Modern, accessible button with multiple variants and sizes
// =============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'link';
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show loading spinner */
  loading?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Icon to show on left side */
  leftIcon?: React.ReactNode;
  /** Icon to show on right side */
  rightIcon?: React.ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
  /** Icon-only button (square) */
  iconOnly?: boolean;
}

const buttonVariants = {
  primary: [
    'bg-primary-600 text-white',
    'hover:bg-primary-700',
    'focus:ring-primary-500',
    'shadow-sm hover:shadow-md',
    'active:bg-primary-800',
  ].join(' '),
  
  secondary: [
    'bg-white text-slate-700',
    'border border-slate-300',
    'hover:bg-slate-50 hover:border-slate-400',
    'focus:ring-slate-500',
    'active:bg-slate-100',
  ].join(' '),
  
  ghost: [
    'bg-transparent text-slate-600',
    'hover:bg-slate-100 hover:text-slate-900',
    'focus:ring-slate-500',
    'active:bg-slate-200',
  ].join(' '),
  
  danger: [
    'bg-danger-600 text-white',
    'hover:bg-danger-700',
    'focus:ring-danger-500',
    'shadow-sm',
    'active:bg-danger-800',
  ].join(' '),
  
  success: [
    'bg-success-600 text-white',
    'hover:bg-success-700',
    'focus:ring-success-500',
    'shadow-sm',
    'active:bg-success-800',
  ].join(' '),
  
  link: [
    'bg-transparent text-primary-600',
    'hover:text-primary-700 hover:underline',
    'focus:ring-primary-500',
    'p-0 h-auto',
  ].join(' '),
};

const buttonSizes = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-7 px-2.5 text-sm gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-9 px-4 text-base gap-2',
  xl: 'h-10 px-5 text-lg gap-2.5',
};

const iconOnlySizes = {
  xs: 'h-6 w-6',
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-9 w-9',
  xl: 'h-10 w-10',
};

const iconSizes = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          // Variant
          buttonVariants[variant],
          // Size
          iconOnly ? iconOnlySizes[size] : buttonSizes[size],
          // Full width
          fullWidth && 'w-full',
          // Custom class
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        )}

        {/* Left icon */}
        {!loading && leftIcon && (
          <span className={cn('flex-shrink-0', iconSizes[size])}>
            {leftIcon}
          </span>
        )}

        {/* Button text */}
        {!iconOnly && (
          <span className={loading && loadingText ? '' : loading ? 'sr-only' : ''}>
            {loading && loadingText ? loadingText : children}
          </span>
        )}

        {/* Right icon */}
        {!loading && rightIcon && (
          <span className={cn('flex-shrink-0', iconSizes[size])}>
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// =============================================================================
// ICON BUTTON COMPONENT
// Square button for icons only
// =============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'iconOnly'> {
  /** Icon to display */
  icon: React.ReactNode;
  /** Accessible label */
  'aria-label': string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        iconOnly
        size={size}
        className={className}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// =============================================================================
// BUTTON GROUP COMPONENT
// Group multiple buttons together
// =============================================================================

export interface ButtonGroupProps {
  children: React.ReactNode;
  /** Orientation of the group */
  orientation?: 'horizontal' | 'vertical';
  /** Attached style (no gaps, connected borders) */
  attached?: boolean;
  className?: string;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  attached = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        attached ? '' : 'gap-2',
        className
      )}
      role="group"
    >
      {attached ? (
        React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          
          const isFirst = index === 0;
          const isLast = index === React.Children.count(children) - 1;
          
          return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
            className: cn(
              (child as React.ReactElement<{ className?: string }>).props.className,
              orientation === 'horizontal' && !isFirst && '-ml-px',
              orientation === 'vertical' && !isFirst && '-mt-px',
              orientation === 'horizontal' && {
                'rounded-r-none': !isLast,
                'rounded-l-none': !isFirst,
              },
              orientation === 'vertical' && {
                'rounded-b-none': !isLast,
                'rounded-t-none': !isFirst,
              }
            ),
          });
        })
      ) : (
        children
      )}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

// =============================================================================
// EXPORTS
// =============================================================================

export { Button, IconButton, ButtonGroup };
export default Button;
