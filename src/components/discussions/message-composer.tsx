'use client';

import { useState, useCallback, useRef, KeyboardEvent, useEffect } from 'react';
import { Send, Paperclip, Loader2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AttachmentInput,
  EntityLinkInput,
  MessageAttachment,
  EntityLink,
} from '@/types/discussions';
import { useMentions } from '@/hooks/use-mentions';
import { ScreenshotCapture } from './screenshot-capture';
import { EntityPicker } from './entity-picker';
import { AttachmentPreview } from './attachment-card';
import { MentionAutocomplete } from './mention-autocomplete';

interface MentionedUser {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

interface MessageComposerProps {
  threadId: string;
  onSend: (data: {
    content: string;
    attachments: AttachmentInput[];
    entityLinks: EntityLinkInput[];
    mentions?: MentionedUser[];
  }) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MessageComposer({
  threadId,
  onSend,
  placeholder = 'Type a message... (@ to mention)',
  disabled,
  className,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [entityLinks, setEntityLinks] = useState<EntityLinkInput[]>([]);
  const [mentions, setMentions] = useState<MentionedUser[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isActive: mentionActive,
    users: mentionUsers,
    selectedIndex,
    isLoading: mentionLoading,
    handleInputChange,
    handleKeyDown: handleMentionKeyDown,
    close: closeMention,
    startPosition,
  } = useMentions();

  const hasContent = content.trim().length > 0 || attachments.length > 0 || entityLinks.length > 0;

  // Calculate dropdown position when mention is active
  useEffect(() => {
    if (!mentionActive || !textareaRef.current || !containerRef.current) return;

    const textarea = textareaRef.current;
    const container = containerRef.current;

    // Get textarea position
    const textareaRect = textarea.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Position below the textarea
    setDropdownPosition({
      top: textareaRect.height + 8,
      left: Math.min(8, textareaRect.width - 280),
    });
  }, [mentionActive, content, startPosition]);

  // Handle content change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursor = e.target.selectionStart || 0;

      setContent(value);
      setCursorPosition(cursor);
      handleInputChange(value, cursor);
    },
    [handleInputChange]
  );

  // Handle mention selection
  const handleSelectMention = useCallback(
    (user: { id: string; name: string | null }) => {
      if (!textareaRef.current || !user.name) return;

      const beforeMention = content.slice(0, startPosition);
      const afterMention = content.slice(cursorPosition);
      const mentionText = `@${user.name} `;

      const newContent = beforeMention + mentionText + afterMention;
      setContent(newContent);

      // Track mention
      const newMention: MentionedUser = {
        id: user.id,
        name: user.name,
        startIndex: startPosition,
        endIndex: startPosition + mentionText.length - 1,
      };
      setMentions((prev) => [...prev, newMention]);

      // Close dropdown and refocus
      closeMention();

      // Set cursor after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursor = startPosition + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    },
    [content, cursorPosition, startPosition, closeMention]
  );

  const handleSend = useCallback(async () => {
    if (!hasContent || isSending) return;

    setIsSending(true);
    try {
      await onSend({
        content: content.trim(),
        attachments,
        entityLinks,
        mentions: mentions.length > 0 ? mentions : undefined,
      });

      // Clear after successful send
      setContent('');
      setAttachments([]);
      setEntityLinks([]);
      setMentions([]);
      textareaRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  }, [content, attachments, entityLinks, mentions, hasContent, isSending, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Check if mention dropdown should handle the key
      const result = handleMentionKeyDown(e);

      if (result && typeof result === 'object') {
        // User selected from mention dropdown
        handleSelectMention(result);
        return;
      }

      if (result === true) {
        // Key was handled by mention dropdown
        return;
      }

      // Send on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleMentionKeyDown, handleSelectMention, handleSend]
  );

  // Insert @ at cursor position
  const insertMentionTrigger = useCallback(() => {
    if (!textareaRef.current) return;

    const cursor = textareaRef.current.selectionStart || 0;
    const before = content.slice(0, cursor);
    const after = content.slice(cursor);

    // Add space before @ if needed
    const needSpace = before.length > 0 && !/\s$/.test(before);
    const newContent = before + (needSpace ? ' @' : '@') + after;

    setContent(newContent);

    // Trigger mention search
    const newCursor = cursor + (needSpace ? 2 : 1);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
        handleInputChange(newContent, newCursor);
      }
    }, 0);
  }, [content, handleInputChange]);

