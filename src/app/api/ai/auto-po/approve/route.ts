// =============================================================================
// AUTO-PO APPROVE API - Approve PO suggestions
// POST: Approve a single suggestion, PUT: Bulk approve
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queueItemId, notes, modifications } = body;

    if (!queueItemId) {
      return NextResponse.json(
        { error: 'queueItemId is required' },
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

    // Apply modifications if any
    let finalSuggestion = queueItem.suggestion;
    if (modifications) {
      finalSuggestion = {
        ...finalSuggestion,
        quantity: modifications.quantity || finalSuggestion.quantity,
        supplierId: modifications.supplierId || finalSuggestion.supplierId,
        supplierName: modifications.supplierName || finalSuggestion.supplierName,
        unitPrice: modifications.unitPrice || finalSuggestion.unitPrice,
        totalAmount: (modifications.quantity || finalSuggestion.quantity) *
                     (modifications.unitPrice || finalSuggestion.unitPrice),
        expectedDeliveryDate: modifications.expectedDeliveryDate || finalSuggestion.expectedDeliveryDate,
      };
    }

    // Approve the item
    const approved = await approvalQueueService.approveItem(
      queueItemId,
      userId,
      notes || 'Approved'
    );

    return NextResponse.json({
      success: true,
      queueItem: approved,
      message: 'PO suggestion approved successfully',
      approvedBy: {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-po/approve' });
    return NextResponse.json(
      { error: 'Failed to approve PO suggestion', details: (error as Error).message },
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
    const { queueItemIds, notes } = body;

    if (!queueItemIds || !Array.isArray(queueItemIds) || queueItemIds.length === 0) {
      return NextResponse.json(
        { error: 'queueItemIds array is required' },
        { status: 400 }
      );
    }

    const userId = session.user?.id || 'unknown';
    const userName = session.user?.name || 'Unknown User';

    const results = {
      approved: [] as string[],
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

        await approvalQueueService.approveItem(itemId, userId, notes || 'Bulk approved');
        results.approved.push(itemId);
      } catch (error) {
        results.failed.push({ id: itemId, error: (error as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: queueItemIds.length,
        approved: results.approved.length,
        failed: results.failed.length,
      },
      approvedBy: {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/ai/auto-po/approve' });
    return NextResponse.json(
      { error: 'Failed to bulk approve PO suggestions', details: (error as Error).message },
      { status: 500 }
    );
  }
}
