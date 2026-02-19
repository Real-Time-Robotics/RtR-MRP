import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET single thread
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { threadId } = await context.params

    const thread = await prisma.conversationThread.findUnique({
      where: { id: threadId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        participants: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        _count: { select: { messages: true } }
      }
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Update last read for current user
    await prisma.threadParticipant.upsert({
      where: {
        threadId_userId: {
          threadId: threadId,
          userId: session.user.id
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        threadId: threadId,
        userId: session.user.id,
        lastReadAt: new Date()
      }
    })

    return NextResponse.json(thread)

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads/[threadId]' })
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    )
  }
});

// PATCH - Update thread status/priority
const updateThreadSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  title: z.string().optional(),
})

export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { threadId } = await context.params
    const body = await request.json()
    const data = updateThreadSchema.parse(body)

    const updateData: Record<string, unknown> = { ...data }

    // If resolving, set resolvedAt and resolvedById
    if (data.status === 'RESOLVED') {
      updateData.resolvedAt = new Date()
      updateData.resolvedById = session.user.id
    }

    const thread = await prisma.conversationThread.update({
      where: { id: threadId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Add system message for status change
    if (data.status) {
      await prisma.message.create({
        data: {
          threadId: threadId,
          senderId: session.user.id,
          content: `Changed status to ${data.status}`,
          isSystemMessage: true,
        }
      })
    }

    return NextResponse.json(thread)

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads/[threadId]' })
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    )
  }
});

// DELETE - Archive thread
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { threadId } = await context.params

    // Archive instead of delete
    await prisma.conversationThread.update({
      where: { id: threadId },
      data: { status: 'ARCHIVED' }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads/[threadId]' })
    return NextResponse.json(
      { error: 'Failed to archive thread' },
      { status: 500 }
    )
  }
});
