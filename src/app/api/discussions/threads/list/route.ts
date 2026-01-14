/**
 * API: List All Discussion Threads
 * GET - Get all threads the user participates in
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contextType = searchParams.get('contextType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      OR: [
        // Threads user created
        { createdById: session.user.id },
        // Threads user participates in
        { participants: { some: { userId: session.user.id } } },
      ],
    };

    if (contextType && contextType !== 'all') {
      where.contextType = contextType;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { contextTitle: { contains: search, mode: 'insensitive' } },
            { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
          ],
        },
      ];
    }

    // Get threads with count
    const [threads, total] = await Promise.all([
      prisma.conversationThread.findMany({
        where,
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
            take: 5,
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: {
            select: { messages: true, participants: true },
          },
        },
        orderBy: [
          { lastMessageAt: { sort: 'desc', nulls: 'last' } },
          { updatedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.conversationThread.count({ where }),
    ]);

    // Get unread counts for each thread
    const threadsWithUnread = await Promise.all(
      threads.map(async (thread) => {
        const participant = await prisma.threadParticipant.findFirst({
          where: {
            threadId: thread.id,
            userId: session.user.id,
          },
        });

        let unreadCount = 0;
        if (participant?.lastReadAt) {
          unreadCount = await prisma.message.count({
            where: {
              threadId: thread.id,
              createdAt: { gt: participant.lastReadAt },
              senderId: { not: session.user.id },
            },
          });
        } else if (participant) {
          unreadCount = await prisma.message.count({
            where: {
              threadId: thread.id,
              senderId: { not: session.user.id },
            },
          });
        }

        return {
          ...thread,
          unreadCount,
          lastMessage: thread.messages[0] || null,
        };
      })
    );

    return NextResponse.json({
      threads: threadsWithUnread,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch threads' },
      { status: 500 }
    );
  }
}
