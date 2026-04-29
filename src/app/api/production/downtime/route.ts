// GET + POST /api/production/downtime
// Sprint 28 TIP-S28-05

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const createSchema = z.object({
  workCenterId: z.string().min(1),
  type: z.enum(['PLANNED', 'UNPLANNED', 'MAINTENANCE', 'BREAKDOWN', 'CHANGEOVER']),
  reason: z.string().min(1),
  category: z.enum(['Equipment', 'Material', 'Labor', 'Quality']).optional(),
  workOrderId: z.string().optional(),
  equipmentId: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const workCenterId = searchParams.get('workCenterId');
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};
  if (workCenterId) where.workCenterId = workCenterId;
  if (type) where.type = type;
  if (from || to) {
    where.startTime = {};
    if (from) (where.startTime as Record<string, unknown>).gte = new Date(from);
    if (to) (where.startTime as Record<string, unknown>).lte = new Date(to);
  }

  const records = await prisma.downtimeRecord.findMany({
    where,
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  return NextResponse.json({ records });
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

  const record = await prisma.downtimeRecord.create({
    data: {
      workCenterId: parsed.data.workCenterId,
      type: parsed.data.type,
      reason: parsed.data.reason,
      category: parsed.data.category,
      startTime: new Date(),
      reportedBy: session.user.name || session.user.email || session.user.id,
    },
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
    },
  });

  // Auto-update equipment status if linked
  if (parsed.data.equipmentId && (parsed.data.type === 'BREAKDOWN' || parsed.data.type === 'MAINTENANCE')) {
    await prisma.equipment.update({
      where: { id: parsed.data.equipmentId },
      data: { status: parsed.data.type === 'BREAKDOWN' ? 'breakdown' : 'maintenance' },
    });
  }

  return NextResponse.json({ record }, { status: 201 });
});
