'use client'

import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { MessageSquare, Clock, User } from 'lucide-react'
import { ThreadStatusBadge, ThreadPriorityBadge } from './ThreadStatusBadge'

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
      className={`
        p-4 cursor-pointer transition-colors
        hover:bg-gray-50 dark:hover:bg-gray-800
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''}
        ${hasUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${hasUnread ? 'font-semibold' : ''}`}>
            {thread.title || thread.contextTitle || 'Untitled Discussion'}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
              {thread.unreadCount}
            </span>
          )}
          <ThreadStatusBadge status={thread.status} size="sm" />
        </div>
      </div>

      {/* Last message preview */}
      {lastMessage && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
          <span className="font-medium">{lastMessage.sender.name || 'Unknown'}:</span>{' '}
          {lastMessage.content.length > 100
            ? lastMessage.content.substring(0, 100) + '...'
            : lastMessage.content}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {thread._count.messages}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {thread.createdBy.name || 'Unknown'}
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {thread.lastMessageAt
            ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true, locale: vi })
            : formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true, locale: vi })}
        </span>
      </div>

      {/* Priority indicator for high/urgent */}
      {(thread.priority === 'HIGH' || thread.priority === 'URGENT') && (
        <div className="mt-2">
          <ThreadPriorityBadge priority={thread.priority} size="sm" />
        </div>
      )}
    </div>
  )
}
