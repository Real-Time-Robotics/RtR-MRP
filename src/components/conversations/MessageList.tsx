'use client'

import { useEffect, useRef } from 'react'
import { MessageItem } from './MessageItem'
import { Loader2 } from 'lucide-react'

interface Message {
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

interface MessageListProps {
  messages: Message[]
  loading?: boolean
  currentUserId: string
  onLoadMore?: () => void
  hasMore?: boolean
}

export function MessageList({
  messages,
  loading,
  currentUserId,
  onLoadMore,
  hasMore
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>Chưa có tin nhắn nào</p>
        <p className="text-sm">Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4">
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={onLoadMore}
            className="text-sm text-blue-500 hover:text-blue-600"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Tải tin nhắn cũ hơn'
            )}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-1">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isCurrentUser={message.sender.id === currentUserId}
          />
        ))}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}
