// GET /api/users — List users with roles (admin only)
// Sprint 28.5 TIP-S285-04

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/rbac';

export const GET = withAuth(async (request: NextRequest, _context, session) => {
  const allowed = await hasRole(session.user.id, 'admin');
  if (!allowed) {
    return NextResponse.json({ error: 'Admin only', code: 'FORBIDDEN_ROLE' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || '';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      userRoles: {
        include: { role: { select: { code: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  let result = users.map((u) => ({
    ...u,
    roles: u.userRoles.map((ur) => ur.role.code),
    roleNames: u.userRoles.map((ur) => ur.role.name),
  }));

  if (roleFilter) {
    result = result.filter((u) => u.roles.includes(roleFilter));
  }

  return NextResponse.json({ users: result, total: result.length });
});
