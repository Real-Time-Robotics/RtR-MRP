// GET + POST /api/production/equipment
// Sprint 28 TIP-S28-05

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const createSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  workCenterId: z.string().optional(),
  type: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  description: z.string().optional(),
});

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const workCenterId = searchParams.get('workCenterId');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (workCenterId) where.workCenterId = workCenterId;
  if (status) where.status = status;

  const equipment = await prisma.equipment.findMany({
    where,
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
    },
    orderBy: { code: 'asc' },
  });

  return NextResponse.json({ equipment });
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

  const equipment = await prisma.equipment.create({
    data: {
      ...parsed.data,
      status: 'operational',
    },
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
    },
  });

  return NextResponse.json({ equipment }, { status: 201 });
});
