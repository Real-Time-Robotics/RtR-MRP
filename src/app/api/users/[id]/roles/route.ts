// src/app/api/users/[id]/roles/route.ts — Admin API for managing user roles
// Sprint 27 TIP-S27-05

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { hasRole, type RoleCode } from '@/lib/auth/rbac';
import { z } from 'zod';

const VALID_CODES: RoleCode[] = ['engineer', 'warehouse', 'production', 'procurement', 'admin', 'viewer'];

const roleBodySchema = z.object({
  roleCode: z.enum(['engineer', 'warehouse', 'production', 'procurement', 'admin', 'viewer']),
});

// GET /api/users/[id]/roles — List user's roles
export const GET = withAuth(async (
  _request: NextRequest,
  context,
  session
) => {
  const params = await context.params;
  const userId = params.id;

  // Only admin can view roles
  const isAdmin = await hasRole(session.user.id, 'admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Requires admin role', code: 'FORBIDDEN_ROLE' }, { status: 403 });
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { code: true, name: true, description: true } } },
  });

  return NextResponse.json({
    userId,
    roles: userRoles.map((ur) => ({
      code: ur.role.code,
      name: ur.role.name,
      description: ur.role.description,
      assignedAt: ur.assignedAt,
    })),
  });
});

// POST /api/users/[id]/roles — Assign a role
export const POST = withAuth(async (
  request: NextRequest,
  context,
  session
) => {
  const params = await context.params;
  const userId = params.id;

  const isAdmin = await hasRole(session.user.id, 'admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Requires admin role', code: 'FORBIDDEN_ROLE' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = roleBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid role code', validCodes: VALID_CODES },
      { status: 400 }
    );
  }

  const role = await prisma.role.findUnique({ where: { code: parsed.data.roleCode } });
  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  // Upsert — idempotent
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id, assignedBy: session.user.id },
    update: {},
  });

  // Return current roles
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { code: true, name: true } } },
  });

  return NextResponse.json({
    userId,
    roles: userRoles.map((ur) => ({ code: ur.role.code, name: ur.role.name })),
  });
});

// DELETE /api/users/[id]/roles — Unassign a role
export const DELETE = withAuth(async (
  request: NextRequest,
  context,
  session
) => {
  const params = await context.params;
  const userId = params.id;

  const isAdmin = await hasRole(session.user.id, 'admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Requires admin role', code: 'FORBIDDEN_ROLE' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = roleBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid role code', validCodes: VALID_CODES },
      { status: 400 }
    );
  }

  const role = await prisma.role.findUnique({ where: { code: parsed.data.roleCode } });
  if (!role) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  await prisma.userRole.deleteMany({
    where: { userId, roleId: role.id },
  });

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { code: true, name: true } } },
  });

  return NextResponse.json({
    userId,
    roles: userRoles.map((ur) => ({ code: ur.role.code, name: ur.role.name })),
  });
});
