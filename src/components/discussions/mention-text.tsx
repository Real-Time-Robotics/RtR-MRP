'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MentionData {
  id: string;
  userId?: string | null;
  mentionType: 'USER' | 'ROLE' | 'ALL';
  roleName?: string | null;
  startIndex?: number | null;
  endIndex?: number | null;
  user?: {
    id: string;
    name: string | null;
  } | null;
}

interface MentionTextProps {
  content: string;
  mentions?: MentionData[];
  className?: string;
  highlightCurrentUser?: string; // Current user ID to highlight their mentions
}

interface ParsedSegment {
  type: 'text' | 'mention';
  content: string;
  mention?: MentionData;
}

export function MentionText({
  content,
  mentions = [],
  className,
  highlightCurrentUser,
}: MentionTextProps) {
  const segments = useMemo(() => {
    if (!mentions || mentions.length === 0) {
      // No structured mentions, try to parse @mentions from text
      return parseInlineMentions(content);
    }

    // Sort mentions by startIndex
    const sortedMentions = [...mentions]
      .filter((m) => m.startIndex != null && m.endIndex != null)
      .sort((a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0));

    if (sortedMentions.length === 0) {
      return parseInlineMentions(content);
    }

    const result: ParsedSegment[] = [];
    let lastIndex = 0;

    for (const mention of sortedMentions) {
      const startIdx = mention.startIndex ?? 0;
      const endIdx = mention.endIndex ?? 0;

      // Add text before mention
      if (startIdx > lastIndex) {
        result.push({
          type: 'text',
          content: content.slice(lastIndex, startIdx),
        });
      }

      // Add mention segment
      const mentionText = content.slice(startIdx, endIdx + 1);
      result.push({
        type: 'mention',
        content: mentionText,
        mention,
      });

      lastIndex = endIdx + 1;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      result.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return result;
  }, [content, mentions]);

  return (
    <span className={cn('whitespace-pre-wrap break-words', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>;
        }

        // Mention segment
        const isCurrentUser = segment.mention?.userId === highlightCurrentUser;
        const displayName = getMentionDisplayName(segment);

        if (segment.mention?.userId) {
          // Clickable user mention
          return (
            <Link
              key={index}
              href={`/settings/users/${segment.mention.userId}`}
              className={cn(
                'inline-flex items-center px-1 py-0.5 rounded text-sm font-medium transition-colors',
                isCurrentUser
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
              )}
            >
              {displayName}
            </Link>
          );
        }

        // Non-clickable mention (role or @all)
        return (
          <span
            key={index}
            className={cn(
              'inline-flex items-center px-1 py-0.5 rounded text-sm font-medium',
              segment.mention?.mentionType === 'ALL'
                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
            )}
          >
            {displayName}
          </span>
        );
      })}
    </span>
  );
}

// Get display name for a mention
function getMentionDisplayName(segment: ParsedSegment): string {
  if (segment.mention?.user?.name) {
    return `@${segment.mention.user.name}`;
  }
  if (segment.mention?.mentionType === 'ALL') {
    return '@all';
  }
  if (segment.mention?.mentionType === 'ROLE' && segment.mention.roleName) {
    return `@${segment.mention.roleName}`;
  }
  // Fall back to content
  return segment.content;
}

// Parse inline @mentions from text (fallback when no structured mentions)
function parseInlineMentions(content: string): ParsedSegment[] {
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  const result: ParsedSegment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Add inline mention (without structured data)
    result.push({
      type: 'mention',
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    result.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  // If no mentions found, return just the text
  if (result.length === 0) {
    return [{ type: 'text', content }];
  }

  return result;
}

// Utility component for displaying a single mention badge (for use in other places)
interface MentionBadgeProps {
  name: string;
  userId?: string;
  type?: 'user' | 'role' | 'all';
  isCurrentUser?: boolean;
  size?: 'sm' | 'md';
}

export function MentionBadge({
  name,
  userId,
  type = 'user',
  isCurrentUser = false,
  size = 'md',
}: MentionBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-1 py-0.5' : 'text-sm px-1.5 py-0.5';

  const colorClasses = {
    user: isCurrentUser
      ? 'bg-primary/20 text-primary hover:bg-primary/30'
      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20',
    role: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    all: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  };

  if (userId && type === 'user') {
    return (
      <Link
        href={`/settings/users/${userId}`}
        className={cn(
          'inline-flex items-center rounded font-medium transition-colors',
          sizeClasses,
          colorClasses[type]
        )}
      >
        @{name}
      </Link>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium',
        sizeClasses,
        colorClasses[type]
      )}
    >
      @{name}
    </span>
  );
}
