'use client'

import { formatDistanceToNow, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageItemProps {
  message: {
    id: string
    content: string
    isSystemMessage: boolean
    isEdited: boolean
    createdAt: string
    sender: {
      id: string
      name?: string | null
      email?: string | null
    }
    mentions?: Array<{
      mentionType: string
      userId?: string | null
      roleName?: string | null
    }>
  }
  isCurrentUser: boolean
}

export function MessageItem({ message, isCurrentUser }: MessageItemProps) {
  // Get initials from name
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // System messages have different styling - Industrial
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center py-1.5">
        <div className="text-[10px] text-gray-500 dark:text-mrp-text-muted bg-gray-100 dark:bg-gunmetal/50 px-2.5 py-1 flex items-center gap-1.5">
          <Bot className="w-3 h-3" />
          {message.content}
          <span className="text-gray-400 dark:text-mrp-text-muted/70 ml-1">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: vi })}
          </span>
        </div>
      </div>
    )
  }

  // Parse mentions in content and highlight them
  const renderContent = (content: string) => {
    // Highlight @mentions
    const mentionRegex = /@(\w+)/g
    const parts = content.split(mentionRegex)

    return parts.map((part, index) => {
      // Every odd index is a mention
      if (index % 2 === 1) {
        return (
          <span key={index} className="text-info-cyan font-medium">
            @{part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={cn(
      'flex gap-2 py-2',
      isCurrentUser ? 'flex-row-reverse' : ''
    )}>
      {/* Avatar - Industrial Sharp */}
      <div className={cn(
        'flex-shrink-0 w-6 h-6 flex items-center justify-center text-[10px] font-semibold',
        isCurrentUser
          ? 'bg-info-cyan text-steel-dark'
          : 'bg-gray-200 dark:bg-gunmetal text-gray-600 dark:text-mrp-text-muted'
      )}>
        {getInitials(message.sender.name)}
      </div>

      {/* Message content */}
      <div className={cn('flex-1 max-w-[80%]', isCurrentUser ? 'text-right' : '')}>
        {/* Sender name */}
        <div className={cn(
          'flex items-center gap-1.5 mb-0.5',
          isCurrentUser ? 'justify-end' : ''
        )}>
          <span className="text-[11px] font-medium text-gray-900 dark:text-mrp-text-primary">
            {message.sender.name || message.sender.email || 'Unknown'}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-mrp-text-muted">
            {format(new Date(message.createdAt), 'HH:mm', { locale: vi })}
          </span>
          {message.isEdited && (
            <span className="text-[9px] text-gray-400 dark:text-mrp-text-muted">(edited)</span>
          )}
        </div>

        {/* Message bubble - Industrial Sharp */}
        <div className={cn(
          'inline-block px-2.5 py-1.5',
          isCurrentUser
            ? 'bg-info-cyan text-steel-dark'
            : 'bg-gray-100 dark:bg-gunmetal/70 text-gray-900 dark:text-mrp-text-primary'
        )}>
          <p className="text-[12px] whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>
        </div>
      </div>
    </div>
  )
}
