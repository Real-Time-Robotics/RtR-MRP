// POST /api/production/data-sources/:id/sync
// Sprint 28 TIP-S28-09

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/rbac';
import { runIngestion } from '@/lib/bridge/ingestion';

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

  // Get active mapping
  const activeMapping = await prisma.mappingRule.findFirst({
    where: { sourceId: id, isActive: true },
  });
  if (!activeMapping) {
    return NextResponse.json({ error: 'No active mapping. Create a mapping first.' }, { status: 422 });
  }

  // Get file from request
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await runIngestion(
    id,
    buffer,
    activeMapping.targetEntity,
    activeMapping.columnMappings as Record<string, string>,
    session.user.id
  );

  return NextResponse.json({ result }, { status: 201 });
});
