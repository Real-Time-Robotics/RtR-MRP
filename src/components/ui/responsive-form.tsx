'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// FORM CONTAINER
// =============================================================================

export interface ResponsiveFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveForm({
  children,
  className,
  ...props
}: ResponsiveFormProps) {
  return (
    <form className={cn('space-y-4 sm:space-y-6', className)} {...props}>
      {children}
    </form>
  );
}

// =============================================================================
// FORM SECTION
// =============================================================================

export interface FormSectionProps {
  title?: string;
  titleVi?: string;
  description?: string;
  descriptionVi?: string;
  language?: 'en' | 'vi';
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  titleVi,
  description,
  descriptionVi,
  language = 'vi',
  children,
  className,
}: FormSectionProps) {
  const displayTitle = language === 'vi' && titleVi ? titleVi : title;
  const displayDescription =
    language === 'vi' && descriptionVi ? descriptionVi : description;

  return (
    <div className={cn('space-y-4', className)}>
      {(displayTitle || displayDescription) && (
        <div className="pb-2 border-b border-gray-200 dark:border-mrp-border">
          {displayTitle && (
            <h3 className="text-base font-semibold text-gray-900 dark:text-mrp-text-primary">
              {displayTitle}
            </h3>
          )}
          {displayDescription && (
            <p className="text-sm text-gray-500 dark:text-mrp-text-secondary mt-1">
              {displayDescription}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// =============================================================================
// FORM ROW - Grid for multiple fields
// =============================================================================

export interface FormRowProps {
  children: React.ReactNode;
  // Number of columns on desktop
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, cols = 2, className }: FormRowProps) {
  const colClasses = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        colClasses[cols],
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// FORM FIELD
// =============================================================================

export interface FormFieldProps {
  label?: string;
  labelVi?: string;
  language?: 'en' | 'vi';
  required?: boolean;
  error?: string;
  errorVi?: string;
  hint?: string;
  hintVi?: string;
  children: React.ReactNode;
  className?: string;
  // Span full width in a grid
  fullWidth?: boolean;
}

export function FormField({
  label,
  labelVi,
  language = 'vi',
  required = false,
  error,
  errorVi,
  hint,
  hintVi,
  children,
  className,
  fullWidth = false,
}: FormFieldProps) {
  const displayLabel = language === 'vi' && labelVi ? labelVi : label;
  const displayError = language === 'vi' && errorVi ? errorVi : error;
  const displayHint = language === 'vi' && hintVi ? hintVi : hint;

  return (
    <div
      className={cn(
        'space-y-1.5',
        fullWidth && 'sm:col-span-full',
        className
      )}
    >
      {displayLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-mrp-text-secondary">
          {displayLabel}
          {required && (
            <span className="text-red-500 dark:text-urgent-red ml-0.5">*</span>
          )}
        </label>
      )}
      {children}
      {displayHint && !displayError && (
        <p className="text-xs text-gray-500 dark:text-mrp-text-muted">
          {displayHint}
        </p>
      )}
      {displayError && (
        <p className="text-xs text-red-600 dark:text-urgent-red">
          {displayError}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// FORM INPUT
// =============================================================================

export interface FormInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: 'sm' | 'md' | 'lg';
  hasError?: boolean;
}

export function FormInput({
  inputSize = 'md',
  hasError = false,
  className,
  ...props
}: FormInputProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  return (
    <input
      className={cn(
        'w-full rounded-lg border transition-colors',
        'bg-white dark:bg-steel-dark',
        'text-gray-900 dark:text-mrp-text-primary',
        'placeholder:text-gray-400 dark:placeholder:text-mrp-text-muted',
        // Focus
        'focus:outline-none focus:ring-2 focus:ring-info-cyan/50 focus:border-info-cyan',
        // Border
        hasError
          ? 'border-red-500 dark:border-urgent-red'
          : 'border-gray-300 dark:border-mrp-border',
        // Mobile touch target
        'min-h-[44px] sm:min-h-0',
        sizeClasses[inputSize],
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// FORM TEXTAREA
// =============================================================================

export interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function FormTextarea({
  hasError = false,
  className,
  ...props
}: FormTextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors',
        'bg-white dark:bg-steel-dark',
        'text-gray-900 dark:text-mrp-text-primary',
        'placeholder:text-gray-400 dark:placeholder:text-mrp-text-muted',
        // Focus
        'focus:outline-none focus:ring-2 focus:ring-info-cyan/50 focus:border-info-cyan',
        // Border
        hasError
          ? 'border-red-500 dark:border-urgent-red'
          : 'border-gray-300 dark:border-mrp-border',
        'min-h-[100px] resize-y',
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// FORM SELECT
// =============================================================================

export interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  options: { value: string; label: string; labelVi?: string }[];
  language?: 'en' | 'vi';
  placeholder?: string;
  placeholderVi?: string;
}

export function FormSelect({
  hasError = false,
  options,
  language = 'vi',
  placeholder,
  placeholderVi,
  className,
  ...props
}: FormSelectProps) {
  const displayPlaceholder =
    language === 'vi' && placeholderVi ? placeholderVi : placeholder;

  return (
    <select
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-sm transition-colors',
        'bg-white dark:bg-steel-dark',
        'text-gray-900 dark:text-mrp-text-primary',
        // Focus
        'focus:outline-none focus:ring-2 focus:ring-info-cyan/50 focus:border-info-cyan',
        // Border
        hasError
          ? 'border-red-500 dark:border-urgent-red'
          : 'border-gray-300 dark:border-mrp-border',
        // Mobile touch target
        'min-h-[44px] sm:min-h-0',
        className
      )}
      {...props}
    >
      {displayPlaceholder && (
        <option value="">{displayPlaceholder}</option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {language === 'vi' && option.labelVi ? option.labelVi : option.label}
        </option>
      ))}
    </select>
  );
}

// =============================================================================
// FORM CHECKBOX
// =============================================================================

export interface FormCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelVi?: string;
  language?: 'en' | 'vi';
}

export function FormCheckbox({
  label,
  labelVi,
  language = 'vi',
  className,
  ...props
}: FormCheckboxProps) {
  const displayLabel = language === 'vi' && labelVi ? labelVi : label;

  return (
    <label
      className={cn(
        'flex items-center gap-3 cursor-pointer touch-manipulation',
        // Mobile: larger touch target
        'py-2 sm:py-0',
        className
      )}
    >
      <input
        type="checkbox"
        className={cn(
          'w-5 h-5 sm:w-4 sm:h-4 rounded border-gray-300 dark:border-mrp-border',
          'text-info-cyan focus:ring-info-cyan/50',
          'bg-white dark:bg-steel-dark'
        )}
        {...props}
      />
      {displayLabel && (
        <span className="text-sm text-gray-700 dark:text-mrp-text-secondary">
          {displayLabel}
        </span>
      )}
    </label>
  );
}

// =============================================================================
// FORM ACTIONS
// =============================================================================

export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4',
        // Mobile: Stack buttons and reverse order (primary last = at bottom)
        'flex-col-reverse sm:flex-row sm:justify-end',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// FORM SUBMIT BUTTON
// =============================================================================

export interface FormSubmitProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  loadingTextVi?: string;
  language?: 'en' | 'vi';
}

export function FormSubmit({
  children,
  loading = false,
  loadingText = 'Saving...',
  loadingTextVi = 'Đang lưu...',
  language = 'vi',
  disabled,
  className,
  ...props
}: FormSubmitProps) {
  const displayLoadingText =
    language === 'vi' ? loadingTextVi : loadingText;

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
        'bg-info-cyan text-white hover:bg-info-cyan/90',
        'disabled:bg-info-cyan/50 disabled:cursor-not-allowed',
        // Mobile: Full width
        'w-full sm:w-auto',
        // Touch target
        'min-h-[44px] sm:min-h-0',
        'touch-manipulation',
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{displayLoadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// =============================================================================
// FORM CANCEL BUTTON
// =============================================================================

export type FormCancelProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function FormCancel({
  children,
  className,
  ...props
}: FormCancelProps) {
  return (
    <button
      type="button"
      className={cn(
        'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
        'bg-gray-100 dark:bg-gunmetal text-gray-700 dark:text-mrp-text-secondary',
        'hover:bg-gray-200 dark:hover:bg-gunmetal-light',
        // Mobile: Full width
        'w-full sm:w-auto',
        // Touch target
        'min-h-[44px] sm:min-h-0',
        'touch-manipulation',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default ResponsiveForm;
