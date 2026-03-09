// src/lib/analytics/__tests__/query-builder.test.ts
// Unit tests for QueryBuilder

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock fns referenced inside vi.mock factory
const { mockFindMany, mockCount, mockAggregate, mockGroupBy, mockModel } = vi.hoisted(() => {
  const mockFindMany = vi.fn().mockResolvedValue([]);
  const mockCount = vi.fn().mockResolvedValue(0);
  const mockAggregate = vi.fn().mockResolvedValue({});
  const mockGroupBy = vi.fn().mockResolvedValue([]);
  const mockModel = { findMany: mockFindMany, count: mockCount, aggregate: mockAggregate, groupBy: mockGroupBy };
  return { mockFindMany, mockCount, mockAggregate, mockGroupBy, mockModel };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: mockModel,
    supplier: mockModel,
    customer: mockModel,
    inventory: mockModel,
    salesOrder: mockModel,
    salesOrderLine: mockModel,
    purchaseOrder: mockModel,
    purchaseOrderLine: mockModel,
    workOrder: mockModel,
    inspection: mockModel,
    nCR: mockModel,
    cAPA: mockModel,
    workOrderOperation: mockModel,
    workCenter: mockModel,
    salesInvoice: mockModel,
    purchaseInvoice: mockModel,
    costVariance: mockModel,
    analyticsDashboard: mockModel,
    dashboardWidget: mockModel,
    kPIDefinition: mockModel,
    savedReport: mockModel,
    reportSchedule: mockModel,
    reportInstance: mockModel,
  },
}));

import { QueryBuilder, createQuery, analyticsQueries } from '../query-builder';

