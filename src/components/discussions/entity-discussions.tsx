'use client';

import { ConversationPanel } from '@/components/conversations';
import type { ContextType } from '@/types/discussions';

interface EntityDiscussionsProps {
  contextType: ContextType;
  contextId: string;
  contextTitle: string;
  className?: string;
}

/**
 * Generic Discussion component for any entity type.
 * Wraps ConversationPanel with the appropriate context.
 */
export function EntityDiscussions({
  contextType,
  contextId,
  contextTitle,
  className = 'h-[600px]',
}: EntityDiscussionsProps) {
  return (
    <ConversationPanel
      contextType={contextType}
      contextId={contextId}
      contextTitle={contextTitle}
      className={className}
    />
  );
}
