'use client'

import { cn } from '@/lib/utils'

interface ThreadStatusBadgeProps {
  status: string
  size?: 'sm' | 'default'
}

// Industrial Precision - Status colors
const statusConfig: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: 'Mở',
    className: 'bg-production-green/20 text-production-green border-production-green/30'
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    className: 'bg-info-cyan/20 text-info-cyan border-info-cyan/30'
  },
  WAITING: {
    label: 'Chờ phản hồi',
    className: 'bg-amber-500/20 text-amber-500 border-amber-500/30'
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    className: 'bg-mrp-text-muted/20 text-mrp-text-muted border-mrp-text-muted/30'
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    className: 'bg-slate text-mrp-text-muted border-mrp-border'
  },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: {
    label: 'Thấp',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  },
  NORMAL: {
    label: 'Bình thường',
    className: 'bg-info-cyan/20 text-info-cyan border-info-cyan/30'
  },
  HIGH: {
    label: 'Cao',
    className: 'bg-amber-500/20 text-amber-500 border-amber-500/30'
  },
  URGENT: {
    label: 'Khẩn cấp',
    className: 'bg-red-500/20 text-red-400 border-red-500/30'
  },
}

export function ThreadStatusBadge({ status, size = 'default' }: ThreadStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <span className={cn(
      // Industrial Precision - Sharp edges, mono font
      'inline-flex items-center font-mono uppercase tracking-wide border',
      size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
      config.className
    )}>
      {config.label}
    </span>
  )
}

export function ThreadPriorityBadge({ priority, size = 'default' }: { priority: string; size?: 'sm' | 'default' }) {
  const config = priorityConfig[priority] || {
    label: priority,
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <span className={cn(
      // Industrial Precision - Sharp edges, mono font
      'inline-flex items-center font-mono uppercase tracking-wide border',
      size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
      config.className
    )}>
      {config.label}
    </span>
  )
}
