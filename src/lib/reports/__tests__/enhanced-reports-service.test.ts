import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventory: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    workOrder: {
      findMany: vi.fn(),
    },
    salesOrder: {
      findMany: vi.fn(),
    },
    part: {
      findMany: vi.fn(),
    },
    lotTransaction: {
      aggregate: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  generateInventoryValuationReport,
  generateProductionReport,
  generateSalesReport,
  generateInventoryTurnoverReport,
} from '../enhanced-reports-service';

describe('enhanced-reports-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateInventoryValuationReport', () => {
    it('should return empty report when no inventory', async () => {
      (prisma.inventory.findMany as any).mockResolvedValue([]);

      const result = await generateInventoryValuationReport();

      expect(result.totalItems).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.byWarehouse).toEqual([]);
      expect(result.byCategory).toEqual([]);
      expect(result.byABCClass).toEqual([]);
      expect(result.topItems).toEqual([]);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should calculate valuation correctly', async () => {
      (prisma.inventory.findMany as any).mockResolvedValue([
        {
          quantity: 100,
          part: { partNumber: 'P001', name: 'Part A', category: 'RAW', unitCost: 50, abcClass: 'A' },
          warehouse: { code: 'WH1', name: 'Main Warehouse' },
        },
        {
          quantity: 200,
          part: { partNumber: 'P002', name: 'Part B', category: 'FG', unitCost: 100, abcClass: 'B' },
          warehouse: { code: 'WH1', name: 'Main Warehouse' },
        },
        {
          quantity: 50,
          part: { partNumber: 'P003', name: 'Part C', category: 'RAW', unitCost: 30, abcClass: null },
          warehouse: { code: 'WH2', name: 'Secondary' },
        },
      ]);

      const result = await generateInventoryValuationReport();

      expect(result.totalItems).toBe(3);
      expect(result.totalValue).toBe(100 * 50 + 200 * 100 + 50 * 30); // 26500
      expect(result.byWarehouse.length).toBe(2);
      expect(result.byCategory.length).toBe(2);
      expect(result.byABCClass.length).toBe(3); // A, B, Unclassified
    });

    it('should sort topItems by value descending', async () => {
      (prisma.inventory.findMany as any).mockResolvedValue([
        {
          quantity: 10,
          part: { partNumber: 'P001', name: 'Cheap', category: 'RAW', unitCost: 1, abcClass: 'C' },
          warehouse: { code: 'WH1', name: 'Main' },
        },
        {
          quantity: 10,
          part: { partNumber: 'P002', name: 'Expensive', category: 'FG', unitCost: 1000, abcClass: 'A' },
          warehouse: { code: 'WH1', name: 'Main' },
        },
      ]);

      const result = await generateInventoryValuationReport();
      expect(result.topItems[0].partNumber).toBe('P002');
      expect(result.topItems[1].partNumber).toBe('P001');
    });

    it('should limit topItems by topN parameter', async () => {
      const items = Array.from({ length: 30 }, (_, i) => ({
        quantity: 10,
        part: { partNumber: `P${i}`, name: `Part ${i}`, category: 'RAW', unitCost: i + 1, abcClass: 'A' },
        warehouse: { code: 'WH1', name: 'Main' },
      }));
      (prisma.inventory.findMany as any).mockResolvedValue(items);

      const result = await generateInventoryValuationReport(undefined, 5);
      expect(result.topItems.length).toBe(5);
    });

    it('should filter by warehouseId when provided', async () => {
      (prisma.inventory.findMany as any).mockResolvedValue([]);

      await generateInventoryValuationReport('wh-123');

      const call = (prisma.inventory.findMany as any).mock.calls[0][0];
      expect(call.where.warehouseId).toBe('wh-123');
    });

    it('should calculate percent of total correctly', async () => {
      (prisma.inventory.findMany as any).mockResolvedValue([
        {
          quantity: 100,
          part: { partNumber: 'P001', name: 'A', category: 'RAW', unitCost: 100, abcClass: 'A' },
          warehouse: { code: 'WH1', name: 'Main' },
        },
      ]);

      const result = await generateInventoryValuationReport();
      expect(result.byWarehouse[0].percentOfTotal).toBe(100);
    });
  });

  describe('generateProductionReport', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-06-30');

    it('should return empty report for no work orders', async () => {
      (prisma.workOrder.findMany as any).mockResolvedValue([]);

      const result = await generateProductionReport(fromDate, toDate);

      expect(result.totalWOs).toBe(0);
      expect(result.completedWOs).toBe(0);
      expect(result.totalProduced).toBe(0);
      expect(result.scrapRate).toBe(0);
      expect(result.onTimeCompletion).toBe(0);
      expect(result.averageLeadTime).toBe(0);
    });

    it('should calculate production metrics correctly', async () => {
      (prisma.workOrder.findMany as any).mockResolvedValue([
        {
          productId: 'prod-1',
          product: { name: 'Widget', sku: 'WDG-001' },
          status: 'completed',
          quantity: 100,
          completedQty: 95,
          scrapQty: 5,
          createdAt: new Date('2025-03-15'),
          actualStart: new Date('2025-03-15'),
          actualEnd: new Date('2025-03-17'),
          plannedEnd: new Date('2025-03-18'),
        },
        {
          productId: 'prod-1',
          product: { name: 'Widget', sku: 'WDG-001' },
          status: 'in_progress',
          quantity: 50,
          completedQty: 20,
          scrapQty: 2,
          createdAt: new Date('2025-04-01'),
          actualStart: null,
          actualEnd: null,
          plannedEnd: new Date('2025-04-10'),
        },
      ]);

      const result = await generateProductionReport(fromDate, toDate);

      expect(result.totalWOs).toBe(2);
      expect(result.completedWOs).toBe(1);
      expect(result.totalProduced).toBe(115);
      expect(result.totalScrapped).toBe(7);
      expect(result.onTimeCompletion).toBe(100); // 1 on time out of 1 completed
      expect(result.byProduct.length).toBe(1);
      expect(result.byMonth.length).toBe(2);
    });

    it('should handle late work orders', async () => {
      (prisma.workOrder.findMany as any).mockResolvedValue([
        {
          productId: 'prod-1',
          product: { name: 'Late Widget', sku: 'LW-001' },
          status: 'completed',
          quantity: 100,
          completedQty: 100,
          scrapQty: 0,
          createdAt: new Date('2025-02-01'),
          actualStart: new Date('2025-02-01'),
          actualEnd: new Date('2025-02-20'), // late
          plannedEnd: new Date('2025-02-10'),
        },
      ]);

      const result = await generateProductionReport(fromDate, toDate);
      expect(result.onTimeCompletion).toBe(0); // not on time
    });
  });

  describe('generateSalesReport', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-06-30');

    it('should return empty report for no orders', async () => {
      (prisma.salesOrder.findMany as any).mockResolvedValue([]);

      const result = await generateSalesReport(fromDate, toDate);

      expect(result.totalOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.fulfillmentRate).toBe(0);
    });

    it('should calculate sales metrics', async () => {
      (prisma.salesOrder.findMany as any).mockResolvedValue([
        {
          orderNumber: 'SO-001',
          customerId: 'cust-1',
          customer: { name: 'Customer A', code: 'CA' },
          totalAmount: 10000,
          status: 'shipped',
          orderDate: new Date('2025-03-15'),
          lines: [
            {
              productId: 'prod-1',
              product: { name: 'Widget', sku: 'W-001' },
              quantity: 10,
              unitPrice: 1000,
              lineTotal: 10000,
            },
          ],
        },
        {
          orderNumber: 'SO-002',
          customerId: 'cust-1',
          customer: { name: 'Customer A', code: 'CA' },
          totalAmount: 5000,
          status: 'pending',
          orderDate: new Date('2025-04-01'),
          lines: [
            {
              productId: 'prod-1',
              product: { name: 'Widget', sku: 'W-001' },
              quantity: 5,
              unitPrice: 1000,
              lineTotal: null,
            },
          ],
        },
      ]);

      const result = await generateSalesReport(fromDate, toDate);

      expect(result.totalOrders).toBe(2);
      expect(result.totalRevenue).toBe(15000);
      expect(result.averageOrderValue).toBe(7500);
      expect(result.fulfillmentRate).toBe(50); // 1 shipped out of 2
      expect(result.byCustomer.length).toBe(1);
      expect(result.byProduct.length).toBe(1);
      expect(result.byMonth.length).toBe(2);
      expect(result.topOrders.length).toBe(2);
    });

    it('should limit topOrders by topN', async () => {
      const orders = Array.from({ length: 15 }, (_, i) => ({
        orderNumber: `SO-${i}`,
        customerId: 'cust-1',
        customer: { name: 'Cust', code: 'C' },
        totalAmount: 1000 * (i + 1),
        status: 'pending',
        orderDate: new Date('2025-01-15'),
        lines: [],
      }));
      (prisma.salesOrder.findMany as any).mockResolvedValue(orders);

      const result = await generateSalesReport(fromDate, toDate, 5);
      expect(result.topOrders.length).toBe(5);
    });
  });

  describe('generateInventoryTurnoverReport', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-06-30');

    it('should return empty array when no active parts', async () => {
      (prisma.part.findMany as any).mockResolvedValue([]);

      const result = await generateInventoryTurnoverReport(fromDate, toDate);
      expect(result).toEqual([]);
    });

    it('should skip parts with no stock and no issued qty', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        { id: 'p1', partNumber: 'P001', name: 'Dead Part', abcClass: 'C', unitCost: 10 },
      ]);
      (prisma.inventory.aggregate as any).mockResolvedValue({ _sum: { quantity: 0 } });
      (prisma.lotTransaction.aggregate as any).mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await generateInventoryTurnoverReport(fromDate, toDate);
      expect(result).toEqual([]);
    });

    it('should calculate turnover metrics', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        { id: 'p1', partNumber: 'P001', name: 'Active Part', abcClass: 'A', unitCost: 100 },
      ]);
      (prisma.inventory.aggregate as any).mockResolvedValue({ _sum: { quantity: 500 } });
      (prisma.lotTransaction.aggregate as any).mockResolvedValue({ _sum: { quantity: 200 } });

      const result = await generateInventoryTurnoverReport(fromDate, toDate);

      expect(result.length).toBe(1);
      expect(result[0].partNumber).toBe('P001');
      expect(result[0].currentStock).toBe(500);
      expect(result[0].issuedQty).toBe(200);
      expect(result[0].turnoverRatio).toBeGreaterThan(0);
      expect(result[0].daysOfSupply).toBeGreaterThan(0);
    });

    it('should sort by turnover ratio descending', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        { id: 'p1', partNumber: 'P001', name: 'Slow', abcClass: 'C', unitCost: 10 },
        { id: 'p2', partNumber: 'P002', name: 'Fast', abcClass: 'A', unitCost: 50 },
      ]);

      // P001: stock 1000, issued 10 (slow)
      // P002: stock 100, issued 500 (fast)
      (prisma.inventory.aggregate as any)
        .mockResolvedValueOnce({ _sum: { quantity: 1000 } })
        .mockResolvedValueOnce({ _sum: { quantity: 100 } });
      (prisma.lotTransaction.aggregate as any)
        .mockResolvedValueOnce({ _sum: { quantity: 10 } })
        .mockResolvedValueOnce({ _sum: { quantity: 500 } });

      const result = await generateInventoryTurnoverReport(fromDate, toDate);

      expect(result.length).toBe(2);
      expect(result[0].partNumber).toBe('P002'); // higher turnover first
    });

    it('should handle null aggregation results', async () => {
      (prisma.part.findMany as any).mockResolvedValue([
        { id: 'p1', partNumber: 'P001', name: 'Part', abcClass: null, unitCost: 10 },
      ]);
      (prisma.inventory.aggregate as any).mockResolvedValue({ _sum: { quantity: null } });
      (prisma.lotTransaction.aggregate as any).mockResolvedValue({ _sum: { quantity: null } });

      const result = await generateInventoryTurnoverReport(fromDate, toDate);
      expect(result).toEqual([]);
    });
  });
});
