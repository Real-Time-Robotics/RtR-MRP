// PUT /api/production/daily-plan/:id/lines/reorder
// Sprint 28 TIP-S28-03

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const reorderSchema = z.object({
  lineIds: z.array(z.string().min(1)),
});

export const PUT = withAuth(async (request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  // Update sequence for each line
  await Promise.all(
    parsed.data.lineIds.map((lineId, index) =>
      prisma.dailyProductionPlanLine.update({
        where: { id: lineId },
        data: { sequence: index + 1 },
      })
    )
  );

  const plan = await prisma.dailyProductionPlan.findUnique({
    where: { id },
    include: { lines: { orderBy: { sequence: 'asc' } } },
  });

  return NextResponse.json({ plan });
});
