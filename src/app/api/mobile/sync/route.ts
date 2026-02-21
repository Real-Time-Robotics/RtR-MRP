// ═══════════════════════════════════════════════════════════════════
//                    MOBILE SYNC API
//              Offline sync and master data download
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const syncPostSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    'inventory_adjust', 'inventory_transfer', 'inventory_count',
    'po_receive', 'so_pick', 'wo_start', 'wo_complete', 'quality_inspect',
  ]),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string().optional(),
});

/**
 * GET /api/mobile/sync
 * Get sync status and download master data
 */
export const GET = withAuth(async (req, context, session) => {
  // Rate limiting
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(req.url);
  const dataType = searchParams.get('type');
  const since = searchParams.get('since');

  if (dataType === 'parts') {
    const sinceDate = since ? new Date(since) : undefined;

    const parts = await prisma.part.findMany({
      where: {
        status: 'active',
        ...(sinceDate && { updatedAt: { gt: sinceDate } }),
      },
      include: {
        inventory: {
          include: { warehouse: true },
        },
      },
      orderBy: { partNumber: 'asc' },
    });

    const data = parts.map((part) => {
      const onHand = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const reserved = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);

      return {
        id: part.id,
        partNumber: part.partNumber,
        description: part.name,
        category: part.category,
        uom: part.unit,
        onHand,
        reserved,
        available: onHand - reserved,
        reorderPoint: part.reorderPoint,
        locations: part.inventory.map((inv) => ({
          locationId: inv.warehouseId,
          code: inv.warehouse.code,
          qty: inv.quantity,
        })),
        updatedAt: part.updatedAt.getTime(),
      };
    });

    return NextResponse.json(data);
  }

  if (dataType === 'locations') {
    const warehouses = await prisma.warehouse.findMany({
      where: { status: 'active' },
      orderBy: { code: 'asc' },
    });

    const data = warehouses.map((wh) => ({
      id: wh.id,
      code: wh.code,
      name: wh.name,
      warehouseId: wh.id,
      warehouseName: wh.name,
      location: wh.location,
      type: wh.type,
    }));

    return NextResponse.json(data);
  }

  // Return sync status
  const [partCount, warehouseCount, latestPart, latestWarehouse] = await Promise.all([
    prisma.part.count({ where: { status: 'active' } }),
    prisma.warehouse.count({ where: { status: 'active' } }),
    prisma.part.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    prisma.warehouse.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);

  return NextResponse.json({
    success: true,
    serverTime: new Date().toISOString(),
    dataVersions: {
      parts: {
        count: partCount,
        lastModified: latestPart?.updatedAt.getTime() ?? Date.now(),
      },
      locations: {
        count: warehouseCount,
        lastModified: latestWarehouse?.createdAt.getTime() ?? Date.now(),
      },
    },
    endpoints: {
      parts: '/api/mobile/sync?type=parts',
      locations: '/api/mobile/sync?type=locations',
    },
  });
});

/**
 * POST /api/mobile/sync
 * Process offline operations
 */
