/**
 * Sprint 27 TIP-S27-05 — RBAC Unit Tests
 * Tests for hasRole, requireRole, getUserRoles, and bypass behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasRole, requireRole, getUserRoles, type RoleCode } from '../rbac';
import type { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/prisma', () => {
  const userRolesDB: Array<{ userId: string; role: { code: string } }> = [];

  return {
    default: {
      userRole: {
        findMany: vi.fn(({ where }: { where: { userId: string } }) => {
          return Promise.resolve(
            userRolesDB.filter((ur) => ur.userId === where.userId)
          );
        }),
      },
      // Helper to seed test data (not a real Prisma method)
      __seedUserRole: (userId: string, roleCode: string) => {
        userRolesDB.push({ userId, role: { code: roleCode } });
      },
      __clearUserRoles: () => {
        userRolesDB.length = 0;
      },
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = (await import('@/lib/prisma')).default as any;

describe('Sprint 27 RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.__clearUserRoles();
    // Reset env
    delete process.env.RBAC_BYPASS;
  });

  describe('getUserRoles', () => {
    it('should return role codes for a user', async () => {
      prisma.__seedUserRole('user-1', 'engineer');
      prisma.__seedUserRole('user-1', 'warehouse');

      const roles = await getUserRoles('user-1');
      expect(roles).toContain('engineer');
      expect(roles).toContain('warehouse');
      expect(roles).toHaveLength(2);
    });

    it('should return empty array for user with no roles', async () => {
      const roles = await getUserRoles('user-no-roles');
      expect(roles).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the requested role', async () => {
      prisma.__seedUserRole('user-eng', 'engineer');

      expect(await hasRole('user-eng', 'engineer')).toBe(true);
    });

    it('should return false when user lacks the requested role', async () => {
      prisma.__seedUserRole('user-eng', 'engineer');

      expect(await hasRole('user-eng', 'warehouse')).toBe(false);
    });

    it('should auto-pass for admin (any role check)', async () => {
      prisma.__seedUserRole('user-admin', 'admin');

      expect(await hasRole('user-admin', 'engineer')).toBe(true);
      expect(await hasRole('user-admin', 'warehouse')).toBe(true);
      expect(await hasRole('user-admin', 'production')).toBe(true);
    });

    it('should return true if user has ANY of multiple roles', async () => {
      prisma.__seedUserRole('user-multi', 'warehouse');

      expect(await hasRole('user-multi', 'engineer', 'warehouse')).toBe(true);
    });
  });

  describe('requireRole', () => {
    const mockHandler = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    it('should return 401 when no user session', async () => {
      const wrapped = requireRole('admin')(mockHandler);
      const response = await wrapped(
        {} as NextRequest,
        { user: undefined as unknown as { id: string; email: string; name: string; role: 'admin' } }
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.code).toBe('AUTH_REQUIRED');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks required role', async () => {
      prisma.__seedUserRole('user-viewer', 'viewer');

      const wrapped = requireRole('admin')(mockHandler);
      const response = await wrapped(
        {} as NextRequest,
        { user: { id: 'user-viewer', email: 'v@rtr.vn', name: 'Viewer', role: 'viewer' as const } }
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe('FORBIDDEN_ROLE');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should pass through when user has matching role', async () => {
      prisma.__seedUserRole('user-eng', 'engineer');

      const wrapped = requireRole('engineer')(mockHandler);
      const response = await wrapped(
        {} as NextRequest,
        { user: { id: 'user-eng', email: 'e@rtr.vn', name: 'Engineer', role: 'operator' as const } }
      );

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should pass through for admin regardless of required role', async () => {
      prisma.__seedUserRole('user-admin', 'admin');

      const wrapped = requireRole('warehouse')(mockHandler);
      const response = await wrapped(
        {} as NextRequest,
        { user: { id: 'user-admin', email: 'a@rtr.vn', name: 'Admin', role: 'admin' as const } }
      );

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
    });
  });

  describe('RBAC bypass', () => {
    it('should bypass in development when RBAC_BYPASS=true', async () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('RBAC_BYPASS', 'true');

      // User with NO roles should still pass
      expect(await hasRole('user-no-roles', 'admin')).toBe(true);

      vi.stubEnv('NODE_ENV', originalEnv || 'test');
    });

    it('should NOT bypass in production even with RBAC_BYPASS=true', async () => {
      const originalEnv = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('RBAC_BYPASS', 'true');

      // User with no roles should still fail
      expect(await hasRole('user-no-roles', 'admin')).toBe(false);

      vi.stubEnv('NODE_ENV', originalEnv || 'test');
    });
  });
});
