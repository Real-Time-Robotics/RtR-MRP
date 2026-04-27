// GET /api/serial/:serial — Lookup serial unit with full details
// Sprint 27 TIP-S27-02

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (
  _request: NextRequest,
  context,
  _session
) => {
  const params = await context.params;
  const serial = params.serial;

  const serialUnit = await prisma.serialUnit.findUnique({
    where: { serial },
    include: {
      moduleDesign: { select: { id: true, code: true, name: true, version: true, prefix: true } },
      product: { select: { id: true, sku: true, name: true } },
      part: { select: { id: true, partNumber: true, name: true } },
      inventory: { select: { id: true, quantity: true, locationCode: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
      parentLinks: {
        include: { parentSerial: { select: { id: true, serial: true, status: true } } },
      },
      childLinks: {
        include: { childSerial: { select: { id: true, serial: true, status: true } } },
      },
    },
  });

  if (!serialUnit) {
    return NextResponse.json({ error: 'Serial not found' }, { status: 404 });
  }

  return NextResponse.json(serialUnit);
});
