import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockSalesOrder, mockSalesOrderLine, mockWorkOrder, mockInspection, mockInventory, mockNCR, mockSupplier, mockKpiService } = vi.hoisted(() => ({
  mockSalesOrder: {
    findMany: vi.fn(),
  },
  mockSalesOrderLine: {
    findMany: vi.fn(),
  },
  mockWorkOrder: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  mockInspection: {
    groupBy: vi.fn(),
  },
  mockInventory: {
    findMany: vi.fn(),
  },
  mockNCR: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  mockSupplier: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  mockKpiService: {
    calculateKPI: vi.fn(),
    getKPIWithTrend: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesOrder: mockSalesOrder,
    salesOrderLine: mockSalesOrderLine,
    workOrder: mockWorkOrder,
    inspection: mockInspection,
    inventory: mockInventory,
    nCR: mockNCR,
    supplier: mockSupplier,
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

vi.mock('../kpi-service', () => ({
  kpiService: mockKpiService,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { widgetService } from '../widget-service';
import type { DashboardWidget } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeWidget(overrides: Partial<DashboardWidget> = {}): DashboardWidget {
  return {
    id: 'w-1',
    dashboardId: 'dash-1',
    widgetType: 'kpi',
    title: 'Test Widget',
    dataSource: 'sales',
    queryConfig: {},
    displayConfig: {},
    gridX: 0,
    gridY: 0,
    gridW: 3,
    gridH: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('widget-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getWidgetData - KPI
  // =========================================================================

  describe('getWidgetData - kpi', () => {
    it('returns KPI data when metric is set', async () => {
      mockKpiService.calculateKPI.mockResolvedValue({
        value: 1500000,
        formattedValue: '1,500,000',
        status: 'normal',
        trend: { direction: 'up', changePercent: 5, data: [] },
        changePercent: 5,
        target: 2000000,
        targetPercent: 75,
      });

      const widget = makeWidget({ metric: 'REVENUE_MTD', displayConfig: { showTrend: true } });
      const result = await widgetService.getWidgetData(widget);

      expect(result.widgetId).toBe('w-1');
      expect(result.data).toMatchObject({
        value: 1500000,
        formattedValue: '1,500,000',
        status: 'normal',
        changePercent: 5,
      });
      expect(mockKpiService.calculateKPI).toHaveBeenCalledWith('REVENUE_MTD', {
        includeTrend: true,
        trendPeriods: 6,
      });
    });

    it('returns null data when metric is not set', async () => {
      const widget = makeWidget({ widgetType: 'kpi', metric: undefined });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toBeNull();
    });
  });

  // =========================================================================
  // getWidgetData - error handling
  // =========================================================================

  describe('getWidgetData - error handling', () => {
    it('returns null data on error', async () => {
      mockKpiService.calculateKPI.mockRejectedValue(new Error('DB error'));

      const widget = makeWidget({ metric: 'BAD_METRIC' });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toBeNull();
      expect(result.widgetId).toBe('w-1');
    });
  });

  // =========================================================================
  // getWidgetData - unknown type
  // =========================================================================

  describe('getWidgetData - unknown type', () => {
    it('returns null data for unknown widget type', async () => {
      const widget = makeWidget({ widgetType: 'heatmap' as any });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toBeNull();
    });
  });

  // =========================================================================
  // getMultipleWidgetsData
  // =========================================================================

  describe('getMultipleWidgetsData', () => {
    it('fetches data for multiple widgets in parallel', async () => {
      mockKpiService.calculateKPI.mockResolvedValue({
        value: 100,
        formattedValue: '100',
        status: 'normal',
        trend: null,
        changePercent: 0,
        target: 200,
        targetPercent: 50,
      });

      const widgets = [
        makeWidget({ id: 'w-1', metric: 'M1' }),
        makeWidget({ id: 'w-2', metric: 'M2' }),
      ];

      const results = await widgetService.getMultipleWidgetsData(widgets);

      expect(results).toHaveLength(2);
      expect(results[0].widgetId).toBe('w-1');
      expect(results[1].widgetId).toBe('w-2');
    });
  });

  // =========================================================================
  // getWidgetData - chart-line (time series)
  // =========================================================================

  describe('getWidgetData - chart-line (sales)', () => {
    it('fetches sales time series data grouped by month', async () => {
      mockSalesOrder.findMany.mockResolvedValue([
        { orderDate: new Date('2025-01-15'), totalAmount: 1000 },
        { orderDate: new Date('2025-01-20'), totalAmount: 2000 },
        { orderDate: new Date('2025-02-10'), totalAmount: 3000 },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'sales',
        queryConfig: { groupBy: ['month'], metrics: ['revenue'] },
      });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toMatchObject({
        type: 'chart-line',
        xAxisKey: 'date',
        yAxisKey: 'value',
      });
      const data = (result.data as any).data;
      expect(data).toHaveLength(2); // Jan and Feb
      expect(data[0].value).toBe(3000); // Jan total
      expect(data[1].value).toBe(3000); // Feb total
    });
  });

  describe('getWidgetData - chart-line (production)', () => {
    it('fetches production time series grouped by week', async () => {
      mockWorkOrder.findMany.mockResolvedValue([
        { plannedStart: new Date('2025-01-06'), completedQty: 80, quantity: 100 },
        { plannedStart: new Date('2025-01-07'), completedQty: 50, quantity: 100 },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'production',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data.length).toBeGreaterThanOrEqual(1);
      // Both in same week: (80+50)/(100+100)*100 = 65%
      expect(data[0].value).toBe(65);
    });
  });

  describe('getWidgetData - chart-line (quality)', () => {
    it('fetches quality time series', async () => {
      mockInspection.groupBy
        .mockResolvedValueOnce([
          { createdAt: new Date('2025-01-15'), _count: { result: 10 } },
        ])
        .mockResolvedValueOnce([
          { createdAt: new Date('2025-01-15'), _count: { result: 8 } },
        ]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'quality',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data).toHaveLength(1);
      expect(data[0].value).toBe(80); // 8/10 * 100
    });
  });

  describe('getWidgetData - chart-line (inventory)', () => {
    it('groups inventory value by category', async () => {
      mockInventory.findMany.mockResolvedValue([
        { quantity: 10, part: { unitCost: 100, category: 'Electronics' } },
        { quantity: 5, part: { unitCost: 200, category: 'Electronics' } },
        { quantity: 20, part: { unitCost: 50, category: 'Mechanical' } },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'inventory',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data).toHaveLength(2);
      const electronics = data.find((d: any) => d.date === 'Electronics');
      expect(electronics.value).toBe(2000); // 10*100 + 5*200
    });
  });

  describe('getWidgetData - chart-line (default/unknown source)', () => {
    it('returns empty data for unknown data source', async () => {
      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'custom' as any,
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data).toEqual([]);
    });
  });

  // =========================================================================
  // getWidgetData - chart-bar
  // =========================================================================

  describe('getWidgetData - chart-bar (production/work orders by status)', () => {
    it('groups work orders by status with Vietnamese labels', async () => {
      mockWorkOrder.groupBy.mockResolvedValue([
        { status: 'PLANNED', _count: { status: 5 } },
        { status: 'IN_PROGRESS', _count: { status: 3 } },
        { status: 'COMPLETED', _count: { status: 10 } },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-bar',
        dataSource: 'production',
        queryConfig: { groupBy: ['status'], metrics: ['count'] },
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data).toHaveLength(3);
      expect(data.find((d: any) => d.name === 'Hoàn thành')?.value).toBe(10);
      expect(data.find((d: any) => d.name === 'Kế hoạch')?.value).toBe(5);
    });
  });

  describe('getWidgetData - chart-bar (sales by category)', () => {
    it('groups sales lines by product name', async () => {
      mockSalesOrderLine.findMany.mockResolvedValue([
        { product: { name: 'Widget A' }, lineTotal: 500 },
        { product: { name: 'Widget A' }, lineTotal: 300 },
        { product: { name: 'Widget B' }, lineTotal: 1000 },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-bar',
        dataSource: 'sales',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data[0].name).toBe('Widget B'); // highest first
      expect(data[0].value).toBe(1000);
      expect(data[1].value).toBe(800); // 500+300
    });
  });

  describe('getWidgetData - chart-bar (quality NCRs)', () => {
    it('groups NCRs by defect category', async () => {
      mockNCR.groupBy.mockResolvedValue([
        { defectCategory: 'Cosmetic', _count: { defectCategory: 4 } },
        { defectCategory: null, _count: { defectCategory: 2 } },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-bar',
        dataSource: 'quality',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data).toHaveLength(2);
      expect(data[1].name).toBe('Không phân loại');
    });
  });

  describe('getWidgetData - chart-bar (inventory)', () => {
    it('groups inventory by category', async () => {
      mockInventory.findMany.mockResolvedValue([
        { quantity: 10, part: { category: 'A', unitCost: 5 } },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-bar',
        dataSource: 'inventory',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data[0]).toEqual({ name: 'A', value: 50 });
    });
  });

  describe('getWidgetData - chart-bar (supplier)', () => {
    it('groups suppliers by rating', async () => {
      mockSupplier.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 3 } },
        { rating: 3, _count: { rating: 7 } },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-bar',
        dataSource: 'supplier',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = (result.data as any).data;
      expect(data.find((d: any) => d.name === '5 Sao')?.value).toBe(3);
      expect(data.find((d: any) => d.name === '3 Sao')?.value).toBe(7);
    });
  });

  describe('getWidgetData - chart-bar (default/unknown source)', () => {
    it('returns empty data', async () => {
      const widget = makeWidget({
        widgetType: 'chart-bar',
        dataSource: 'custom' as any,
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      expect((result.data as any).data).toEqual([]);
    });
  });

  // =========================================================================
  // getWidgetData - chart-pie / chart-donut
  // =========================================================================

  describe('getWidgetData - chart-pie', () => {
    it('reuses bar chart data with correct type', async () => {
      mockWorkOrder.groupBy.mockResolvedValue([
        { status: 'PLANNED', _count: { status: 5 } },
      ]);

      const widget = makeWidget({
        widgetType: 'chart-pie',
        dataSource: 'production',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      expect((result.data as any).type).toBe('chart-pie');
    });
  });

  describe('getWidgetData - chart-donut', () => {
    it('reuses bar chart data with donut type', async () => {
      mockWorkOrder.groupBy.mockResolvedValue([]);

      const widget = makeWidget({
        widgetType: 'chart-donut',
        dataSource: 'production',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      expect((result.data as any).type).toBe('chart-donut');
    });
  });

  // =========================================================================
  // getWidgetData - gauge
  // =========================================================================

  describe('getWidgetData - gauge', () => {
    it('returns gauge data from KPI', async () => {
      mockKpiService.calculateKPI.mockResolvedValue({
        value: 85,
        status: 'normal',
        target: 90,
      });

      const widget = makeWidget({
        widgetType: 'gauge',
        metric: 'PRODUCTION_EFFICIENCY',
      });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toMatchObject({
        value: 85,
        min: 0,
        max: 100,
        target: 90,
        status: 'normal',
      });
    });

    it('returns default gauge data when no metric', async () => {
      const widget = makeWidget({ widgetType: 'gauge', metric: undefined });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toEqual({ value: 0, min: 0, max: 100 });
    });
  });

  // =========================================================================
  // getWidgetData - table
  // =========================================================================

  describe('getWidgetData - table (sales)', () => {
    it('returns sales table data', async () => {
      mockSalesOrder.findMany.mockResolvedValue([
        {
          orderNumber: 'SO-001',
          customer: { name: 'ACME Corp' },
          orderDate: new Date('2025-03-01'),
          totalAmount: 5000000,
          status: 'confirmed',
        },
      ]);

      const widget = makeWidget({
        widgetType: 'table',
        dataSource: 'sales',
        queryConfig: { limit: 5 },
      });
      const result = await widgetService.getWidgetData(widget);

      const data = result.data as any;
      expect(data.columns).toHaveLength(5);
      expect(data.rows).toHaveLength(1);
      expect(data.rows[0].orderNumber).toBe('SO-001');
      expect(data.rows[0].customerName).toBe('ACME Corp');
    });
  });

  describe('getWidgetData - table (production)', () => {
    it('returns production table data with progress', async () => {
      mockWorkOrder.findMany.mockResolvedValue([
        {
          woNumber: 'WO-001',
          product: { sku: 'SKU-A', name: 'Product A' },
          quantity: 100,
          completedQty: 75,
          status: 'IN_PROGRESS',
          plannedStart: new Date('2025-01-01'),
        },
      ]);

      const widget = makeWidget({
        widgetType: 'table',
        dataSource: 'production',
        queryConfig: {
          filters: [{ field: 'status', operator: 'in', value: ['IN_PROGRESS'] }],
        },
      });
      const result = await widgetService.getWidgetData(widget);

      const data = result.data as any;
      expect(data.rows[0].progress).toBe('75%');
      expect(data.rows[0].completedQty).toBe(75);
    });
  });

  describe('getWidgetData - table (quality)', () => {
    it('returns NCR table data', async () => {
      mockNCR.findMany.mockResolvedValue([
        {
          ncrNumber: 'NCR-001',
          title: 'Defect in batch',
          priority: 'high',
          status: 'open',
          createdAt: new Date('2025-02-15'),
        },
      ]);

      const widget = makeWidget({
        widgetType: 'table',
        dataSource: 'quality',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = result.data as any;
      expect(data.columns).toHaveLength(5);
      expect(data.rows[0].ncrNumber).toBe('NCR-001');
    });
  });

  describe('getWidgetData - table (inventory)', () => {
    it('returns inventory table with stock status', async () => {
      mockInventory.findMany.mockResolvedValue([
        { quantity: 0, part: { partNumber: 'P001', name: 'Part 1', unitCost: 10 } },
        { quantity: 5, part: { partNumber: 'P002', name: 'Part 2', unitCost: 20 } },
        { quantity: 100, part: { partNumber: 'P003', name: 'Part 3', unitCost: 30 } },
      ]);

      const widget = makeWidget({
        widgetType: 'table',
        dataSource: 'inventory',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = result.data as any;
      expect(data.rows[0].status).toBe('Hết hàng');
      expect(data.rows[1].status).toBe('Sắp hết');
      expect(data.rows[2].status).toBe('Đủ hàng');
    });
  });

  describe('getWidgetData - table (supplier)', () => {
    it('returns supplier table data', async () => {
      mockSupplier.findMany.mockResolvedValue([
        {
          code: 'SUP-001',
          name: 'Supplier A',
          leadTimeDays: 14,
          rating: 4.5,
          ndaaCompliant: true,
        },
      ]);

      const widget = makeWidget({
        widgetType: 'table',
        dataSource: 'supplier',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      const data = result.data as any;
      expect(data.rows[0].code).toBe('SUP-001');
      expect(data.rows[0].leadTimeDays).toBe('14 ngày');
      expect(data.rows[0].ndaaCompliant).toBe('✓');
    });
  });

  describe('getWidgetData - table (default/unknown)', () => {
    it('returns empty columns and rows', async () => {
      const widget = makeWidget({
        widgetType: 'table',
        dataSource: 'custom' as any,
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toEqual({ columns: [], rows: [] });
    });
  });

  // =========================================================================
  // getWidgetData - sparkline
  // =========================================================================

  describe('getWidgetData - sparkline', () => {
    it('returns sparkline data from KPI trend', async () => {
      mockKpiService.getKPIWithTrend.mockResolvedValue({
        value: 42,
        trend: { data: [10, 20, 30, 40, 42] },
        changePercent: 5,
      });

      const widget = makeWidget({ widgetType: 'sparkline', metric: 'REVENUE_MTD' });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toMatchObject({
        data: [10, 20, 30, 40, 42],
        currentValue: 42,
        changePercent: 5,
      });
    });

    it('returns empty data when no metric', async () => {
      const widget = makeWidget({ widgetType: 'sparkline', metric: undefined });
      const result = await widgetService.getWidgetData(widget);

      expect(result.data).toEqual({ data: [] });
    });
  });

  // =========================================================================
  // Date range helper (tested indirectly through time series)
  // =========================================================================

  describe('date range presets', () => {
    it('uses custom date range when provided', async () => {
      mockSalesOrder.findMany.mockResolvedValue([]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'sales',
        queryConfig: {
          dateRange: { type: 'custom', from: '2025-01-01', to: '2025-06-30' },
        },
      });
      await widgetService.getWidgetData(widget);

      const call = mockSalesOrder.findMany.mock.calls[0][0];
      expect(call.where.orderDate.gte).toEqual(new Date('2025-01-01'));
      expect(call.where.orderDate.lte).toEqual(new Date('2025-06-30'));
    });

    it('defaults to last30days when no dateRange specified', async () => {
      mockSalesOrder.findMany.mockResolvedValue([]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'sales',
        queryConfig: {},
      });
      await widgetService.getWidgetData(widget);

      const call = mockSalesOrder.findMany.mock.calls[0][0];
      const from = call.where.orderDate.gte as Date;
      const to = call.where.orderDate.lte as Date;
      // from should be about 30 days before to
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('handles thisYear preset', async () => {
      mockSalesOrder.findMany.mockResolvedValue([]);

      const widget = makeWidget({
        widgetType: 'chart-line',
        dataSource: 'sales',
        queryConfig: {
          dateRange: { type: 'preset', preset: 'thisYear' },
        },
      });
      await widgetService.getWidgetData(widget);

      const call = mockSalesOrder.findMany.mock.calls[0][0];
      const from = call.where.orderDate.gte as Date;
      expect(from.getMonth()).toBe(0); // January
      expect(from.getDate()).toBe(1);
    });
  });

  // =========================================================================
  // chart-area (same as chart-line path)
  // =========================================================================

  describe('getWidgetData - chart-area', () => {
    it('uses time series path like chart-line', async () => {
      mockSalesOrder.findMany.mockResolvedValue([]);

      const widget = makeWidget({
        widgetType: 'chart-area',
        dataSource: 'sales',
        queryConfig: {},
      });
      const result = await widgetService.getWidgetData(widget);

      expect((result.data as any).type).toBe('chart-area');
      expect(mockSalesOrder.findMany).toHaveBeenCalled();
    });
  });
});
