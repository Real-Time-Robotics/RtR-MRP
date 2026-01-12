'use client'

import { formatDistanceToNow, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { User, Bot } from 'lucide-react'

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
  // System messages have different styling
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
          <Bot className="w-3 h-3 inline mr-1" />
          {message.content}
          <span className="ml-2 text-gray-400">
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
          <span key={index} className="text-blue-600 dark:text-blue-400 font-medium">
            @{part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={`flex gap-3 py-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
      `}>
        <User className="w-4 h-4" />
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[75%] ${isCurrentUser ? 'text-right' : ''}`}>
        {/* Sender name */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {message.sender.name || message.sender.email || 'Unknown'}
          </span>
          <span className="text-xs text-gray-500">
            {format(new Date(message.createdAt), 'HH:mm', { locale: vi })}
          </span>
          {message.isEdited && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>

        {/* Message bubble */}
        <div className={`
          inline-block px-4 py-2 rounded-2xl
          ${isCurrentUser
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }
        `}>
          <p className="text-sm whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>
        </div>
      </div>
    </div>
  )
}
