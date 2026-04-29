// POST /api/production/equipment/:id/status
// Sprint 28 TIP-S28-05

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const statusSchema = z.object({
  status: z.enum(['operational', 'maintenance', 'breakdown', 'retired']),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id } = await context.params;

  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === 'maintenance') {
    updateData.lastMaintenanceDate = new Date();
  }

  const equipment = await prisma.equipment.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ equipment });
});
