// GET /api/assembly/:id — Get Assembly Order details
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';

export const GET = withAuth(async (
  _request: NextRequest,
  context,
  _session
) => {
  const { id } = await context.params;

  const ao = await prisma.assemblyOrder.findUnique({
    where: { id },
    include: {
      product: true,
      bomHeader: { include: { bomLines: { include: { part: true } } } },
      parentSerial: true,
      assignedToUser: true,
      createdByUser: true,
    },
  });

  if (!ao) {
    return NextResponse.json({ error: 'Assembly order not found' }, { status: 404 });
  }

  // Count scanned children per BOM line
  const allocatedChildren = await prisma.serialUnit.findMany({
    where: {
      status: 'ALLOCATED',
      meta: { path: ['allocatedToAoId'], equals: id },
    },
  });

  const scannedByBomLine = ao.bomHeader.bomLines.map((line) => {
    const scanned = allocatedChildren.filter((child) => {
      if (child.partId && line.partId === child.partId) return true;
      if (child.productId && line.partId === child.productId) return true;
      return false;
    }).length;
    return {
      bomLineId: line.id,
      partId: line.partId,
      required: Math.ceil(line.quantity * ao.targetQuantity),
      scanned,
    };
  });

  // If completed, also get SerialLinks
  let childSerials: unknown[] = [];
  if (ao.status === 'COMPLETED' && ao.parentSerialId) {
    childSerials = await prisma.serialLink.findMany({
      where: { parentSerialId: ao.parentSerialId },
      include: { childSerial: true },
    });
  }

  return NextResponse.json({
    ao,
    scannedByBomLine,
    childSerials,
  });
});
