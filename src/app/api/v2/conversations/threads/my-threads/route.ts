import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

import { checkReadEndpointLimit } from '@/lib/rate-limit';
export async function GET(request: NextRequest) {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // OPEN, RESOLVED, etc.
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get threads where user is participant
    const threads = await prisma.conversationThread.findMany({
      where: {
        participants: {
          some: { userId: session.user.id }
        },
        ...(status && { status: status as 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'ARCHIVED' })
      },
      take: limit,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true } }
          }
        },
        participants: {
          where: { userId: session.user.id },
          select: { lastReadAt: true }
        }
      }
    })

    // Calculate unread count for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const lastReadAt = thread.participants[0]?.lastReadAt

        const unreadCount = lastReadAt
          ? await prisma.message.count({
              where: {
                threadId: thread.id,
                createdAt: { gt: lastReadAt },
                senderId: { not: session.user.id }
              }
            })
          : thread._count.messages

        return {
          ...thread,
          unreadCount
        }
      })
    )

    // Calculate total unread
    const totalUnread = threadsWithUnread.reduce((sum, t) => sum + t.unreadCount, 0)

    return NextResponse.json({
      data: threadsWithUnread,
      totalUnread
    })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/threads/my-threads' })
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    )
  }
}