export const POST = withAuth(async (req, context, session) => {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const operation = await req.json();
    const parsed = syncPostSchema.safeParse(operation);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { id, type, data, createdAt } = parsed.data;

    let result;

    switch (type) {
      case 'inventory_adjust':
        result = await processInventoryAdjust(data, session.user.id);
        break;
      case 'inventory_transfer':
        result = await processInventoryTransfer(data, session.user.id);
        break;
      case 'inventory_count':
        result = await processInventoryCount(data, session.user.id);
        break;
      case 'po_receive':
        result = await processPOReceive(data, session.user.id);
        break;
      case 'so_pick':
        result = await processSOPick(data, session.user.id);
        break;
      case 'wo_start':
        result = await processWOStart(data);
        break;
      case 'wo_complete':
        result = await processWOComplete(data);
        break;
      case 'quality_inspect':
        result = await processQualityInspect(data);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      operationId: id,
      serverTransactionId: `SRV-${Date.now()}`,
      result,
      processedAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/sync' });
    return NextResponse.json(
      { success: false, error: 'Failed to process operation' },
      { status: 500 }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════
//                    OPERATION PROCESSORS
// ═══════════════════════════════════════════════════════════════════

async function processInventoryAdjust(data: Record<string, unknown>, userId: string) {
  const partId = data.partId as string;
  const warehouseId = data.warehouseId as string;
  const quantity = data.quantity as number;
  const lotNumber = (data.lotNumber as string) ?? null;
  const notes = (data.notes as string) ?? null;

  if (!partId || !warehouseId || quantity == null) {
    throw new Error('Missing required fields: partId, warehouseId, quantity');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventory.findFirst({
      where: { partId, warehouseId, lotNumber },
    });

    const previousQty = existing?.quantity ?? 0;
    const newQty = previousQty + quantity;

    const inventory = await tx.inventory.upsert({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId,
          lotNumber: lotNumber ?? '',
        },
      },
      create: {
        partId,
        warehouseId,
        quantity: Math.max(newQty, 0),
        lotNumber,
      },
      update: {
        quantity: Math.max(newQty, 0),
      },
    });

    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: lotNumber ?? `ADJ-${Date.now()}`,
        transactionType: 'ADJUSTED',
        partId,
        quantity,
        previousQty,
        newQty: inventory.quantity,
        toWarehouseId: warehouseId,
        notes,
        userId,
      },
    });

    return {
      transactionId: lotTx.id,
      inventoryId: inventory.id,
      previousQty,
      newQty: inventory.quantity,
      status: 'completed',
    };
  });
}

async function processInventoryTransfer(data: Record<string, unknown>, userId: string) {
  const partId = data.partId as string;
  const fromWarehouseId = data.fromWarehouseId as string;
  const toWarehouseId = data.toWarehouseId as string;
  const quantity = data.quantity as number;
  const lotNumber = (data.lotNumber as string) ?? null;

  if (!partId || !fromWarehouseId || !toWarehouseId || quantity == null || quantity <= 0) {
    throw new Error('Missing required fields: partId, fromWarehouseId, toWarehouseId, quantity');
  }

  return prisma.$transaction(async (tx) => {
    const sourceInv = await tx.inventory.findFirst({
      where: { partId, warehouseId: fromWarehouseId, lotNumber },
    });

    if (!sourceInv || sourceInv.quantity < quantity) {
      throw new Error('Insufficient inventory at source warehouse');
    }

    await tx.inventory.update({
      where: { id: sourceInv.id },
      data: { quantity: { decrement: quantity } },
    });

    await tx.inventory.upsert({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId: toWarehouseId,
          lotNumber: lotNumber ?? '',
        },
      },
      create: {
        partId,
        warehouseId: toWarehouseId,
        quantity,
        lotNumber,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: lotNumber ?? `TRF-${Date.now()}`,
        transactionType: 'ISSUED',
        partId,
        quantity,
        fromWarehouseId,
        toWarehouseId,
        userId,
      },
    });

    return { transferId: lotTx.id, status: 'completed' };
  });
}

async function processInventoryCount(data: Record<string, unknown>, userId: string) {
  const partId = data.partId as string;
  const warehouseId = data.warehouseId as string;
  const countedQty = data.countedQty as number;
  const lotNumber = (data.lotNumber as string) ?? null;
  const notes = (data.notes as string) ?? null;

  if (!partId || !warehouseId || countedQty == null) {
    throw new Error('Missing required fields: partId, warehouseId, countedQty');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.inventory.findFirst({
      where: { partId, warehouseId, lotNumber },
    });

    const previousQty = existing?.quantity ?? 0;
    const variance = countedQty - previousQty;

    const inventory = await tx.inventory.upsert({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId,
          lotNumber: lotNumber ?? '',
        },
      },
      create: {
        partId,
        warehouseId,
        quantity: Math.max(countedQty, 0),
        lotNumber,
        lastCountDate: new Date(),
      },
      update: {
        quantity: Math.max(countedQty, 0),
        lastCountDate: new Date(),
      },
    });

    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: lotNumber ?? `CNT-${Date.now()}`,
        transactionType: 'ADJUSTED',
        partId,
        quantity: variance,
        previousQty,
        newQty: inventory.quantity,
        toWarehouseId: warehouseId,
        notes: notes ?? `Cycle count adjustment. Variance: ${variance}`,
        userId,
      },
    });

    return {
      countId: lotTx.id,
      previousQty,
      countedQty: inventory.quantity,
      variance,
      status: 'completed',
    };
  });
}

async function processPOReceive(data: Record<string, unknown>, userId: string) {
  const poId = data.poId as string;
  const lineId = data.lineId as string;
  const receivedQty = data.receivedQty as number;
  const warehouseId = data.warehouseId as string;
  const lotNumber = (data.lotNumber as string) ?? null;
  const notes = (data.notes as string) ?? null;

  if (!poId || !lineId || receivedQty == null || receivedQty <= 0 || !warehouseId) {
    throw new Error('Missing required fields: poId, lineId, receivedQty, warehouseId');
  }

  return prisma.$transaction(async (tx) => {
    // Find the PO line and validate
    const poLine = await tx.purchaseOrderLine.findUnique({
      where: { id: lineId },
      include: { po: true },
    });

    if (!poLine) {
      throw new Error(`PO line not found: ${lineId}`);
    }

    if (poLine.poId !== poId) {
      throw new Error('PO line does not belong to the specified PO');
    }

    const remainingQty = poLine.quantity - poLine.receivedQty;
    if (receivedQty > remainingQty) {
      throw new Error(`Received qty (${receivedQty}) exceeds remaining qty (${remainingQty})`);
    }

    // Increment receivedQty on the PO line
    const updatedLine = await tx.purchaseOrderLine.update({
      where: { id: lineId },
      data: {
        receivedQty: { increment: receivedQty },
        status: poLine.receivedQty + receivedQty >= poLine.quantity ? 'received' : 'partial',
      },
    });

    // Upsert inventory
    const existingInv = await tx.inventory.findFirst({
      where: { partId: poLine.partId, warehouseId, lotNumber },
    });

    const previousQty = existingInv?.quantity ?? 0;

    await tx.inventory.upsert({
      where: {
        partId_warehouseId_lotNumber: {
          partId: poLine.partId,
          warehouseId,
          lotNumber: lotNumber ?? '',
        },
      },
      create: {
        partId: poLine.partId,
        warehouseId,
        quantity: receivedQty,
        lotNumber,
      },
      update: {
        quantity: { increment: receivedQty },
      },
    });

    // Create lot transaction
    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: lotNumber ?? `RCV-${Date.now()}`,
        transactionType: 'RECEIVED',
        partId: poLine.partId,
        quantity: receivedQty,
        previousQty,
        newQty: previousQty + receivedQty,
        poId,
        poLineNumber: poLine.lineNumber,
        toWarehouseId: warehouseId,
        notes,
        userId,
      },
    });

    // Check if all lines are fully received and update PO status
    const allLines = await tx.purchaseOrderLine.findMany({
      where: { poId },
    });

    const allFullyReceived = allLines.every(
      (line) => (line.id === lineId ? updatedLine.receivedQty : line.receivedQty) >= line.quantity
    );
    const anyReceived = allLines.some(
      (line) => (line.id === lineId ? updatedLine.receivedQty : line.receivedQty) > 0
    );

    const newPoStatus = allFullyReceived ? 'received' : anyReceived ? 'partial' : poLine.po.status;

    if (newPoStatus !== poLine.po.status) {
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: newPoStatus },
      });
    }

    return {
      receiptId: lotTx.id,
      lineId: poLine.id,
      lineReceivedQty: updatedLine.receivedQty,
      poStatus: newPoStatus,
      status: 'completed',
    };
  });
}

async function processSOPick(data: Record<string, unknown>, userId: string) {
  const partId = data.partId as string;
  const warehouseId = data.warehouseId as string;
  const quantity = data.quantity as number;
  const lotNumber = (data.lotNumber as string) ?? null;

  if (!partId || !warehouseId || quantity == null || quantity <= 0) {
    throw new Error('Missing required fields: partId, warehouseId, quantity');
  }

  return prisma.$transaction(async (tx) => {
    const inv = await tx.inventory.findFirst({
      where: { partId, warehouseId, lotNumber },
    });

    if (!inv || inv.quantity < quantity) {
      throw new Error('Insufficient inventory for pick');
    }

    await tx.inventory.update({
      where: { id: inv.id },
      data: { quantity: { decrement: quantity } },
    });

    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: lotNumber ?? `PICK-${Date.now()}`,
        transactionType: 'ISSUED',
        partId,
        quantity: -quantity,
        previousQty: inv.quantity,
        newQty: inv.quantity - quantity,
        fromWarehouseId: warehouseId,
        notes: (data.notes as string) ?? null,
        userId,
      },
    });

    return { pickId: lotTx.id, status: 'completed' };
  });
}

async function processWOStart(data: Record<string, unknown>) {
  const woId = data.woId as string;

  if (!woId) {
    throw new Error('Missing required field: woId');
  }

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: woId },
  });

  if (!workOrder) {
    throw new Error(`Work order not found: ${woId}`);
  }

  if (workOrder.status !== 'draft' && workOrder.status !== 'planned' && workOrder.status !== 'released') {
    throw new Error(`Cannot start work order in status: ${workOrder.status}`);
  }

  const updated = await prisma.workOrder.update({
    where: { id: woId },
    data: {
      status: 'in_progress',
      actualStart: new Date(),
    },
  });

  return {
    woId: updated.id,
    woNumber: updated.woNumber,
    status: updated.status,
    actualStart: updated.actualStart?.toISOString(),
  };
}

async function processWOComplete(data: Record<string, unknown>) {
  const woId = data.woId as string;
  const completedQty = data.completedQty as number | undefined;

  if (!woId) {
    throw new Error('Missing required field: woId');
  }

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: woId },
  });

  if (!workOrder) {
    throw new Error(`Work order not found: ${woId}`);
  }

  if (workOrder.status !== 'in_progress') {
    throw new Error(`Cannot complete work order in status: ${workOrder.status}`);
  }

  const finalCompletedQty = completedQty ?? workOrder.quantity;

  const updated = await prisma.workOrder.update({
    where: { id: woId },
    data: {
      status: 'completed',
      actualEnd: new Date(),
      completedQty: finalCompletedQty,
    },
  });

  return {
    woId: updated.id,
    woNumber: updated.woNumber,
    status: updated.status,
    completedQty: updated.completedQty,
    actualEnd: updated.actualEnd?.toISOString(),
  };
}

async function processQualityInspect(data: Record<string, unknown>) {
  // Quality inspection remains a stub until the Inspection model processor is required
  return { inspectionId: `QI-${Date.now()}`, status: 'completed' };
}

/**
 * PUT /api/mobile/sync
 * Bulk sync operations
 */
export const PUT = withAuth(async (req, context, session) => {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { operations } = await req.json();

    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { success: false, error: 'Operations must be an array' },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const op of operations) {
      try {
        const parsed = syncPostSchema.safeParse(op);
        if (!parsed.success) {
          results.push({ id: op.id, success: false, error: 'Invalid operation data' });
          failedCount++;
          continue;
        }

        const { id, type, data } = parsed.data;
        let result;

        switch (type) {
          case 'inventory_adjust':
            result = await processInventoryAdjust(data, session.user.id);
            break;
          case 'inventory_transfer':
            result = await processInventoryTransfer(data, session.user.id);
            break;
          case 'inventory_count':
            result = await processInventoryCount(data, session.user.id);
            break;
          case 'po_receive':
            result = await processPOReceive(data, session.user.id);
            break;
          case 'so_pick':
            result = await processSOPick(data, session.user.id);
            break;
          case 'wo_start':
            result = await processWOStart(data);
            break;
          case 'wo_complete':
            result = await processWOComplete(data);
            break;
          case 'quality_inspect':
            result = await processQualityInspect(data);
            break;
          default:
            results.push({ id, success: false, error: `Unknown operation type: ${type}` });
            failedCount++;
            continue;
        }

        results.push({ id, success: true, result });
        successCount++;
      } catch (error) {
        results.push({
          id: op.id,
          success: false,
          error: error instanceof Error ? error.message : 'Processing error',
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: operations.length,
        success: successCount,
        failed: failedCount,
      },
      results,
      syncedAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/sync' });
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk sync' },
      { status: 500 }
    );
  }
});
