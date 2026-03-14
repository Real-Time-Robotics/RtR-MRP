'use client'

import React, { forwardRef } from 'react'
import { Search, type LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  error?: boolean
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, error, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-mrp-text-muted pointer-events-none"
          />
        )}
        <input
          ref={ref}
          className={`
            h-input bg-slate border text-mrp-text-primary
            font-body text-base transition-all duration-fast
            placeholder:text-mrp-text-muted
            focus:outline-none focus:border-mrp-border-focus focus:bg-gunmetal
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-9 pr-3' : 'px-3'}
            ${error ? 'border-urgent-red' : 'border-mrp-border'}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

// Search Input variant
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'icon'>
>((props, ref) => {
  return <Input ref={ref} icon={Search} placeholder="Tim kiem..." {...props} />
})

SearchInput.displayName = 'SearchInput'

export default Input
