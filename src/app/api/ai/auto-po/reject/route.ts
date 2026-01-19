// =============================================================================
// AUTO-PO REJECT API - Reject PO suggestions
// POST: Reject a single suggestion, PUT: Bulk reject
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queueItemId, reason, feedback } = body;

    if (!queueItemId) {
      return NextResponse.json(
        { error: 'queueItemId is required' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required when rejecting' },
        { status: 400 }
      );
    }

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
    console.error('[Auto-PO Reject API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject PO suggestion', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queueItemIds, reason, feedback } = body;

    if (!queueItemIds || !Array.isArray(queueItemIds) || queueItemIds.length === 0) {
      return NextResponse.json(
        { error: 'queueItemIds array is required' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'reason is required when rejecting' },
        { status: 400 }
      );
    }

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
    console.error('[Auto-PO Bulk Reject API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk reject PO suggestions', details: (error as Error).message },
      { status: 500 }
    );
  }
}
