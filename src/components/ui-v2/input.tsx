'use client';

import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, Search, X, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// INPUT COMPONENT
// Modern, accessible input with multiple variants
// =============================================================================

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Show error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Show success state */
  success?: boolean;
  /** Helper text below input */
  helperText?: string;
  /** Icon to show on left */
  leftIcon?: React.ReactNode;
  /** Icon to show on right */
  rightIcon?: React.ReactNode;
  /** Allow clearing the input */
  clearable?: boolean;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Full width */
  fullWidth?: boolean;
  /** Label for the input */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
}

const inputSizes = {
  sm: 'h-7 px-2.5 text-sm',
  md: 'h-8 px-3 text-sm',
  lg: 'h-9 px-3.5 text-base',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = 'md',
      error = false,
      errorMessage,
      success = false,
      helperText,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      fullWidth = false,
      label,
      required = false,
      disabled,
      type,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const hasValue = value !== undefined && value !== '';

    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none',
                iconSizes[size]
              )}
            >
              {leftIcon}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            value={value}
            className={cn(
              // Base styles
              'w-full bg-white border rounded-lg',
              'text-slate-900 placeholder:text-slate-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500',
              // Size
              inputSizes[size],
              // Left icon padding
              leftIcon && 'pl-10',
              // Right icon/clear button padding
              (rightIcon || clearable || isPassword || error || success) && 'pr-10',
              // Multiple right elements
              ((clearable && hasValue) || isPassword) && (error || success) && 'pr-16',
              // States
              error
                ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
                : success
                ? 'border-success-500 focus:ring-success-500 focus:border-success-500'
                : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500',
              // Custom class
              className
            )}
            {...props}
          />

          {/* Right icons container */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Clear button */}
            {clearable && hasValue && !disabled && (
              <button
                type="button"
                onClick={onClear}
                className={cn(
                  'text-slate-400 hover:text-slate-600 transition-colors',
                  iconSizes[size]
                )}
                tabIndex={-1}
                aria-label="Xóa"
              >
                <X className="h-full w-full" />
              </button>
            )}

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'text-slate-400 hover:text-slate-600 transition-colors',
                  iconSizes[size]
                )}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-full w-full" />
                ) : (
                  <Eye className="h-full w-full" />
                )}
              </button>
            )}

            {/* Status icon */}
            {error && (
              <AlertCircle className={cn('text-danger-500', iconSizes[size])} />
            )}
            {success && !error && (
              <CheckCircle className={cn('text-success-500', iconSizes[size])} />
            )}

            {/* Custom right icon */}
            {rightIcon && !error && !success && (
              <span className={cn('text-slate-400', iconSizes[size])}>
                {rightIcon}
              </span>
            )}
          </div>
        </div>

        {/* Helper/Error text */}
        {(errorMessage || helperText) && (
          <p
            className={cn(
              'text-xs',
              error ? 'text-danger-600' : 'text-slate-500'
            )}
          >
            {error ? errorMessage : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// =============================================================================
// SEARCH INPUT COMPONENT
// Specialized input for search functionality
// =============================================================================

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  /** Callback when search is submitted */
  onSearch?: (value: string) => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(e.currentTarget.value);
      }
      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search />}
        placeholder="Search..."
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// =============================================================================
// TEXTAREA COMPONENT
// Multi-line text input
// =============================================================================

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Show error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Helper text */
  helperText?: string;
  /** Label */
  label?: string;
  /** Required field */
  required?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Auto-resize based on content */
  autoResize?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error = false,
      errorMessage,
      helperText,
      label,
      required = false,
      fullWidth = false,
      autoResize = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
      }
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          onInput={handleInput}
          className={cn(
            'w-full px-3.5 py-2.5 bg-white border rounded-lg',
            'text-sm text-slate-900 placeholder:text-slate-400',
            'transition-all duration-200 resize-y min-h-[100px]',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-slate-100 disabled:cursor-not-allowed',
            error
              ? 'border-danger-500 focus:ring-danger-500'
              : 'border-slate-300 focus:ring-primary-500',
            autoResize && 'resize-none overflow-hidden',
            className
          )}
          {...props}
        />

        {(errorMessage || helperText) && (
          <p className={cn('text-xs', error ? 'text-danger-600' : 'text-slate-500')}>
            {error ? errorMessage : helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// =============================================================================
// EXPORTS
// =============================================================================

export { Input, SearchInput, Textarea };
export default Input;
