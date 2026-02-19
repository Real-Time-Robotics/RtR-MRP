'use client'

import { useState, useEffect, useCallback } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { MessageList } from './MessageList'
import { MessageComposer } from './MessageComposer'
import { ThreadStatusBadge, ThreadPriorityBadge } from './ThreadStatusBadge'
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
import { cn } from '@/lib/utils'

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
      clientLogger.error('Failed to fetch thread', error)
    }
  }, [threadId])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/v2/conversations/threads/${threadId}/messages`)
      const data = await res.json()
      setMessages(data.data || [])
    } catch (error) {
      clientLogger.error('Failed to fetch messages', error)
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
      clientLogger.error('Failed to update status', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading || !thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-info-cyan" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Industrial Precision */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border bg-gray-50 dark:bg-gunmetal">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-7 h-7 flex items-center justify-center text-gray-500 dark:text-mrp-text-muted hover:bg-gray-200 dark:hover:bg-slate transition-colors"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className="text-[12px] font-medium text-gray-900 dark:text-mrp-text-primary truncate max-w-[200px]">
              {thread.title || thread.contextTitle || 'Discussion'}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
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
            <button
              className="w-7 h-7 flex items-center justify-center text-gray-500 dark:text-mrp-text-muted hover:bg-gray-200 dark:hover:bg-slate transition-colors disabled:opacity-50"
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={() => updateStatus('OPEN')} className="text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 mr-2" />
              Đánh dấu Mở
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('IN_PROGRESS')} className="text-[11px]">
              <Clock className="w-3.5 h-3.5 mr-2" />
              Đang xử lý
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('WAITING')} className="text-[11px]">
              <Clock className="w-3.5 h-3.5 mr-2" />
              Chờ phản hồi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateStatus('RESOLVED')} className="text-[11px]">
              <CheckCircle className="w-3.5 h-3.5 mr-2 text-production-green" />
              Đã giải quyết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus('ARCHIVED')} className="text-[11px]">
              <Archive className="w-3.5 h-3.5 mr-2" />
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
