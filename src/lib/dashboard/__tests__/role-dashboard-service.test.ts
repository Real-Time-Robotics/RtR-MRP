import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockSalesOrder,
  mockWorkOrder,
  mockPurchaseOrder,
  mockNCR,
  mockWorkflowInstance,
  mockSalesInvoice,
  mockInventory,
  mockInspection,
  mockPrisma,
} = vi.hoisted(() => {
  const mockSalesOrder = {
    count: vi.fn(),
  };
  const mockWorkOrder = {
    count: vi.fn(),
  };
  const mockPurchaseOrder = {
    count: vi.fn(),
  };
  const mockNCR = {
    count: vi.fn(),
  };
  const mockWorkflowInstance = {
    count: vi.fn(),
  };
  const mockSalesInvoice = {
    aggregate: vi.fn(),
  };
  const mockInventory = {
    aggregate: vi.fn(),
  };
  const mockInspection = {
    count: vi.fn(),
  };
  const mockPrisma = {
    salesOrder: mockSalesOrder,
    workOrder: mockWorkOrder,
    purchaseOrder: mockPurchaseOrder,
    nCR: mockNCR,
    workflowInstance: mockWorkflowInstance,
    salesInvoice: mockSalesInvoice,
    inventory: mockInventory,
    inspection: mockInspection,
    $queryRaw: vi.fn(),
  };
  return {
    mockSalesOrder,
    mockWorkOrder,
    mockPurchaseOrder,
    mockNCR,
    mockWorkflowInstance,
    mockSalesInvoice,
    mockInventory,
    mockInspection,
    mockPrisma,
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { getRoleDashboard } from '../role-dashboard-service';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function setupAdminMocks(overrides: {
  totalOrders?: number;
  pendingOrders?: number;
  activeWOs?: number;
  overdueWOs?: number;
  lowStockParts?: number;
  openNCRs?: number;
  pendingApprovals?: number;
  totalRevenue?: number;
} = {}) {
  const {
    totalOrders = 100,
    pendingOrders = 5,
    activeWOs = 10,
    overdueWOs = 0,
    lowStockParts = 0,
    openNCRs = 0,
    pendingApprovals = 0,
    totalRevenue = 5000000,
  } = overrides;

  mockSalesOrder.count
    .mockResolvedValueOnce(totalOrders)   // total
    .mockResolvedValueOnce(pendingOrders); // pending
  mockWorkOrder.count
    .mockResolvedValueOnce(activeWOs)     // active
    .mockResolvedValueOnce(overdueWOs);   // overdue
  mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(lowStockParts) }]);
  mockNCR.count.mockResolvedValue(openNCRs);
  mockWorkflowInstance.count.mockResolvedValue(pendingApprovals);
  mockSalesInvoice.aggregate.mockResolvedValue({
    _sum: { totalAmount: totalRevenue },
  });
}

function setupManagerMocks(overrides: {
  activeWOs?: number;
  completedThisWeek?: number;
  pendingPOs?: number;
  openNCRs?: number;
  pendingApprovals?: number;
} = {}) {
  const {
    activeWOs = 10,
    completedThisWeek = 5,
    pendingPOs = 3,
    openNCRs = 0,
    pendingApprovals = 0,
  } = overrides;

  mockWorkOrder.count
    .mockResolvedValueOnce(activeWOs)
    .mockResolvedValueOnce(completedThisWeek);
  mockPurchaseOrder.count.mockResolvedValue(pendingPOs);
  mockNCR.count.mockResolvedValue(openNCRs);
  mockWorkflowInstance.count.mockResolvedValue(pendingApprovals);
}

function setupOperatorMocks(overrides: {
  myWOs?: number;
  myCompletedToday?: number;
  pendingInspections?: number;
} = {}) {
  const {
    myWOs = 3,
    myCompletedToday = 1,
    pendingInspections = 2,
  } = overrides;

  mockWorkOrder.count
    .mockResolvedValueOnce(myWOs)
    .mockResolvedValueOnce(myCompletedToday);
  mockInspection.count.mockResolvedValue(pendingInspections);
}

