import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockAnalyticsDashboard, mockDashboardWidget, mockDashboardTemplate } = vi.hoisted(() => ({
  mockAnalyticsDashboard: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mockDashboardWidget: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockDashboardTemplate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analyticsDashboard: mockAnalyticsDashboard,
    dashboardWidget: mockDashboardWidget,
    dashboardTemplate: mockDashboardTemplate,
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('../role-dashboard-mapping', () => ({
  getRoleDashboardConfig: vi.fn().mockReturnValue({
    defaultTemplate: 'template-executive-default',
    allowedTemplates: ['template-executive-default', 'template-operations-default'],
    permissions: {
      canCreate: true,
      canEdit: true,
      canShare: true,
      canDelete: true,
      canViewAll: true,
    },
    maxDashboards: -1,
    features: {
      canCustomizeWidgets: true,
      canExportData: true,
      canScheduleReports: true,
      canAccessRawData: true,
    },
  }),
  canAccessTemplate: vi.fn().mockReturnValue(true),
  hasPermission: vi.fn().mockReturnValue(true),
  getDefaultTemplateForRole: vi.fn().mockReturnValue('template-executive-default'),
  getAllowedTemplatesForRole: vi.fn().mockReturnValue(['template-executive-default', 'template-operations-default']),
  canCreateMoreDashboards: vi.fn().mockReturnValue(true),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  dashboardService,
  DEFAULT_LAYOUT,
  DEFAULT_WIDGET_DISPLAY,
  DASHBOARD_TEMPLATES,
} from '../dashboard-service';
import { getRoleDashboardConfig, canAccessTemplate, hasPermission, canCreateMoreDashboards } from '../role-dashboard-mapping';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makePrismaDashboard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dash-1',
    userId: 'user-1',
    name: 'Test Dashboard',
    description: 'A test dashboard',
    layout: DEFAULT_LAYOUT,
    isPublic: false,
    isDefault: false,
    viewCount: 0,
    lastViewedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    widgets: [],
    ...overrides,
  };
}

function makePrismaWidget(overrides: Record<string, unknown> = {}) {
  return {
    id: 'widget-1',
    dashboardId: 'dash-1',
    widgetType: 'kpi',
    title: 'Revenue',
    titleVi: 'Doanh thu',
    dataSource: 'sales',
    metric: 'REVENUE_MTD',
    queryConfig: {},
    displayConfig: { formatter: 'currency' },
    gridX: 0,
    gridY: 0,
    gridW: 3,
    gridH: 2,
    refreshInterval: null,
    drillDownConfig: null,
    ...overrides,
  };
}

function makePrismaTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'template-executive-default',
    name: 'Executive Overview',
    nameVi: 'Tong quan dieu hanh',
    description: 'High-level KPIs',
    category: 'executive',
    thumbnail: null,
    layout: DEFAULT_LAYOUT,
    widgets: [],
    isActive: true,
    isDefault: true,
    usageCount: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('dashboard-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Exported constants
  // =========================================================================

  describe('DEFAULT_LAYOUT', () => {
    it('has expected default properties', () => {
      expect(DEFAULT_LAYOUT.columns).toBe(12);
      expect(DEFAULT_LAYOUT.rowHeight).toBe(100);
      expect(DEFAULT_LAYOUT.margin).toEqual([16, 16]);
      expect(DEFAULT_LAYOUT.containerPadding).toEqual([16, 16]);
      expect(DEFAULT_LAYOUT.compactType).toBe('vertical');
    });
  });

  describe('DEFAULT_WIDGET_DISPLAY', () => {
    it('has expected defaults', () => {
      expect(DEFAULT_WIDGET_DISPLAY.showLegend).toBe(true);
      expect(DEFAULT_WIDGET_DISPLAY.legendPosition).toBe('bottom');
      expect(DEFAULT_WIDGET_DISPLAY.formatter).toBe('number');
      expect(DEFAULT_WIDGET_DISPLAY.locale).toBe('vi-VN');
      expect(DEFAULT_WIDGET_DISPLAY.animation).toBe(true);
    });
  });

  describe('DASHBOARD_TEMPLATES', () => {
    it('contains at least 3 templates', () => {
      expect(DASHBOARD_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    });

    it('has executive, operations, and quality templates', () => {
      const categories = DASHBOARD_TEMPLATES.map(t => t.category);
      expect(categories).toContain('executive');
      expect(categories).toContain('operations');
      expect(categories).toContain('quality');
    });

    it('each template has widgets', () => {
      DASHBOARD_TEMPLATES.forEach(t => {
        expect(t.widgets.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // createDashboard
  // =========================================================================

  describe('createDashboard', () => {
    it('creates a dashboard with merged layout', async () => {
      const prismaDash = makePrismaDashboard();
      mockAnalyticsDashboard.create.mockResolvedValue(prismaDash);

      const result = await dashboardService.createDashboard('user-1', {
        name: 'Test Dashboard',
      });

      expect(mockAnalyticsDashboard.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('dash-1');
      expect(result.name).toBe('Test Dashboard');
    });

    it('unsets other defaults when isDefault is true', async () => {
      const prismaDash = makePrismaDashboard({ isDefault: true });
      mockAnalyticsDashboard.create.mockResolvedValue(prismaDash);
      mockAnalyticsDashboard.updateMany.mockResolvedValue({ count: 1 });

      await dashboardService.createDashboard('user-1', {
        name: 'New Default',
        isDefault: true,
      });

      expect(mockAnalyticsDashboard.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true },
        data: { isDefault: false },
      });
    });

    it('does not unset defaults when isDefault is not set', async () => {
      const prismaDash = makePrismaDashboard();
      mockAnalyticsDashboard.create.mockResolvedValue(prismaDash);

      await dashboardService.createDashboard('user-1', { name: 'No Default' });

      expect(mockAnalyticsDashboard.updateMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getDashboard
  // =========================================================================

  describe('getDashboard', () => {
    it('returns null when not found', async () => {
      mockAnalyticsDashboard.findUnique.mockResolvedValue(null);

      const result = await dashboardService.getDashboard('not-exist');

      expect(result).toBeNull();
      expect(mockAnalyticsDashboard.update).not.toHaveBeenCalled();
    });

    it('returns dashboard and increments view count', async () => {
      const prismaDash = makePrismaDashboard({ widgets: [makePrismaWidget()] });
      mockAnalyticsDashboard.findUnique.mockResolvedValue(prismaDash);
      mockAnalyticsDashboard.update.mockResolvedValue(prismaDash);

      const result = await dashboardService.getDashboard('dash-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('dash-1');
      expect(result!.widgets).toHaveLength(1);
      expect(mockAnalyticsDashboard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dash-1' },
          data: expect.objectContaining({
            viewCount: { increment: 1 },
          }),
        })
      );
    });
  });

  // =========================================================================
  // getUserDashboards
  // =========================================================================

  describe('getUserDashboards', () => {
    it('returns dashboards for user and public dashboards', async () => {
      mockAnalyticsDashboard.findMany.mockResolvedValue([
        makePrismaDashboard({ id: 'd1' }),
        makePrismaDashboard({ id: 'd2', isPublic: true }),
      ]);

      const result = await dashboardService.getUserDashboards('user-1');

      expect(result).toHaveLength(2);
      expect(mockAnalyticsDashboard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ userId: 'user-1' }, { isPublic: true }] },
        })
      );
    });
  });

  // =========================================================================
  // updateDashboard
  // =========================================================================

  describe('updateDashboard', () => {
    it('updates a dashboard', async () => {
      const prismaDash = makePrismaDashboard({ name: 'Updated' });
      mockAnalyticsDashboard.update.mockResolvedValue(prismaDash);

      const result = await dashboardService.updateDashboard('dash-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('unsets other defaults when setting isDefault', async () => {
      const prismaDash = makePrismaDashboard({ isDefault: true });
      mockAnalyticsDashboard.findUnique.mockResolvedValue(prismaDash);
      mockAnalyticsDashboard.updateMany.mockResolvedValue({ count: 1 });
      mockAnalyticsDashboard.update.mockResolvedValue(prismaDash);

      await dashboardService.updateDashboard('dash-1', { isDefault: true });

      expect(mockAnalyticsDashboard.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDefault: true, id: { not: 'dash-1' } },
        data: { isDefault: false },
      });
    });
  });

  // =========================================================================
  // deleteDashboard
  // =========================================================================

  describe('deleteDashboard', () => {
    it('deletes a dashboard', async () => {
      mockAnalyticsDashboard.delete.mockResolvedValue(makePrismaDashboard());

      await dashboardService.deleteDashboard('dash-1');

      expect(mockAnalyticsDashboard.delete).toHaveBeenCalledWith({ where: { id: 'dash-1' } });
    });
  });

  // =========================================================================
  // getDefaultDashboard
  // =========================================================================

  describe('getDefaultDashboard', () => {
    it('returns the default dashboard when one exists', async () => {
      const prismaDash = makePrismaDashboard({ isDefault: true });
      mockAnalyticsDashboard.findFirst.mockResolvedValue(prismaDash);

      const result = await dashboardService.getDefaultDashboard('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('dash-1');
    });

    it('falls back to first dashboard when no default', async () => {
      mockAnalyticsDashboard.findFirst
        .mockResolvedValueOnce(null) // no default
        .mockResolvedValueOnce(makePrismaDashboard({ id: 'first' }));

      const result = await dashboardService.getDefaultDashboard('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('first');
    });

    it('returns null when user has no dashboards', async () => {
      mockAnalyticsDashboard.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await dashboardService.getDefaultDashboard('user-1');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Widget Management
  // =========================================================================

  describe('addWidget', () => {
    it('creates a widget with merged display config', async () => {
      const prismaWidget = makePrismaWidget();
      mockDashboardWidget.create.mockResolvedValue(prismaWidget);

      const result = await dashboardService.addWidget('dash-1', {
        widgetType: 'kpi',
        title: 'Revenue',
        dataSource: 'sales',
        metric: 'REVENUE_MTD',
        queryConfig: {},
        displayConfig: { formatter: 'currency' },
        gridX: 0,
        gridY: 0,
        gridW: 3,
        gridH: 2,
      });

      expect(result.id).toBe('widget-1');
      expect(mockDashboardWidget.create).toHaveBeenCalledTimes(1);
      // display config should include defaults merged
      const callData = mockDashboardWidget.create.mock.calls[0][0].data;
      expect(callData.displayConfig).toMatchObject({
        showLegend: true, // from DEFAULT_WIDGET_DISPLAY
        formatter: 'currency', // overridden
      });
    });
  });

  describe('updateWidget', () => {
    it('updates a widget', async () => {
      const prismaWidget = makePrismaWidget({ title: 'Updated' });
      mockDashboardWidget.update.mockResolvedValue(prismaWidget);

      const result = await dashboardService.updateWidget('widget-1', { title: 'Updated' });

      expect(result.title).toBe('Updated');
    });
  });

  describe('removeWidget', () => {
    it('deletes a widget', async () => {
      mockDashboardWidget.delete.mockResolvedValue(makePrismaWidget());

      await dashboardService.removeWidget('widget-1');

      expect(mockDashboardWidget.delete).toHaveBeenCalledWith({ where: { id: 'widget-1' } });
    });
  });

  describe('updateWidgetPositions', () => {
    it('updates positions in a transaction', async () => {
      mockDashboardWidget.update.mockResolvedValue(makePrismaWidget());

      const updates = [
        { id: 'w1', gridX: 0, gridY: 0, gridW: 3, gridH: 2 },
        { id: 'w2', gridX: 3, gridY: 0, gridW: 3, gridH: 2 },
      ];

      await dashboardService.updateWidgetPositions(updates);

      // $transaction is called with an array of update promises
      const { prisma } = await import('@/lib/prisma');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Template Management
  // =========================================================================

  describe('getTemplates', () => {
    it('returns active templates', async () => {
      mockDashboardTemplate.findMany.mockResolvedValue([makePrismaTemplate()]);

      const result = await dashboardService.getTemplates();

      expect(result).toHaveLength(1);
      expect(mockDashboardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('filters by category', async () => {
      mockDashboardTemplate.findMany.mockResolvedValue([]);

      await dashboardService.getTemplates('executive');

      expect(mockDashboardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'executive', isActive: true },
        })
      );
    });
  });

  describe('createFromTemplate', () => {
    it('throws when template not found', async () => {
      mockDashboardTemplate.findUnique.mockResolvedValue(null);

      await expect(dashboardService.createFromTemplate('user-1', 'bad-id')).rejects.toThrow(
        'Template not found'
      );
    });

    it('creates dashboard from template and adds widgets', async () => {
      const templateWidgets = [
        {
          widgetType: 'kpi',
          title: 'Revenue',
          dataSource: 'sales',
          metric: 'REVENUE_MTD',
          queryConfig: {},
          displayConfig: {},
          gridX: 0,
          gridY: 0,
          gridW: 3,
          gridH: 2,
        },
      ];
      const template = makePrismaTemplate({ widgets: templateWidgets });
      mockDashboardTemplate.findUnique.mockResolvedValue(template);
      mockDashboardTemplate.update.mockResolvedValue(template);

      const createdDash = makePrismaDashboard();
      mockAnalyticsDashboard.create.mockResolvedValue(createdDash);

      const widgetResult = makePrismaWidget();
      mockDashboardWidget.create.mockResolvedValue(widgetResult);

      // getDashboard call at the end
      mockAnalyticsDashboard.findUnique.mockResolvedValue(
        makePrismaDashboard({ widgets: [widgetResult] })
      );
      mockAnalyticsDashboard.update.mockResolvedValue(createdDash);

      const result = await dashboardService.createFromTemplate('user-1', 'template-exec', 'My Dashboard');

      expect(result).not.toBeNull();
      expect(mockDashboardTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { usageCount: { increment: 1 } },
        })
      );
      expect(mockDashboardWidget.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('seedTemplates', () => {
    it('upserts all templates', async () => {
      mockDashboardTemplate.upsert.mockResolvedValue(makePrismaTemplate());

      await dashboardService.seedTemplates();

      expect(mockDashboardTemplate.upsert).toHaveBeenCalledTimes(DASHBOARD_TEMPLATES.length);
    });
  });

  // =========================================================================
  // Role-Based Access
  // =========================================================================

  describe('canUserAccessTemplate', () => {
    it('delegates to canAccessTemplate', () => {
      const result = dashboardService.canUserAccessTemplate('admin' as any, 'template-exec');
      expect(canAccessTemplate).toHaveBeenCalledWith('admin', 'template-exec');
      expect(result).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('returns permissions from role config', () => {
      const perms = dashboardService.getUserPermissions('admin' as any);
      expect(perms.canCreate).toBe(true);
      expect(perms.canViewAll).toBe(true);
    });
  });

  describe('getUserFeatures', () => {
    it('returns features from role config', () => {
      const features = dashboardService.getUserFeatures('admin' as any);
      expect(features.canCustomizeWidgets).toBe(true);
      expect(features.canExportData).toBe(true);
    });
  });

  describe('validateRolePermission', () => {
    it('maps action to permission key', () => {
      dashboardService.validateRolePermission('admin' as any, 'create');
      expect(hasPermission).toHaveBeenCalledWith('admin', 'canCreate');

      dashboardService.validateRolePermission('admin' as any, 'share');
      expect(hasPermission).toHaveBeenCalledWith('admin', 'canShare');
    });
  });

  describe('getTemplatesForRole', () => {
    it('filters templates by allowed list', async () => {
      mockDashboardTemplate.findMany.mockResolvedValue([makePrismaTemplate()]);

      await dashboardService.getTemplatesForRole('admin' as any);

      expect(mockDashboardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            id: { in: ['template-executive-default', 'template-operations-default'] },
          }),
        })
      );
    });

    it('adds category filter when provided', async () => {
      mockDashboardTemplate.findMany.mockResolvedValue([]);

      await dashboardService.getTemplatesForRole('admin' as any, 'operations');

      expect(mockDashboardTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'operations',
          }),
        })
      );
    });
  });

  describe('canUserCreateDashboard', () => {
    it('returns false when role cannot create', async () => {
      vi.mocked(getRoleDashboardConfig).mockReturnValueOnce({
        defaultTemplate: 'x',
        allowedTemplates: [],
        permissions: { canCreate: false, canEdit: false, canShare: false, canDelete: false, canViewAll: false },
        maxDashboards: 0,
        features: { canCustomizeWidgets: false, canExportData: false, canScheduleReports: false, canAccessRawData: false },
      });

      const result = await dashboardService.canUserCreateDashboard('user-1', 'operator' as any);
      expect(result).toBe(false);
    });

    it('returns true for unlimited dashboards', async () => {
      // default mock has maxDashboards: -1
      const result = await dashboardService.canUserCreateDashboard('user-1', 'admin' as any);
      expect(result).toBe(true);
    });

    it('checks current count when limit is set', async () => {
      vi.mocked(getRoleDashboardConfig).mockReturnValueOnce({
        defaultTemplate: 'x',
        allowedTemplates: [],
        permissions: { canCreate: true, canEdit: true, canShare: true, canDelete: true, canViewAll: true },
        maxDashboards: 5,
        features: { canCustomizeWidgets: true, canExportData: true, canScheduleReports: true, canAccessRawData: true },
      });
      mockAnalyticsDashboard.count.mockResolvedValue(3);

      await dashboardService.canUserCreateDashboard('user-1', 'manager' as any);

      expect(mockAnalyticsDashboard.count).toHaveBeenCalled();
      expect(canCreateMoreDashboards).toHaveBeenCalledWith('manager', 3);
    });
  });

  describe('getUserDashboardsWithRole', () => {
    it('returns all dashboards including public when canViewAll', async () => {
      mockAnalyticsDashboard.findMany.mockResolvedValue([makePrismaDashboard()]);

      await dashboardService.getUserDashboardsWithRole('user-1', 'admin' as any);

      // canViewAll=true so it should call getUserDashboards (which queries OR public)
      expect(mockAnalyticsDashboard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ userId: 'user-1' }, { isPublic: true }] },
        })
      );
    });

    it('returns only own dashboards when canViewAll is false', async () => {
      vi.mocked(getRoleDashboardConfig).mockReturnValueOnce({
        defaultTemplate: 'x',
        allowedTemplates: [],
        permissions: { canCreate: true, canEdit: true, canShare: false, canDelete: false, canViewAll: false },
        maxDashboards: 3,
        features: { canCustomizeWidgets: false, canExportData: false, canScheduleReports: false, canAccessRawData: false },
      });
      mockAnalyticsDashboard.findMany.mockResolvedValue([makePrismaDashboard()]);

      const result = await dashboardService.getUserDashboardsWithRole('user-1', 'operator' as any);

      expect(result).toHaveLength(1);
      expect(mockAnalyticsDashboard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      );
    });
  });

  describe('getDefaultDashboardForRole', () => {
    it('returns existing default if found', async () => {
      const prismaDash = makePrismaDashboard({ isDefault: true });
      mockAnalyticsDashboard.findFirst.mockResolvedValue(prismaDash);

      const result = await dashboardService.getDefaultDashboardForRole('user-1', 'admin' as any);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('dash-1');
    });

    it('auto-provisions when no existing default', async () => {
      // getDefaultDashboard returns null
      mockAnalyticsDashboard.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      // autoProvisionDashboard: template exists
      mockDashboardTemplate.findUnique.mockResolvedValue(makePrismaTemplate());
      mockDashboardTemplate.update.mockResolvedValue(makePrismaTemplate());

      const createdDash = makePrismaDashboard({ id: 'new-dash' });
      mockAnalyticsDashboard.create.mockResolvedValue(createdDash);

      // updateDashboard (set default) + getDashboard at end
      mockAnalyticsDashboard.update.mockResolvedValue(createdDash);
      mockAnalyticsDashboard.findUnique.mockResolvedValue(
        makePrismaDashboard({ id: 'new-dash', isDefault: true })
      );

      const result = await dashboardService.getDefaultDashboardForRole('user-1', 'admin' as any);

      expect(result).not.toBeNull();
    });
  });

  describe('autoProvisionDashboard', () => {
    it('returns null on error and logs', async () => {
      mockDashboardTemplate.findUnique.mockResolvedValue(makePrismaTemplate());
      mockDashboardTemplate.update.mockRejectedValue(new Error('DB error'));

      const result = await dashboardService.autoProvisionDashboard('user-1', 'admin' as any);

      expect(result).toBeNull();
    });

    it('seeds templates when template not found', async () => {
      // First findUnique returns null (template not found) => seeds
      mockDashboardTemplate.findUnique
        .mockResolvedValueOnce(null); // check template exists
      mockDashboardTemplate.upsert.mockResolvedValue(makePrismaTemplate());

      // createFromTemplate: findUnique for template
      mockDashboardTemplate.findUnique.mockResolvedValueOnce(makePrismaTemplate());
      mockDashboardTemplate.update.mockResolvedValue(makePrismaTemplate());

      const createdDash = makePrismaDashboard();
      mockAnalyticsDashboard.create.mockResolvedValue(createdDash);
      mockAnalyticsDashboard.update.mockResolvedValue(createdDash);
      mockAnalyticsDashboard.findUnique.mockResolvedValue(createdDash);

      const result = await dashboardService.autoProvisionDashboard('user-1', 'admin' as any);

      expect(mockDashboardTemplate.upsert).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });
  });
});
