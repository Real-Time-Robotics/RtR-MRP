'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, XCircle } from 'lucide-react';

export interface BreakingAlert {
  id: string;
  type: 'critical' | 'warning';
  message: string;
  link?: string;
  dismissAfterMs?: number;
}

/**
 * BreakingAlertBanner — World Monitor-style sliding alert banner for critical events.
 * Supports multiple stacked alerts with auto-dismiss and manual close.
 */
export function BreakingAlertBanner({
  alerts,
  onDismiss,
  className,
}: {
  alerts: BreakingAlert[];
  onDismiss?: (id: string) => void;
  className?: string;
}) {
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const newIds = alerts.map((a) => a.id);
    setVisible((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });

    // Auto-dismiss timers
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const alert of alerts) {
      if (alert.dismissAfterMs) {
        timers.push(
          setTimeout(() => {
            setVisible((prev) => {
              const next = new Set(prev);
              next.delete(alert.id);
              return next;
            });
            onDismissRef.current?.(alert.id);
          }, alert.dismissAfterMs),
        );
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [alerts]);

  const dismiss = (id: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onDismiss?.(id);
  };

  const activeAlerts = alerts.filter((a) => visible.has(a.id));
  if (activeAlerts.length === 0) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {activeAlerts.map((alert) => {
        const isCritical = alert.type === 'critical';
        const Icon = isCritical ? XCircle : AlertTriangle;

        return (
          <div
            key={alert.id}
            role="alert"
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono animate-[slide-in-top_0.3s_ease-out]',
              isCritical
                ? 'bg-urgent-red-dim border border-urgent-red/30 text-urgent-red'
                : 'bg-alert-amber-dim border border-alert-amber/30 text-alert-amber',
            )}
          >
            <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isCritical && 'animate-[pulse-dot_1s_infinite]')} />

            <span className="flex-1 truncate font-medium">
              {alert.link ? (
                <a href={alert.link} className="hover:underline">
                  {alert.message}
                </a>
              ) : (
                alert.message
              )}
            </span>

            <button
              onClick={() => dismiss(alert.id)}
              className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity min-h-[28px] min-w-[28px] flex items-center justify-center"
              aria-label="Đóng cảnh báo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
