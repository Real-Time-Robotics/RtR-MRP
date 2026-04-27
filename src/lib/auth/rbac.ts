// src/lib/auth/rbac.ts — Role-Based Access Control middleware (Sprint 27)
// Composes with existing withPermission HOF from Sprint 26

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { HandlerContext, ApiHandler } from '@/lib/api/with-permission';

// =============================================================================
// TYPES
// =============================================================================

export type RoleCode = 'engineer' | 'warehouse' | 'production' | 'procurement' | 'admin' | 'viewer';

const VALID_ROLES: Set<string> = new Set(['engineer', 'warehouse', 'production', 'procurement', 'admin', 'viewer']);

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Fetch user roles from DB.
 * Returns array of role codes the user has been assigned.
 */
export async function getUserRoles(userId: string): Promise<RoleCode[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { select: { code: true } } },
  });
  return userRoles
    .map((ur) => ur.role.code)
    .filter((code): code is RoleCode => VALID_ROLES.has(code));
}

/**
 * Check if user has at least one of the specified roles.
 * Admin auto-passes all role checks.
 */
export async function hasRole(userId: string, ...roles: RoleCode[]): Promise<boolean> {
  if (rbacBypassEnabled()) return true;

  const userRoles = await getUserRoles(userId);
  if (userRoles.includes('admin')) return true;
  return roles.some((r) => userRoles.includes(r));
}

/**
 * HOF: Wrap an ApiHandler to enforce role-based access.
 * Returns 403 if user doesn't have any of the required roles.
 * Returns 401 if no user session.
 *
 * @example
 * export const GET = withPermission(
 *   requireRole('engineer', 'admin')(handler),
 *   { read: 'modules:read' }
 * );
 */
export function requireRole(...roles: RoleCode[]): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context: HandlerContext) => {
      const userId = context?.user?.id;

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthenticated', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const ok = await hasRole(userId, ...roles);

      if (!ok) {
        return NextResponse.json(
          {
            error: `Requires one of: ${roles.join(', ')}`,
            code: 'FORBIDDEN_ROLE',
          },
          { status: 403 }
        );
      }

      return handler(request, context);
    };
  };
}

// =============================================================================
// BYPASS (dev-only safety valve)
// =============================================================================

/**
 * Dev-only bypass for RBAC checks.
 * NEVER bypasses in production, even if env var is set.
 */
function rbacBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.RBAC_BYPASS === 'true';
}
