// GET + POST /api/production/data-sources
// Sprint 28 TIP-S28-09

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const createSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['EXCEL_UPLOAD', 'CSV', 'GSHEET']).default('EXCEL_UPLOAD'),
  ownerDept: z.string().optional(),
});

export const GET = withAuth(async (_request: NextRequest, _context, _session) => {
  const sources = await prisma.dataSource.findMany({
    include: {
      mappings: { where: { isActive: true }, select: { id: true, version: true, targetEntity: true } },
      syncJobs: { take: 1, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, createdAt: true, rowsRead: true, rowsCreated: true, rowsUpdated: true, rowsError: true } },
      createdByUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ sources });
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: admin' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  const source = await prisma.dataSource.create({
    data: {
      ...parsed.data,
      createdByUserId: session.user.id,
    },
  });

  return NextResponse.json({ source }, { status: 201 });
});
