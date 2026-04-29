// POST /api/production/shift-entry/start
// Sprint 28 TIP-S28-04

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const startSchema = z.object({
  shiftId: z.string().min(1),
  workCenterId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  // Check no active shift for this user today
  const activeAssignment = await prisma.shiftAssignment.findFirst({
    where: {
      employee: { userId: session.user.id },
      date: new Date(parsed.data.date),
      status: 'checked_in',
    },
  });
  if (activeAssignment) {
    return NextResponse.json({ error: 'User already has active shift today' }, { status: 409 });
  }

  // Find or create employee for this user
  let employee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
  });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        employeeId: `EMP-${session.user.id.slice(0, 8)}`,
        name: session.user.name || session.user.email || 'Unknown',
        userId: session.user.id,
        department: 'Production',
        position: 'Operator',
        status: 'active',
        hireDate: new Date(),
      },
    });
  }

  const now = new Date();

  // Create ShiftAssignment
  const shiftAssignment = await prisma.shiftAssignment.create({
    data: {
      employeeId: employee.id,
      shiftId: parsed.data.shiftId,
      date: new Date(parsed.data.date),
      status: 'checked_in',
      actualStart: now,
    },
  });

  // Create main LaborEntry for shift tracking
  const mainLaborEntry = await prisma.laborEntry.create({
    data: {
      userId: session.user.id,
      workCenterId: parsed.data.workCenterId,
      type: 'DIRECT',
      startTime: now,
    },
  });

  return NextResponse.json({ shiftAssignment, mainLaborEntry }, { status: 201 });
});
