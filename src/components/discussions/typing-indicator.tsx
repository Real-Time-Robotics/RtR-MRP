'use client';

import { cn } from '@/lib/utils';

interface TypingUser {
  userId: string;
  userName: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getText = () => {
    if (users.length === 1) {
      return `${users[0].userName} is typing...`;
    }
    if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`;
    }
    return `${users[0].userName} and ${users.length - 1} others are typing...`;
  };

  return (
    <div
      className={cn(
        'px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground',
        className
      )}
    >
      {/* Animated dots */}
      <div className="flex gap-0.5">
        <span
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>{getText()}</span>
    </div>
  );
}
