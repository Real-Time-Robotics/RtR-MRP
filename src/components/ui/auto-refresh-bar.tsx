'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, Play } from 'lucide-react';

/**
 * AutoRefreshBar — World Monitor-style live indicator with countdown + pause.
 * Shows a thin progress bar that counts down to next auto-refresh.
 */
export function AutoRefreshBar({
  intervalMs = 60_000,
  onRefresh,
  paused: externalPaused,
  className,
}: {
  intervalMs?: number;
  onRefresh: () => void;
  paused?: boolean;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(externalPaused ?? false);
  const [refreshing, setRefreshing] = useState(false);
  const startRef = useRef(Date.now());
  const lockRef = useRef(false); // Concurrency guard

  useEffect(() => {
    if (externalPaused !== undefined) setPaused(externalPaused);
  }, [externalPaused]);

  const doRefresh = useCallback(async () => {
    if (lockRef.current) return; // Prevent concurrent refreshes
    lockRef.current = true;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // Silently handle — dashboard shows its own error states
    } finally {
      setRefreshing(false);
      startRef.current = Date.now();
      setProgress(0);
      lockRef.current = false;
    }
  }, [onRefresh]);

  useEffect(() => {
    if (paused) return;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / intervalMs) * 100, 100);
      setProgress(pct);

      if (elapsed >= intervalMs && !lockRef.current) {
        doRefresh();
      }
    };

    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [paused, intervalMs, doRefresh]);

  const remaining = Math.max(0, Math.ceil((intervalMs - (progress / 100) * intervalMs) / 1000));

  return (
    <div className={cn('flex items-center gap-2', className)} role="status" aria-label="Tự động cập nhật">
      {/* Countdown + status */}
      <button
        onClick={() => setPaused(!paused)}
        className="flex items-center gap-1 px-1.5 py-1 min-h-[28px] text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        title={paused ? 'Tiếp tục tự động cập nhật' : 'Tạm dừng tự động cập nhật'}
        aria-label={paused ? 'Tiếp tục tự động cập nhật' : `Tạm dừng — còn ${remaining} giây`}
      >
        {paused ? (
          <Play className="w-3 h-3" />
        ) : (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-production-green animate-[pulse-dot_2s_infinite]" aria-hidden="true" />
            {remaining}s
          </span>
        )}
      </button>

      {/* Manual refresh */}
      <button
        onClick={doRefresh}
        disabled={refreshing}
        className="flex items-center gap-1 px-1.5 py-1 min-h-[28px] text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        title="Làm mới ngay"
        aria-label="Làm mới dữ liệu"
      >
        <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
      </button>

      {/* Progress bar */}
      {!paused && (
        <div
          className="flex-1 h-[2px] bg-muted rounded-full overflow-hidden min-w-[40px]"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-production-green/60 origin-left transition-transform duration-500 ease-linear"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      )}
    </div>
  );
}
