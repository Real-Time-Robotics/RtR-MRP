'use client'

import React, { forwardRef } from 'react'
import { Check, Minus } from 'lucide-react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ indeterminate = false, label, className = '', checked, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => inputRef.current!)

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate
      }
    }, [indeterminate])

    return (
      <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
        <div className="relative">
          <input
            ref={inputRef}
            type="checkbox"
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`
              w-4 h-4 border transition-colors
              flex items-center justify-center
              peer-checked:bg-info-cyan peer-checked:border-info-cyan
              peer-indeterminate:bg-info-cyan peer-indeterminate:border-info-cyan
              peer-focus-visible:ring-1 peer-focus-visible:ring-info-cyan peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-steel-dark
              ${checked || indeterminate ? 'border-info-cyan' : 'border-mrp-border bg-slate'}
            `}
          >
            {checked && !indeterminate && (
              <Check size={12} className="text-steel-dark" strokeWidth={3} />
            )}
            {indeterminate && (
              <Minus size={12} className="text-steel-dark" strokeWidth={3} />
            )}
          </div>
        </div>
        {label && (
          <span className="text-sm text-mrp-text-primary select-none">{label}</span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
