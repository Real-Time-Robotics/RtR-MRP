// POST /api/production/shift-entry/append-qty
// Sprint 28 TIP-S28-04

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const appendSchema = z.object({
  workOrderId: z.string().min(1),
  quantityProduced: z.number().int().min(0),
  quantityScrapped: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: production or admin' }, { status: 403 });
  }

  // Verify user has active shift
  const employee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
  });
  const activeShift = employee
    ? await prisma.shiftAssignment.findFirst({
        where: { employeeId: employee.id, status: 'checked_in', actualEnd: null },
      })
    : null;

  if (!activeShift) {
    return NextResponse.json({ error: 'No active shift. Start shift first.' }, { status: 422 });
  }

  const body = await request.json();
  const parsed = appendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  // Find the main labor entry for work center
  const mainLaborEntry = await prisma.laborEntry.findFirst({
    where: { userId: session.user.id, endTime: null, type: 'DIRECT' },
    orderBy: { startTime: 'desc' },
  });

  const now = new Date();

  // Create per-WO labor entry
  const laborEntry = await prisma.laborEntry.create({
    data: {
      userId: session.user.id,
      workCenterId: mainLaborEntry?.workCenterId || null,
      type: 'DIRECT',
      startTime: now,
      endTime: now,
      durationMinutes: 0,
      quantityProduced: parsed.data.quantityProduced,
      quantityScrapped: parsed.data.quantityScrapped,
      notes: parsed.data.notes,
    },
  });

  // Update WorkOrder qty
  const wo = await prisma.workOrder.findUnique({ where: { id: parsed.data.workOrderId } });
  if (!wo) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  }

  const newCompleted = wo.completedQty + parsed.data.quantityProduced;
  const newScrap = wo.scrapQty + parsed.data.quantityScrapped;
  const isComplete = newCompleted >= wo.quantity;

  const workOrderUpdated = await prisma.workOrder.update({
    where: { id: parsed.data.workOrderId },
    data: {
      completedQty: newCompleted,
      scrapQty: newScrap,
      ...(isComplete ? { status: 'completed', actualEnd: now } : {}),
    },
  });

  return NextResponse.json({ laborEntry, workOrderUpdated });
});
