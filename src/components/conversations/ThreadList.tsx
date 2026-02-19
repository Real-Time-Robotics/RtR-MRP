'use client'

import { useState, useEffect, useCallback } from 'react'
import { clientLogger } from '@/lib/client-logger'
import { ThreadItem } from './ThreadItem'
import { NewThreadModal } from './NewThreadModal'
import { MessageSquarePlus, Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      clientLogger.error('Failed to fetch threads', error)
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
        <Loader2 className="w-5 h-5 animate-spin text-info-cyan" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - Industrial Precision */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-mrp-border bg-gray-50 dark:bg-gunmetal">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-600 dark:text-mrp-text-muted flex items-center gap-1.5">
          <MessageSquarePlus className="w-3.5 h-3.5" />
          Thảo luận
          {threads.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-info-cyan/20 text-info-cyan text-[10px] font-mono">
              {threads.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchThreads}
            className="w-7 h-7 flex items-center justify-center text-gray-500 dark:text-mrp-text-muted hover:bg-gray-200 dark:hover:bg-slate transition-colors"
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="h-9 px-2.5 flex items-center gap-1.5 bg-info-cyan text-steel-dark text-xs font-medium hover:bg-info-cyan/80 transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Tạo mới
          </button>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-mrp-text-muted">
            <MessageSquarePlus className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[12px] font-medium">Chưa có discussion nào</p>
            <p className="text-[11px] text-center mt-1 text-gray-400 dark:text-mrp-text-muted">
              Tạo discussion để thảo luận về {contextTitle || contextType}
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-3 text-[11px] text-info-cyan hover:underline"
            >
              Bắt đầu thảo luận
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-mrp-border/50">
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

      {/* Thread count footer */}
      {threads.length > 0 && (
        <div className="px-3 py-1.5 text-[10px] text-gray-500 dark:text-mrp-text-muted border-t border-gray-100 dark:border-mrp-border/50 bg-gray-50 dark:bg-gunmetal/50">
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
