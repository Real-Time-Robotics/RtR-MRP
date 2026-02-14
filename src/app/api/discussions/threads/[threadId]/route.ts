/**
 * API: Single Thread Operations
 * GET - Get thread details
 * PATCH - Update thread (status, priority, title)
 * DELETE - Delete thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

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

    const thread = await prisma.conversationThread.findUnique({
      where: { id: threadId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/discussions/threads/[threadId]' });
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await context.params;
    const body = await request.json();
    const { status, priority, title } = body;

    // Check if thread exists
    const existingThread = await prisma.conversationThread.findUnique({
      where: { id: threadId },
    });

    if (!existingThread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Update thread
    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = session.user.id;
      } else if (existingThread.status === 'RESOLVED') {
        // Reopening - clear resolved info
        updateData.resolvedAt = null;
        updateData.resolvedById = null;
      }
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    const thread = await prisma.conversationThread.update({
      where: { id: threadId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // If status changed, create system message
    if (status && status !== existingThread.status) {
      await prisma.message.create({
        data: {
          threadId,
          senderId: session.user.id,
          content: `Thread status changed to ${status.toLowerCase().replace('_', ' ')}`,
          isSystemMessage: true,
        },
      });
    }

    return NextResponse.json({ thread });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/discussions/threads/[threadId]' });
    return NextResponse.json(
      { error: 'Failed to update thread' },
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

    const { threadId } = await context.params;

    // Check if thread exists and user is creator
    const thread = await prisma.conversationThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.createdById !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the creator can delete this thread' },
        { status: 403 }
      );
    }

    // Delete thread (cascades to messages, participants, etc.)
    await prisma.conversationThread.delete({
      where: { id: threadId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/discussions/threads/[threadId]' });
    return NextResponse.json(
      { error: 'Failed to delete thread' },
      { status: 500 }
    );
  }
}
