// POST /api/serial/generate — Generate a new serial number
// Sprint 27 TIP-S27-02

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { generateSerial, SerialNumberingRuleNotFoundError } from '@/lib/serial/numbering';
import { hasRole } from '@/lib/auth/rbac';

const bodySchema = z.object({
  moduleDesignId: z.string().min(1),
});

export const POST = withAuth(async (request: NextRequest, _context, session) => {
  // Role check: engineer, production, admin
  const allowed = await hasRole(session.user.id, 'engineer', 'production', 'admin');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Requires role: engineer, production, or admin', code: 'FORBIDDEN_ROLE' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify moduleDesign exists
  const md = await prisma.moduleDesign.findUnique({ where: { id: parsed.data.moduleDesignId } });
  if (!md) {
    return NextResponse.json({ error: 'ModuleDesign not found' }, { status: 404 });
  }

  try {
    const serial = await generateSerial({ moduleDesignId: parsed.data.moduleDesignId });

    const serialUnit = await prisma.serialUnit.create({
      data: {
        serial,
        moduleDesignId: parsed.data.moduleDesignId,
        source: 'MANUFACTURED',
        status: 'IN_STOCK',
        createdByUserId: session.user.id,
      },
    });

    return NextResponse.json(
      { serial: serialUnit.serial, serialUnitId: serialUnit.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SerialNumberingRuleNotFoundError) {
      return NextResponse.json(
        { error: 'Numbering rule not configured for this module' },
        { status: 422 }
      );
    }
    throw error;
  }
});
