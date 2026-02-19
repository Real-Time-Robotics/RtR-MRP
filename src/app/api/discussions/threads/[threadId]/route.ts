/**
 * API: Single Thread Operations
 * GET - Get thread details
 * PATCH - Update thread (status, priority, title)
 * DELETE - Delete thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';

const threadPatchSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  title: z.string().optional(),
});
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
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
});

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { threadId } = await context.params;
    const body = await request.json();
    const parsed = threadPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { status, priority, title } = parsed.data;

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
});

export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
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
});
