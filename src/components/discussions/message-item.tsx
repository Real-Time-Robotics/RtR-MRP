'use client';

import { useState, useCallback } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  History,
  Reply,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/date';
import { Message, MessageEditHistory } from '@/types/discussions';
import {
  ImageAttachmentCard,
  DocumentAttachmentCard,
  EntityLinkCard,
} from './attachment-card';
import { MentionText } from './mention-text';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  onEdit?: (messageId: string, content: string, reason?: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onReply?: (message: Message) => void;
  className?: string;
}

export function MessageItem({
  message,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  className,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwnMessage = message.senderId === currentUserId;
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasEntityLinks = message.entityLinks && message.entityLinks.length > 0;
  const hasEditHistory = message.editHistory && message.editHistory.length > 0;

  const senderInitials = message.sender?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleEditSubmit = useCallback(async () => {
    if (!onEdit || editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(message.id, editContent.trim(), editReason || undefined);
      setIsEditing(false);
      setEditReason('');
    } finally {
      setIsSaving(false);
    }
  }, [onEdit, editContent, editReason, message.id, message.content]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(message.content);
    setEditReason('');
    setIsEditing(false);
  }, [message.content]);

  return (
    <div
      className={cn(
        'group flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors',
        message.isSystemMessage && 'bg-muted/20 italic',
        className
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs">{senderInitials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {message.sender?.name || 'Unknown User'}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-default">
                {formatRelativeTime(new Date(message.createdAt))}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {new Date(message.createdAt).toLocaleString()}
            </TooltipContent>
          </Tooltip>
          {message.isEdited && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowEditHistory(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  (edited)
                </button>
              </TooltipTrigger>
              <TooltipContent>
                View edit history
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Message content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <input
              type="text"
              placeholder="Reason for edit (optional)"
              aria-label="Reason for edit"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border bg-background"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSubmit} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            <MentionText
              content={message.content}
              mentions={message.mentions}
              highlightCurrentUser={currentUserId}
            />
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && !isEditing && (
          <div className="mt-2 space-y-2">
            {/* Image attachments */}
            {message.attachments!.filter((a) => a.type === 'IMAGE').length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
                {message.attachments!
                  .filter((a) => a.type === 'IMAGE')
                  .map((attachment) => (
                    <ImageAttachmentCard key={attachment.id} attachment={attachment} />
                  ))}
              </div>
            )}

            {/* Document attachments */}
            {message.attachments!
              .filter((a) => a.type !== 'IMAGE')
              .map((attachment) => (
                <DocumentAttachmentCard key={attachment.id} attachment={attachment} />
              ))}
          </div>
        )}

        {/* Entity links */}
        {hasEntityLinks && !isEditing && (
          <div className="mt-2 space-y-1 max-w-md">
            {message.entityLinks!.map((link) => (
              <EntityLinkCard key={link.id} entityLink={link} />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && !message.isSystemMessage && (
        <div className="flex items-start opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copied!' : 'Copy text'}
              </DropdownMenuItem>

              {onReply && (
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </DropdownMenuItem>
              )}

              {hasEditHistory && (
                <DropdownMenuItem onClick={() => setShowEditHistory(true)}>
                  <History className="mr-2 h-4 w-4" />
                  View edit history
                </DropdownMenuItem>
              )}

              {isOwnMessage && onEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit message
                  </DropdownMenuItem>
                </>
              )}

              {isOwnMessage && onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Edit History Dialog */}
      <Dialog open={showEditHistory} onOpenChange={setShowEditHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Edit History
            </DialogTitle>
            <DialogDescription>
              {message.editHistory?.length || 0} edit(s) made to this message
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {/* Current version */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="font-medium">Current version</span>
                  <span className="text-xs text-muted-foreground">
                    {message.isEdited && message.editedAt
                      ? formatRelativeTime(new Date(message.editedAt))
                      : formatRelativeTime(new Date(message.createdAt))}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Previous versions */}
              {message.editHistory?.map((edit, index) => (
                <div key={edit.id} className="p-3 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <span className="text-muted-foreground">
                      Version {message.editHistory!.length - index}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(edit.editedAt))}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {edit.previousContent}
                  </p>
                  {edit.reason && (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      Reason: {edit.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
