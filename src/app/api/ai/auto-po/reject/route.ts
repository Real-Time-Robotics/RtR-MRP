// =============================================================================
// AUTO-PO REJECT API - Reject PO suggestions
// POST: Reject a single suggestion, PUT: Bulk reject
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

const rejectPostSchema = z.object({
  queueItemId: z.string().min(1, 'queueItemId là bắt buộc'),
  reason: z.string().min(1, 'Lý do từ chối là bắt buộc'),
  feedback: z.string().optional(),
});

const bulkRejectSchema = z.object({
  queueItemIds: z.array(z.string()).min(1, 'queueItemIds array is required'),
  reason: z.string().min(1, 'reason is required when rejecting'),
  feedback: z.string().optional(),
});

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const body = await request.json();
    const parsed = rejectPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { queueItemId, reason, feedback } = parsed.data;

    const userId = session.user?.id || 'unknown';
    const userName = session.user?.name || 'Unknown User';

    // Get the queue item first
    const queueItem = await approvalQueueService.getQueueItem(queueItemId);
    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (queueItem.status !== 'pending') {
      return NextResponse.json(
        { error: `Item already ${queueItem.status}` },
        { status: 400 }
      );
    }

    // Reject the item
    const rejected = await approvalQueueService.rejectItem(
      queueItemId,
      userId,
      feedback ? `${reason} - ${feedback}` : reason
    );

    return NextResponse.json({
      success: true,
      queueItem: rejected,
      message: 'PO suggestion rejected',
      rejectedBy: {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-po/reject' });
    return NextResponse.json(
      { error: 'Failed to reject PO suggestion', details: (error as Error).message },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  try {
const rawBody = await request.json();
    const parseResult = bulkRejectSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { queueItemIds, reason, feedback } = parseResult.data;

    const userId = session.user?.id || 'unknown';
    const userName = session.user?.name || 'Unknown User';

    const results = {
      rejected: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    // Process each item
    for (const itemId of queueItemIds) {
      try {
        const queueItem = await approvalQueueService.getQueueItem(itemId);
        if (!queueItem) {
          results.failed.push({ id: itemId, error: 'Not found' });
          continue;
        }

        if (queueItem.status !== 'pending') {
          results.failed.push({ id: itemId, error: `Already ${queueItem.status}` });
          continue;
        }

        await approvalQueueService.rejectItem(itemId, userId, feedback ? `${reason} - ${feedback}` : reason);
        results.rejected.push(itemId);
      } catch (error) {
        results.failed.push({ id: itemId, error: (error as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: queueItemIds.length,
        rejected: results.rejected.length,
        failed: results.failed.length,
      },
      rejectedBy: {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/ai/auto-po/reject' });
    return NextResponse.json(
      { error: 'Failed to bulk reject PO suggestions', details: (error as Error).message },
      { status: 500 }
    );
  }
});
