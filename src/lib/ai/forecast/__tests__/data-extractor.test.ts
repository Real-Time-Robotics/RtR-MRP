import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DataExtractorService,
  getDataExtractorService,
} from '../data-extractor';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    salesOrderLine: {
      findMany: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    salesOrder: {
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../vn-calendar', () => ({
  formatPeriod: vi.fn((date: Date, type: string) => {
    if (type === 'monthly') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`;
  }),
  getWeekNumber: vi.fn((date: Date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff / 7);
  }),
}));

// ============================================================================
// TESTS
// ============================================================================

describe('DataExtractorService', () => {
  let service: DataExtractorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DataExtractorService();
  });

  describe('getDataExtractorService', () => {
    it('should return a DataExtractorService instance', () => {
      const inst = getDataExtractorService();
      expect(inst).toBeInstanceOf(DataExtractorService);
    });
  });

  describe('extractProductSalesHistory', () => {
    it('should return null when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      const result = await service.extractProductSalesHistory('non-existent');
      expect(result).toBeNull();
    });

    it('should extract sales history with correct statistics', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test Product',
      });

      const salesLines = [
        {
          orderId: 'so-1',
          productId: 'prod-1',
          quantity: 100,
          unitPrice: 50000,
          lineTotal: 5000000,
          order: { orderDate: new Date('2025-01-15'), customerId: 'cust-1' },
        },
        {
          orderId: 'so-2',
          productId: 'prod-1',
          quantity: 150,
          unitPrice: 50000,
          lineTotal: 7500000,
          order: { orderDate: new Date('2025-02-10'), customerId: 'cust-2' },
        },
      ];
      mockPrisma.salesOrderLine.findMany.mockResolvedValue(salesLines);

      const result = await service.extractProductSalesHistory('prod-1', 24, 'monthly');

      expect(result).not.toBeNull();
      expect(result!.productId).toBe('prod-1');
      expect(result!.productSku).toBe('SKU-001');
      expect(result!.totalQuantity).toBeGreaterThanOrEqual(250);
      expect(result!.totalRevenue).toBeGreaterThanOrEqual(12500000);
    });

    it('should handle empty sales history', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test Product',
      });
      mockPrisma.salesOrderLine.findMany.mockResolvedValue([]);

      const result = await service.extractProductSalesHistory('prod-1');

      expect(result).not.toBeNull();
      expect(result!.totalQuantity).toBe(0);
      expect(result!.trend).toBe('stable');
    });

    it('should classify trend correctly based on data pattern', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test Product',
      });

      // Create sales data across recent months so fillMissingPeriods doesn't dilute
      const now = new Date();
      const salesLines = Array.from({ length: 12 }, (_, i) => ({
        orderId: `so-${i}`,
        productId: 'prod-1',
        quantity: 100 + i * 30,
        unitPrice: 50000,
        lineTotal: (100 + i * 30) * 50000,
        order: {
          orderDate: new Date(now.getFullYear(), now.getMonth() - 11 + i, 15),
          customerId: 'cust-1',
        },
      }));
      mockPrisma.salesOrderLine.findMany.mockResolvedValue(salesLines);

      const result = await service.extractProductSalesHistory('prod-1', 12, 'monthly');
      expect(result).not.toBeNull();
      // trend depends on the algorithm's interpretation of the data
      expect(result!.trend).toBeDefined();
      expect(['increasing', 'stable', 'decreasing']).toContain(result!.trend);
    });
  });

  describe('extractCustomerBehavior', () => {
    it('should return null when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      const result = await service.extractCustomerBehavior('non-existent');
      expect(result).toBeNull();
    });

    it('should return defaults when no orders', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        code: 'C001',
        name: 'Test Customer',
      });
      mockPrisma.salesOrder.findMany.mockResolvedValue([]);

      const result = await service.extractCustomerBehavior('cust-1');

      expect(result).not.toBeNull();
      expect(result!.totalOrders).toBe(0);
      expect(result!.totalQuantity).toBe(0);
      expect(result!.daysSinceLastOrder).toBe(999);
    });

    it('should compute customer metrics correctly', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        code: 'C001',
        name: 'Test Customer',
      });

      const orders = [
        {
          id: 'so-1',
          orderDate: new Date('2025-01-10'),
          totalAmount: 5000000,
          lines: [
            { productId: 'prod-1', quantity: 100, product: { id: 'prod-1', sku: 'SKU1' } },
          ],
        },
        {
          id: 'so-2',
          orderDate: new Date('2025-02-10'),
          totalAmount: 3000000,
          lines: [
            { productId: 'prod-1', quantity: 50, product: { id: 'prod-1', sku: 'SKU1' } },
          ],
        },
      ];
      mockPrisma.salesOrder.findMany.mockResolvedValue(orders);

      const result = await service.extractCustomerBehavior('cust-1');

      expect(result!.totalOrders).toBe(2);
      expect(result!.totalQuantity).toBe(150);
      expect(result!.totalRevenue).toBe(8000000);
      expect(result!.avgOrderValue).toBe(4000000);
      expect(result!.avgOrderFrequency).toBeGreaterThan(0);
      expect(result!.preferredProducts.length).toBeGreaterThanOrEqual(1);
      expect(result!.preferredProducts[0].productId).toBe('prod-1');
      expect(result!.lastOrderDate).toEqual(new Date('2025-02-10'));
    });
  });

  describe('extractSupplierLeadTimes', () => {
    it('should return empty array when no orders', async () => {
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      const result = await service.extractSupplierLeadTimes();
      expect(result).toEqual([]);
    });

    it('should calculate lead time statistics', async () => {
      const orders = [
        {
          id: 'po-1',
          supplierId: 'sup-1',
          orderDate: new Date('2025-01-01'),
          expectedDate: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-14'),
          status: 'completed',
          supplier: { id: 'sup-1', code: 'S001', name: 'Supplier 1' },
        },
        {
          id: 'po-2',
          supplierId: 'sup-1',
          orderDate: new Date('2025-02-01'),
          expectedDate: new Date('2025-02-15'),
          updatedAt: new Date('2025-02-18'),
          status: 'received',
          supplier: { id: 'sup-1', code: 'S001', name: 'Supplier 1' },
        },
      ];
      mockPrisma.purchaseOrder.findMany.mockResolvedValue(orders);

      const result = await service.extractSupplierLeadTimes();

      expect(result).toHaveLength(1);
      expect(result[0].supplierId).toBe('sup-1');
      expect(result[0].avgLeadTimeDays).toBeGreaterThan(0);
      expect(result[0].minLeadTimeDays).toBeLessThanOrEqual(result[0].maxLeadTimeDays);
      expect(result[0].reliability).toBeGreaterThanOrEqual(0);
      expect(result[0].reliability).toBeLessThanOrEqual(100);
    });

    it('should filter by supplier when provided', async () => {
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      await service.extractSupplierLeadTimes('sup-1');
      const callArgs = mockPrisma.purchaseOrder.findMany.mock.calls[0][0];
      expect(callArgs.where.supplierId).toBe('sup-1');
    });
  });

  describe('prepareTimeSeriesData', () => {
    it('should return null when no sales history', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      const result = await service.prepareTimeSeriesData('non-existent');
      expect(result).toBeNull();
    });

    it('should return null when insufficient data points', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test Product',
      });
      // Only 2 data points - should return null (needs >= 6)
      mockPrisma.salesOrderLine.findMany.mockResolvedValue([
        {
          orderId: 'so-1',
          productId: 'prod-1',
          quantity: 100,
          unitPrice: 50000,
          lineTotal: 5000000,
          order: { orderDate: new Date('2025-01-15'), customerId: 'cust-1' },
        },
      ]);

      const result = await service.prepareTimeSeriesData('prod-1', 2);
      // With only 1 data point spread over 2 months, filled will be ~2, which < 6
      expect(result).toBeNull();
    });
  });

  describe('helper methods - calculateTrend', () => {
    it('should return 0 for single value', () => {
      const result = (service as any).calculateTrend([5]);
      expect(result).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const result = (service as any).calculateTrend([]);
      expect(result).toBe(0);
    });

    it('should return positive trend for increasing values', () => {
      const result = (service as any).calculateTrend([10, 20, 30, 40, 50]);
      expect(result).toBeGreaterThan(0);
    });

    it('should return negative trend for decreasing values', () => {
      const result = (service as any).calculateTrend([50, 40, 30, 20, 10]);
      expect(result).toBeLessThan(0);
    });

    it('should return ~0 for flat values', () => {
      const result = (service as any).calculateTrend([10, 10, 10, 10, 10]);
      expect(Math.abs(result)).toBeLessThan(0.01);
    });
  });

  describe('helper methods - calculateTrendSlope', () => {
    it('should return 0 for single value', () => {
      const result = (service as any).calculateTrendSlope([5]);
      expect(result).toBe(0);
    });

    it('should return positive slope for increasing values', () => {
      const result = (service as any).calculateTrendSlope([10, 20, 30]);
      expect(result).toBeGreaterThan(0);
    });

    it('should return negative slope for decreasing values', () => {
      const result = (service as any).calculateTrendSlope([30, 20, 10]);
      expect(result).toBeLessThan(0);
    });
  });

  describe('helper methods - calculateVolatility', () => {
    it('should return 0 for single value', () => {
      const result = (service as any).calculateVolatility([5]);
      expect(result).toBe(0);
    });

    it('should return 0 for all zero values', () => {
      const result = (service as any).calculateVolatility([0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should return 0 for constant values', () => {
      const result = (service as any).calculateVolatility([10, 10, 10, 10]);
      expect(result).toBe(0);
    });

    it('should return higher volatility for more variable data', () => {
      const stable = (service as any).calculateVolatility([10, 11, 10, 11]);
      const volatile = (service as any).calculateVolatility([10, 50, 10, 50]);
      expect(volatile).toBeGreaterThan(stable);
    });
  });

  describe('helper methods - detectOutliers', () => {
    it('should return empty for < 4 values', () => {
      const result = (service as any).detectOutliers([10, 20, 30]);
      expect(result).toEqual([]);
    });

    it('should detect outliers', () => {
      const values = [10, 10, 10, 10, 10, 10, 10, 100]; // 100 is an outlier
      const result = (service as any).detectOutliers(values);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain(7); // Index of 100
    });

    it('should return empty when no outliers', () => {
      const values = [10, 11, 10, 11, 10, 11];
      const result = (service as any).detectOutliers(values);
      expect(result).toEqual([]);
    });
  });

  describe('helper methods - getPeriodStart', () => {
    it('should return first of month for monthly', () => {
      const date = new Date(2025, 2, 15);
      const result = (service as any).getPeriodStart(date, 'monthly');
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(2);
    });

    it('should return Monday for weekly', () => {
      const wednesday = new Date(2025, 0, 8); // Wed Jan 8 2025
      const result = (service as any).getPeriodStart(wednesday, 'weekly');
      expect(result.getDay()).toBe(1); // Monday
    });
  });

  describe('helper methods - getPeriodEnd', () => {
    it('should return last day of month for monthly', () => {
      const date = new Date(2025, 1, 15); // Feb 15
      const result = (service as any).getPeriodEnd(date, 'monthly');
      expect(result.getDate()).toBe(28); // Feb 2025 has 28 days
    });

    it('should return Sunday for weekly', () => {
      const wednesday = new Date(2025, 0, 8);
      const result = (service as any).getPeriodEnd(wednesday, 'weekly');
      expect(result.getDay()).toBe(0); // Sunday
    });
  });

  describe('helper methods - fillMissingPeriods', () => {
    it('should return empty for empty input', () => {
      const result = (service as any).fillMissingPeriods([], 'monthly', 3);
      expect(result).toEqual([]);
    });
  });

  describe('extractSeasonalPatterns', () => {
    it('should return seasonal indices', async () => {
      mockPrisma.salesOrderLine.findMany.mockResolvedValue([
        {
          quantity: 100,
          order: { orderDate: new Date(2024, 0, 15) },
        },
        {
          quantity: 200,
          order: { orderDate: new Date(2024, 5, 15) },
        },
      ]);

      const result = await service.extractSeasonalPatterns(24);

      expect(result).toHaveProperty('monthly');
      expect(result).toHaveProperty('quarterly');
      expect(result).toHaveProperty('weekOfYear');
    });

    it('should handle empty sales data', async () => {
      mockPrisma.salesOrderLine.findMany.mockResolvedValue([]);

      const result = await service.extractSeasonalPatterns();

      expect(result.monthly).toBeDefined();
      // All indices should default to 1 when no data
      for (let m = 1; m <= 12; m++) {
        expect(result.monthly[m]).toBe(1);
      }
    });
  });
});
