// =============================================================================
// RTR AUTH GATEWAY — PERMISSION MAPPING
// Maps Gateway JWT role_level/permissions/dept to MRP's 8-role system
// =============================================================================

import type { UserRole } from '@/lib/roles';
import type { Permission } from '@/lib/auth/auth-types';
import { rolePermissions } from '@/lib/auth/auth-types';
import type { RtrJwtPayload } from './types';

/**
 * Map Auth Gateway JWT payload to MRP UserRole.
 *
 * Gateway has 5 levels: super_admin(99), admin(30), manager(20), staff(10), viewer(0)
 * MRP has 8 roles: admin, manager, supervisor, planner, quality, operator, viewer, user
 *
 * Mapping logic (sơ bộ — Admin sẽ fine-tune sau deploy):
 * - role_level >= 99 → admin (super admin)
 * - mrpPerms includes "admin" → admin
 * - role_level >= 20 (manager) → manager
 * - dept === "quality" or "rnd" → quality
 * - dept === "planning" → planner
 * - dept === "production" + write → supervisor
 * - mrpPerms includes "write" → operator
 * - mrpPerms includes "read" → viewer
 * - else → null (no MRP access)
 */
export function mapToMrpRole(payload: RtrJwtPayload): UserRole | null {
  const { role_level, permissions, dept } = payload;
  const mrpPerms = permissions?.[process.env.RTR_APP_CODE || 'mrp'] || [];

  // No MRP permissions at all
  if (mrpPerms.length === 0) return null;

  // Super admin
  if (role_level >= 99) return 'admin';

  // App-level admin permission
  if (mrpPerms.includes('admin')) return 'admin';

  // Gateway manager level
  if (role_level >= 20) return 'manager';

  // Department-based mapping for staff level
  const deptLower = (dept || '').toLowerCase();

  if (deptLower === 'quality' || deptLower === 'rnd') return 'quality';
  if (deptLower === 'planning') return 'planner';
  if (deptLower === 'production' && mrpPerms.includes('write')) return 'supervisor';

  // Generic write access
  if (mrpPerms.includes('write')) return 'operator';

  // Read-only
  if (mrpPerms.includes('read')) return 'viewer';

  return null;
}

/**
 * Get MRP fine-grained permissions for a mapped role.
 * Uses existing rolePermissions from auth-types.ts.
 */
export function getMrpPermissions(role: UserRole): Permission[] {
  return rolePermissions[role as keyof typeof rolePermissions] || rolePermissions.viewer;
}

/**
 * Check if user has a specific MRP permission based on their mapped role.
 */
export function hasGatewayPermission(role: UserRole, permission: Permission): boolean {
  const perms = getMrpPermissions(role);
  return perms.includes(permission);
}
