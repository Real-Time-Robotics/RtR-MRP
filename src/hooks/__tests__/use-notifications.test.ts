import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock client-logger
vi.mock('@/lib/client-logger', () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock socket provider
const mockSocket = {
  isConnected: false,
  onNewNotification: vi.fn(),
};

vi.mock('@/providers/socket-provider', () => ({
  useSocketContextSafe: () => mockSocket,
}));

import { useNotifications } from '../use-notifications';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  mockSocket.isConnected = false;
  mockSocket.onNewNotification = vi.fn();
});

// =============================================================================
// TESTS
// =============================================================================

describe('useNotifications', () => {
  describe('initialization', () => {
    it('should fetch notifications on mount', async () => {
      const mockNotifications = [
        {
          id: 'n1',
          type: 'MENTION',
          title: 'User mentioned you',
          message: 'Hello @you',
          priority: 'normal',
          isRead: false,
          createdAt: '2026-03-01T00:00:00Z',
          readAt: null,
        },
        {
          id: 'n2',
          type: 'REPLY',
          title: 'User replied',
          message: 'Reply text',
          priority: 'normal',
          isRead: true,
          createdAt: '2026-02-28T00:00:00Z',
          readAt: '2026-03-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ notifications: mockNotifications }),
      });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(1);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/notifications?limit=20');
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() =>
        useNotifications({ enabled: false })
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.notifications).toEqual([]);
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch notifications');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read and update state', async () => {
      mockFetch
        // Initial fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              {
                id: 'n1',
                type: 'MENTION',
                title: 'Test',
                message: 'Test',
                priority: 'normal',
                isRead: false,
                createdAt: '2026-03-01T00:00:00Z',
                readAt: null,
              },
            ],
          }),
        })
        // Mark as read call
        .mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.markAsRead('n1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/n1/read', {
        method: 'POST',
      });
      expect(result.current.notifications[0].isRead).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });

    it('should throw on failed mark as read', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              { id: 'n1', type: 'TEST', title: 'T', message: 'M', priority: 'normal', isRead: false, createdAt: '2026-03-01T00:00:00Z', readAt: null },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await expect(
        act(async () => {
          await result.current.markAsRead('n1');
        })
      ).rejects.toThrow('Failed to mark notification as read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              { id: 'n1', type: 'T', title: 'T', message: 'M', priority: 'normal', isRead: false, createdAt: '2026-03-01T00:00:00Z', readAt: null },
              { id: 'n2', type: 'T', title: 'T', message: 'M', priority: 'normal', isRead: false, createdAt: '2026-03-01T00:00:00Z', readAt: null },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(2);
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/read-all', {
        method: 'POST',
      });
      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification and remove from state', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              { id: 'n1', type: 'T', title: 'T', message: 'M', priority: 'normal', isRead: false, createdAt: '2026-03-01T00:00:00Z', readAt: null },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteNotification('n1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/n1', {
        method: 'DELETE',
      });
      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('archiveNotification', () => {
    it('should archive a notification', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              { id: 'n1', type: 'T', title: 'T', message: 'M', priority: 'normal', isRead: false, isArchived: false, createdAt: '2026-03-01T00:00:00Z', readAt: null },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.archiveNotification('n1');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/notifications/n1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      expect(result.current.notifications[0].isArchived).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should re-fetch notifications', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ notifications: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            notifications: [
              { id: 'n1', type: 'T', title: 'T', message: 'M', priority: 'normal', isRead: false, createdAt: '2026-03-01T00:00:00Z', readAt: null },
            ],
          }),
        });

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(0);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('requestBrowserPermission', () => {
    it('should request permission when Notification API is available', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted');
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        writable: true,
        configurable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ notifications: [] }),
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.requestBrowserPermission();
      });

      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('socket integration', () => {
    it('should subscribe to new notifications via socket', async () => {
      const unsubscribe = vi.fn();
      mockSocket.onNewNotification = vi.fn().mockReturnValue(unsubscribe);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ notifications: [] }),
      });

      const { unmount } = renderHook(() => useNotifications());

      await waitFor(() => {
        expect(mockSocket.onNewNotification).toHaveBeenCalled();
      });

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
