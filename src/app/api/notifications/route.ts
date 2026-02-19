import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from '@/lib/logger';

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const notificationBodySchema = z.object({
  type: z.string(),
  title: z.string(),
  message: z.string(),
  priority: z.string().optional(),
  link: z.string().optional(),
  metadata: z.any().optional(),
});

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10") || 10, 100);

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/notifications' });
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const rawBody = await request.json();
    const parseResult = notificationBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { type, title, message, priority, link, metadata } = parseResult.data;

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        type,
        title,
        message,
        priority: priority || "normal",
        link,
        metadata,
      },
    });

    return NextResponse.json(notification);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/notifications' });
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
});
