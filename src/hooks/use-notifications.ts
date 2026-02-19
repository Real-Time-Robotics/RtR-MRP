'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContextSafe } from '@/providers/socket-provider';
import { clientLogger } from '@/lib/client-logger';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  link?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  mentionedBy?: string | null;
  mentionedByName?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  contextType?: string | null;
  contextId?: string | null;
  contextUrl?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  isArchived?: boolean;
  createdAt: Date;
}

interface UseNotificationsOptions {
  pollInterval?: number; // in milliseconds, 0 to disable polling when socket is connected
  enabled?: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  requestBrowserPermission: () => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { pollInterval = 30000, enabled = true } = options;

  const socket = useSocketContextSafe();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      setNotifications(
        data.notifications.map((n: Notification) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : null,
        }))
      );
      setError(null);
    } catch (err) {
      clientLogger.error('Failed to fetch notifications', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    fetchNotifications();
  }, [enabled, fetchNotifications]);

  // Polling fallback (only when socket is not connected)
  useEffect(() => {
    if (!enabled) return;

    // If socket is connected, don't poll
    if (socket?.isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set up polling as fallback
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchNotifications, pollInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollInterval, fetchNotifications, socket?.isConnected]);

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket?.onNewNotification) return;

    const unsubscribe = socket.onNewNotification((notification) => {
      // Add new notification to the top of the list
      setNotifications((prev) => {
        // Avoid duplicates
        if (prev.some((n) => n.id === notification.id)) return prev;

        const newNotification: Notification = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority as Notification['priority'],
          link: notification.link,
          mentionedByName: notification.mentionedByName,
          threadId: notification.threadId,
          messageId: notification.messageId,
          isRead: false,
          createdAt: new Date(notification.createdAt),
        };

        // Show browser notification if permitted
        showBrowserNotification(newNotification);

        return [newNotification, ...prev];
      });
    });

    return unsubscribe;
  }, [socket?.onNewNotification]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
        )
      );
    } catch (err) {
      clientLogger.error('Failed to mark notification as read', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
    } catch (err) {
      clientLogger.error('Failed to mark all notifications as read', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      clientLogger.error('Failed to delete notification', err);
      throw err;
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive notification');
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isArchived: true } : n
        )
      );
    } catch (err) {
      clientLogger.error('Failed to archive notification', err);
      throw err;
    }
  }, []);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    archiveNotification,
    refresh: fetchNotifications,
    requestBrowserPermission,
  };
}

// Helper function to show browser notification
function showBrowserNotification(notification: Notification) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id, // Prevents duplicate notifications
    });
  } catch (err) {
    clientLogger.error('Failed to show browser notification', err);
  }
}
