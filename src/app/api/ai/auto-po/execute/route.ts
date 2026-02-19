// =============================================================================
// AUTO-PO EXECUTE API - Execute approved PO suggestions
// POST: Execute a single PO, PUT: Bulk execute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';
import { prisma } from '@/lib/prisma';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
const executePostSchema = z.object({
  queueItemId: z.string().min(1, 'queueItemId là bắt buộc'),
  createAsDraft: z.boolean().optional().default(false),
});

const bulkExecuteSchema = z.object({
  queueItemIds: z.array(z.string()).min(1, 'queueItemIds array is required'),
  createAsDraft: z.boolean().optional(),
});

interface ExecutionResult {
  queueItemId: string;
  purchaseOrderId: string | null;
  success: boolean;
  error?: string;
}

async function createPurchaseOrder(
  suggestion: Record<string, any>,
  userId: string
): Promise<string> {
  const supplierId = String(suggestion.supplierId || '');
  const partId = String(suggestion.partId || '');
  const quantity = Number(suggestion.quantity || 0);
  const unitPrice = Number(suggestion.unitPrice || 0);
  const totalAmount = Number(suggestion.totalAmount || 0);
  const expectedDeliveryDate = suggestion.expectedDeliveryDate as string | undefined;
  const partNumber = String(suggestion.partNumber || '');
  const reason = String(suggestion.reason || '');

  // Create the actual Purchase Order in the database
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      supplierId,
      status: 'draft',
      orderDate: new Date(),
      expectedDate: expectedDeliveryDate
        ? new Date(expectedDeliveryDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      totalAmount,
      currency: 'VND',
      notes: `Auto-generated PO for ${partNumber || 'unknown'}. ${reason || ''}`,
    },
  });

  // Create the PO line
  await prisma.purchaseOrderLine.create({
    data: {
      poId: po.id,
      lineNumber: 1,
      partId,
      quantity,
      unitPrice,
      lineTotal: totalAmount,
      status: 'pending',
    },
  });

  return po.id;
}

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
    const parsed = executePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { queueItemId, createAsDraft } = parsed.data;

    const userId = session.user?.id || 'unknown';
    const userName = session.user?.name || 'Unknown User';

    // Get the queue item
    const queueItem = await approvalQueueService.getQueueItem(queueItemId);
    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    // Check if approved
    if (queueItem.status !== 'approved' && queueItem.status !== 'modified_approved') {
      return NextResponse.json(
        {
          error: `Cannot execute: item status is ${queueItem.status}. Only approved items can be executed.`,
        },
        { status: 400 }
      );
    }

    // Create the Purchase Order
    const suggestion = queueItem.suggestion;
    const purchaseOrderId = await createPurchaseOrder(suggestion, userId);

    // Update the PO status if not draft
    if (!createAsDraft) {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: 'pending' },
      });
    }

    return NextResponse.json({
      success: true,
      queueItemId,
      purchaseOrder: {
        id: purchaseOrderId,
        status: createAsDraft ? 'draft' : 'pending',
      },
      message: `Purchase Order created successfully${createAsDraft ? ' as draft' : ''}`,
      executedBy: {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/auto-po/execute' });
    return NextResponse.json(
      {
        error: 'Failed to execute PO suggestion',
        details: (error as Error).message,
      },
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
    const parseResult = bulkExecuteSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { queueItemIds, createAsDraft = false } = parseResult.data;

    const userId = session.user?.id || 'unknown';
    const userName = session.user?.name || 'Unknown User';

    const results: ExecutionResult[] = [];

    // Process each item
    for (const itemId of queueItemIds) {
      try {
        const queueItem = await approvalQueueService.getQueueItem(itemId);

        if (!queueItem) {
          results.push({
            queueItemId: itemId,
            purchaseOrderId: null,
            success: false,
            error: 'Not found',
          });
          continue;
        }

        if (queueItem.status !== 'approved' && queueItem.status !== 'modified_approved') {
          results.push({
            queueItemId: itemId,
            purchaseOrderId: null,
            success: false,
            error: `Status is ${queueItem.status}`,
          });
          continue;
        }

        // Create the Purchase Order
        const suggestion = queueItem.suggestion;
        const purchaseOrderId = await createPurchaseOrder(suggestion, userId);

        // Update status if not draft
        if (!createAsDraft) {
          await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: 'pending' },
          });
        }

        results.push({ queueItemId: itemId, purchaseOrderId, success: true });
      } catch (error) {
        results.push({
          queueItemId: itemId,
          purchaseOrderId: null,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: queueItemIds.length,
        executed: successful.length,
        failed: failed.length,
        purchaseOrdersCreated: successful.map((r) => r.purchaseOrderId),
      },
      executedBy: {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/ai/auto-po/execute' });
    return NextResponse.json(
      {
        error: 'Failed to bulk execute PO suggestions',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
});
