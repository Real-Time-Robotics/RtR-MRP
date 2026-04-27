// POST /api/assembly/:id/cancel — Cancel Assembly Order
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { hasRole } from '@/lib/auth/rbac';

export const POST = withAuth(async (
  _request: NextRequest,
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

  const ao = await prisma.assemblyOrder.findUnique({ where: { id } });
  if (!ao) {
    return NextResponse.json({ error: 'Assembly order not found' }, { status: 404 });
  }

  if (ao.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Cannot cancel a completed assembly order' },
      { status: 400 }
    );
  }

  if (ao.status === 'CANCELLED') {
    return NextResponse.json({ ao, message: 'Already cancelled' });
  }

  // Revert allocated children back to IN_STOCK
  const allocatedChildren = await prisma.serialUnit.findMany({
    where: {
      status: 'ALLOCATED',
      meta: { path: ['allocatedToAoId'], equals: id },
    },
  });

  await prisma.$transaction([
    ...allocatedChildren.map((child) =>
      prisma.serialUnit.update({
        where: { id: child.id },
        data: {
          status: 'IN_STOCK',
          meta: (() => {
            const meta = child.meta as Record<string, unknown> | null;
            if (!meta) return Prisma.JsonNull;
            const { allocatedToAoId: _, ...rest } = meta;
            return Object.keys(rest).length > 0
              ? (rest as Prisma.InputJsonValue)
              : Prisma.JsonNull;
          })(),
        },
      })
    ),
    prisma.assemblyOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    }),
  ]);

  const updated = await prisma.assemblyOrder.findUnique({ where: { id } });
  return NextResponse.json({ ao: updated });
});
