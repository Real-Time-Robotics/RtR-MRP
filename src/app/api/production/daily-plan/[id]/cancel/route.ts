// POST /api/production/daily-plan/:id/cancel
// Sprint 28 TIP-S28-03

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/rbac';

export const POST = withAuth(async (_request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id } = await context.params;

  const plan = await prisma.dailyProductionPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const updated = await prisma.dailyProductionPlan.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return NextResponse.json({ plan: updated });
});
