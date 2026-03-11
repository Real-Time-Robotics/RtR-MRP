'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * LiveRelativeTime — Self-updating relative timestamp like World Monitor.
 * Automatically refreshes display: "Vừa xong" → "2 phút trước" → "1 giờ trước"
 */
export function LiveRelativeTime({
  date,
  className,
}: {
  date: Date | string;
  className?: string;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const target = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let text: string;
  if (diffSec < 30) text = 'Vừa xong';
  else if (diffMin < 1) text = `${diffSec}s trước`;
  else if (diffMin < 60) text = `${diffMin} phút trước`;
  else if (diffHr < 24) text = `${diffHr} giờ trước`;
  else text = `${diffDay} ngày trước`;

  return (
    <time
      dateTime={target.toISOString()}
      title={target.toLocaleString('vi-VN')}
      className={cn('text-muted-foreground tabular-nums', className)}
    >
      {text}
    </time>
  );
}
