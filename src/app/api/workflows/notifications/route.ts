/**
 * Workflow Notifications API Routes
 * GET - Get notifications for a user
 * PATCH - Mark notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { notificationService } from '@/lib/workflow';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';

const workflowNotificationPatchSchema = z.object({
  notificationId: z.string().optional(),
  userId: z.string().optional(),
  markAll: z.boolean().optional(),
});

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET /api/workflows/notifications - Get user notifications
export const GET = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const result = await notificationService.getNotifications(userId, {
      page,
      limit,
      unreadOnly,
    });

    const unreadCount = await notificationService.getUnreadCount(userId);

    return NextResponse.json({
      ...result,
      unreadCount,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/workflows/notifications' });
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
});

// PATCH /api/workflows/notifications - Mark as read
export const PATCH = withAuth(async (request: NextRequest, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = workflowNotificationPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { notificationId, userId, markAll } = parsed.data;

    if (!userId && !notificationId) {
      return NextResponse.json(
        { error: 'Missing required field: notificationId or userId' },
        { status: 400 }
      );
    }

    if (markAll && userId) {
      const count = await notificationService.markAllAsRead(userId);
      return NextResponse.json({ success: true, markedCount: count });
    }

    if (notificationId) {
      const success = await notificationService.markAsRead(notificationId);
      return NextResponse.json({ success });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PATCH /api/workflows/notifications' });
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
});
