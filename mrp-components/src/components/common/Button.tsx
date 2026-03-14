'use client'

import React, { forwardRef } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'default'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-info-cyan text-steel-dark border-info-cyan hover:bg-[#0891B2] hover:border-[#0891B2]',
  secondary: 'bg-slate text-mrp-text-primary border-mrp-border hover:bg-slate-light',
  ghost: 'bg-transparent text-mrp-text-secondary border-transparent hover:bg-slate hover:text-mrp-text-primary',
  danger: 'bg-urgent-red-dim text-urgent-red border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.3)]',
  success: 'bg-production-green-dim text-production-green border-[rgba(34,197,94,0.3)] hover:bg-[rgba(34,197,94,0.3)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-btn-sm px-2 text-sm',
  default: 'h-btn px-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'default',
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center gap-1.5
          font-body font-medium
          border transition-all duration-fast
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
        ) : Icon && iconPosition === 'left' ? (
          <Icon size={size === 'sm' ? 14 : 16} />
        ) : null}
        {children}
        {!loading && Icon && iconPosition === 'right' && (
          <Icon size={size === 'sm' ? 14 : 16} />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
