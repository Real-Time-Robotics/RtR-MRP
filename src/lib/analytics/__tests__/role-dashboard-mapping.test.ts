import { describe, it, expect } from 'vitest';
import {
  ROLE_DASHBOARD_MAPPING,
  getRoleDashboardConfig,
  canAccessTemplate,
  hasPermission,
  hasFeature,
  getDefaultTemplateForRole,
  getAllowedTemplatesForRole,
  canCreateMoreDashboards,
  getRolePermissions,
  getRoleFeatures,
  TEMPLATE_CATEGORIES,
} from '../role-dashboard-mapping';

describe('role-dashboard-mapping', () => {
  describe('ROLE_DASHBOARD_MAPPING', () => {
    it('should have config for all roles', () => {
      const roles = ['admin', 'manager', 'supervisor', 'planner', 'operator', 'quality', 'viewer', 'user'];
      for (const role of roles) {
        expect(ROLE_DASHBOARD_MAPPING[role as keyof typeof ROLE_DASHBOARD_MAPPING]).toBeDefined();
      }
    });

    it('should give admin unlimited dashboards', () => {
      expect(ROLE_DASHBOARD_MAPPING.admin.maxDashboards).toBe(-1);
    });

    it('should give operator limited permissions', () => {
      const op = ROLE_DASHBOARD_MAPPING.operator;
      expect(op.permissions.canCreate).toBe(false);
      expect(op.permissions.canEdit).toBe(false);
      expect(op.permissions.canDelete).toBe(false);
      expect(op.maxDashboards).toBe(1);
    });
  });

  describe('getRoleDashboardConfig', () => {
    it('should return config for known role', () => {
      const config = getRoleDashboardConfig('admin');
      expect(config.defaultTemplate).toBe('template-executive-default');
    });

    it('should fallback to user config for unknown role', () => {
      const config = getRoleDashboardConfig('nonexistent' as any);
      expect(config).toEqual(ROLE_DASHBOARD_MAPPING.user);
    });
  });

  describe('canAccessTemplate', () => {
    it('should allow admin to access all templates', () => {
      expect(canAccessTemplate('admin', 'template-executive-default')).toBe(true);
      expect(canAccessTemplate('admin', 'template-operations-default')).toBe(true);
      expect(canAccessTemplate('admin', 'template-quality-default')).toBe(true);
    });

    it('should deny operator access to executive template', () => {
      expect(canAccessTemplate('operator', 'template-executive-default')).toBe(false);
    });

    it('should allow quality role access to quality template', () => {
      expect(canAccessTemplate('quality', 'template-quality-default')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin canCreate', () => {
      expect(hasPermission('admin', 'canCreate')).toBe(true);
    });

    it('should return false for viewer canCreate', () => {
      expect(hasPermission('viewer', 'canCreate')).toBe(false);
    });

    it('should return true for viewer canViewAll', () => {
      expect(hasPermission('viewer', 'canViewAll')).toBe(true);
    });
  });

  describe('hasFeature', () => {
    it('should allow admin all features', () => {
      expect(hasFeature('admin', 'canCustomizeWidgets')).toBe(true);
      expect(hasFeature('admin', 'canExportData')).toBe(true);
      expect(hasFeature('admin', 'canScheduleReports')).toBe(true);
      expect(hasFeature('admin', 'canAccessRawData')).toBe(true);
    });

    it('should deny operator all features', () => {
      expect(hasFeature('operator', 'canCustomizeWidgets')).toBe(false);
      expect(hasFeature('operator', 'canExportData')).toBe(false);
    });
  });

  describe('getDefaultTemplateForRole', () => {
    it('should return executive for admin', () => {
      expect(getDefaultTemplateForRole('admin')).toBe('template-executive-default');
    });

    it('should return operations for operator', () => {
      expect(getDefaultTemplateForRole('operator')).toBe('template-operations-default');
    });

    it('should return quality for quality', () => {
      expect(getDefaultTemplateForRole('quality')).toBe('template-quality-default');
    });
  });

  describe('getAllowedTemplatesForRole', () => {
    it('should return all 3 templates for admin', () => {
      const templates = getAllowedTemplatesForRole('admin');
      expect(templates).toHaveLength(3);
    });

    it('should return 1 template for operator', () => {
      const templates = getAllowedTemplatesForRole('operator');
      expect(templates).toHaveLength(1);
    });
  });

  describe('canCreateMoreDashboards', () => {
    it('should always allow admin (unlimited)', () => {
      expect(canCreateMoreDashboards('admin', 100)).toBe(true);
    });

    it('should limit operator to 1', () => {
      expect(canCreateMoreDashboards('operator', 0)).toBe(true);
      expect(canCreateMoreDashboards('operator', 1)).toBe(false);
    });

    it('should limit manager to 20', () => {
      expect(canCreateMoreDashboards('manager', 19)).toBe(true);
      expect(canCreateMoreDashboards('manager', 20)).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return all permissions for admin', () => {
      const perms = getRolePermissions('admin');
      expect(perms.canCreate).toBe(true);
      expect(perms.canEdit).toBe(true);
      expect(perms.canShare).toBe(true);
      expect(perms.canDelete).toBe(true);
      expect(perms.canViewAll).toBe(true);
    });
  });

  describe('getRoleFeatures', () => {
    it('should return features object', () => {
      const features = getRoleFeatures('supervisor');
      expect(features.canCustomizeWidgets).toBe(true);
      expect(features.canExportData).toBe(true);
      expect(features.canScheduleReports).toBe(false);
    });
  });

  describe('TEMPLATE_CATEGORIES', () => {
    it('should have executive, operations, quality', () => {
      expect(TEMPLATE_CATEGORIES.executive).toBeDefined();
      expect(TEMPLATE_CATEGORIES.operations).toBeDefined();
      expect(TEMPLATE_CATEGORIES.quality).toBeDefined();
    });

    it('should have Vietnamese names', () => {
      expect(TEMPLATE_CATEGORIES.executive.nameVi).toBe('Điều hành');
      expect(TEMPLATE_CATEGORIES.operations.nameVi).toBe('Vận hành');
      expect(TEMPLATE_CATEGORIES.quality.nameVi).toBe('Chất lượng');
    });
  });
});
