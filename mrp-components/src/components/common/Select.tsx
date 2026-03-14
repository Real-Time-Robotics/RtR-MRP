'use client'

import React, { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  placeholder?: string
  error?: boolean
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
        <select
          ref={ref}
          className={`
            appearance-none h-input bg-slate border text-mrp-text-primary
            font-body text-base transition-all duration-fast
            pl-3 pr-8 cursor-pointer
            focus:outline-none focus:border-mrp-border-focus focus:bg-gunmetal
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-urgent-red' : 'border-mrp-border'}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-mrp-text-muted pointer-events-none"
        />
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
