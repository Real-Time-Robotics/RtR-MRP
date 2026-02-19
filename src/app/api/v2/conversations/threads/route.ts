import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// ═══════════════════════════════════════════════════════════════
// GET /api/v2/conversations/threads
// List threads (by context or all)
// ═══════════════════════════════════════════════════════════════

const listQuerySchema = z.object({
  contextType: z.string().optional(),
  contextId: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().default('20'),
  cursor: z.string().optional(),
})

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const { searchParams } = new URL(request.url)
    const query = listQuerySchema.parse({
      contextType: searchParams.get('contextType'),
      contextId: searchParams.get('contextId'),
      status: searchParams.get('status'),
      limit: searchParams.get('limit') || '20',
      cursor: searchParams.get('cursor'),
    })

    const where: Record<string, unknown> = {}

    // Filter by context
    if (query.contextType) {
      where.contextType = query.contextType
    }
    if (query.contextId) {
      where.contextId = query.contextId
    }
    if (query.status) {
      where.status = query.status
    }

    // Cursor pagination
    const cursor = query.cursor ? { id: query.cursor } : undefined

    const threads = await prisma.conversationThread.findMany({
      where,
      take: parseInt(query.limit) + 1, // +1 để check hasMore
      cursor,
      skip: cursor ? 1 : 0,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { messages: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    // Check hasMore
    const hasMore = threads.length > parseInt(query.limit)
    if (hasMore) threads.pop()

    return NextResponse.json({
      data: threads,
      hasMore,
      nextCursor: hasMore ? threads[threads.length - 1]?.id : null
    })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads' })
    return NextResponse.json(
      { error: 'Failed to list threads' },
      { status: 500 }
    )
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/v2/conversations/threads
// Create new thread
// ═══════════════════════════════════════════════════════════════

const createThreadSchema = z.object({
  contextType: z.enum([
    'WORK_ORDER', 'BOM', 'PART', 'INVENTORY', 'QC_REPORT',
    'MRP_RUN', 'PURCHASE_ORDER', 'SUPPLIER', 'CUSTOMER',
    'SALES_ORDER', 'GENERAL'
  ]),
  contextId: z.string().min(1, 'Context ID is required'),
  contextTitle: z.string().optional(),
  title: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  initialMessage: z.string().min(1, 'Initial message is required'),
  mentionUserIds: z.array(z.string()).optional(),
  mentionRoles: z.array(z.string()).optional(),
})

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const body = await request.json()
    const data = createThreadSchema.parse(body)

    // Create thread with initial message in transaction
    const thread = await prisma.$transaction(async (tx) => {
      // 1. Create thread
      const newThread = await tx.conversationThread.create({
        data: {
          contextType: data.contextType,
          contextId: data.contextId,
          contextTitle: data.contextTitle,
          title: data.title,
          priority: data.priority,
          createdById: session.user.id,
          lastMessageAt: new Date(),
        }
      })

      // 2. Add creator as participant
      await tx.threadParticipant.create({
        data: {
          threadId: newThread.id,
          userId: session.user.id,
          lastReadAt: new Date(),
        }
      })

      // 3. Create initial message
      const message = await tx.message.create({
        data: {
          threadId: newThread.id,
          senderId: session.user.id,
          content: data.initialMessage,
        }
      })

      // 4. Create mentions if any
      if (data.mentionUserIds?.length) {
        await tx.mention.createMany({
          data: data.mentionUserIds.map(userId => ({
            messageId: message.id,
            mentionType: 'USER' as const,
            userId,
          }))
        })

        // Add mentioned users as participants
        await tx.threadParticipant.createMany({
          data: data.mentionUserIds.map(userId => ({
            threadId: newThread.id,
            userId,
          })),
          skipDuplicates: true,
        })
      }

      if (data.mentionRoles?.length) {
        await tx.mention.createMany({
          data: data.mentionRoles.map(roleName => ({
            messageId: message.id,
            mentionType: 'ROLE' as const,
            roleName,
          }))
        })
      }

      return newThread
    })

    // Fetch complete thread data
    const completeThread = await prisma.conversationThread.findUnique({
      where: { id: thread.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          include: {
            sender: { select: { id: true, name: true } },
            mentions: true,
          }
        },
        participants: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    })

    return NextResponse.json(completeThread, { status: 201 })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads' })
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create thread' },
      { status: 500 }
    )
  }
});
