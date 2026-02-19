import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET messages in thread
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { threadId } = await context.params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor')

    const messages = await prisma.message.findMany({
      where: { threadId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'asc' }, // Oldest first for chat
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        },
        mentions: true
      }
    })

    const hasMore = messages.length > limit
    if (hasMore) messages.pop()

    // Update last read for current user
    await prisma.threadParticipant.upsert({
      where: {
        threadId_userId: {
          threadId,
          userId: session.user.id
        }
      },
      update: { lastReadAt: new Date() },
      create: {
        threadId,
        userId: session.user.id,
        lastReadAt: new Date()
      }
    })

    return NextResponse.json({
      data: messages,
      hasMore,
      nextCursor: hasMore ? messages[messages.length - 1]?.id : null
    })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads/[threadId]/messages' })
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
});

// POST new message
const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  mentionUserIds: z.array(z.string()).optional(),
  mentionRoles: z.array(z.string()).optional(),
})

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { threadId } = await context.params
    const body = await request.json()
    const data = createMessageSchema.parse(body)

    // Create message in transaction
    const message = await prisma.$transaction(async (tx) => {
      // 1. Create message
      const newMessage = await tx.message.create({
        data: {
          threadId,
          senderId: session.user.id,
          content: data.content,
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // 2. Update thread lastMessageAt
      await tx.conversationThread.update({
        where: { id: threadId },
        data: {
          lastMessageAt: new Date(),
          // Reopen if resolved
          status: 'OPEN'
        }
      })

      // 3. Add sender as participant if not already
      await tx.threadParticipant.upsert({
        where: {
          threadId_userId: {
            threadId,
            userId: session.user.id
          }
        },
        update: { lastReadAt: new Date() },
        create: {
          threadId,
          userId: session.user.id,
          lastReadAt: new Date()
        }
      })

      // 4. Create mentions
      if (data.mentionUserIds?.length) {
        await tx.mention.createMany({
          data: data.mentionUserIds.map(userId => ({
            messageId: newMessage.id,
            mentionType: 'USER' as const,
            userId,
          }))
        })

        // Add mentioned users as participants
        await tx.threadParticipant.createMany({
          data: data.mentionUserIds.map(userId => ({
            threadId,
            userId,
          })),
          skipDuplicates: true,
        })
      }

      if (data.mentionRoles?.length) {
        await tx.mention.createMany({
          data: data.mentionRoles.map(roleName => ({
            messageId: newMessage.id,
            mentionType: 'ROLE' as const,
            roleName,
          }))
        })
      }

      return newMessage
    })

    return NextResponse.json(message, { status: 201 })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads/[threadId]/messages' })
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
});
