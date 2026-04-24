// POST /api/serial/:serial/status — Update serial unit status
// Sprint 27 TIP-S27-02

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { hasRole } from '@/lib/auth/rbac';
import { SerialStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  IN_STOCK: ['ALLOCATED', 'CONSUMED', 'SHIPPED', 'SCRAPPED'],
  ALLOCATED: ['IN_STOCK', 'CONSUMED', 'SHIPPED'],
  CONSUMED: ['SCRAPPED'],
  SHIPPED: ['RETURNED'],
  SCRAPPED: [],
  RETURNED: ['IN_STOCK', 'SCRAPPED'],
};

const bodySchema = z.object({
  status: z.nativeEnum(SerialStatus),
  note: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, context, session) => {
  const allowed = await hasRole(session.user.id, 'warehouse', 'production', 'admin');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Requires role: warehouse, production, or admin', code: 'FORBIDDEN_ROLE' },
      { status: 403 }
    );
  }

  const params = await context.params;
  const serial = params.serial;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const serialUnit = await prisma.serialUnit.findUnique({ where: { serial } });
  if (!serialUnit) {
    return NextResponse.json({ error: 'Serial not found' }, { status: 404 });
  }

  // Validate transition
  const allowedNext = ALLOWED_TRANSITIONS[serialUnit.status] || [];
  if (!allowedNext.includes(parsed.data.status)) {
    return NextResponse.json(
      {
        error: `Invalid transition: ${serialUnit.status} → ${parsed.data.status}`,
        allowedTransitions: allowedNext,
      },
      { status: 422 }
    );
  }

  // Build notes update
  const timestamp = new Date().toISOString();
  const noteEntry = parsed.data.note
    ? `[${timestamp}] ${session.user.email}: ${parsed.data.note}`
    : `[${timestamp}] ${session.user.email}: Status → ${parsed.data.status}`;
  const updatedNotes = serialUnit.notes
    ? `${noteEntry}\n${serialUnit.notes}`
    : noteEntry;

  // Build status history in meta
  const currentMeta = (serialUnit.meta as Record<string, unknown>) || {};
  const statusHistory = Array.isArray(currentMeta.statusHistory)
    ? currentMeta.statusHistory
    : [];
  statusHistory.push({
    from: serialUnit.status,
    to: parsed.data.status,
    at: timestamp,
    by: session.user.id,
  });

  const updated = await prisma.serialUnit.update({
    where: { serial },
    data: {
      status: parsed.data.status,
      notes: updatedNotes,
      meta: { ...currentMeta, statusHistory },
    },
  });

  return NextResponse.json(updated);
});
