/**
 * API: Single Message Operations
 * PATCH - Edit message (with history tracking)
 * DELETE - Delete message
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { broadcastMessageUpdate, broadcastMessageDelete } from '@/lib/socket/emit';

const messagePatchSchema = z.object({
  content: z.string().min(1, 'Nội dung tin nhắn không được để trống'),
  reason: z.string().optional(),
});
import { logger } from '@/lib/logger';

import { checkWriteEndpointLimit } from '@/lib/rate-limit';
interface RouteContext {
  params: Promise<{ messageId: string }>;
}

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { messageId } = await context.params;
    const body = await request.json();
    const parsed = messagePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { content, reason } = parsed.data;

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
});

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
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
});
