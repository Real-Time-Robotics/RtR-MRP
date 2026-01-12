'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThreadItem } from './ThreadItem'
import { NewThreadModal } from './NewThreadModal'
import { Button } from '@/components/ui/button'
import { MessageSquarePlus, Loader2, RefreshCw } from 'lucide-react'

interface Thread {
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

interface ThreadListProps {
  contextType: string
  contextId: string
  contextTitle?: string
  onSelectThread?: (thread: Thread) => void
  selectedThreadId?: string
}

export function ThreadList({
  contextType,
  contextId,
  contextTitle,
  onSelectThread,
  selectedThreadId
}: ThreadListProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v2/conversations/threads?contextType=${contextType}&contextId=${contextId}`
      )
      const data = await res.json()
      setThreads(data.data || [])
    } catch (error) {
      console.error('Failed to fetch threads:', error)
    } finally {
      setLoading(false)
    }
  }, [contextType, contextId])

  useEffect(() => {
    fetchThreads()

    // Poll for updates every 30 seconds (Phase 1 - no WebSocket)
    const interval = setInterval(fetchThreads, 30000)
    return () => clearInterval(interval)
  }, [fetchThreads])

  const handleThreadCreated = (newThread: unknown) => {
    setThreads(prev => [newThread as Thread, ...prev])
    setShowNewModal(false)
    if (onSelectThread) {
      onSelectThread(newThread as Thread)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg">Discussions</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchThreads}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNewModal(true)}
            className="gap-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Tạo mới
          </Button>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <MessageSquarePlus className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">Chưa có discussion nào</p>
            <p className="text-sm text-center mt-1">
              Tạo discussion để thảo luận về {contextTitle || contextType}
            </p>
            <Button
              variant="link"
              onClick={() => setShowNewModal(true)}
              className="mt-3"
            >
              Bắt đầu thảo luận
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {threads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                onSelect={() => onSelectThread?.(thread)}
                isSelected={thread.id === selectedThreadId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thread count */}
      {threads.length > 0 && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t bg-gray-50 dark:bg-gray-900">
          {threads.length} discussion{threads.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* New Thread Modal */}
      <NewThreadModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        contextType={contextType}
        contextId={contextId}
        contextTitle={contextTitle}
        onCreated={handleThreadCreated}
      />
    </div>
  )
}
