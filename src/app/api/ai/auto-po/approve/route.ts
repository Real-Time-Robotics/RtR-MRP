// =============================================================================
// AUTO-PO APPROVE API - Approve PO suggestions
// POST: Approve a single suggestion, PUT: Bulk approve
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
const approvePostSchema = z.object({
  queueItemId: z.string().min(1, 'queueItemId là bắt buộc'),
  notes: z.string().optional(),
  modifications: z.object({
    quantity: z.number().positive().optional(),
    supplierId: z.string().optional(),
    supplierName: z.string().optional(),
    unitPrice: z.number().min(0).optional(),
    expectedDeliveryDate: z.string().optional(),
  }).optional(),
});

const bulkApproveSchema = z.object({
  queueItemIds: z.array(z.string()).min(1, 'queueItemIds array is required'),
  notes: z.string().optional(),
});

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
    const parsed = approvePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { queueItemId, notes, modifications } = parsed.data;

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
        expectedDeliveryDate: modifications.expectedDeliveryDate ? new Date(modifications.expectedDeliveryDate) : finalSuggestion.expectedDeliveryDate,
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
    const parseResult = bulkApproveSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { queueItemIds, notes } = parseResult.data;

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
});
