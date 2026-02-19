'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  CheckCheck,
  X,
  RefreshCw,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertSeverity,
  SEVERITY_CONFIG,
  formatAlertTime,
} from '@/lib/alerts/alert-engine';

interface AlertSummary {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  unread: number;
  latestAlerts: Alert[];
}

export function AlertBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch alert summary
  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/v2/alerts?view=summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch alerts', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Acknowledge all alerts
  const handleAcknowledgeAll = async () => {
    setAcknowledging(true);
    try {
      await fetch('/api/v2/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_all' }),
      });
      await fetchSummary();
    } catch (error) {
      clientLogger.error('Failed to acknowledge alerts', error);
    } finally {
      setAcknowledging(false);
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const unreadCount = summary?.unread || 0;
  const hasCritical = (summary?.bySeverity.critical || 0) > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          isOpen && 'bg-gray-100 dark:bg-gray-700'
        )}
        aria-label="Notifications"
      >
        <Bell className={cn('w-5 h-5', hasCritical ? 'text-red-500' : 'text-gray-600 dark:text-gray-300')} />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full',
              'flex items-center justify-center text-xs font-bold text-white',
              hasCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Thông báo</h3>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Không có thông báo mới'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchSummary()}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Làm mới"
                aria-label="Làm mới"
              >
                <RefreshCw className={cn('w-4 h-4 text-gray-500', loading && 'animate-spin')} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleAcknowledgeAll}
                  disabled={acknowledging}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Đánh dấu tất cả đã đọc"
                  aria-label="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className={cn('w-4 h-4', acknowledging ? 'text-gray-300' : 'text-gray-500')} />
                </button>
              )}
            </div>
          </div>

          {/* Alert List */}
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : summary?.latestAlerts && summary.latestAlerts.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {summary.latestAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/alerts?id=${alert.id}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                      alert.status === 'ACTIVE' && 'bg-red-50/50 dark:bg-red-900/10'
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        alert.status === 'ACTIVE' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {formatAlertTime(new Date(alert.createdAt))}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Bell className="w-8 h-8 mb-2" />
                <p className="text-sm">Không có thông báo</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <Link
              href="/alerts"
              onClick={() => setIsOpen(false)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Xem tất cả
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/alerts?view=settings"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Cài đặt thông báo"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
