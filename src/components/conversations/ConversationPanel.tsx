'use client'

import { useState } from 'react'
import { ThreadList } from './ThreadList'
import { ThreadDetail } from './ThreadDetail'
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

interface ConversationPanelProps {
  contextType: string
  contextId: string
  contextTitle?: string
  className?: string
}

export function ConversationPanel({
  contextType,
  contextId,
  contextTitle,
  className = ''
}: ConversationPanelProps) {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)

  return (
    <div className={cn(
      // Industrial Precision - Dark theme with sharp edges
      'flex flex-col bg-white dark:bg-steel-dark border border-gray-200 dark:border-mrp-border overflow-hidden',
      className
    )}>
      {selectedThread ? (
        <ThreadDetail
          threadId={selectedThread.id}
          onBack={() => setSelectedThread(null)}
        />
      ) : (
        <ThreadList
          contextType={contextType}
          contextId={contextId}
          contextTitle={contextTitle}
          onSelectThread={setSelectedThread}
        />
      )}
    </div>
  )
}
