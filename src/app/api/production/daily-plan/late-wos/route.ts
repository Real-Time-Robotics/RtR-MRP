// GET /api/production/daily-plan/late-wos?date=
// Sprint 28 TIP-S28-03

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const refDate = new Date(dateStr);

  const lateWOs = await prisma.workOrder.findMany({
    where: {
      dueDate: { lt: refDate },
      status: { notIn: ['completed', 'cancelled'] },
    },
    select: {
      id: true,
      woNumber: true,
      quantity: true,
      completedQty: true,
      status: true,
      dueDate: true,
      workCenterId: true,
      product: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  return NextResponse.json({ lateWOs });
});
