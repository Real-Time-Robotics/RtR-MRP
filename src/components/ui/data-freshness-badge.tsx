'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LivePulse } from './live-pulse';

/**
 * DataFreshnessBadge — Shows data age like World Monitor's panel-data-badge.
 * Automatically transitions: LIVE → CACHED → STALE based on elapsed time.
 *
 * @param lastUpdated - Date of last successful data fetch
 * @param liveThresholdMs - Below this = LIVE (default 30s)
 * @param staleThresholdMs - Above this = STALE (default 120s)
 */
export function DataFreshnessBadge({
  lastUpdated,
  liveThresholdMs = 30_000,
  staleThresholdMs = 120_000,
  className,
}: {
  lastUpdated: Date | null;
  liveThresholdMs?: number;
  staleThresholdMs?: number;
  className?: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  if (!lastUpdated) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-full border',
        'text-urgent-red border-urgent-red/30 bg-urgent-red-dim',
        className,
      )}>
        <LivePulse status="offline" size="sm" />
        Offline
      </span>
    );
  }

  const age = now - lastUpdated.getTime();

  let status: 'live' | 'stale' | 'offline';
  let label: string;
  let colors: string;

  if (age < liveThresholdMs) {
    status = 'live';
    label = 'Live';
    colors = 'text-production-green border-production-green/30 bg-production-green-dim';
  } else if (age < staleThresholdMs) {
    status = 'stale';
    const secs = Math.floor(age / 1000);
    label = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`;
    colors = 'text-alert-amber border-alert-amber/30 bg-alert-amber-dim';
  } else {
    status = 'offline';
    const mins = Math.floor(age / 60_000);
    label = mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
    colors = 'text-urgent-red border-urgent-red/30 bg-urgent-red-dim';
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-full border',
      colors,
      className,
    )}>
      <LivePulse status={status} size="sm" />
      {label}
    </span>
  );
}