function setupViewerMocks(overrides: {
  totalOrders?: number;
  activeWOs?: number;
  totalQuantity?: number;
} = {}) {
  const {
    totalOrders = 50,
    activeWOs = 8,
    totalQuantity = 1000,
  } = overrides;

  mockSalesOrder.count.mockResolvedValue(totalOrders);
  mockWorkOrder.count.mockResolvedValue(activeWOs);
  mockInventory.aggregate.mockResolvedValue({
    _sum: { quantity: totalQuantity },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getRoleDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Admin Dashboard
  // =========================================================================

  describe('admin role', () => {
    it('returns admin dashboard with correct structure', async () => {
      setupAdminMocks();

      const result = await getRoleDashboard('user-1', 'admin');

      expect(result.role).toBe('admin');
      expect(result.sections).toHaveLength(3);
      expect(result.sections[0].title).toBe('Business Overview');
      expect(result.sections[1].title).toBe('Production');
      expect(result.sections[2].title).toBe('Quality & Inventory');
      expect(result.quickActions).toHaveLength(4);
    });

    it('returns correct KPI values', async () => {
      setupAdminMocks({
        totalOrders: 200,
        pendingOrders: 15,
        activeWOs: 20,
        overdueWOs: 3,
      });

      const result = await getRoleDashboard('user-1', 'admin');

      const businessKPIs = result.sections[0].kpis;
      expect(businessKPIs[0].value).toBe(200); // Total Orders
      expect(businessKPIs[1].value).toBe(15);  // Pending Orders
    });

    it('formats monthly revenue in millions', async () => {
      setupAdminMocks({ totalRevenue: 12345678 });

      const result = await getRoleDashboard('user-1', 'admin');

      const revenueKPI = result.sections[0].kpis[2];
      expect(revenueKPI.value).toBe('12.3M');
    });

    it('handles null totalAmount gracefully', async () => {
      setupAdminMocks();
      // Override the aggregate mock to return null
      mockSalesInvoice.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
      });

      const result = await getRoleDashboard('user-1', 'admin');

      const revenueKPI = result.sections[0].kpis[2];
      expect(revenueKPI.value).toBe('0.0M');
    });

    it('sets warning severity for pending orders > 10', async () => {
      setupAdminMocks({ pendingOrders: 11 });

      const result = await getRoleDashboard('user-1', 'admin');

      const pendingKPI = result.sections[0].kpis[1];
      expect(pendingKPI.severity).toBe('warning');
    });

    it('sets info severity for pending orders <= 10', async () => {
      setupAdminMocks({ pendingOrders: 10 });

      const result = await getRoleDashboard('user-1', 'admin');

      const pendingKPI = result.sections[0].kpis[1];
      expect(pendingKPI.severity).toBe('info');
    });

    it('sets danger severity for overdue WOs > 0', async () => {
      setupAdminMocks({ overdueWOs: 5 });

      const result = await getRoleDashboard('user-1', 'admin');

      const overdueKPI = result.sections[1].kpis[1];
      expect(overdueKPI.severity).toBe('danger');
    });

    it('sets success severity for overdue WOs = 0', async () => {
      setupAdminMocks({ overdueWOs: 0 });

      const result = await getRoleDashboard('user-1', 'admin');

      const overdueKPI = result.sections[1].kpis[1];
      expect(overdueKPI.severity).toBe('success');
    });

    it('sets danger severity for open NCRs > 5', async () => {
      setupAdminMocks({ openNCRs: 6 });

      const result = await getRoleDashboard('user-1', 'admin');

      const ncrKPI = result.sections[2].kpis[0];
      expect(ncrKPI.severity).toBe('danger');
    });

    it('sets info severity for open NCRs <= 5', async () => {
      setupAdminMocks({ openNCRs: 5 });

      const result = await getRoleDashboard('user-1', 'admin');

      const ncrKPI = result.sections[2].kpis[0];
      expect(ncrKPI.severity).toBe('info');
    });

    it('sets warning severity for low stock > 0', async () => {
      setupAdminMocks({ lowStockParts: 3 });

      const result = await getRoleDashboard('user-1', 'admin');

      const lowStockKPI = result.sections[2].kpis[1];
      expect(lowStockKPI.severity).toBe('warning');
    });

    it('sets success severity for low stock = 0', async () => {
      setupAdminMocks({ lowStockParts: 0 });

      const result = await getRoleDashboard('user-1', 'admin');

      const lowStockKPI = result.sections[2].kpis[1];
      expect(lowStockKPI.severity).toBe('success');
    });

    // --- Alerts ---

    it('adds danger alert for overdue work orders', async () => {
      setupAdminMocks({ overdueWOs: 3 });

      const result = await getRoleDashboard('user-1', 'admin');

      const dangerAlert = result.alerts.find(a => a.type === 'danger');
      expect(dangerAlert).toBeDefined();
      expect(dangerAlert!.message).toContain('3 work orders are overdue');
      expect(dangerAlert!.messageVi).toContain('3 lệnh sản xuất quá hạn');
      expect(dangerAlert!.link).toBe('/work-orders?filter=overdue');
      expect(dangerAlert!.count).toBe(3);
    });

    it('adds warning alert for open NCRs', async () => {
      setupAdminMocks({ openNCRs: 2 });

      const result = await getRoleDashboard('user-1', 'admin');

      const warningAlert = result.alerts.find(a => a.type === 'warning');
      expect(warningAlert).toBeDefined();
      expect(warningAlert!.count).toBe(2);
    });

    it('adds info alert for pending approvals', async () => {
      setupAdminMocks({ pendingApprovals: 4 });

      const result = await getRoleDashboard('user-1', 'admin');

      const infoAlert = result.alerts.find(a => a.type === 'info');
      expect(infoAlert).toBeDefined();
      expect(infoAlert!.count).toBe(4);
    });

    it('returns no alerts when all counts are zero', async () => {
      setupAdminMocks({ overdueWOs: 0, openNCRs: 0, pendingApprovals: 0 });

      const result = await getRoleDashboard('user-1', 'admin');

      expect(result.alerts).toHaveLength(0);
    });

    it('returns all three alerts when all trigger', async () => {
      setupAdminMocks({ overdueWOs: 1, openNCRs: 1, pendingApprovals: 1 });

      const result = await getRoleDashboard('user-1', 'admin');

      expect(result.alerts).toHaveLength(3);
    });

    // --- Quick Actions ---

    it('includes correct quick actions', async () => {
      setupAdminMocks();

      const result = await getRoleDashboard('user-1', 'admin');

      const actions = result.quickActions.map(a => a.action);
      expect(actions).toContain('/mrp');
      expect(actions).toContain('/approvals');
      expect(actions).toContain('/reports');
      expect(actions).toContain('/settings');
    });

    // --- Vietnamese labels ---

    it('includes Vietnamese labels', async () => {
      setupAdminMocks();

      const result = await getRoleDashboard('user-1', 'admin');

      expect(result.sections[0].titleVi).toBe('Tổng quan kinh doanh');
      expect(result.sections[0].kpis[0].labelVi).toBe('Tổng đơn hàng');
    });

    it('handles lowStockParts query returning empty result', async () => {
      setupAdminMocks();
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await getRoleDashboard('user-1', 'admin');

      const lowStockKPI = result.sections[2].kpis[1];
      expect(lowStockKPI.value).toBe(0);
    });
  });

  // =========================================================================
  // Manager Dashboard
  // =========================================================================

  describe('manager role', () => {
    it('returns manager dashboard with correct structure', async () => {
      setupManagerMocks();

      const result = await getRoleDashboard('user-1', 'manager');

      expect(result.role).toBe('manager');
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].title).toBe('Production Status');
      expect(result.sections[1].title).toBe('Quality & Approvals');
      expect(result.alerts).toHaveLength(0);
      expect(result.quickActions).toHaveLength(3);
    });

    it('returns correct KPI values', async () => {
      setupManagerMocks({
        activeWOs: 15,
        completedThisWeek: 8,
        pendingPOs: 4,
        openNCRs: 2,
        pendingApprovals: 3,
      });

      const result = await getRoleDashboard('user-1', 'manager');

      const productionKPIs = result.sections[0].kpis;
      expect(productionKPIs[0].value).toBe(15); // Active WOs
      expect(productionKPIs[1].value).toBe(8);  // Completed (7d)
      expect(productionKPIs[2].value).toBe(4);  // Pending POs
    });

    it('sets warning severity for open NCRs > 3', async () => {
      setupManagerMocks({ openNCRs: 4 });

      const result = await getRoleDashboard('user-1', 'manager');

      const ncrKPI = result.sections[1].kpis[0];
      expect(ncrKPI.severity).toBe('warning');
    });

    it('sets info severity for open NCRs <= 3', async () => {
      setupManagerMocks({ openNCRs: 3 });

      const result = await getRoleDashboard('user-1', 'manager');

      const ncrKPI = result.sections[1].kpis[0];
      expect(ncrKPI.severity).toBe('info');
    });

    it('sets warning severity for pending approvals > 0', async () => {
      setupManagerMocks({ pendingApprovals: 1 });

      const result = await getRoleDashboard('user-1', 'manager');

      const approvalKPI = result.sections[1].kpis[1];
      expect(approvalKPI.severity).toBe('warning');
    });

    it('sets success severity for pending approvals = 0', async () => {
      setupManagerMocks({ pendingApprovals: 0 });

      const result = await getRoleDashboard('user-1', 'manager');

      const approvalKPI = result.sections[1].kpis[1];
      expect(approvalKPI.severity).toBe('success');
    });

    it('includes correct quick actions', async () => {
      setupManagerMocks();

      const result = await getRoleDashboard('user-1', 'manager');

      const actions = result.quickActions.map(a => a.action);
      expect(actions).toContain('/approvals');
      expect(actions).toContain('/work-orders');
      expect(actions).toContain('/purchase-orders/new');
    });
  });

  // =========================================================================
  // Operator Dashboard
  // =========================================================================

  describe('operator role', () => {
    it('returns operator dashboard with correct structure', async () => {
      setupOperatorMocks();

      const result = await getRoleDashboard('user-op', 'operator');

      expect(result.role).toBe('operator');
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe('My Work');
      expect(result.alerts).toHaveLength(0);
      expect(result.quickActions).toHaveLength(3);
    });

    it('returns correct KPI values', async () => {
      setupOperatorMocks({ myWOs: 5, myCompletedToday: 2, pendingInspections: 4 });

      const result = await getRoleDashboard('user-op', 'operator');

      const kpis = result.sections[0].kpis;
      expect(kpis[0].value).toBe(5);  // My Active WOs
      expect(kpis[1].value).toBe(2);  // Completed Today
      expect(kpis[2].value).toBe(4);  // Pending Inspections
    });

    it('filters work orders by userId', async () => {
      setupOperatorMocks();

      await getRoleDashboard('specific-user', 'operator');

      // First count call should filter by assignedTo
      expect(mockWorkOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedTo: 'specific-user' }),
        })
      );
    });

    it('includes correct quick actions', async () => {
      setupOperatorMocks();

      const result = await getRoleDashboard('user-op', 'operator');

      const actions = result.quickActions.map(a => a.action);
      expect(actions).toContain('/work-orders?assignedTo=me');
      expect(actions).toContain('/labor');
      expect(actions).toContain('/quality/ncr/new');
    });

    it('includes Vietnamese labels', async () => {
      setupOperatorMocks();

      const result = await getRoleDashboard('user-op', 'operator');

      expect(result.sections[0].titleVi).toBe('Công việc của tôi');
      expect(result.sections[0].kpis[0].labelVi).toBe('LSX của tôi');
    });
  });

  // =========================================================================
  // Viewer Dashboard
  // =========================================================================

  describe('viewer role', () => {
    it('returns viewer dashboard with correct structure', async () => {
      setupViewerMocks();

      const result = await getRoleDashboard('user-1', 'viewer');

      expect(result.role).toBe('viewer');
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].title).toBe('Overview');
      expect(result.alerts).toHaveLength(0);
      expect(result.quickActions).toHaveLength(2);
    });

    it('returns correct KPI values', async () => {
      setupViewerMocks({ totalOrders: 75, activeWOs: 12, totalQuantity: 5000 });

      const result = await getRoleDashboard('user-1', 'viewer');

      const kpis = result.sections[0].kpis;
      expect(kpis[0].value).toBe(75);   // Total Orders
      expect(kpis[1].value).toBe(12);   // Active WOs
      expect(kpis[2].value).toBe(5000); // Total Stock
    });

    it('handles null quantity sum', async () => {
      setupViewerMocks();
      mockInventory.aggregate.mockResolvedValue({
        _sum: { quantity: null },
      });

      const result = await getRoleDashboard('user-1', 'viewer');

      const stockKPI = result.sections[0].kpis[2];
      expect(stockKPI.value).toBe(0);
    });

    it('includes correct quick actions', async () => {
      setupViewerMocks();

      const result = await getRoleDashboard('user-1', 'viewer');

      const actions = result.quickActions.map(a => a.action);
      expect(actions).toContain('/sales-orders');
      expect(actions).toContain('/inventory');
    });
  });

  // =========================================================================
  // Default / Unknown role
  // =========================================================================

  describe('default role handling', () => {
    it('falls back to viewer dashboard for unknown role', async () => {
      setupViewerMocks();

      const result = await getRoleDashboard('user-1', 'unknown' as any);

      expect(result.role).toBe('viewer');
    });
  });
});
