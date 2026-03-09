import { describe, it, expect } from 'vitest';
import { ROLES, ROLE_HIERARCHY, hasPermission, hasAnyRole, UserRole } from '../roles';

describe('Roles', () => {
  describe('ROLES constant', () => {
    it('should define all roles', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MANAGER).toBe('manager');
      expect(ROLES.SUPERVISOR).toBe('supervisor');
      expect(ROLES.PLANNER).toBe('planner');
      expect(ROLES.QUALITY).toBe('quality');
      expect(ROLES.OPERATOR).toBe('operator');
      expect(ROLES.VIEWER).toBe('viewer');
      expect(ROLES.USER).toBe('user');
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('should have admin at highest level', () => {
      expect(ROLE_HIERARCHY.admin).toBe(100);
    });

    it('should have user at lowest level', () => {
      expect(ROLE_HIERARCHY.user).toBe(10);
    });

    it('should order roles correctly', () => {
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.manager);
      expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.supervisor);
      expect(ROLE_HIERARCHY.supervisor).toBeGreaterThan(ROLE_HIERARCHY.planner);
      expect(ROLE_HIERARCHY.planner).toBeGreaterThan(ROLE_HIERARCHY.operator);
      expect(ROLE_HIERARCHY.operator).toBeGreaterThan(ROLE_HIERARCHY.viewer);
      expect(ROLE_HIERARCHY.viewer).toBeGreaterThan(ROLE_HIERARCHY.user);
    });
  });

  describe('hasPermission', () => {
    it('should allow admin to access everything', () => {
      expect(hasPermission('admin', 'admin')).toBe(true);
      expect(hasPermission('admin', 'manager')).toBe(true);
      expect(hasPermission('admin', 'viewer')).toBe(true);
    });

    it('should not allow viewer to access admin', () => {
      expect(hasPermission('viewer', 'admin')).toBe(false);
    });

    it('should not allow operator to access manager', () => {
      expect(hasPermission('operator', 'manager')).toBe(false);
    });

    it('should allow same role', () => {
      expect(hasPermission('manager', 'manager')).toBe(true);
    });

    it('should handle unknown role as level 0', () => {
      expect(hasPermission('unknown', 'viewer')).toBe(false);
    });

    it('should handle manager accessing supervisor resources', () => {
      expect(hasPermission('manager', 'supervisor')).toBe(true);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true if user has any required role', () => {
      expect(hasAnyRole('admin', ['admin', 'manager'])).toBe(true);
    });

    it('should return true for higher role', () => {
      expect(hasAnyRole('admin', ['manager', 'viewer'])).toBe(true);
    });

    it('should return false if user has none of required roles', () => {
      expect(hasAnyRole('viewer', ['admin', 'manager'])).toBe(false);
    });

    it('should return true for exact match', () => {
      expect(hasAnyRole('operator', ['operator'])).toBe(true);
    });

    it('should return false for empty allowed roles', () => {
      expect(hasAnyRole('admin', [])).toBe(false);
    });
  });
});
