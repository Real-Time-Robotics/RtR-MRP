import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    message: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      count: vi.fn(),
    },
    mention: {
      createMany: vi.fn(),
      count: vi.fn(),
    },
    threadParticipant: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/socket/emit', () => ({
  broadcastNotification: vi.fn(),
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

import { prisma } from '@/lib/prisma';
import { broadcastNotification } from '@/lib/socket/emit';
import {
  createNotification,
  getUnreadNotificationCount,
  getUnreadMentionCount,
  notifyMentions,
  notifyReply,
} from '../notifications';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// TESTS
// =============================================================================

describe('notifications', () => {
  describe('createNotification', () => {
    it('should create a notification with required fields', async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      await createNotification({
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'Test Notification',
        message: 'Hello World',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'SYSTEM',
          title: 'Test Notification',
          message: 'Hello World',
          priority: 'normal',
          link: undefined,
          sourceType: undefined,
          sourceId: undefined,
          metadata: undefined,
        },
      });
    });

    it('should create a notification with optional fields', async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      await createNotification({
        userId: 'user-2',
        type: 'ORDER',
        title: 'Order Created',
        message: 'SO-001 created',
        priority: 'high',
        link: '/orders/so1',
        sourceType: 'SALES_ORDER',
        sourceId: 'so1',
        metadata: { orderNumber: 'SO-001' },
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-2',
          type: 'ORDER',
          title: 'Order Created',
          message: 'SO-001 created',
          priority: 'high',
          link: '/orders/so1',
          sourceType: 'SALES_ORDER',
          sourceId: 'so1',
          metadata: JSON.stringify({ orderNumber: 'SO-001' }),
        },
      });
    });

    it('should use default priority of normal', async () => {
      vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

      await createNotification({
        userId: 'user-1',
        type: 'TEST',
        title: 'Title',
        message: 'Msg',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 'normal' }),
        })
      );
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications for user', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(5 as never);

      const count = await getUnreadNotificationCount('user-1');

      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: false,
        },
      });
    });

    it('should return 0 when no unread notifications', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(0 as never);

      const count = await getUnreadNotificationCount('user-2');
      expect(count).toBe(0);
    });
  });

  describe('getUnreadMentionCount', () => {
    it('should return count of unread mentions for user', async () => {
      vi.mocked(prisma.mention.count).mockResolvedValue(3 as never);

      const count = await getUnreadMentionCount('user-1');

      expect(count).toBe(3);
      expect(prisma.mention.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: false,
        },
      });
    });
  });

  describe('notifyMentions', () => {
    it('should return early when mentionedUsers is empty', async () => {
      await notifyMentions({
        messageId: 'msg-1',
        threadId: 'thread-1',
        mentionedUsers: [],
        mentionedById: 'user-1',
        mentionedByName: 'User 1',
      });

      expect(prisma.message.findUnique).not.toHaveBeenCalled();
    });

    it('should return early when message is not found', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValue(null as never);

      await notifyMentions({
        messageId: 'msg-nonexistent',
        threadId: 'thread-1',
        mentionedUsers: [{ id: 'user-2', name: 'User 2', startIndex: 0, endIndex: 6 }],
        mentionedById: 'user-1',
        mentionedByName: 'User 1',
      });

      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should return early when no users to notify (all have notifications disabled)', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: 'msg-1',
        content: 'Hello @user2',
        thread: { title: 'Discussion', contextTitle: null, contextType: null, contextId: null },
      } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);

      await notifyMentions({
        messageId: 'msg-1',
        threadId: 'thread-1',
        mentionedUsers: [{ id: 'user-2', name: 'User 2', startIndex: 6, endIndex: 12 }],
        mentionedById: 'user-1',
        mentionedByName: 'User 1',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create notifications and mention records for eligible users', async () => {
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: 'msg-1',
        content: 'Hey @User2, check this out',
        thread: { title: 'My Thread', contextTitle: null, contextType: 'PART', contextId: 'part-1' },
      } as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'user-2', notifyByEmail: false },
      ] as never);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
        type: 'MENTION',
        title: 'User 1 mentioned you',
        message: 'Hey @User2, check this out',
        priority: 'normal',
        link: '/discussions/thread-1?messageId=msg-1',
        mentionedByName: 'User 1',
        threadId: 'thread-1',
        messageId: 'msg-1',
        createdAt: new Date('2026-01-01'),
      } as never);

      vi.mocked(prisma.mention.createMany).mockResolvedValue({ count: 1 } as never);

      await notifyMentions({
        messageId: 'msg-1',
        threadId: 'thread-1',
        mentionedUsers: [{ id: 'user-2', name: 'User 2', startIndex: 4, endIndex: 10 }],
        mentionedById: 'user-1',
        mentionedByName: 'User 1',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(broadcastNotification).toHaveBeenCalledTimes(1);
      expect(prisma.mention.createMany).toHaveBeenCalledWith({
        data: [
          {
            messageId: 'msg-1',
            mentionType: 'USER',
            userId: 'user-2',
            startIndex: 4,
            endIndex: 10,
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should truncate long message content to 100 chars', async () => {
      const longContent = 'A'.repeat(200);
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: 'msg-1',
        content: longContent,
        thread: { title: 'Thread', contextTitle: null, contextType: null, contextId: null },
      } as never);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'user-2', notifyByEmail: false },
      ] as never);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
        type: 'MENTION',
        title: 'User 1 mentioned you',
        message: longContent.slice(0, 100) + '...',
        priority: 'normal',
        link: '/discussions/thread-1?messageId=msg-1',
        mentionedByName: 'User 1',
        threadId: 'thread-1',
        messageId: 'msg-1',
        createdAt: new Date(),
      } as never);

      vi.mocked(prisma.mention.createMany).mockResolvedValue({ count: 1 } as never);

      await notifyMentions({
        messageId: 'msg-1',
        threadId: 'thread-1',
        mentionedUsers: [{ id: 'user-2', name: 'User 2', startIndex: 0, endIndex: 6 }],
        mentionedById: 'user-1',
        mentionedByName: 'User 1',
      });

      const createCall = vi.mocked(prisma.notification.create).mock.calls[0][0];
      expect((createCall.data as unknown as Record<string, string>).message).toBe(longContent.slice(0, 100) + '...');
    });
  });

  describe('notifyReply', () => {
    it('should return early when no participants to notify', async () => {
      vi.mocked(prisma.threadParticipant.findMany).mockResolvedValue([] as never);

      await notifyReply({
        threadId: 'thread-1',
        messageId: 'msg-1',
        senderId: 'user-1',
        senderName: 'User 1',
      });

      expect(prisma.message.findUnique).not.toHaveBeenCalled();
    });

    it('should return early when message is not found', async () => {
      vi.mocked(prisma.threadParticipant.findMany).mockResolvedValue([
        { user: { id: 'user-2' } },
      ] as never);
      vi.mocked(prisma.message.findUnique).mockResolvedValue(null as never);

      await notifyReply({
        threadId: 'thread-1',
        messageId: 'msg-1',
        senderId: 'user-1',
        senderName: 'User 1',
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create reply notifications and broadcast them', async () => {
      vi.mocked(prisma.threadParticipant.findMany).mockResolvedValue([
        { user: { id: 'user-2' } },
      ] as never);

      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: 'msg-1',
        content: 'Reply content here',
        thread: { title: 'My Thread', contextTitle: null },
      } as never);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
        type: 'REPLY',
        title: 'User 1 replied in My Thread',
        message: 'Reply content here',
        priority: 'normal',
        link: '/discussions/thread-1?messageId=msg-1',
        threadId: 'thread-1',
        messageId: 'msg-1',
        createdAt: new Date('2026-01-01'),
      } as never);

      await notifyReply({
        threadId: 'thread-1',
        messageId: 'msg-1',
        senderId: 'user-1',
        senderName: 'User 1',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(broadcastNotification).toHaveBeenCalledWith('user-2', expect.objectContaining({
        type: 'REPLY',
        title: 'User 1 replied in My Thread',
      }));
    });

    it('should exclude specified user IDs', async () => {
      await notifyReply({
        threadId: 'thread-1',
        messageId: 'msg-1',
        senderId: 'user-1',
        senderName: 'User 1',
        excludeUserIds: ['user-3'],
      });

      expect(prisma.threadParticipant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              id: { notIn: ['user-3', 'user-1'] },
            }),
          }),
        })
      );
    });
  });
});
