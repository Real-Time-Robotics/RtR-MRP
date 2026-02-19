import { prisma } from '@/lib/prisma';
import { broadcastNotification } from '@/lib/socket/emit';
import { logger } from '@/lib/logger';

interface MentionedUser {
  id: string;
  name: string;
  startIndex: number;
  endIndex: number;
}

interface NotifyMentionsParams {
  messageId: string;
  threadId: string;
  mentionedUsers: MentionedUser[];
  mentionedById: string;
  mentionedByName: string;
  contextType?: string;
  contextId?: string;
  contextUrl?: string;
}

/**
 * Create notifications for mentioned users in a message
 */
export async function notifyMentions({
  messageId,
  threadId,
  mentionedUsers,
  mentionedById,
  mentionedByName,
  contextType,
  contextId,
  contextUrl,
}: NotifyMentionsParams): Promise<void> {
  if (mentionedUsers.length === 0) return;

  // Get the message content for the notification
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      thread: {
        select: {
          contextType: true,
          contextId: true,
          contextTitle: true,
          title: true,
        },
      },
    },
  });

  if (!message) return;

  const threadTitle = message.thread?.title || message.thread?.contextTitle || 'a discussion';
  const contentPreview = message.content.length > 100
    ? message.content.slice(0, 100) + '...'
    : message.content;

  // Get users who have mention notifications enabled
  const usersToNotify = await prisma.user.findMany({
    where: {
      id: { in: mentionedUsers.map((m) => m.id) },
      notifyOnMention: true,
      // Don't notify the person who made the mention
      NOT: { id: mentionedById },
    },
    select: {
      id: true,
      notifyByEmail: true,
    },
  });

  if (usersToNotify.length === 0) return;

  // Create notifications for each mentioned user
  const notifications = usersToNotify.map((user) => ({
    userId: user.id,
    type: 'MENTION',
    title: `${mentionedByName} mentioned you`,
    message: contentPreview,
    priority: 'normal' as const,
    link: `/discussions/${threadId}?messageId=${messageId}`,
    sourceType: 'MESSAGE',
    sourceId: messageId,
    mentionedBy: mentionedById,
    mentionedByName,
    threadId,
    messageId,
    contextType: contextType || message.thread?.contextType,
    contextId: contextId || message.thread?.contextId,
    contextUrl,
  }));

  // Create notifications in database
  const createdNotifications = await Promise.all(
    notifications.map((n) =>
      prisma.notification.create({
        data: n,
      })
    )
  );

  // Broadcast each notification via Socket.io
  for (const notification of createdNotifications) {
    try {
      broadcastNotification(notification.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        link: notification.link,
        mentionedByName: notification.mentionedByName,
        threadId: notification.threadId,
        messageId: notification.messageId,
        createdAt: notification.createdAt.toISOString(),
      });
    } catch (err) {
      logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'notifications', operation: 'broadcastNotification' });
    }
  }

  // Create mention records
  const mentions = mentionedUsers.map((user) => ({
    messageId,
    mentionType: 'USER' as const,
    userId: user.id,
    startIndex: user.startIndex,
    endIndex: user.endIndex,
  }));

  await prisma.mention.createMany({
    data: mentions,
    skipDuplicates: true,
  });
}

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  link?: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a single notification for a user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  priority = 'normal',
  link,
  sourceType,
  sourceId,
  metadata,
}: CreateNotificationParams): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      priority,
      link,
      sourceType,
      sourceId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

interface NotifyReplyParams {
  threadId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  excludeUserIds?: string[];
}

/**
 * Notify thread participants about a new reply
 */
export async function notifyReply({
  threadId,
  messageId,
  senderId,
  senderName,
  excludeUserIds = [],
}: NotifyReplyParams): Promise<void> {
  // Get thread participants who have reply notifications enabled
  const participants = await prisma.threadParticipant.findMany({
    where: {
      threadId,
      user: {
        notifyOnReply: true,
        id: { notIn: [...excludeUserIds, senderId] },
      },
    },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (participants.length === 0) return;

  // Get message content
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      thread: {
        select: {
          title: true,
          contextTitle: true,
        },
      },
    },
  });

  if (!message) return;

  const threadTitle = message.thread?.title || message.thread?.contextTitle || 'a discussion';
  const contentPreview = message.content.length > 80
    ? message.content.slice(0, 80) + '...'
    : message.content;

  const notificationData = participants.map((p) => ({
    userId: p.user.id,
    type: 'REPLY',
    title: `${senderName} replied in ${threadTitle}`,
    message: contentPreview,
    priority: 'normal' as const,
    link: `/discussions/${threadId}?messageId=${messageId}`,
    sourceType: 'MESSAGE',
    sourceId: messageId,
    threadId,
    messageId,
  }));

  // Create notifications in database
  const createdNotifications = await Promise.all(
    notificationData.map((n) =>
      prisma.notification.create({
        data: n,
      })
    )
  );

  // Broadcast each notification via Socket.io
  for (const notification of createdNotifications) {
    try {
      broadcastNotification(notification.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        link: notification.link,
        threadId: notification.threadId,
        messageId: notification.messageId,
        createdAt: notification.createdAt.toISOString(),
      });
    } catch (err) {
      logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'notifications', operation: 'broadcastReplyNotification' });
    }
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * Get unread mention count for a user
 */
export async function getUnreadMentionCount(userId: string): Promise<number> {
  return prisma.mention.count({
    where: {
      userId,
      isRead: false,
    },
  });
}
