// GET /api/production/shift-entry/wo/:id/bom
// Sprint 28 TIP-S28-06 (tech debt from TIP-S28-04)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (_request: NextRequest, context: RouteContext, _session) => {
  const { id } = await context.params;

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    select: {
      id: true,
      woNumber: true,
      productId: true,
      quantity: true,
    },
  });

  if (!wo) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  }

  // Find BOM for this product
  const bom = await prisma.bomHeader.findFirst({
    where: { productId: wo.productId, status: 'active' },
    include: {
      bomLines: {
        include: {
          part: { select: { id: true, partNumber: true, name: true, unit: true } },
        },
        orderBy: { lineNumber: 'asc' },
      },
    },
  });

  if (!bom) {
    return NextResponse.json({ bomLines: [] });
  }

  // Get material allocations for this WO to calculate qty issued
  const allocations = await prisma.materialAllocation.findMany({
    where: { workOrderId: id },
    select: { partId: true, allocatedQty: true, issuedQty: true },
  });

  const allocationMap = new Map<string, { allocated: number; issued: number }>();
  for (const alloc of allocations) {
    const existing = allocationMap.get(alloc.partId) || { allocated: 0, issued: 0 };
    existing.allocated += alloc.allocatedQty || 0;
    existing.issued += alloc.issuedQty || 0;
    allocationMap.set(alloc.partId, existing);
  }

  const bomLines = bom.bomLines.map((line: any) => {
    const alloc = allocationMap.get(line.partId) || { allocated: 0, issued: 0 };
    return {
      partNumber: line.part.partNumber,
      name: line.part.name,
      unit: line.part.unit,
      qtyPerUnit: line.quantity,
      qtyRequired: line.quantity * wo.quantity,
      qtyAllocated: alloc.allocated,
      qtyIssued: alloc.issued,
    };
  });

  return NextResponse.json({ bomLines });
});
