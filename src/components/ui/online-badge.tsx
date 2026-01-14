'use client';

import { useSocketContextSafe } from '@/providers/socket-provider';
import { cn } from '@/lib/utils';

interface OnlineBadgeProps {
  userId: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OnlineBadge({
  userId,
  showText = false,
  size = 'sm',
  className,
}: OnlineBadgeProps) {
  const socket = useSocketContextSafe();
  const isOnline = socket?.isUserOnline(userId) ?? false;

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full',
          dotSizeClasses[size],
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'
        )}
      />
      {showText && (
        <span
          className={cn(
            'text-[10px]',
            isOnline ? 'text-green-500' : 'text-muted-foreground'
          )}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}

/**
 * Online status dot for use in avatars
 */
interface OnlineDotProps {
  userId: string;
  className?: string;
}

export function OnlineDot({ userId, className }: OnlineDotProps) {
  const socket = useSocketContextSafe();
  const isOnline = socket?.isUserOnline(userId) ?? false;

  if (!isOnline) return null;

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full',
        className
      )}
    />
  );
}
