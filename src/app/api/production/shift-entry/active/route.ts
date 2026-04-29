// GET /api/production/shift-entry/active
// Sprint 28 TIP-S28-04

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (_request: NextRequest, _context, session) => {
  // Find active shift assignment for current user
  const employee = await prisma.employee.findFirst({
    where: { userId: session.user.id },
  });

  if (!employee) {
    return NextResponse.json({ active: null, assignedWOs: [] });
  }

  const active = await prisma.shiftAssignment.findFirst({
    where: {
      employeeId: employee.id,
      status: 'checked_in',
      actualEnd: null,
    },
    include: {
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
    },
    orderBy: { date: 'desc' },
  });

  if (!active) {
    return NextResponse.json({ active: null, assignedWOs: [] });
  }

  // Find assigned WOs from daily plan for this date + work center
  const mainLaborEntry = await prisma.laborEntry.findFirst({
    where: {
      userId: session.user.id,
      endTime: null,
      type: 'DIRECT',
    },
    orderBy: { startTime: 'desc' },
  });

  let assignedWOs: unknown[] = [];
  if (mainLaborEntry?.workCenterId) {
    const planLines = await prisma.dailyProductionPlanLine.findMany({
      where: {
        plan: {
          date: active.date,
          workCenterId: mainLaborEntry.workCenterId,
        },
        assignedToUserId: session.user.id,
      },
      include: {
        workOrder: {
          select: {
            id: true,
            woNumber: true,
            quantity: true,
            completedQty: true,
            scrapQty: true,
            status: true,
            product: { select: { name: true } },
          },
        },
      },
    });
    assignedWOs = planLines.map((l) => l.workOrder);
  }

  // Fallback: get all active WOs for the work center if no plan assignment
  if (assignedWOs.length === 0 && mainLaborEntry?.workCenterId) {
    assignedWOs = await prisma.workOrder.findMany({
      where: {
        workCenterId: mainLaborEntry.workCenterId,
        status: { in: ['draft', 'in_progress', 'released'] },
      },
      select: {
        id: true,
        woNumber: true,
        quantity: true,
        completedQty: true,
        scrapQty: true,
        status: true,
        product: { select: { name: true } },
      },
      take: 20,
    });
  }

  return NextResponse.json({
    active: { ...active, workCenterId: mainLaborEntry?.workCenterId },
    assignedWOs,
  });
});
