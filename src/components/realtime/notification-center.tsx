'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  ShoppingCart,
  Package,
  Factory,
  AlertTriangle,
  Calculator,
  Settings,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationSocket } from '@/lib/realtime/use-socket';
import { type NotificationPayload } from '@/lib/realtime/events';

// Webkit AudioContext type for Safari compatibility
interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// =============================================================================
// NOTIFICATION CENTER
// Real-time notification dropdown
// =============================================================================

// =============================================================================
// ICON MAPPING
// =============================================================================

const iconMap: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Factory: <Factory className="w-4 h-4" />,
  AlertTriangle: <AlertTriangle className="w-4 h-4" />,
  Calculator: <Calculator className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
  Info: <Info className="w-4 h-4" />,
  Bell: <Bell className="w-4 h-4" />,
};

const typeStyles: Record<NotificationPayload['type'], { icon: React.ReactNode; bg: string; border: string }> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    icon: <AlertCircle className="w-4 h-4" />,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

const typeColors: Record<NotificationPayload['type'], string> = {
  info: 'text-blue-600 dark:text-blue-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};

// =============================================================================
// TIME AGO HELPER
// =============================================================================

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

// =============================================================================
// NOTIFICATION ITEM
// =============================================================================

interface NotificationItemProps {
  notification: NotificationPayload;
  onDismiss?: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const style = typeStyles[notification.type];
  const icon = notification.icon ? iconMap[notification.icon] : style.icon;

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border transition-all',
        style.bg,
        style.border,
        !notification.read && 'ring-2 ring-purple-500/20',
        notification.link && 'cursor-pointer hover:shadow-md'
      )}
    >
      <div className={cn('p-2 rounded-lg bg-white dark:bg-gray-800', typeColors[notification.type])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'font-medium text-sm',
            !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
          )}>
            {notification.title}
          </p>
          {onDismiss && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDismiss(notification.id);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{formatTimeAgo(notification.timestamp)}</span>
          {notification.link && (
            <>
              <span>•</span>
              <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                Xem chi tiết
                <ChevronRight className="w-3 h-3" />
              </span>
            </>
          )}
        </div>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

// =============================================================================
// NOTIFICATION CENTER COMPONENT
// =============================================================================

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    isConnected,
  } = useNotificationSocket();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Play sound on new notification
  useEffect(() => {
    if (soundEnabled && unreadCount > 0 && !isOpen) {
      // Create a simple beep sound using Web Audio API
      try {
        const WebkitAudioContext = (window as WindowWithWebkitAudio).webkitAudioContext;
        const AudioContextClass = window.AudioContext || WebkitAudioContext;
        if (!AudioContextClass) return;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, [unreadCount, soundEnabled, isOpen]);

  // Mark as read when opening
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [isOpen, unreadCount, markAsRead]);

  const handleDismiss = (id: string) => {
    // In a real app, this would remove the notification
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-xl transition-all',
          isOpen
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[80vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Thông báo</h3>
              {isConnected && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAsRead}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Đánh dấu tất cả đã đọc"
                    aria-label="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Xóa tất cả"
                    aria-label="Xóa tất cả"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500">Không có thông báo</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <Link
                href="/notifications"
                className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-medium hover:underline"
                onClick={() => setIsOpen(false)}
              >
                Xem tất cả thông báo
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NOTIFICATION TOAST (Pop-up notification)
// =============================================================================

interface NotificationToastProps {
  notification: NotificationPayload;
  onClose: () => void;
  duration?: number;
}

export function NotificationToast({ notification, onClose, duration = 5000 }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const style = typeStyles[notification.type];
  const icon = notification.icon ? iconMap[notification.icon] : style.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-in slide-in-from-right-5 duration-200',
        'bg-white dark:bg-gray-800',
        style.border
      )}
    >
      <div className={cn('p-2 rounded-lg', style.bg, typeColors[notification.type])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white text-sm">
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          {notification.message}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
        aria-label="Đóng"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// NOTIFICATION TOAST CONTAINER
// =============================================================================

export function NotificationToastContainer() {
  const [toasts, setToasts] = useState<NotificationPayload[]>([]);
  const { subscribe } = useNotificationSocket();

  useEffect(() => {
    const unsubscribe = subscribe<NotificationPayload>('notification:new', (event) => {
      setToasts(prev => [...prev, event.payload].slice(-3)); // Keep max 3 toasts
    });

    return unsubscribe;
  }, [subscribe]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-96">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default NotificationCenter;
