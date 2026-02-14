/**
 * API: Single Message Operations
 * PATCH - Edit message (with history tracking)
 * DELETE - Delete message
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { broadcastMessageUpdate, broadcastMessageDelete } from '@/lib/socket/emit';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ messageId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await context.params;
    const body = await request.json();
    const { content, reason } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get current message
    const existingMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { thread: true },
    });

    if (!existingMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check ownership
    if (existingMessage.senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    // Check if thread is archived
    if (existingMessage.thread.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Cannot edit messages in archived thread' },
        { status: 403 }
      );
    }

    // Check if content actually changed
    if (existingMessage.content === content.trim()) {
      return NextResponse.json(
        { error: 'No changes detected' },
        { status: 400 }
      );
    }

    // Save edit history and update message
    const [, updatedMessage] = await prisma.$transaction([
      // Create edit history entry
      prisma.messageEditHistory.create({
        data: {
          messageId,
          previousContent: existingMessage.content,
          editedById: session.user.id,
          reason,
        },
      }),
      // Update message
      prisma.message.update({
        where: { id: messageId },
        data: {
          content: content.trim(),
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true },
          },
          attachments: true,
          editHistory: {
            orderBy: { editedAt: 'desc' },
          },
          entityLinks: true,
        },
      }),
    ]);

    // Broadcast message update via Socket.io
    try {
      broadcastMessageUpdate(existingMessage.threadId, {
        id: updatedMessage.id,
        threadId: existingMessage.threadId,
        content: updatedMessage.content,
        senderId: updatedMessage.senderId,
        sender: updatedMessage.sender,
        attachments: updatedMessage.attachments,
        entityLinks: updatedMessage.entityLinks,
        createdAt: updatedMessage.createdAt.toISOString(),
        isEdited: updatedMessage.isEdited,
        editedAt: updatedMessage.editedAt?.toISOString(),
      });
    } catch (err) {
      logger.error('Failed to broadcast message update', { context: '/api/discussions/messages/[messageId]', details: err instanceof Error ? err.message : String(err) });
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/discussions/messages/[messageId]' });
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await context.params;

    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { thread: true },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check ownership
    if (message.senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Delete message (cascades to attachments, edit history, entity links)
    await prisma.message.delete({
      where: { id: messageId },
    });

    // Broadcast message deletion via Socket.io
    try {
      broadcastMessageDelete(message.threadId, messageId);
    } catch (err) {
      logger.error('Failed to broadcast message deletion', { context: '/api/discussions/messages/[messageId]', details: err instanceof Error ? err.message : String(err) });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/discussions/messages/[messageId]' });
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
