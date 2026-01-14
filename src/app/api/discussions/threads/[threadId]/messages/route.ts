/**
 * API: Thread Messages
 * GET - Get messages for thread
 * POST - Create new message with attachments and entity links
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notifyMentions, notifyReply } from '@/lib/notifications';
import { broadcastNewMessage } from '@/lib/socket/emit';

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');

    // Check if thread exists
    const thread = await prisma.conversationThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Fetch messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: { threadId },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        attachments: true,
        editHistory: {
          orderBy: { editedAt: 'desc' },
        },
        entityLinks: true,
        mentions: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    // Update participant's last read
    await prisma.threadParticipant.updateMany({
      where: {
        threadId,
        userId: session.user.id,
      },
      data: {
        lastReadAt: new Date(),
        lastReadMessageId: messages[messages.length - 1]?.id,
      },
    });

    return NextResponse.json({
      messages,
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await context.params;
    const body = await request.json();
    const { content, attachments = [], entityLinks = [], mentions = [] } = body;

    // Validate input
    if (!content?.trim() && attachments.length === 0 && entityLinks.length === 0) {
      return NextResponse.json(
        { error: 'Message must have content, attachments, or entity links' },
        { status: 400 }
      );
    }

    // Check if thread exists and is not archived
    const thread = await prisma.conversationThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Cannot send messages to archived thread' },
        { status: 403 }
      );
    }

    // Create message with attachments and entity links
    const message = await prisma.message.create({
      data: {
        threadId,
        senderId: session.user.id,
        content: content?.trim() || '',
        attachments: {
          create: attachments.map((att: any) => ({
            type: att.type,
            filename: att.filename,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            width: att.width,
            height: att.height,
            thumbnailUrl: att.thumbnailUrl,
            capturedContext: att.capturedContext
              ? JSON.stringify(att.capturedContext)
              : null,
            uploadedById: session.user.id,
          })),
        },
        entityLinks: {
          create: entityLinks.map((link: any) => ({
            entityType: link.entityType,
            entityId: link.entityId,
            entityTitle: link.entityTitle,
            entitySubtitle: link.entitySubtitle,
            entityIcon: link.entityIcon,
            entityStatus: link.entityStatus,
          })),
        },
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        attachments: true,
        entityLinks: true,
      },
    });

    // Update thread's lastMessageAt
    await prisma.conversationThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    // Ensure sender is a participant
    await prisma.threadParticipant.upsert({
      where: {
        threadId_userId: {
          threadId,
          userId: session.user.id,
        },
      },
      update: {
        lastReadAt: new Date(),
        lastReadMessageId: message.id,
      },
      create: {
        threadId,
        userId: session.user.id,
        lastReadAt: new Date(),
        lastReadMessageId: message.id,
      },
    });

    // Handle mentions and notifications (async, don't block response)
    const senderName = session.user.name || session.user.email || 'Someone';
    const mentionedUserIds = mentions.map((m: { id: string }) => m.id);

    if (mentions.length > 0) {
      notifyMentions({
        messageId: message.id,
        threadId,
        mentionedUsers: mentions,
        mentionedById: session.user.id,
        mentionedByName: senderName,
      }).catch((err) => console.error('Failed to notify mentions:', err));
    }

    // Notify other participants about the reply (excluding mentioned users to avoid duplicates)
    notifyReply({
      threadId,
      messageId: message.id,
      senderId: session.user.id,
      senderName,
      excludeUserIds: mentionedUserIds,
    }).catch((err) => console.error('Failed to notify reply:', err));

    // Broadcast new message via Socket.io
    try {
      broadcastNewMessage(threadId, {
        id: message.id,
        threadId,
        content: message.content,
        senderId: message.senderId,
        sender: message.sender,
        attachments: message.attachments,
        entityLinks: message.entityLinks,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (err) {
      console.error('Failed to broadcast message:', err);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