  const handleScreenshotCapture = useCallback((attachment: AttachmentInput) => {
    setAttachments((prev) => [...prev, attachment]);
  }, []);

  const handleEntitySelect = useCallback((entity: EntityLinkInput) => {
    setEntityLinks((prev) => [...prev, entity]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isImage = file.type.startsWith('image/');
        const attachment: AttachmentInput = {
          type: isImage ? 'IMAGE' : file.type.includes('pdf') ? 'DOCUMENT' : 'FILE',
          filename: file.name,
          fileUrl: reader.result as string,
          fileSize: file.size,
          mimeType: file.type,
        };

        if (isImage) {
          const img = new Image();
          img.onload = () => {
            attachment.width = img.width;
            attachment.height = img.height;
            setAttachments((prev) => [...prev, attachment]);
          };
          img.src = reader.result as string;
        } else {
          setAttachments((prev) => [...prev, attachment]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveEntityLink = useCallback((index: number) => {
    setEntityLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Convert inputs to display format
  const displayAttachments: MessageAttachment[] = attachments.map((a, i) => ({
    id: `temp-${i}`,
    messageId: '',
    type: a.type,
    filename: a.filename,
    fileUrl: a.fileUrl,
    fileSize: a.fileSize,
    mimeType: a.mimeType,
    width: a.width,
    height: a.height,
    thumbnailUrl: a.thumbnailUrl,
    capturedContext: a.capturedContext ? JSON.stringify(a.capturedContext) : undefined,
    uploadedById: '',
    uploadedAt: new Date(),
  }));

  const displayEntityLinks: EntityLink[] = entityLinks.map((e, i) => ({
    id: `temp-${i}`,
    messageId: '',
    ...e,
    createdAt: new Date(),
  }));

  return (
    <div ref={containerRef} className={cn('border rounded-lg bg-card', className)}>
      {/* Mentioned users preview */}
      {mentions.length > 0 && (
        <div className="px-3 py-2 border-b flex items-center gap-2 flex-wrap">
          <AtSign className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Mentioning:</span>
          {mentions.map((m, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setMentions((prev) => prev.filter((_, idx) => idx !== i))}
            >
              @{m.name} ×
            </Badge>
          ))}
        </div>
      )}

      {/* Attachment Preview */}
      <AttachmentPreview
        attachments={displayAttachments}
        entityLinks={displayEntityLinks}
        onRemoveAttachment={handleRemoveAttachment}
        onRemoveEntityLink={handleRemoveEntityLink}
      />

      {/* Input Area */}
      <div className="flex items-end gap-2 p-2">
        {/* Toolbar - larger touch targets on mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Mention button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={insertMentionTrigger}
                disabled={disabled || isSending}
                className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
                aria-label="Nhắc đến người dùng"
              >
                <AtSign className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mention User (@)</TooltipContent>
          </Tooltip>

          {/* Screenshot capture - hide on mobile for space */}
          <div className="hidden sm:block">
            <ScreenshotCapture
              onCapture={handleScreenshotCapture}
              disabled={disabled || isSending}
            />
          </div>

          {/* Entity picker - hide on very small mobile */}
          <div className="hidden xs:block">
            <EntityPicker
              onSelect={handleEntitySelect}
              disabled={disabled || isSending}
            />
          </div>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isSending}
                className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
                aria-label="Đính kèm tệp"
              >
                <Paperclip className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach File</TooltipContent>
          </Tooltip>
        </div>

        {/* Text input with mention autocomplete */}
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-h-[40px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />

          {/* Mention autocomplete dropdown */}
          <MentionAutocomplete
            isActive={mentionActive}
            users={mentionUsers}
            selectedIndex={selectedIndex}
            isLoading={mentionLoading}
            position={dropdownPosition}
            onSelect={handleSelectMention}
            onClose={closeMention}
          />
        </div>

        {/* Send button - larger touch target on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!hasContent || disabled || isSending}
              className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
              aria-label="Gửi tin nhắn"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Send className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send Message</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
