'use client';

import { cn } from '@/lib/utils';

/**
 * LivePulse — Animated dot indicating real-time data connection.
 * Inspired by World Monitor's status-dot / live-dot pattern.
 *
 * @param status - 'live' (green pulse), 'stale' (amber slow pulse), 'offline' (red static)
 * @param size - 'sm' (6px), 'md' (8px), 'lg' (10px)
 */
export function LivePulse({
  status = 'live',
  size = 'sm',
  className,
}: {
  status?: 'live' | 'stale' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' };

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block rounded-full flex-shrink-0',
        sizeMap[size],
        status === 'live' && 'bg-production-green animate-[pulse-dot_2s_infinite]',
        status === 'stale' && 'bg-alert-amber animate-[pulse-dot_3s_infinite]',
        status === 'offline' && 'bg-urgent-red opacity-60',
        className,
      )}
    />
  );
}
