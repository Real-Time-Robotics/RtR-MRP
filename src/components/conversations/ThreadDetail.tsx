'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ThreadStatusBadge, ThreadPriorityBadge } from './ThreadStatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  Loader2
} from 'lucide-react'
import { useSession } from 'next-auth/react'

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

interface ThreadDetailProps {
  threadId: string
  onBack?: () => void
}

export function ThreadDetail({ threadId, onBack }: ThreadDetailProps) {
  const { data: session } = useSession()
  const [thread, setThread] = useState<{
    id: string
    title?: string | null
    status: string
    priority: string
    contextType: string
    contextId: string
    contextTitle?: string | null
    createdBy: { id: string; name?: string | null }
    _count: { messages: number }
  } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/conversations/threads/${threadId}`)
      const data = await res.json()
      setThread(data)
    } catch (error) {
      console.error('Failed to fetch thread:', error)
    }
  }, [threadId])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/conversations/threads/${threadId}/messages`)
      const data = await res.json()
      setMessages(data.data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    fetchThread()
    fetchMessages()

    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchThread, fetchMessages])

  const handleMessageSent = (newMessage: unknown) => {
    setMessages(prev => [...prev, newMessage as Message])
  }

  const updateStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/v2/conversations/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        const updatedThread = await res.json()
        setThread(prev => prev ? { ...prev, status: updatedThread.status } : null)
        // Refresh messages to show system message
        fetchMessages()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading || !thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h3 className="font-semibold">
              {thread.title || thread.contextTitle || 'Discussion'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <ThreadStatusBadge status={thread.status} size="sm" />
              {(thread.priority === 'HIGH' || thread.priority === 'URGENT') && (
                <ThreadPriorityBadge priority={thread.priority} size="sm" />
              )}
            </div>
          </div>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={updatingStatus}>
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => updateStatus('OPEN')}>
              <AlertCircle className="w-4 h-4 mr-2" />
              Đánh dấu Mở
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('IN_PROGRESS')}>
              <Clock className="w-4 h-4 mr-2" />
              Đang xử lý
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('WAITING')}>
              <Clock className="w-4 h-4 mr-2" />
              Chờ phản hồi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateStatus('RESOLVED')}>
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Đã giải quyết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('ARCHIVED')}>
              <Archive className="w-4 h-4 mr-2" />
              Lưu trữ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          loading={loading}
          currentUserId={session?.user?.id || ''}
        />
      </div>

      {/* Composer */}
      <MessageComposer
        threadId={threadId}
        onSent={handleMessageSent}
        disabled={thread.status === 'ARCHIVED'}
      />
    </div>
  )
}
