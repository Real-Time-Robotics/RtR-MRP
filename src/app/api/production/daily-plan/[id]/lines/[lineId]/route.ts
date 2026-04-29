// PUT + DELETE /api/production/daily-plan/:id/lines/:lineId
// Sprint 28 TIP-S28-06 (tech debt from TIP-S28-03)

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const updateLineSchema = z.object({
  plannedQty: z.number().int().positive().optional(),
  assignedToUserId: z.string().nullable().optional(),
  estimatedStartTime: z.string().nullable().optional(),
  estimatedEndTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const PUT = withAuth(async (request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id, lineId } = await context.params;

  // Verify plan exists and is editable
  const plan = await prisma.dailyProductionPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (plan.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot edit lines on ${plan.status} plan` }, { status: 409 });
  }

  const body = await request.json();
  const parsed = updateLineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  const line = await prisma.dailyProductionPlanLine.update({
    where: { id: lineId },
    data: parsed.data,
    include: {
      workOrder: { select: { id: true, woNumber: true, quantity: true, status: true } },
      assignedToUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ line });
});

export const DELETE = withAuth(async (_request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id, lineId } = await context.params;

  const plan = await prisma.dailyProductionPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  if (plan.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot delete lines on ${plan.status} plan` }, { status: 409 });
  }

  await prisma.dailyProductionPlanLine.delete({ where: { id: lineId } });

  return NextResponse.json({ deleted: true });
});
