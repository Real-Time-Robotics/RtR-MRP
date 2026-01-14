'use client'

import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { MessageSquare, Clock, User } from 'lucide-react'
import { ThreadStatusBadge, ThreadPriorityBadge } from './ThreadStatusBadge'
import { cn } from '@/lib/utils'

interface ThreadItemProps {
  thread: {
    id: string
    title?: string | null
    status: string
    priority: string
    contextTitle?: string | null
    createdAt: string
    lastMessageAt?: string | null
    createdBy: { id: string; name?: string | null }
    _count: { messages: number }
    messages: Array<{
      content: string
      sender: { id: string; name?: string | null }
    }>
    unreadCount?: number
  }
  onSelect: () => void
  isSelected?: boolean
}

export function ThreadItem({ thread, onSelect, isSelected }: ThreadItemProps) {
  const lastMessage = thread.messages[0]
  const hasUnread = (thread.unreadCount || 0) > 0

  return (
    <div
      onClick={onSelect}
      className={cn(
        // Industrial Precision - Compact padding, sharp styling
        'p-2.5 cursor-pointer transition-colors border-l-2',
        'hover:bg-gray-50 dark:hover:bg-gunmetal/50',
        isSelected
          ? 'bg-info-cyan/10 dark:bg-info-cyan/5 border-l-info-cyan'
          : 'border-l-transparent',
        hasUnread && 'bg-info-cyan/5'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            'text-[12px] truncate text-gray-900 dark:text-mrp-text-primary',
            hasUnread ? 'font-semibold' : 'font-medium'
          )}>
            {thread.title || thread.contextTitle || 'Untitled Discussion'}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white bg-info-cyan">
              {thread.unreadCount}
            </span>
          )}
          <ThreadStatusBadge status={thread.status} size="sm" />
        </div>
      </div>

      {/* Last message preview */}
      {lastMessage && (
        <p className="text-[11px] text-gray-600 dark:text-mrp-text-secondary line-clamp-2 mb-1.5">
          <span className="font-medium text-gray-700 dark:text-mrp-text-primary">
            {lastMessage.sender.name || 'Unknown'}:
          </span>{' '}
          {lastMessage.content.length > 80
            ? lastMessage.content.substring(0, 80) + '...'
            : lastMessage.content}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-mrp-text-muted">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <MessageSquare className="w-3 h-3" />
            {thread._count.messages}
          </span>
          <span className="flex items-center gap-0.5">
            <User className="w-3 h-3" />
            {thread.createdBy.name || 'Unknown'}
          </span>
        </div>
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {thread.lastMessageAt
            ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true, locale: vi })
            : formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true, locale: vi })}
        </span>
      </div>

      {/* Priority indicator for high/urgent */}
      {(thread.priority === 'HIGH' || thread.priority === 'URGENT') && (
        <div className="mt-1.5">
          <ThreadPriorityBadge priority={thread.priority} size="sm" />
        </div>
      )}
    </div>
  )
}
