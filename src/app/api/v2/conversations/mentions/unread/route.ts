import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/with-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET unread mentions count for current user
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    // Get user's role for role-based mentions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // Count unread mentions (both direct user mentions and role mentions)
    const unreadCount = await prisma.mention.count({
      where: {
        isRead: false,
        OR: [
          { userId: session.user.id },
          { roleName: user?.role }
        ]
      }
    })

    // Get recent unread mentions with details
    const recentMentions = await prisma.mention.findMany({
      where: {
        isRead: false,
        OR: [
          { userId: session.user.id },
          { roleName: user?.role }
        ]
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, name: true }
            },
            thread: {
              select: {
                id: true,
                title: true,
                contextType: true,
                contextId: true,
                contextTitle: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      unreadCount,
      mentions: recentMentions
    })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/mentions/unread' })
    return NextResponse.json(
      { error: 'Failed to fetch unread mentions' },
      { status: 500 }
    )
  }
});

// POST - Mark mentions as read
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const bodySchema = z.object({
      mentionIds: z.array(z.string()).optional(),
    })
    const rawBody = await request.json()
    const parseResult = bodySchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const body = parseResult.data
    const { mentionIds } = body

    if (mentionIds && Array.isArray(mentionIds)) {
      // Mark specific mentions as read
      await prisma.mention.updateMany({
        where: {
          id: { in: mentionIds },
          OR: [
            { userId: session.user.id },
            // Also allow marking role mentions as read
          ]
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
    } else {
      // Mark all mentions for user as read
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      await prisma.mention.updateMany({
        where: {
          isRead: false,
          OR: [
            { userId: session.user.id },
            { roleName: user?.role }
          ]
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/v2/conversations/mentions/unread' })
    return NextResponse.json(
      { error: 'Failed to mark mentions as read' },
      { status: 500 }
    )
  }
});
