import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

export const GET = withAuth(async (req, context, session) => {
  const rateLimitResult = await checkReadEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(req.url);
  const poId = searchParams.get('poId');
  const status = searchParams.get('status') || 'Open,Partial';
  const statusList = status.split(',');

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      ...(poId ? { id: poId } : {}),
      status: { in: statusList },
    },
    include: {
      supplier: true,
      lines: {
        include: {
          part: true,
        },
      },
    },
    orderBy: { expectedDate: 'asc' },
  });

  const results = purchaseOrders.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    supplier: po.supplier.name,
    status: po.status,
    orderDate: po.orderDate.toISOString().split('T')[0],
    expectedDate: po.expectedDate.toISOString().split('T')[0],
    lines: po.lines.map((line) => ({
      id: line.id,
      partNumber: line.part.partNumber,
      description: line.part.name,
      qtyOrdered: line.quantity,
      qtyReceived: line.receivedQty,
      qtyRemaining: line.quantity - line.receivedQty,
      unitCost: line.unitPrice,
    })),
  }));

  const summary = {
    totalPOs: results.length,
    totalLines: results.reduce((sum, po) => sum + po.lines.length, 0),
    totalQtyRemaining: results.reduce(
      (sum, po) =>
        sum + po.lines.reduce((lineSum, line) => lineSum + line.qtyRemaining, 0),
      0
    ),
  };

  return NextResponse.json({
    success: true,
    data: results,
    summary,
  });
});

export const POST = withAuth(async (req, context, session) => {
  const rateLimitResult = await checkWriteEndpointLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const bodySchema = z.object({
      poId: z.string(),
      lineId: z.string(),
      qtyReceived: z.number(),
      locationId: z.string(),
      lotNumber: z.string().optional(),
      notes: z.string().optional(),
      userId: z.string().optional(),
    });

    const rawBody = await req.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const { poId, lineId, qtyReceived, locationId, lotNumber, notes } = body;
    const userId = body.userId ?? session.user.id;

    if (!poId || !lineId || qtyReceived === undefined || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: poId, lineId, qtyReceived, locationId' },
        { status: 400 }
      );
    }

    if (qtyReceived <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be positive' },
        { status: 400 }
      );
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        lines: {
          include: { part: true },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    const line = po.lines.find((l) => l.id === lineId);
    if (!line) {
      return NextResponse.json(
        { success: false, error: 'PO line not found' },
        { status: 404 }
      );
    }

    const qtyRemaining = line.quantity - line.receivedQty;
    if (qtyReceived > qtyRemaining) {
      return NextResponse.json(
        { success: false, error: `Quantity exceeds remaining (${qtyRemaining})` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedLine = await tx.purchaseOrderLine.update({
        where: { id: lineId },
        data: {
          receivedQty: { increment: qtyReceived },
          status: line.receivedQty + qtyReceived >= line.quantity ? 'received' : 'partial',
        },
      });

      await tx.inventory.upsert({
        where: {
          partId_warehouseId_lotNumber: {
            partId: line.partId,
            warehouseId: locationId,
            lotNumber: lotNumber ?? '',
          },
        },
        create: {
          partId: line.partId,
          warehouseId: locationId,
          quantity: qtyReceived,
          lotNumber: lotNumber ?? '',
          locationCode: null,
        },
        update: {
          quantity: { increment: qtyReceived },
        },
      });

      const existingInventory = await tx.inventory.findUnique({
        where: {
          partId_warehouseId_lotNumber: {
            partId: line.partId,
            warehouseId: locationId,
            lotNumber: lotNumber ?? '',
          },
        },
      });

      await tx.lotTransaction.create({
        data: {
          lotNumber: lotNumber ?? `RCV-${Date.now()}`,
          transactionType: 'RECEIVED',
          partId: line.partId,
          quantity: qtyReceived,
          previousQty: (existingInventory?.quantity ?? qtyReceived) - qtyReceived,
          newQty: existingInventory?.quantity ?? qtyReceived,
          poId: poId,
          poLineNumber: line.lineNumber,
          toWarehouseId: locationId,
          notes: notes ?? null,
          userId,
        },
      });

      const allLines = await tx.purchaseOrderLine.findMany({
        where: { poId },
      });

      const allReceived = allLines.every((l) => l.receivedQty >= l.quantity);
      const anyReceived = allLines.some((l) => l.receivedQty > 0);

      let newPoStatus: string;
      if (allReceived) {
        newPoStatus = 'Received';
      } else if (anyReceived) {
        newPoStatus = 'Partial';
      } else {
        newPoStatus = po.status;
      }

      if (newPoStatus !== po.status) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: { status: newPoStatus },
        });
      }

      return { updatedLine, newPoStatus };
    });

    const newQtyReceived = result.updatedLine.receivedQty;
    const newQtyRemaining = line.quantity - newQtyReceived;

    return NextResponse.json({
      success: true,
      receiptId: `RCV-${Date.now()}`,
      message: `Received ${qtyReceived} units of ${line.part.partNumber}`,
      data: {
        poNumber: po.poNumber,
        partNumber: line.part.partNumber,
        qtyReceived,
        location: locationId,
        lotNumber,
        newQtyReceived,
        newQtyRemaining,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/mobile/receiving' });
    return NextResponse.json(
      { success: false, error: 'Failed to process receipt' },
      { status: 500 }
    );
  }
});