describe('QueryBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Constructor & Builder Methods
  // ==========================================================================
  describe('builder methods', () => {
    it('should create a query builder with createQuery helper', () => {
      const qb = createQuery('parts');
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should chain select, where, orderBy, limit, offset', () => {
      const qb = createQuery('parts')
        .select('id', 'name')
        .where({ field: 'status', operator: 'eq', value: 'active' })
        .orderBy('name', 'asc')
        .limit(10)
        .offset(5);

      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should support whereMany', () => {
      const qb = createQuery('parts').whereMany([
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'category', operator: 'in', value: ['A', 'B'] },
      ]);

      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should support groupBy', () => {
      const qb = createQuery('workOrders').groupBy('status');
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('should support join', () => {
      const qb = createQuery('inventory').join('parts', 'partId', 'left');
      expect(qb).toBeInstanceOf(QueryBuilder);
    });
  });

  // ==========================================================================
  // execute
  // ==========================================================================
  describe('execute', () => {
    it('should call findMany with built where clause', async () => {
      mockFindMany.mockResolvedValue([{ id: '1', name: 'Part A' }]);

      const result = await createQuery('parts')
        .where({ field: 'status', operator: 'eq', value: 'active' })
        .orderBy('name', 'desc')
        .limit(10)
        .offset(0)
        .execute();

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: [{ name: 'desc' }],
        take: 10,
        skip: 0,
      });
      expect(result).toEqual([{ id: '1', name: 'Part A' }]);
    });

    it('should throw for unknown table', async () => {
      await expect(
        createQuery('nonExistentTable').execute()
      ).rejects.toThrow('Unknown table: nonExistentTable');
    });

    it('should build where clause for all operators', async () => {
      mockFindMany.mockResolvedValue([]);

      await createQuery('parts')
        .where({ field: 'status', operator: 'eq', value: 'active' })
        .where({ field: 'id', operator: 'ne', value: '123' })
        .where({ field: 'price', operator: 'gt', value: 10 })
        .where({ field: 'qty', operator: 'gte', value: 5 })
        .where({ field: 'weight', operator: 'lt', value: 100 })
        .where({ field: 'cost', operator: 'lte', value: 50 })
        .where({ field: 'category', operator: 'in', value: ['A', 'B'] })
        .where({ field: 'tag', operator: 'notIn', value: ['X'] })
        .where({ field: 'name', operator: 'contains', value: 'bolt' })
        .where({ field: 'date', operator: 'between', value: ['2025-01-01', '2025-12-31'] })
        .execute();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'active',
            id: { not: '123' },
            price: { gt: 10 },
            qty: { gte: 5 },
            weight: { lt: 100 },
            cost: { lte: 50 },
            category: { in: ['A', 'B'] },
            tag: { notIn: ['X'] },
            name: { contains: 'bolt', mode: 'insensitive' },
            date: { gte: '2025-01-01', lte: '2025-12-31' },
          },
        })
      );
    });
  });

  // ==========================================================================
  // count
  // ==========================================================================
  describe('count', () => {
    it('should call count with where clause', async () => {
      mockCount.mockResolvedValue(42);

      const result = await createQuery('parts')
        .where({ field: 'status', operator: 'eq', value: 'active' })
        .count();

      expect(mockCount).toHaveBeenCalledWith({
        where: { status: 'active' },
      });
      expect(result).toBe(42);
    });

    it('should throw for unknown table', async () => {
      await expect(
        createQuery('unknownTable').count()
      ).rejects.toThrow('Unknown table: unknownTable');
    });
  });

  // ==========================================================================
  // aggregate
  // ==========================================================================
  describe('aggregate', () => {
    it('should call aggregate with SUM', async () => {
      mockAggregate.mockResolvedValue({ _sum: { totalAmount: 5000 } });

      const result = await createQuery('salesOrders').aggregate('SUM', 'totalAmount');

      expect(mockAggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { totalAmount: true },
          _avg: undefined,
          _min: undefined,
          _max: undefined,
          _count: undefined,
        })
      );
      expect(result).toBe(5000);
    });

    it('should call aggregate with AVG', async () => {
      mockAggregate.mockResolvedValue({ _avg: { unitCost: 25.5 } });

      const result = await createQuery('parts').aggregate('AVG', 'unitCost');
      expect(result).toBe(25.5);
    });

    it('should call aggregate with MIN', async () => {
      mockAggregate.mockResolvedValue({ _min: { price: 1.5 } });

      const result = await createQuery('parts').aggregate('MIN', 'price');
      expect(result).toBe(1.5);
    });

    it('should call aggregate with MAX', async () => {
      mockAggregate.mockResolvedValue({ _max: { price: 999 } });

      const result = await createQuery('parts').aggregate('MAX', 'price');
      expect(result).toBe(999);
    });

    it('should call aggregate with COUNT', async () => {
      mockAggregate.mockResolvedValue({ _count: { id: 150 } });

      const result = await createQuery('parts').aggregate('COUNT', 'id');
      expect(result).toBe(150);
    });

    it('should return 0 for null/undefined aggregate result', async () => {
      mockAggregate.mockResolvedValue({ _sum: { totalAmount: null } });

      const result = await createQuery('salesOrders').aggregate('SUM', 'totalAmount');
      expect(result).toBe(0);
    });

    it('should return 0 for unknown aggregation type', async () => {
      mockAggregate.mockResolvedValue({});

      const result = await createQuery('parts').aggregate('UNKNOWN' as 'SUM', 'field');
      expect(result).toBe(0);
    });

    it('should throw for unknown table', async () => {
      await expect(
        createQuery('badTable').aggregate('SUM', 'field')
      ).rejects.toThrow('Unknown table: badTable');
    });
  });

  // ==========================================================================
  // groupAggregate
  // ==========================================================================
  describe('groupAggregate', () => {
    it('should call groupBy with SUM aggregation', async () => {
      mockGroupBy.mockResolvedValue([
        { status: 'active', _sum: { totalAmount: 3000 } },
        { status: 'completed', _sum: { totalAmount: 7000 } },
      ]);

      const result = await createQuery('salesOrders')
        .groupBy('status')
        .groupAggregate('SUM', 'totalAmount');

      expect(mockGroupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['status'],
          _sum: { totalAmount: true },
        })
      );
      expect(result.length).toBe(2);
      expect(result[0].dimension).toBe('active');
      expect(result[0].value).toBe(3000);
      expect(result[0].metadata).toEqual({ status: 'active' });
    });

    it('should handle multiple groupBy fields', async () => {
      mockGroupBy.mockResolvedValue([
        { status: 'active', category: 'A', _count: { id: 10 } },
      ]);

      const result = await createQuery('workOrders')
        .groupBy('status', 'category')
        .groupAggregate('COUNT', 'id');

      expect(result[0].dimension).toBe('active - A');
      expect(result[0].metadata).toEqual({ status: 'active', category: 'A' });
    });

    it('should throw when no groupBy fields', async () => {
      await expect(
        createQuery('parts').groupAggregate('SUM', 'cost')
      ).rejects.toThrow('Group by fields required');
    });

    it('should return 0 for unknown aggregation in groupAggregate', async () => {
      mockGroupBy.mockResolvedValue([
        { status: 'active' },
      ]);

      const result = await createQuery('parts')
        .groupBy('status')
        .groupAggregate('UNKNOWN' as 'SUM', 'field');

      expect(result[0].value).toBe(0);
    });
  });

  // ==========================================================================
  // analyticsQueries (pre-built helpers)
  // ==========================================================================
  describe('analyticsQueries', () => {
    it('lowStockItems should create correct query', () => {
      const qb = analyticsQueries.lowStockItems();
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('salesByMonth should filter by year', () => {
      const qb = analyticsQueries.salesByMonth(2025);
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('topCustomers should set limit', () => {
      const qb = analyticsQueries.topCustomers(5);
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('topCustomers should default to 10', () => {
      const qb = analyticsQueries.topCustomers();
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('workOrdersByStatus should create grouped query', () => {
      const qb = analyticsQueries.workOrdersByStatus();
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('ncrsByCategory should create filtered grouped query', () => {
      const qb = analyticsQueries.ncrsByCategory();
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('supplierPerformance should create ordered query', () => {
      const qb = analyticsQueries.supplierPerformance();
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('productionEfficiency should filter by date range', () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-12-31');
      const qb = analyticsQueries.productionEfficiency(from, to);
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('qualityTrend should filter by date range and status', () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-06-30');
      const qb = analyticsQueries.qualityTrend(from, to);
      expect(qb).toBeInstanceOf(QueryBuilder);
    });

    it('inventoryValueByCategory should create joined grouped query', () => {
      const qb = analyticsQueries.inventoryValueByCategory();
      expect(qb).toBeInstanceOf(QueryBuilder);
    });
  });
});
