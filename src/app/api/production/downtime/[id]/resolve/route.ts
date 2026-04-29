// POST /api/production/downtime/:id/resolve
// Sprint 28 TIP-S28-05

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const resolveSchema = z.object({
  resolution: z.string().min(1),
});

export const POST = withAuth(async (request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const { id } = await context.params;

  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.downtimeRecord.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Downtime record not found' }, { status: 404 });
  }
  if (existing.endTime) {
    return NextResponse.json({ error: 'Already resolved' }, { status: 409 });
  }

  const endTime = new Date();
  const durationMinutes = Math.round(
    (endTime.getTime() - existing.startTime.getTime()) / 60000
  );

  const record = await prisma.downtimeRecord.update({
    where: { id },
    data: {
      endTime,
      durationMinutes,
      resolution: parsed.data.resolution,
      resolvedBy: session.user.name || session.user.email || session.user.id,
    },
  });

  // Restore equipment status if linked via workCenter equipment
  // Find equipment in this workCenter that is in breakdown/maintenance
  const equipmentInBreakdown = await prisma.equipment.findMany({
    where: {
      workCenterId: existing.workCenterId,
      status: { in: ['breakdown', 'maintenance'] },
    },
  });
  if (equipmentInBreakdown.length > 0) {
    await prisma.equipment.updateMany({
      where: {
        workCenterId: existing.workCenterId,
        status: { in: ['breakdown', 'maintenance'] },
      },
      data: { status: 'operational' },
    });
  }

  return NextResponse.json({ record });
});
