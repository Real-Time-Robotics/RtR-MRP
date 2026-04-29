// POST /api/production/data-sources/:id/upload
// Sprint 28 TIP-S28-09

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/rbac';
import { parseExcelBuffer } from '@/lib/bridge/parser';

export const POST = withAuth(async (request: NextRequest, context: RouteContext, session) => {
  const allowed = await hasRole(session.user.id, 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Requires role: admin' }, { status: 403 });
  }

  const { id } = await context.params;

  const source = await prisma.dataSource.findUnique({ where: { id } });
  if (!source) {
    return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sheets = parseExcelBuffer(buffer, 10);

  return NextResponse.json({
    fileName: file.name,
    fileSize: file.size,
    sheets,
  });
});
