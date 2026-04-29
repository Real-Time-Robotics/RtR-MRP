// GET + POST /api/production/data-sources/:id/mappings
// Sprint 28 TIP-S28-09

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type RouteContext } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';

const mappingSchema = z.object({
  targetEntity: z.string().min(1),
  columnMappings: z.record(z.string(), z.string()),
  authorityFields: z.array(z.string()).optional(),
  validations: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withAuth(async (_request: NextRequest, context: RouteContext, _session) => {
  const { id } = await context.params;

  const mappings = await prisma.mappingRule.findMany({
    where: { sourceId: id },
    orderBy: { version: 'desc' },
  });

  return NextResponse.json({ mappings });
});

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

  const body = await request.json();
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  // Deactivate previous active mappings
  await prisma.mappingRule.updateMany({
    where: { sourceId: id, isActive: true },
    data: { isActive: false },
  });

  // Get next version
  const lastMapping = await prisma.mappingRule.findFirst({
    where: { sourceId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastMapping?.version || 0) + 1;

  const mapping = await prisma.mappingRule.create({
    data: {
      sourceId: id,
      version: nextVersion,
      isActive: true,
      targetEntity: parsed.data.targetEntity,
      columnMappings: parsed.data.columnMappings as any,
      authorityFields: (parsed.data.authorityFields || []) as any,
      validations: (parsed.data.validations || {}) as any,
      createdByUserId: session.user.id,
    },
  });

  return NextResponse.json({ mapping }, { status: 201 });
});
