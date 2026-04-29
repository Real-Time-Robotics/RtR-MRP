// GET + POST /api/production/daily-plan
// Sprint 28 TIP-S28-03

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workCenterId: z.string().min(1),
  notes: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const workCenterId = searchParams.get('workCenterId');

  const where: Record<string, unknown> = {};

  if (date) {
    where.date = new Date(date);
  } else if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  if (workCenterId) where.workCenterId = workCenterId;

  const plans = await prisma.dailyProductionPlan.findMany({
    where,
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      lines: {
        include: {
          workOrder: { select: { id: true, woNumber: true, quantity: true, completedQty: true, status: true, dueDate: true, product: { select: { name: true } } } },
          assignedToUser: { select: { id: true, name: true } },
        },
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ plans });
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const planDate = new Date(parsed.data.date);

  // Check conflict
  const existing = await prisma.dailyProductionPlan.findUnique({
    where: { date_workCenterId: { date: planDate, workCenterId: parsed.data.workCenterId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Plan already exists for this date + work center', existingPlanId: existing.id },
      { status: 409 }
    );
  }

  // Generate planNumber: DPP-YYYYMMDD-NN
  const dateStr = parsed.data.date.replace(/-/g, '');
  const countToday = await prisma.dailyProductionPlan.count({
    where: {
      date: planDate,
    },
  });
  const planNumber = `DPP-${dateStr}-${String(countToday + 1).padStart(2, '0')}`;

  const plan = await prisma.dailyProductionPlan.create({
    data: {
      planNumber,
      date: planDate,
      workCenterId: parsed.data.workCenterId,
      notes: parsed.data.notes,
      createdByUserId: session.user.id,
    },
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
      lines: true,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
});
