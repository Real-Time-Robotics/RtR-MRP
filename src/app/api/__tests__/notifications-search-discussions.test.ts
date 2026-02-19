/**
 * Notifications, Search & Discussions API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/prisma', () => ({
  default: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    conversationThread: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    threadParticipant: {
      create: vi.fn(),
    },
  },
  prisma: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    conversationThread: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    threadParticipant: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@/lib/search-engine', () => ({
  globalSearch: vi.fn(),
}));

import { GET as getNotifications, POST as postNotification } from '../notifications/route';
import { GET as getNotificationById, PUT as putNotification, DELETE as deleteNotification } from '../notifications/[id]/route';
import { GET as getSearch } from '../search/route';
import { GET as getThread, POST as postThread } from '../discussions/threads/route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { globalSearch } from '@/lib/search-engine';

const mockContext = { params: Promise.resolve({}) };
const mockIdContext = { params: Promise.resolve({ id: 'notif-1' }) };
const mockSession = { user: { id: 'user1', email: 'test@test.com', name: 'Test User', role: 'ADMIN' } };

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/notifications
  // ===========================================================================
  describe('GET /api/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications');
      const response = await getNotifications(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return notifications for the authenticated user', async () => {
      const mockNotifs = [
        { id: 'notif-1', type: 'info', title: 'Test', message: 'Hello', userId: 'user1', isRead: false },
        { id: 'notif-2', type: 'warning', title: 'Alert', message: 'Warning', userId: 'user1', isRead: true },
      ];

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findMany as Mock).mockResolvedValue(mockNotifs);
      (prisma.notification.count as Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/notifications');
      const response = await getNotifications(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(data.unreadCount).toBe(1);
    });

    it('should respect the limit parameter', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findMany as Mock).mockResolvedValue([]);
      (prisma.notification.count as Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/notifications?limit=5');
      await getNotifications(request, mockContext);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/notifications');
      const response = await getNotifications(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/notifications
  // ===========================================================================
  describe('POST /api/notifications', () => {
    it('should create a notification successfully', async () => {
      const mockCreated = {
        id: 'notif-new',
        userId: 'user1',
        type: 'info',
        title: 'New Alert',
        message: 'Something happened',
        priority: 'normal',
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.create as Mock).mockResolvedValue(mockCreated);

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: 'info', title: 'New Alert', message: 'Something happened' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postNotification(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('New Alert');
    });

    it('should return 400 when required fields are missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ type: 'info' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postNotification(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /api/notifications/[id]
  // ===========================================================================
  describe('GET /api/notifications/[id]', () => {
    it('should return a notification by ID', async () => {
      const mockNotif = {
        id: 'notif-1',
        userId: 'user1',
        type: 'info',
        title: 'Test',
        message: 'Hello',
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotif);

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-1');
      const response = await getNotificationById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notification.title).toBe('Test');
    });

    it('should return 404 when notification not found', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/notifications/nonexistent');
      const response = await getNotificationById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Notification not found');
    });

    it('should return 403 when accessing another user notification', async () => {
      const mockNotif = {
        id: 'notif-1',
        userId: 'other-user',
        type: 'info',
        title: 'Test',
        message: 'Hello',
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotif);

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-1');
      const response = await getNotificationById(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Permission denied');
    });
  });

  // ===========================================================================
  // PUT /api/notifications/[id]
  // ===========================================================================
  describe('PUT /api/notifications/[id]', () => {
    it('should mark notification as read', async () => {
      const mockNotif = { id: 'notif-1', userId: 'user1' };
      const mockUpdated = { id: 'notif-1', userId: 'user1', isRead: true, readAt: new Date().toISOString() };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotif);
      (prisma.notification.update as Mock).mockResolvedValue(mockUpdated);

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
        method: 'PUT',
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await putNotification(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notification.isRead).toBe(true);
    });

    it('should return 403 when updating another user notification', async () => {
      const mockNotif = { id: 'notif-1', userId: 'other-user' };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotif);

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
        method: 'PUT',
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await putNotification(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Permission denied');
    });
  });

  // ===========================================================================
  // DELETE /api/notifications/[id]
  // ===========================================================================
  describe('DELETE /api/notifications/[id]', () => {
    it('should delete notification successfully', async () => {
      const mockNotif = { id: 'notif-1', userId: 'user1' };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotif);
      (prisma.notification.delete as Mock).mockResolvedValue(mockNotif);

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
        method: 'DELETE',
      });
      const response = await deleteNotification(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 403 when deleting another user notification', async () => {
      const mockNotif = { id: 'notif-1', userId: 'other-user' };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.notification.findUnique as Mock).mockResolvedValue(mockNotif);

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
        method: 'DELETE',
      });
      const response = await deleteNotification(request, mockIdContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Permission denied');
    });
  });
});

describe('Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/search
  // ===========================================================================
  describe('GET /api/search', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await getSearch(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return empty results when query is too short', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/search?q=a');
      const response = await getSearch(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(globalSearch).not.toHaveBeenCalled();
    });

    it('should return search results successfully', async () => {
      const mockResults = [
        { type: 'part', id: 'p-1', title: 'P001 - Test Part', subtitle: 'Category: Raw', link: '/inventory/p-1' },
        { type: 'supplier', id: 's-1', title: 'SUP-001 - Steel Corp', subtitle: 'VN', link: '/suppliers/s-1' },
      ];

      (auth as Mock).mockResolvedValue(mockSession);
      (globalSearch as Mock).mockResolvedValue(mockResults);

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await getSearch(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(globalSearch).toHaveBeenCalledWith('test', 20);
    });

    it('should respect the limit parameter', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (globalSearch as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/search?q=test&limit=5');
      await getSearch(request, mockContext);

      expect(globalSearch).toHaveBeenCalledWith('test', 5);
    });

    it('should return 500 when search fails', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (globalSearch as Mock).mockRejectedValue(new Error('Search engine error'));

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await getSearch(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Search failed');
    });
  });
});

describe('Discussions Threads API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/discussions/threads
  // ===========================================================================
  describe('GET /api/discussions/threads', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discussions/threads?contextType=PRODUCTION_ORDER&contextId=po-1');
      const response = await getThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when contextType or contextId is missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/discussions/threads');
      const response = await getThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('contextType and contextId are required');
    });

    it('should return existing thread', async () => {
      const mockThread = {
        id: 'thread-1',
        contextType: 'PRODUCTION_ORDER',
        contextId: 'po-1',
        createdBy: { id: 'user1', name: 'Test User', email: 'test@test.com' },
        participants: [
          { userId: 'user1', user: { id: 'user1', name: 'Test User', email: 'test@test.com' } },
        ],
        _count: { messages: 3 },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.conversationThread.findFirst as Mock).mockResolvedValue(mockThread);

      const request = new NextRequest('http://localhost:3000/api/discussions/threads?contextType=PRODUCTION_ORDER&contextId=po-1');
      const response = await getThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.thread.id).toBe('thread-1');
    });

    it('should create a new thread when none exists', async () => {
      const mockNewThread = {
        id: 'thread-new',
        contextType: 'PRODUCTION_ORDER',
        contextId: 'po-2',
        createdBy: { id: 'user1', name: 'Test User', email: 'test@test.com' },
        participants: [
          { userId: 'user1', user: { id: 'user1', name: 'Test User', email: 'test@test.com' } },
        ],
        _count: { messages: 0 },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.conversationThread.findFirst as Mock).mockResolvedValue(null);
      (prisma.conversationThread.create as Mock).mockResolvedValue(mockNewThread);

      const request = new NextRequest('http://localhost:3000/api/discussions/threads?contextType=PRODUCTION_ORDER&contextId=po-2');
      const response = await getThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.thread.id).toBe('thread-new');
      expect(prisma.conversationThread.create).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // POST /api/discussions/threads
  // ===========================================================================
  describe('POST /api/discussions/threads', () => {
    it('should create a new thread successfully', async () => {
      const mockCreated = {
        id: 'thread-created',
        contextType: 'PRODUCTION_ORDER',
        contextId: 'po-3',
        title: 'Discussion about PO-3',
        priority: 'NORMAL',
        createdBy: { id: 'user1', name: 'Test User', email: 'test@test.com' },
        participants: [
          { userId: 'user1', user: { id: 'user1', name: 'Test User', email: 'test@test.com' } },
        ],
        messages: [],
        _count: { messages: 0 },
      };

      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.conversationThread.findFirst as Mock).mockResolvedValue(null);
      (prisma.conversationThread.create as Mock).mockResolvedValue(mockCreated);

      const request = new NextRequest('http://localhost:3000/api/discussions/threads', {
        method: 'POST',
        body: JSON.stringify({
          contextType: 'PRODUCTION_ORDER',
          contextId: 'po-3',
          title: 'Discussion about PO-3',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.thread.id).toBe('thread-created');
    });

    it('should return 409 when thread already exists for context', async () => {
      (auth as Mock).mockResolvedValue(mockSession);
      (prisma.conversationThread.findFirst as Mock).mockResolvedValue({ id: 'existing-thread' });

      const request = new NextRequest('http://localhost:3000/api/discussions/threads', {
        method: 'POST',
        body: JSON.stringify({
          contextType: 'PRODUCTION_ORDER',
          contextId: 'po-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Thread already exists for this context');
    });

    it('should return 400 when required fields are missing', async () => {
      (auth as Mock).mockResolvedValue(mockSession);

      const request = new NextRequest('http://localhost:3000/api/discussions/threads', {
        method: 'POST',
        body: JSON.stringify({ title: 'Missing context fields' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await postThread(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
