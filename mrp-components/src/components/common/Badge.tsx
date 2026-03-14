'use client'

import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-production-green-dim text-production-green',
  warning: 'bg-alert-amber-dim text-alert-amber',
  danger: 'bg-urgent-red-dim text-urgent-red',
  info: 'bg-info-cyan-dim text-info-cyan',
  neutral: 'bg-[rgba(113,113,122,0.2)] text-mrp-text-muted',
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        px-2 py-0.5
        text-xs font-medium uppercase tracking-wide
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}

export default Badge
