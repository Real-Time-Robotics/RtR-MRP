// GET /api/production/maintenance-schedule?days=7
// Sprint 28 TIP-S28-05

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request: NextRequest, _context, _session) => {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7', 10);

  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const upcoming = await prisma.equipment.findMany({
    where: {
      nextMaintenanceDate: {
        gte: now,
        lte: futureDate,
      },
      status: { not: 'retired' },
    },
    include: {
      workCenter: { select: { id: true, code: true, name: true } },
    },
    orderBy: { nextMaintenanceDate: 'asc' },
  });

  return NextResponse.json({ upcoming });
});
