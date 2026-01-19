// =============================================================================
// AUTO-PO EXECUTE API - Execute approved PO suggestions
// POST: Execute a single PO, PUT: Bulk execute
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { approvalQueueService } from '@/lib/ai/autonomous/approval-queue-service';
import { prisma } from '@/lib/prisma';

interface ExecutionResult {
  queueItemId: string;
  purchaseOrderId: string | null;
  success: boolean;
  error?: string;
}

async function createPurchaseOrder(
  suggestion: any,
  userId: string
): Promise<string> {
  // Create the actual Purchase Order in the database
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      supplierId: suggestion.supplierId,
      status: 'draft',
      orderDate: new Date(),
      expectedDate: suggestion.expectedDeliveryDate
        ? new Date(suggestion.expectedDeliveryDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      totalAmount: suggestion.totalAmount,
      currency: 'VND',
      notes: `Auto-generated PO for ${suggestion.partNumber}. ${suggestion.reason || ''}`,
    },
  });

  // Create the PO line
  await prisma.purchaseOrderLine.create({
    data: {
      poId: po.id,
      lineNumber: 1,
      partId: suggestion.partId,
      quantity: suggestion.quantity,
      unitPrice: suggestion.unitPrice,
      lineTotal: suggestion.totalAmount,
      status: 'pending',
    },
  });

  return po.id;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queueItemId, createAsDraft = false } = body;

    if (!queueItemId) {
      return NextResponse.json(
        { error: 'queueItemId is required' },
        { status: 400 }
      );
    }

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
    console.error('[Auto-PO Execute API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute PO suggestion',
        details: (error as Error).message,
      },
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
    const { queueItemIds, createAsDraft = false } = body;

    if (
      !queueItemIds ||
      !Array.isArray(queueItemIds) ||
      queueItemIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'queueItemIds array is required' },
        { status: 400 }
      );
    }

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
    console.error('[Auto-PO Bulk Execute API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to bulk execute PO suggestions',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
