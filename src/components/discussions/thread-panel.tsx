'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import {
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Settings,
  Users,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  ConversationThread,
  Message,
  ContextType,
  ThreadStatus,
  AttachmentInput,
  EntityLinkInput,
  THREAD_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '@/types/discussions';
import { MessageItem } from './message-item';
import { MessageComposer } from './message-composer';

interface ThreadPanelProps {
  contextType: ContextType;
  contextId: string;
  contextTitle?: string;
  currentUserId: string;
  onClose?: () => void;
  className?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

export function ThreadPanel({
  contextType,
  contextId,
  contextTitle,
  currentUserId,
  onClose,
  className,
}: ThreadPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch or create thread
  const {
    data: threadData,
    error: threadError,
    isLoading: isLoadingThread,
    mutate: mutateThread,
  } = useSWR<{ thread: ConversationThread }>(
    `/api/discussions/threads?contextType=${contextType}&contextId=${contextId}`,
    fetcher
  );

  // Fetch messages
  const {
    data: messagesData,
    error: messagesError,
    isLoading: isLoadingMessages,
    mutate: mutateMessages,
  } = useSWR<{ messages: Message[] }>(
    threadData?.thread?.id
      ? `/api/discussions/threads/${threadData.thread.id}/messages`
      : null,
    fetcher,
    { refreshInterval: 5000 } // Poll every 5 seconds
  );

  const thread = threadData?.thread;
  const messages = messagesData?.messages || [];
  const isLoading = isLoadingThread || isLoadingMessages;
  const hasError = threadError || messagesError;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Send message
  const handleSendMessage = useCallback(
    async (data: {
      content: string;
      attachments: AttachmentInput[];
      entityLinks: EntityLinkInput[];
    }) => {
      if (!thread) return;

      const response = await fetch(`/api/discussions/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Refresh messages
      mutateMessages();
    },
    [thread, mutateMessages]
  );

  // Edit message
  const handleEditMessage = useCallback(
    async (messageId: string, content: string, reason?: string) => {
      const response = await fetch(`/api/discussions/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit message');
      }

      mutateMessages();
    },
    [mutateMessages]
  );

  // Delete message
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      const response = await fetch(`/api/discussions/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      mutateMessages();
    },
    [mutateMessages]
  );

  // Update thread status
  const handleStatusChange = useCallback(
    async (status: ThreadStatus) => {
      if (!thread) return;

      const response = await fetch(`/api/discussions/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      mutateThread();
    },
    [thread, mutateThread]
  );

  // Minimized view
  if (isMinimized) {
    return (
      <div
        className={cn(
          // Mobile: fixed at bottom center, Desktop: bottom right
          'fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto',
          'flex items-center justify-center md:justify-start gap-2 p-3 rounded-lg border bg-card shadow-lg cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation',
          className
        )}
        onClick={() => setIsMinimized(false)}
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-medium">Discussion</span>
        {messages.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {messages.length}
          </Badge>
        )}
        <ChevronUp className="h-4 w-4 ml-2" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Mobile: Full screen overlay, Desktop: fixed panel
        'fixed md:bottom-4 md:right-4 md:w-[400px] md:h-[500px] md:rounded-lg',
        'inset-0 md:inset-auto',
        'flex flex-col border bg-card shadow-xl md:shadow-xl z-50',
        className
      )}
    >
      {/* Header - Responsive with safe area padding on mobile */}
      <div className="flex items-center justify-between p-3 pt-safe md:pt-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-5 w-5 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-medium text-sm">Discussion</h3>
            {contextTitle && (
              <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                {contextTitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {thread && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Larger touch target on mobile */}
                <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7 touch-manipulation" aria-label="Cài đặt">
                  <Settings className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Change Status
                </DropdownMenuItem>
                {Object.entries(THREAD_STATUS_CONFIG).map(([status, config]) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleStatusChange(status as ThreadStatus)}
                    className={cn(thread.status === status && 'bg-muted')}
                  >
                    {status === 'RESOLVED' ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <Clock className="mr-2 h-4 w-4" />
                    )}
                    {config.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Participants
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Minimize button - larger on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:h-7 md:w-7 touch-manipulation"
            onClick={() => setIsMinimized(true)}
            aria-label="Thu nhỏ"
          >
            <ChevronDown className="h-5 w-5 md:h-4 md:w-4" />
          </Button>

          {onClose && (
            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7 touch-manipulation" onClick={onClose} aria-label="Đóng">
              <X className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Status bar */}
      {thread && thread.status !== 'OPEN' && (
        <div className={cn(
          'px-3 py-1.5 text-xs flex items-center gap-2',
          thread.status === 'RESOLVED' && 'bg-green-50 text-green-700',
          thread.status === 'IN_PROGRESS' && 'bg-amber-50 text-amber-700',
          thread.status === 'WAITING' && 'bg-purple-50 text-purple-700',
          thread.status === 'ARCHIVED' && 'bg-slate-50 text-slate-700'
        )}>
          <Badge variant="outline" className="h-5 text-[10px]">
            {THREAD_STATUS_CONFIG[thread.status].label}
          </Badge>
          <span>
            {thread.status === 'RESOLVED' && 'This discussion has been resolved'}
            {thread.status === 'IN_PROGRESS' && 'Discussion in progress'}
            {thread.status === 'WAITING' && 'Waiting for response'}
            {thread.status === 'ARCHIVED' && 'This discussion has been archived'}
          </span>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-destructive">Failed to load discussion</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                mutateThread();
                mutateMessages();
              }}
            >
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground">
              Start the discussion by sending a message
            </p>
          </div>
        ) : (
          <div className="p-2">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Composer - with safe area padding on mobile */}
      {thread && thread.status !== 'ARCHIVED' && (
        <div className="p-2 pb-safe md:pb-2 border-t">
          <MessageComposer
            threadId={thread.id}
            onSend={handleSendMessage}
            disabled={thread.status === 'RESOLVED'}
            placeholder={
              thread.status === 'RESOLVED'
                ? 'Reopen to send messages...'
                : 'Type a message...'
            }
          />
        </div>
      )}
    </div>
  );
}
