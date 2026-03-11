'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * TickingValue — World Monitor-style animated counter that smoothly
 * transitions between numeric values using requestAnimationFrame.
 *
 * @param value - Target number to display
 * @param format - Formatting function (e.g., currency, percent)
 * @param duration - Animation duration in ms (default 600)
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
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    setDirection(to > from ? 'up' : 'down');

    const start = performance.now();
    const delta = to - from;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + delta * eased;
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(to);
        prevRef.current = to;
        // Clear direction indicator after a brief flash
        setTimeout(() => setDirection(null), 800);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

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
