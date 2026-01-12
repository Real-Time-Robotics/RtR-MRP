'use client'

import { ConversationPanel } from '@/components/conversations'

interface BomDiscussionsProps {
  bomId: string
  bomTitle: string
}

export function BomDiscussions({ bomId, bomTitle }: BomDiscussionsProps) {
  return (
    <ConversationPanel
      contextType="BOM"
      contextId={bomId}
      contextTitle={bomTitle}
      className="h-[600px]"
    />
  )
}
