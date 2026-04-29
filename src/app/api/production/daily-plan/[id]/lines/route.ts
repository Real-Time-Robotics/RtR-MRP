// POST /api/production/daily-plan/:id/lines
// Sprint 28 TIP-S28-03

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const lineSchema = z.object({
  workOrderId: z.string().min(1),
  plannedQty: z.number().int().positive(),
  assignedToUserId: z.string().optional(),
  estimatedStartTime: z.string().optional(),
  estimatedEndTime: z.string().optional(),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id } = await context.params;

  const plan = await prisma.dailyProductionPlan.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = lineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Next sequence number
  const maxSequence = plan.lines.length > 0
    ? Math.max(...plan.lines.map((l) => l.sequence))
    : 0;

  const line = await prisma.dailyProductionPlanLine.create({
    data: {
      planId: id,
      workOrderId: parsed.data.workOrderId,
      sequence: maxSequence + 1,
      plannedQty: parsed.data.plannedQty,
      assignedToUserId: parsed.data.assignedToUserId,
      estimatedStartTime: parsed.data.estimatedStartTime,
      estimatedEndTime: parsed.data.estimatedEndTime,
      notes: parsed.data.notes,
    },
    include: {
      workOrder: { select: { id: true, woNumber: true, quantity: true, status: true } },
      assignedToUser: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ line }, { status: 201 });
});
