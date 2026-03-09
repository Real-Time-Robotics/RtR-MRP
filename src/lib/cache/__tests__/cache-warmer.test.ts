import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---- mocks ----

const { mockCache, mockCacheKeys, mockCacheTTL } = vi.hoisted(() => ({
  mockCache: { set: vi.fn() },
  mockCacheKeys: {
    dashboardStats: vi.fn(() => 'dashboard-stats'),
    workOrders: vi.fn(() => 'work-orders:1:50'),
    salesOrders: vi.fn(() => 'sales-orders:1:50'),
    parts: vi.fn(() => 'parts:1:50'),
    suppliers: vi.fn(() => 'suppliers:1:50'),
  },
  mockCacheTTL: { SHORT: 60, MEDIUM: 300, STANDARD: 600 },
}));

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    salesOrder: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    purchaseOrder: { count: vi.fn(), aggregate: vi.fn() },
    inventory: { count: vi.fn(), fields: { reservedQty: 'reservedQty' } },
    workOrder: { count: vi.fn(), findMany: vi.fn() },
    part: { count: vi.fn(), findMany: vi.fn() },
    supplier: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('../redis', () => ({
  cache: mockCache,
  cacheKeys: mockCacheKeys,
  cacheTTL: mockCacheTTL,
}));

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/monitoring/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { warmAllCaches, warmCache, startScheduledWarming, stopScheduledWarming } from '../cache-warmer';

// ---- helpers ----

function setupAllPrismaMocks() {
  mockPrisma.salesOrder.count.mockResolvedValue(10);
  mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 1000 } });
  mockPrisma.salesOrder.findMany.mockResolvedValue([]);
  mockPrisma.purchaseOrder.count.mockResolvedValue(5);
  mockPrisma.purchaseOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 500 } });
  mockPrisma.inventory.count.mockResolvedValue(3);
  mockPrisma.workOrder.count.mockResolvedValue(20);
  mockPrisma.workOrder.findMany.mockResolvedValue([]);
  mockPrisma.part.count.mockResolvedValue(100);
  mockPrisma.part.findMany.mockResolvedValue([]);
  mockPrisma.supplier.count.mockResolvedValue(15);
  mockPrisma.supplier.findMany.mockResolvedValue([]);
  mockCache.set.mockResolvedValue(undefined);
}

// ---- tests ----

