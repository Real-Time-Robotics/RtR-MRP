'use client'

import { Badge } from '@/components/ui/badge'

interface ThreadStatusBadgeProps {
  status: string
  size?: 'sm' | 'default'
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  OPEN: { label: 'Mở', variant: 'default' },
  IN_PROGRESS: { label: 'Đang xử lý', variant: 'secondary' },
  WAITING: { label: 'Chờ phản hồi', variant: 'outline' },
  RESOLVED: { label: 'Đã giải quyết', variant: 'secondary' },
  ARCHIVED: { label: 'Lưu trữ', variant: 'outline' },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Thấp', className: 'bg-gray-100 text-gray-700' },
  NORMAL: { label: 'Bình thường', className: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'Cao', className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Khẩn cấp', className: 'bg-red-100 text-red-700' },
}

export function ThreadStatusBadge({ status, size = 'default' }: ThreadStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const }

  return (
    <Badge variant={config.variant} className={size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}>
      {config.label}
    </Badge>
  )
}

export function ThreadPriorityBadge({ priority, size = 'default' }: { priority: string; size?: 'sm' | 'default' }) {
  const config = priorityConfig[priority] || { label: priority, className: 'bg-gray-100 text-gray-700' }

  return (
    <Badge className={`${config.className} ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : ''}`}>
      {config.label}
    </Badge>
  )
}
