// GET + POST /api/production/shift-report
// Sprint 28 TIP-S28-07

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/rbac';
import { generateShiftReport } from '@/lib/production/shift-report';
import { z } from 'zod';

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const workCenterId = searchParams.get('workCenterId');
  const shiftId = searchParams.get('shiftId');

  const where: Record<string, unknown> = {};

  if (date) {
    where.date = new Date(date);
  } else if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  if (workCenterId) where.workCenterId = workCenterId;
  if (shiftId) where.shiftId = shiftId;

  const reports = await prisma.shiftReport.findMany({
    where,
    include: {
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      workCenter: { select: { id: true, code: true, name: true } },
      generatedByUser: { select: { id: true, name: true } },
    },
    orderBy: [{ date: 'desc' }, { shiftId: 'asc' }],
  });

  return NextResponse.json({ reports });
});

const generateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftId: z.string().min(1),
  workCenterId: z.string().min(1),
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  const report = await generateShiftReport({
    date: new Date(parsed.data.date),
    shiftId: parsed.data.shiftId,
    workCenterId: parsed.data.workCenterId,
    generatedByUserId: session.user.id,
  });

  return NextResponse.json({ report }, { status: 201 });
});