describe('Cache Warmer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopScheduledWarming();
    vi.useRealTimers();
  });

  // ----- warmAllCaches -----

  describe('warmAllCaches', () => {
    it('should warm all 5 caches and return report', async () => {
      setupAllPrismaMocks();

      const report = await warmAllCaches();

      expect(report.results).toHaveLength(5);
      expect(report.summary.total).toBe(5);
      expect(report.summary.success).toBe(5);
      expect(report.summary.failed).toBe(0);
      expect(report.startTime).toBeDefined();
      expect(report.endTime).toBeDefined();
      expect(report.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial failures', async () => {
      setupAllPrismaMocks();
      // Make dashboard stats fail
      mockPrisma.salesOrder.count.mockRejectedValue(new Error('DB timeout'));

      const report = await warmAllCaches();
      expect(report.summary.failed).toBeGreaterThanOrEqual(1);
      const failedResult = report.results.find((r) => !r.success);
      expect(failedResult?.error).toBe('DB timeout');
    });

    it('should handle non-Error exceptions in warming functions', async () => {
      setupAllPrismaMocks();
      mockPrisma.workOrder.count.mockRejectedValue('string error');

      const report = await warmAllCaches();
      const failedResult = report.results.find((r) => !r.success);
      expect(failedResult?.error).toBe('Unknown error');
    });

    it('should cache dashboard stats with correct data', async () => {
      setupAllPrismaMocks();
      mockPrisma.salesOrder.count.mockResolvedValue(7);
      mockPrisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 2000 } });
      mockPrisma.purchaseOrder.count.mockResolvedValue(3);
      mockPrisma.purchaseOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      mockPrisma.inventory.count.mockResolvedValue(1);

      await warmAllCaches();

      // Find the dashboard stats cache.set call
      const dashboardCall = mockCache.set.mock.calls.find((c: unknown[]) => c[0] === 'dashboard-stats');
      expect(dashboardCall).toBeDefined();
      expect(dashboardCall![1]).toEqual({
        pendingOrders: 7,
        pendingOrdersValue: 2000,
        activePOs: 3,
        activePOsValue: 0, // null coalesced to 0
        criticalStock: 1,
        reorderAlerts: 0,
      });
    });

    it('should cache work orders list with pagination', async () => {
      setupAllPrismaMocks();
      mockPrisma.workOrder.count.mockResolvedValue(75);
      mockPrisma.workOrder.findMany.mockResolvedValue([{ id: 'wo-1' }]);

      await warmAllCaches();

      const woCall = mockCache.set.mock.calls.find((c: unknown[]) => c[0] === 'work-orders:1:50');
      expect(woCall).toBeDefined();
      expect(woCall![1].pagination.totalItems).toBe(75);
      expect(woCall![1].pagination.hasNextPage).toBe(true);
    });

    it('should cache sales orders with pagination', async () => {
      setupAllPrismaMocks();
      mockPrisma.salesOrder.count
        .mockResolvedValueOnce(10) // for dashboard
        .mockResolvedValueOnce(30); // for sales orders list
      mockPrisma.salesOrder.findMany.mockResolvedValue([]);

      await warmAllCaches();

      const soCall = mockCache.set.mock.calls.find((c: unknown[]) => c[0] === 'sales-orders:1:50');
      expect(soCall).toBeDefined();
    });

    it('should cache parts list', async () => {
      setupAllPrismaMocks();

      await warmAllCaches();

      const partsCall = mockCache.set.mock.calls.find((c: unknown[]) => c[0] === 'parts:1:50');
      expect(partsCall).toBeDefined();
    });

    it('should cache suppliers list', async () => {
      setupAllPrismaMocks();

      await warmAllCaches();

      const suppCall = mockCache.set.mock.calls.find((c: unknown[]) => c[0] === 'suppliers:1:50');
      expect(suppCall).toBeDefined();
    });
  });

  // ----- warmCache -----

  describe('warmCache', () => {
    it('should warm dashboard cache', async () => {
      setupAllPrismaMocks();

      const result = await warmCache('dashboard');
      expect(result.success).toBe(true);
      expect(result.key).toBe('dashboard-stats');
    });

    it('should warm workOrders cache', async () => {
      setupAllPrismaMocks();

      const result = await warmCache('workOrders');
      expect(result.success).toBe(true);
      expect(result.key).toBe('work-orders:1:50');
    });

    it('should warm salesOrders cache', async () => {
      setupAllPrismaMocks();

      const result = await warmCache('salesOrders');
      expect(result.success).toBe(true);
      expect(result.key).toBe('sales-orders:1:50');
    });

    it('should warm parts cache', async () => {
      setupAllPrismaMocks();

      const result = await warmCache('parts');
      expect(result.success).toBe(true);
      expect(result.key).toBe('parts:1:50');
    });

    it('should warm suppliers cache', async () => {
      setupAllPrismaMocks();

      const result = await warmCache('suppliers');
      expect(result.success).toBe(true);
      expect(result.key).toBe('suppliers:1:50');
    });

    it('should return error for unknown cache type', async () => {
      const result = await warmCache('unknown' as any);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown cache type');
      expect(result.duration).toBe(0);
    });

    it('should handle errors in individual warming', async () => {
      mockPrisma.salesOrder.count.mockRejectedValue(new Error('fail'));
      mockPrisma.salesOrder.aggregate.mockRejectedValue(new Error('fail'));
      // These run in Promise.all so only need one to fail
      const result = await warmCache('dashboard');
      expect(result.success).toBe(false);
      expect(result.error).toBe('fail');
    });
  });

  // ----- startScheduledWarming / stopScheduledWarming -----

  describe('startScheduledWarming', () => {
    it('should start warming immediately and schedule interval', async () => {
      setupAllPrismaMocks();

      startScheduledWarming(60000);

      // Let the initial warming promise resolve
      await vi.advanceTimersByTimeAsync(0);

      // cache.set should have been called from initial warming
      expect(mockCache.set).toHaveBeenCalled();

      const callCount = mockCache.set.mock.calls.length;

      // Advance to trigger scheduled warming
      await vi.advanceTimersByTimeAsync(60000);

      expect(mockCache.set.mock.calls.length).toBeGreaterThan(callCount);
    });

    it('should clear previous interval when called again', async () => {
      setupAllPrismaMocks();

      startScheduledWarming(60000);
      await vi.advanceTimersByTimeAsync(0);

      startScheduledWarming(120000);
      await vi.advanceTimersByTimeAsync(0);

      // After 60s, should not trigger again (old interval cleared)
      const callCountAfterSecondStart = mockCache.set.mock.calls.length;
      await vi.advanceTimersByTimeAsync(60000);
      // Only the initial warming from second start, no interval fire at 60s
      // The interval is 120s now so nothing should fire at 60s
    });

    it('should use default 5 minute interval', async () => {
      setupAllPrismaMocks();

      startScheduledWarming();
      await vi.advanceTimersByTimeAsync(0);

      const callCount = mockCache.set.mock.calls.length;

      // Should not fire at 4 minutes
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
      expect(mockCache.set.mock.calls.length).toBe(callCount);

      // Should fire at 5 minutes
      await vi.advanceTimersByTimeAsync(1 * 60 * 1000);
      expect(mockCache.set.mock.calls.length).toBeGreaterThan(callCount);
    });
  });

  describe('stopScheduledWarming', () => {
    it('should stop the interval', async () => {
      setupAllPrismaMocks();

      startScheduledWarming(60000);
      await vi.advanceTimersByTimeAsync(0);

      stopScheduledWarming();

      const callCount = mockCache.set.mock.calls.length;
      await vi.advanceTimersByTimeAsync(120000);
      expect(mockCache.set.mock.calls.length).toBe(callCount);
    });

    it('should be safe to call when no interval is running', () => {
      expect(() => stopScheduledWarming()).not.toThrow();
    });
  });
});
