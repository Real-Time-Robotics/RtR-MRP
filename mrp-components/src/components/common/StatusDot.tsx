'use client'

import React from 'react'

type StatusType = 'active' | 'pending' | 'overdue' | 'completed' | 'inactive'

interface StatusDotProps {
  status: StatusType
  label?: string
  className?: string
}

const statusColors: Record<StatusType, string> = {
  active: 'text-production-green',
  pending: 'text-alert-amber',
  overdue: 'text-urgent-red',
  completed: 'text-mrp-text-muted',
  inactive: 'text-mrp-text-disabled',
}

const defaultLabels: Record<StatusType, string> = {
  active: 'Dang hoat dong',
  pending: 'Cho xu ly',
  overdue: 'Tre han',
  completed: 'Hoan thanh',
  inactive: 'Ngung hoat dong',
}

export function StatusDot({ status, label, className = '' }: StatusDotProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-sm
        before:content-[''] before:w-2 before:h-2 before:rounded-full before:bg-current
        ${statusColors[status]}
        ${className}
      `}
    >
      {label ?? defaultLabels[status]}
    </span>
  )
}

export default StatusDot
