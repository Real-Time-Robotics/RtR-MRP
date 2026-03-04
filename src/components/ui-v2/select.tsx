'use client';

import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Check, ChevronDown, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// SELECT COMPONENT
// Custom select with search, multi-select, and async loading
// =============================================================================

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps {
  /** Select options */
  options: SelectOption[];
  /** Selected value(s) */
  value?: string | string[];
  /** Change handler */
  onChange?: (value: string | string[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Enable multi-select */
  multiple?: boolean;
  /** Allow clearing selection */
  clearable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
  /** Label */
  label?: string;
  /** Required field */
  required?: boolean;
  /** Helper text */
  helperText?: string;
  /** Custom class */
  className?: string;
  /** Max height for dropdown */
  maxHeight?: number;
  /** No options message */
  noOptionsMessage?: string;
  /** Create option (for tagging) */
  creatable?: boolean;
  /** Create option handler */
  onCreate?: (value: string) => void;
}

const selectSizes = {
  sm: 'h-7 text-sm px-2.5',
  md: 'h-8 text-sm px-3',
  lg: 'h-9 text-base px-3.5',
};

const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select...',
      searchable = false,
      searchPlaceholder = 'Search...',
      multiple = false,
      clearable = false,
      disabled = false,
      error = false,
      errorMessage,
      loading = false,
      size = 'md',
      fullWidth = false,
      label,
      required = false,
      helperText,
      className,
      maxHeight = 300,
      noOptionsMessage = 'No options available',
      creatable = false,
      onCreate,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get selected options
    const selectedValues = multiple
      ? (value as string[]) || []
      : value
      ? [value as string]
      : [];

    const selectedOptions = options.filter((opt) =>
      selectedValues.includes(opt.value)
    );

    // Filter options
    const filteredOptions = options.filter((opt) => {
      if (!searchQuery) return true;
      return (
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    // Group options
    const groupedOptions = filteredOptions.reduce((groups, opt) => {
      const group = opt.group || '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
      return groups;
    }, {} as Record<string, SelectOption[]>);

    // Handle selection
    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;

      if (multiple) {
        const newValue = selectedValues.includes(option.value)
          ? selectedValues.filter((v) => v !== option.value)
          : [...selectedValues, option.value];
        onChange?.(newValue);
      } else {
        onChange?.(option.value);
        setIsOpen(false);
      }
      setSearchQuery('');
    };

    // Handle clear
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.(multiple ? [] : '');
    };

    // Handle remove tag
    const handleRemoveTag = (e: React.MouseEvent, val: string) => {
      e.stopPropagation();
      if (multiple) {
        onChange?.(selectedValues.filter((v) => v !== val));
      }
    };

    // Handle create
    const handleCreate = () => {
      if (creatable && onCreate && searchQuery) {
        onCreate(searchQuery);
        setSearchQuery('');
      }
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (isOpen && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else if (creatable && searchQuery) {
            handleCreate();
          } else {
            setIsOpen(true);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
      }
    };

    // Click outside to close
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
      if (isOpen && searchable && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isOpen, searchable]);

    // Reset highlighted index
    useEffect(() => {
      setHighlightedIndex(0);
    }, [searchQuery]);

    // Display value
    const displayValue = multiple
      ? selectedOptions.length > 0
        ? `${selectedOptions.length} selected`
        : placeholder
      : selectedOptions[0]?.label || placeholder;

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}
      >
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        {/* Select container */}
        <div ref={containerRef} className="relative">
          {/* Trigger */}
          <div
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            className={cn(
              'flex items-center justify-between gap-2 w-full',
              'bg-white border rounded-lg cursor-pointer',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              selectSizes[size],
              disabled && 'bg-slate-100 cursor-not-allowed opacity-60',
              error
                ? 'border-danger-500 focus:ring-danger-500'
                : isOpen
                ? 'border-primary-500 ring-2 ring-primary-500'
                : 'border-slate-300 focus:ring-primary-500',
              className
            )}
          >
            {/* Selected value(s) */}
            <div className="flex-1 flex items-center gap-1 overflow-hidden">
              {multiple && selectedOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedOptions.slice(0, 2).map((opt) => (
                    <span
                      key={opt.value}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                    >
                      {opt.label}
                      <button
                        onClick={(e) => handleRemoveTag(e, opt.value)}
                        className="hover:text-primary-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedOptions.length > 2 && (
                    <span className="text-xs text-slate-500">
                      +{selectedOptions.length - 2} more
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className={cn(
                    'truncate',
                    !selectedOptions.length && 'text-slate-400'
                  )}
                >
                  {displayValue}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              {clearable && selectedValues.length > 0 && !disabled && (
                <button
                  onClick={handleClear}
                  className="p-0.5 hover:bg-slate-200 rounded"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div
              className={cn(
                'absolute z-dropdown mt-1 w-full bg-white',
                'border border-slate-200 rounded-lg shadow-lg',
                'animate-fade-in'
              )}
            >
              {/* Search input */}
              {searchable && (
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div
                className="overflow-auto py-1"
                style={{ maxHeight: `${maxHeight}px` }}
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-slate-500">
                    {creatable && searchQuery ? (
                      <button
                        onClick={handleCreate}
                        className="text-primary-600 hover:underline"
                      >
                        Create "{searchQuery}"
                      </button>
                    ) : (
                      noOptionsMessage
                    )}
                  </div>
                ) : (
                  Object.entries(groupedOptions).map(([group, opts]) => (
                    <div key={group}>
                      {group && (
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase">
                          {group}
                        </div>
                      )}
                      {opts.map((option, index) => {
                        const isSelected = selectedValues.includes(option.value);
                        const globalIndex = filteredOptions.indexOf(option);

                        return (
                          <div
                            key={option.value}
                            onClick={() => handleSelect(option)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 cursor-pointer',
                              'transition-colors',
                              option.disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : highlightedIndex === globalIndex
                                ? 'bg-primary-50'
                                : 'hover:bg-slate-50',
                              isSelected && 'bg-primary-50'
                            )}
                          >
                            {/* Checkbox for multi-select */}
                            {multiple && (
                              <div
                                className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center',
                                  isSelected
                                    ? 'bg-primary-600 border-primary-600'
                                    : 'border-slate-300'
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                            )}

                            {/* Icon */}
                            {option.icon && (
                              <span className="flex-shrink-0 text-slate-400">
                                {option.icon}
                              </span>
                            )}

                            {/* Label & description */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-900 truncate">
                                {option.label}
                              </div>
                              {option.description && (
                                <div className="text-xs text-slate-500 truncate">
                                  {option.description}
                                </div>
                              )}
                            </div>

                            {/* Check for single select */}
                            {!multiple && isSelected && (
                              <Check className="h-4 w-4 text-primary-600 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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

Select.displayName = 'Select';

// =============================================================================
// SIMPLE NATIVE SELECT
// Lightweight native select for simple use cases
// =============================================================================

export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: { value: string; label: string }[];
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  fullWidth?: boolean;
  label?: string;
  required?: boolean;
}

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      options,
      size = 'md',
      error = false,
      fullWidth = false,
      label,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
            {required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'appearance-none bg-white border rounded-lg cursor-pointer',
            'transition-all duration-200 pr-10',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'bg-no-repeat',
            selectSizes[size],
            error
              ? 'border-danger-500 focus:ring-danger-500'
              : 'border-slate-300 focus:ring-primary-500',
            fullWidth && 'w-full',
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.75rem center',
            backgroundSize: '1.25rem',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

NativeSelect.displayName = 'NativeSelect';

// =============================================================================
// EXPORTS
// =============================================================================

export { Select, NativeSelect };
export default Select;
