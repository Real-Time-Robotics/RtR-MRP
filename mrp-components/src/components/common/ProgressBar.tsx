'use client'

import React from 'react'

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger'

interface ProgressBarProps {
  value: number // 0-100
  variant?: ProgressVariant
  showLabel?: boolean
  size?: 'sm' | 'default'
  className?: string
}

const variantColors: Record<ProgressVariant, string> = {
  default: 'bg-info-cyan',
  success: 'bg-production-green',
  warning: 'bg-alert-amber',
  danger: 'bg-urgent-red',
}

const sizeStyles: Record<'sm' | 'default', string> = {
  sm: 'h-1',
  default: 'h-1',
}

export function ProgressBar({
  value,
  variant = 'default',
  showLabel = false,
  size = 'default',
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  // Auto-determine variant based on value if default
  let actualVariant = variant
  if (variant === 'default') {
    if (clampedValue >= 80) actualVariant = 'success'
    else if (clampedValue >= 50) actualVariant = 'default'
    else if (clampedValue >= 25) actualVariant = 'warning'
    else actualVariant = 'danger'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-slate overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`h-full transition-all duration-slow ${variantColors[actualVariant]}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-mrp-text-muted w-10 text-right">
          {clampedValue}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar
