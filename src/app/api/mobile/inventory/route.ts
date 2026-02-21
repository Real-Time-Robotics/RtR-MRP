// ═══════════════════════════════════════════════════════════════════
//                    MOBILE INVENTORY API
//              Inventory adjustments, transfers, and counts
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { prisma } from '@/lib/prisma';
import { checkWriteEndpointLimit, checkReadEndpointLimit } from '@/lib/rate-limit';

// ── Zod Schemas ──────────────────────────────────────────────────

const adjustmentSchema = z.object({
  action: z.literal('adjust'),
  partId: z.string().min(1, 'partId is required'),
  warehouseId: z.string().min(1, 'warehouseId is required'),
  adjustmentType: z.enum(['add', 'remove']),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  lotNumber: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  action: z.literal('transfer'),
  partId: z.string().min(1, 'partId is required'),
  fromWarehouseId: z.string().min(1, 'fromWarehouseId is required'),
  toWarehouseId: z.string().min(1, 'toWarehouseId is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  lotNumber: z.string().optional(),
  notes: z.string().optional(),
});

const cycleCountItemSchema = z.object({
  partId: z.string().min(1),
  warehouseId: z.string().min(1),
  lotNumber: z.string().optional(),
  countedQty: z.number().int().min(0),
});

const cycleCountSchema = z.object({
  action: z.literal('count'),
  items: z.array(cycleCountItemSchema).min(1, 'At least one item is required'),
});

const bodySchema = z.discriminatedUnion('action', [
  adjustmentSchema,
  transferSchema,
  cycleCountSchema,
]);

// ── POST /api/mobile/inventory ───────────────────────────────────

export const POST = withAuth(async (req, context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const userId = session.user.id!;

    switch (data.action) {
      case 'adjust':
        return handleAdjustment(data, userId);
      case 'transfer':
        return handleTransfer(data, userId);
      case 'count':
        return handleCycleCount(data, userId);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/inventory' });
    return NextResponse.json(
      { success: false, error: 'Failed to process inventory operation' },
      { status: 500 }
    );
  }
});

// ── Handle Inventory Adjustment ──────────────────────────────────

async function handleAdjustment(
  data: z.infer<typeof adjustmentSchema>,
  userId: string
) {
  const { partId, warehouseId, adjustmentType, quantity, lotNumber, reason, notes } = data;

  // Verify part exists
  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { id: true, partNumber: true },
  });
  if (!part) {
    return NextResponse.json(
      { success: false, error: 'Part not found' },
      { status: 404 }
    );
  }

  // Verify warehouse exists and is active
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true, code: true, status: true },
  });
  if (!warehouse) {
    return NextResponse.json(
      { success: false, error: 'Warehouse not found' },
      { status: 404 }
    );
  }
  if (warehouse.status !== 'active') {
    return NextResponse.json(
      { success: false, error: 'Warehouse is not active' },
      { status: 400 }
    );
  }

  const delta = adjustmentType === 'add' ? quantity : -quantity;
  const effectiveLot = lotNumber ?? '';

  const result = await prisma.$transaction(async (tx) => {
    // Find existing inventory record
    const existing = await tx.inventory.findUnique({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId,
          lotNumber: effectiveLot,
        },
      },
    });

    const previousQty = existing?.quantity ?? 0;
    const newQty = previousQty + delta;

    if (newQty < 0) {
      throw new Error(`Insufficient quantity. Available: ${previousQty}, requested to remove: ${quantity}`);
    }

    // Upsert inventory
    const inventory = await tx.inventory.upsert({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId,
          lotNumber: effectiveLot,
        },
      },
      create: {
        partId,
        warehouseId,
        quantity: Math.max(newQty, 0),
        lotNumber: effectiveLot,
      },
      update: {
        quantity: Math.max(newQty, 0),
      },
    });

    // Create transaction log
    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: effectiveLot ?? `ADJ-${Date.now()}`,
        transactionType: 'ADJUSTED',
        partId,
        quantity: delta,
        previousQty,
        newQty: inventory.quantity,
        toWarehouseId: warehouseId,
        notes: `${reason}${notes ? ` - ${notes}` : ''}`,
        userId,
      },
    });

    return { inventory, lotTx, previousQty };
  });

  return NextResponse.json({
    success: true,
    transactionId: result.lotTx.id,
    message: `Inventory ${adjustmentType === 'add' ? 'increased' : 'decreased'} by ${quantity}`,
    data: {
      partNumber: part.partNumber,
      location: warehouse.code,
      adjustmentType,
      quantity,
      previousQty: result.previousQty,
      newQty: result.inventory.quantity,
      reason,
      timestamp: result.lotTx.createdAt.toISOString(),
    },
  });
}

// ── Handle Inventory Transfer ────────────────────────────────────

async function handleTransfer(
  data: z.infer<typeof transferSchema>,
  userId: string
) {
  const { partId, fromWarehouseId, toWarehouseId, quantity, lotNumber, notes } = data;

  if (fromWarehouseId === toWarehouseId) {
    return NextResponse.json(
      { success: false, error: 'Source and destination must be different' },
      { status: 400 }
    );
  }

  // Verify part exists
  const part = await prisma.part.findUnique({
    where: { id: partId },
    select: { id: true, partNumber: true },
  });
  if (!part) {
    return NextResponse.json(
      { success: false, error: 'Part not found' },
      { status: 404 }
    );
  }

  // Verify both warehouses exist and are active
  const [fromWarehouse, toWarehouse] = await Promise.all([
    prisma.warehouse.findUnique({
      where: { id: fromWarehouseId },
      select: { id: true, code: true, status: true },
    }),
    prisma.warehouse.findUnique({
      where: { id: toWarehouseId },
      select: { id: true, code: true, status: true },
    }),
  ]);

  if (!fromWarehouse) {
    return NextResponse.json(
      { success: false, error: 'Source warehouse not found' },
      { status: 404 }
    );
  }
  if (!toWarehouse) {
    return NextResponse.json(
      { success: false, error: 'Destination warehouse not found' },
      { status: 404 }
    );
  }
  if (fromWarehouse.status !== 'active') {
    return NextResponse.json(
      { success: false, error: 'Source warehouse is not active' },
      { status: 400 }
    );
  }
  if (toWarehouse.status !== 'active') {
    return NextResponse.json(
      { success: false, error: 'Destination warehouse is not active' },
      { status: 400 }
    );
  }

  const effectiveLot = lotNumber ?? '';

  const result = await prisma.$transaction(async (tx) => {
    // Check source inventory
    const sourceInventory = await tx.inventory.findUnique({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId: fromWarehouseId,
          lotNumber: effectiveLot,
        },
      },
    });

    const availableQty = (sourceInventory?.quantity ?? 0) - (sourceInventory?.reservedQty ?? 0);
    if (availableQty < quantity) {
      throw new Error(`Insufficient quantity. Available: ${availableQty}`);
    }

    // Decrement source
    const updatedSource = await tx.inventory.update({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId: fromWarehouseId,
          lotNumber: effectiveLot,
        },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });

    // Increment destination (upsert in case it doesn't exist)
    const updatedDest = await tx.inventory.upsert({
      where: {
        partId_warehouseId_lotNumber: {
          partId,
          warehouseId: toWarehouseId,
          lotNumber: effectiveLot,
        },
      },
      create: {
        partId,
        warehouseId: toWarehouseId,
        quantity,
        lotNumber: effectiveLot,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    // Log the transfer transaction
    const lotTx = await tx.lotTransaction.create({
      data: {
        lotNumber: effectiveLot ?? `TRF-${Date.now()}`,
        transactionType: 'ISSUED',
        partId,
        quantity,
        previousQty: sourceInventory?.quantity ?? 0,
        newQty: updatedSource.quantity,
        fromWarehouseId,
        toWarehouseId,
        notes: notes ?? null,
        userId,
      },
    });

    return { updatedSource, updatedDest, lotTx };
  });

  return NextResponse.json({
    success: true,
    transferId: result.lotTx.id,
    message: `Transferred ${quantity} units successfully`,
    data: {
      partNumber: part.partNumber,
      fromLocation: fromWarehouse.code,
      toLocation: toWarehouse.code,
      quantity,
      sourceQtyAfter: result.updatedSource.quantity,
      destQtyAfter: result.updatedDest.quantity,
      timestamp: result.lotTx.createdAt.toISOString(),
    },
  });
}

// ── Handle Cycle Count ───────────────────────────────────────────

async function handleCycleCount(
  data: z.infer<typeof cycleCountSchema>,
  userId: string
) {
  const results = await prisma.$transaction(async (tx) => {
    const processed = [];

    for (const item of data.items) {
      const effectiveLot = item.lotNumber ?? '';

      // Get current system quantity
      const existingRaw = await tx.inventory.findUnique({
        where: {
          partId_warehouseId_lotNumber: {
            partId: item.partId,
            warehouseId: item.warehouseId,
            lotNumber: effectiveLot,
          },
        },
      });

      // Get part and warehouse info for reporting
      const [partInfo, whInfo] = await Promise.all([
        tx.part.findUnique({ where: { id: item.partId }, select: { partNumber: true } }),
        tx.warehouse.findUnique({ where: { id: item.warehouseId }, select: { code: true } }),
      ]);

      const systemQty = existingRaw?.quantity ?? 0;
      const variance = item.countedQty - systemQty;

      // Update inventory to counted quantity
      if (existingRaw) {
        await tx.inventory.update({
          where: { id: existingRaw.id },
          data: {
            quantity: item.countedQty,
            lastCountDate: new Date(),
          },
        });
      } else if (item.countedQty > 0) {
        await tx.inventory.create({
          data: {
            partId: item.partId,
            warehouseId: item.warehouseId,
            quantity: item.countedQty,
            lotNumber: effectiveLot,
            lastCountDate: new Date(),
          },
        });
      }

      // Log adjustment if there is a variance
      if (variance !== 0) {
        await tx.lotTransaction.create({
          data: {
            lotNumber: effectiveLot ?? `CNT-${Date.now()}`,
            transactionType: 'ADJUSTED',
            partId: item.partId,
            quantity: variance,
            previousQty: systemQty,
            newQty: item.countedQty,
            toWarehouseId: item.warehouseId,
            notes: 'Cycle count adjustment',
            userId,
          },
        });
      }

      processed.push({
        partId: item.partId,
        partNumber: partInfo?.partNumber ?? item.partId,
        warehouseCode: whInfo?.code ?? item.warehouseId,
        systemQty,
        countedQty: item.countedQty,
        variance,
        variancePercent: systemQty > 0
          ? ((variance / systemQty) * 100).toFixed(1)
          : 'N/A',
      });
    }

    return processed;
  });

  const totalVariance = results.reduce((sum, r) => sum + r.variance, 0);
  const itemsWithVariance = results.filter(r => r.variance !== 0).length;

  return NextResponse.json({
    success: true,
    message: `Cycle count completed for ${data.items.length} items`,
    summary: {
      totalItems: data.items.length,
      itemsWithVariance,
      totalVariance,
    },
    results,
    timestamp: new Date().toISOString(),
  });
}

// ── GET /api/mobile/inventory ────────────────────────────────────

export const GET = withAuth(async (req, context, session) => {
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const { searchParams } = new URL(req.url);
    const partId = searchParams.get('partId');
    const search = searchParams.get('search');

    // Build where clause for parts
    const whereClause: Record<string, unknown> = {
      status: 'active',
    };

    if (partId) {
      whereClause.id = partId;
    }

    if (search) {
      whereClause.OR = [
        { partNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const parts = await prisma.part.findMany({
      where: whereClause,
      select: {
        id: true,
        partNumber: true,
        name: true,
        category: true,
        unit: true,
        inventory: {
          include: {
            warehouse: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { partNumber: 'asc' },
      take: 100,
    });

    // Transform into the expected response shape
    const data = parts.map((part) => {
      const totalOnHand = part.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const totalReserved = part.inventory.reduce((sum, inv) => sum + inv.reservedQty, 0);

      return {
        id: part.id,
        partNumber: part.partNumber,
        description: part.name,
        category: part.category,
        unit: part.unit,
        onHand: totalOnHand,
        reserved: totalReserved,
        available: totalOnHand - totalReserved,
        locations: part.inventory.map((inv) => ({
          warehouseId: inv.warehouse.id,
          code: inv.warehouse.code,
          warehouseName: inv.warehouse.name,
          qty: inv.quantity,
          reservedQty: inv.reservedQty,
          lotNumber: inv.lotNumber,
          locationCode: inv.locationCode,
          expiryDate: inv.expiryDate?.toISOString() ?? null,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/mobile/inventory' });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
});
