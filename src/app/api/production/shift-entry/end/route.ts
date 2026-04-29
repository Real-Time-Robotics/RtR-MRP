// POST /api/production/shift-entry/end
// Sprint 28 TIP-S28-04

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const endSchema = z.object({
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = endSchema.safeParse(body);

  // Find active shift
  const employee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
  });
  if (!employee) {
    return NextResponse.json({ error: 'No employee record' }, { status: 422 });
  }

  const activeShift = await prisma.shiftAssignment.findFirst({
    where: { employeeId: employee.id, status: 'checked_in', actualEnd: null },
  });
  if (!activeShift) {
    return NextResponse.json({ error: 'No active shift' }, { status: 422 });
  }

  const now = new Date();
  const durationMinutes = activeShift.actualStart
    ? Math.round((now.getTime() - activeShift.actualStart.getTime()) / 60000)
    : 0;
  const durationHours = parseFloat((durationMinutes / 60).toFixed(1));

  // Close ShiftAssignment
  const shiftAssignment = await prisma.shiftAssignment.update({
    where: { id: activeShift.id },
    data: {
      status: 'checked_out',
      actualEnd: now,
      regularHours: durationHours,
    },
  });

  // Close main LaborEntry
  const mainLaborEntry = await prisma.laborEntry.findFirst({
    where: { userId: session.user.id, endTime: null, type: 'DIRECT' },
    orderBy: { startTime: 'desc' },
  });
  if (mainLaborEntry) {
    await prisma.laborEntry.update({
      where: { id: mainLaborEntry.id },
      data: {
        endTime: now,
        durationMinutes,
        notes: parsed.success ? parsed.data.notes : undefined,
      },
    });
  }

  // Aggregate summary from all labor entries this shift
  const shiftLaborEntries = await prisma.laborEntry.findMany({
    where: {
      userId: session.user.id,
      startTime: { gte: activeShift.actualStart || activeShift.date },
      endTime: { not: null },
    },
  });

  const totalProduced = shiftLaborEntries.reduce(
    (sum, e) => sum + (e.quantityProduced || 0),
    0
  );
  const totalScrap = shiftLaborEntries.reduce(
    (sum, e) => sum + (e.quantityScrapped || 0),
    0
  );

  return NextResponse.json({
    shiftAssignment,
    summary: {
      totalProduced,
      totalScrap,
      durationHours,
      durationMinutes,
    },
  });
});
