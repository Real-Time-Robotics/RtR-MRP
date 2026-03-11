'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * TickingValue — World Monitor-style animated counter that smoothly
 * transitions between numeric values using requestAnimationFrame.
 */
export function TickingValue({
  value,
  format,
  duration = 600,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  // Guard against NaN/Infinity
  const safeValue = isFinite(value) ? value : 0;

  const [display, setDisplay] = useState(safeValue);
  const prevRef = useRef(safeValue);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = safeValue;
    if (from === to) return;

    setDirection(to > from ? 'up' : 'down');

    const start = performance.now();
    const delta = to - from;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + delta * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(to);
        prevRef.current = to;
        timerRef.current = setTimeout(() => setDirection(null), 800);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [safeValue, duration]);

  const formatted = format ? format(display) : Math.round(display).toLocaleString();

  return (
    <span
      className={cn(
        'font-mono font-semibold tabular-nums transition-colors duration-300',
        direction === 'up' && 'text-production-green',
        direction === 'down' && 'text-urgent-red',
        className,
      )}
    >
      {formatted}
    </span>
  );
}
