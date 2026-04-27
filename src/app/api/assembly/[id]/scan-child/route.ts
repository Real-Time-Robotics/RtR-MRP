// POST /api/assembly/:id/scan-child — Scan child serial into Assembly Order
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { hasRole } from '@/lib/auth/rbac';
import { validateChildSerial } from '@/lib/assembly/service';

const bodySchema = z.object({
  childSerial: z.string().min(1),
});

export const POST = withAuth(async (
  request: NextRequest,
  context,
  session
) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Requires role: production or admin', code: 'FORBIDDEN_ROLE' },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  const ao = await prisma.assemblyOrder.findUnique({
    where: { id },
    include: { bomHeader: { include: { bomLines: true } } },
  });
  if (!ao) {
    return NextResponse.json({ error: 'Assembly order not found' }, { status: 404 });
  }
  if (ao.status !== 'IN_PROGRESS') {
    return NextResponse.json(
      { error: `Cannot scan in status ${ao.status}. AO must be IN_PROGRESS.` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await validateChildSerial(id, parsed.data.childSerial);
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Invalid child serial', reason: result.reason },
      { status: 400 }
    );
  }

  // Allocate child: set status=ALLOCATED + meta.allocatedToAoId
  // Race-safe: guard with status=IN_STOCK
  const updateResult = await prisma.serialUnit.updateMany({
    where: { id: result.childUnit.id, status: 'IN_STOCK' },
    data: {
      status: 'ALLOCATED',
      meta: { ...(result.childUnit.meta as object || {}), allocatedToAoId: id },
    },
  });

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: 'Serial already allocated by another process', reason: 'CONFLICT' },
      { status: 409 }
    );
  }

  // Compute scan progress
  const allocatedChildren = await prisma.serialUnit.findMany({
    where: {
      status: 'ALLOCATED',
      meta: { path: ['allocatedToAoId'], equals: id },
    },
  });

  const byBomLine = ao.bomHeader.bomLines.map((line) => {
    const scanned = allocatedChildren.filter((child) => {
      if (child.partId && line.partId === child.partId) return true;
      if (child.productId && line.partId === child.productId) return true;
      return false;
    }).length;
    return {
      bomLineId: line.id,
      partId: line.partId,
      scanned,
      required: Math.ceil(line.quantity * ao.targetQuantity),
    };
  });

  const totalScanned = byBomLine.reduce((s, b) => s + b.scanned, 0);
  const totalRequired = byBomLine.reduce((s, b) => s + b.required, 0);

  return NextResponse.json({
    scannedCount: totalScanned,
    totalRequired,
    byBomLine,
  });
});
