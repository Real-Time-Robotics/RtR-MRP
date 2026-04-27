// POST /api/assembly/:id/complete — Complete Assembly Order
// Sprint 27 TIP-S27-03

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/api/with-auth';
import { hasRole } from '@/lib/auth/rbac';
import {
  completeAssemblyOrder,
  IncompleteAssemblyError,
  NoModuleDesignForProductError,
  AssemblyOrderNotFoundError,
  InvalidAssemblyStateError,
} from '@/lib/assembly/service';
import { SerialNumberingRuleNotFoundError } from '@/lib/serial/numbering';

export const POST = withAuth(async (
  _request: NextRequest,
  context,
  session
) => {
  const allowed = await hasRole(session.user.id, 'production', 'admin');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Requires role: production or admin', code: 'FORBIDDEN_ROLE' },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const result = await completeAssemblyOrder(id, session.user.id);
    return NextResponse.json({
      parentSerial: result.parentSerial,
      aoId: result.aoId,
      status: 'COMPLETED',
    });
  } catch (error) {
    if (error instanceof AssemblyOrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidAssemblyStateError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof IncompleteAssemblyError) {
      return NextResponse.json(
        { error: error.message, missingByBomLine: error.missingByBomLine },
        { status: 422 }
      );
    }
    if (error instanceof NoModuleDesignForProductError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof SerialNumberingRuleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
});
