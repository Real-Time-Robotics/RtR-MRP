// POST /api/assembly/:id/unscan — Remove child serial from Assembly Order
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { hasRole } from '@/lib/auth/rbac';

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

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const childUnit = await prisma.serialUnit.findUnique({
    where: { serial: parsed.data.childSerial },
  });

  if (!childUnit) {
    return NextResponse.json({ error: 'Serial not found' }, { status: 404 });
  }

  // Only unscan if allocated to this AO
  const meta = childUnit.meta as Record<string, unknown> | null;
  if (childUnit.status !== 'ALLOCATED' || meta?.allocatedToAoId !== id) {
    return NextResponse.json({ message: 'Serial not allocated to this AO, no action taken' });
  }

  const { allocatedToAoId: _, ...restMeta } = meta || {};
  const newMeta = Object.keys(restMeta).length > 0
    ? (restMeta as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  await prisma.serialUnit.update({
    where: { id: childUnit.id },
    data: {
      status: 'IN_STOCK',
      meta: newMeta,
    },
  });

  return NextResponse.json({ message: 'Child serial unscanned', serial: parsed.data.childSerial });
});
