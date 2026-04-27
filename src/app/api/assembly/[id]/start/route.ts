// POST /api/assembly/:id/start — Start Assembly Order
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
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

  // Idempotent: already IN_PROGRESS → noop
  if (ao.status === 'IN_PROGRESS') {
    return NextResponse.json({ ao, message: 'Already in progress' });
  }

  if (ao.status !== 'DRAFT') {
    return NextResponse.json(
      { error: `Cannot start AO in status ${ao.status}. Only DRAFT → IN_PROGRESS allowed.` },
      { status: 400 }
    );
  }

  const updated = await prisma.assemblyOrder.update({
    where: { id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  return NextResponse.json({ ao: updated });
});
