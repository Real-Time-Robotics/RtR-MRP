import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET unread mentions count for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    console.error('Error fetching unread mentions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unread mentions' },
      { status: 500 }
    )
  }
}

// POST - Mark mentions as read
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
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
    console.error('Error marking mentions as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark mentions as read' },
      { status: 500 }
    )
  }
}
