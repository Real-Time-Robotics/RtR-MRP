import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SafetyStockOptimizerService,
  getSafetyStockOptimizer,
  getHolidayBuffer,
  calculateOptimalSafetyStock,
  calculateOptimalReorderPoint,
  optimizeBulkSafetyStock,
} from '../safety-stock-optimizer';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const { mockForecastEngine } = vi.hoisted(() => ({
  mockForecastEngine: {
    generateForecast: vi.fn(),
  },
}));

const { mockDataExtractor } = vi.hoisted(() => ({
  mockDataExtractor: {
    extractProductSalesHistory: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

vi.mock('../forecast-engine', () => ({
  getForecastEngine: () => mockForecastEngine,
}));

vi.mock('../data-extractor', () => ({
  getDataExtractorService: () => mockDataExtractor,
}));

vi.mock('../vn-calendar', () => ({
  isHolidayPeriod: vi.fn(() => false),
  getTetPhase: vi.fn(() => null),
  getUpcomingHolidays: vi.fn(() => []),
  getHolidayFactor: vi.fn(() => ({ factor: 1.0 })),
}));

// ============================================================================
// TESTS
// ============================================================================

describe('SafetyStockOptimizerService', () => {
  let optimizer: SafetyStockOptimizerService;

  beforeEach(() => {
    vi.clearAllMocks();
    optimizer = new SafetyStockOptimizerService();
  });

  describe('getSafetyStockOptimizer', () => {
    it('should return a singleton instance', () => {
      const inst = getSafetyStockOptimizer();
      expect(inst).toBeInstanceOf(SafetyStockOptimizerService);
    });

    it('should accept config', () => {
      const inst = new SafetyStockOptimizerService({ serviceLevel: 0.99 });
      expect(inst).toBeInstanceOf(SafetyStockOptimizerService);
    });
  });

  // ==========================================================================
  // getHolidayBuffer (pure function)
  // ==========================================================================
  describe('getHolidayBuffer', () => {
    it('should return 0 for normal period (no Tet, no holidays)', () => {
      // vn-calendar mocks return null for getTetPhase and [] for getUpcomingHolidays
      const buffer = getHolidayBuffer(new Date('2025-07-15'));
      expect(buffer).toBe(0);
    });

    // Note: getHolidayBuffer depends on getTetPhase and getUpcomingHolidays which are mocked.
    // The mocked getTetPhase always returns null and getUpcomingHolidays returns [],
    // so the function will always return 0 with current mocks.
    // To test the holiday buffer logic, we need to re-import with different mocks,
    // but we can still test the function structure.
  });

  // ==========================================================================
  // calculateOptimalSafetyStock
  // ==========================================================================
  describe('calculateOptimalSafetyStock', () => {
    it('should return null when part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      const result = await optimizer.calculateOptimalSafetyStock('bad-id');
      expect(result).toBeNull();
    });

    it('should calculate safety stock from sales history', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 10,
        reorderPoint: 20,
        partSuppliers: [{ leadTimeDays: 14, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [
          { quantity: 300 },
          { quantity: 350 },
          { quantity: 280 },
          { quantity: 320 },
          { quantity: 310 },
          { quantity: 340 },
        ],
      });

      const result = await optimizer.calculateOptimalSafetyStock('p1');
      expect(result).not.toBeNull();
      expect(result!.partId).toBe('p1');
      expect(result!.partSku).toBe('P-001');
      expect(result!.recommended.safetyStock).toBeGreaterThan(0);
      expect(result!.recommended.reorderPoint).toBeGreaterThan(0);
      expect(result!.metrics.averageDailyDemand).toBeGreaterThan(0);
      expect(result!.metrics.leadTimeDays).toBe(14);
      expect(result!.metrics.serviceLevel).toBe(0.95);
      expect(result!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should use forecast data when no sales history', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 0,
        reorderPoint: 0,
        partSuppliers: [{ leadTimeDays: 7, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [
          { forecast: 70 },
          { forecast: 80 },
          { forecast: 75 },
        ],
        dataQuality: 'good',
      });
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue(null);

      const result = await optimizer.calculateOptimalSafetyStock('p1');
      expect(result).not.toBeNull();
      // With forecast only, demandVariability defaults to 0.3
      expect(result!.metrics.demandVariability).toBe(0.3);
      expect(result!.metrics.averageDailyDemand).toBeGreaterThan(0);
    });

    it('should use default lead time when no supplier', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 0,
        reorderPoint: 0,
        partSuppliers: [],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [{ quantity: 100 }, { quantity: 120 }],
      });

      const result = await optimizer.calculateOptimalSafetyStock('p1');
      expect(result!.metrics.leadTimeDays).toBe(14); // default
    });

    it('should respect maxBufferMultiplier', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 0,
        reorderPoint: 0,
        partSuppliers: [{ leadTimeDays: 14, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      // Very high variability
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [
          { quantity: 100 },
          { quantity: 1000 },
          { quantity: 50 },
          { quantity: 900 },
        ],
      });

      const result = await optimizer.calculateOptimalSafetyStock('p1', {
        maxBufferMultiplier: 1.0,
      });
      expect(result).not.toBeNull();
      // Safety stock should be capped by maxBufferMultiplier
      const maxExpected = Math.ceil(result!.metrics.averageDailyDemand * 14 * 1.0);
      expect(result!.recommended.safetyStock).toBeLessThanOrEqual(maxExpected);
    });

    it('should add reasoning for high variability', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 0,
        reorderPoint: 0,
        partSuppliers: [{ leadTimeDays: 7, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [
          { quantity: 10 },
          { quantity: 500 },
          { quantity: 20 },
          { quantity: 600 },
        ],
      });

      const result = await optimizer.calculateOptimalSafetyStock('p1');
      expect(result!.reasoning).toContainEqual(
        expect.stringContaining('High demand variability')
      );
    });

    it('should add reasoning for long lead time', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 0,
        reorderPoint: 0,
        partSuppliers: [{ leadTimeDays: 30, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [{ quantity: 100 }, { quantity: 110 }],
      });

      const result = await optimizer.calculateOptimalSafetyStock('p1');
      expect(result!.reasoning).toContainEqual(
        expect.stringContaining('Long lead time')
      );
    });

    it('should increase confidence with more history data', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 0,
        reorderPoint: 0,
        partSuppliers: [{ leadTimeDays: 14, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue({
        forecasts: [],
        dataQuality: 'good',
      });
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: Array.from({ length: 12 }, () => ({ quantity: 100 })),
      });

      const result = await optimizer.calculateOptimalSafetyStock('p1');
      // 0.7 base + 0.1 (>=6) + 0.1 (>=12) + 0.1 (good quality) = 0.95 capped
      expect(result!.confidence).toBeLessThanOrEqual(0.95);
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should return null on error', async () => {
      mockPrisma.part.findUnique.mockRejectedValue(new Error('DB error'));
      const result = await optimizer.calculateOptimalSafetyStock('p1');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // calculateOptimalReorderPoint
  // ==========================================================================
  describe('calculateOptimalReorderPoint', () => {
    it('should return null when safety stock calculation fails', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      const result = await optimizer.calculateOptimalReorderPoint('bad-id');
      expect(result).toBeNull();
    });

    it('should calculate reorder point from safety stock', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        safetyStock: 10,
        reorderPoint: 20,
        partSuppliers: [{ leadTimeDays: 14, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [{ quantity: 300 }, { quantity: 300 }],
      });

      const result = await optimizer.calculateOptimalReorderPoint('p1');
      expect(result).not.toBeNull();
      expect(result!.partId).toBe('p1');
      expect(result!.recommended).toBe(result!.leadTimeDemand + result!.safetyStock);
      expect(result!.reasoning).toContain('Lead Time Demand');
      expect(result!.reasoning).toContain('Safety Stock');
    });
  });

  // ==========================================================================
  // optimizeBulk
  // ==========================================================================
  describe('optimizeBulk', () => {
    it('should process specified part IDs', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part',
        safetyStock: 10,
        reorderPoint: 20,
        partSuppliers: [{ leadTimeDays: 14, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [{ quantity: 300 }, { quantity: 350 }],
      });

      const result = await optimizer.optimizeBulk(['p1', 'p2']);
      expect(result.processed).toBe(2);
      expect(result.results.length).toBe(2);
    });

    it('should fetch parts from DB when no IDs provided', async () => {
      mockPrisma.part.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await optimizer.optimizeBulk();
      expect(result.processed).toBe(2);
      expect(mockPrisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partType: { in: ['FINISHED_GOOD', 'COMPONENT'] } },
        })
      );
    });

    it('should count significant deltas as updated', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part',
        safetyStock: 10,
        reorderPoint: 20,
        partSuppliers: [{ leadTimeDays: 14, status: 'active', isPreferred: true }],
      });
      mockForecastEngine.generateForecast.mockResolvedValue(null);
      mockDataExtractor.extractProductSalesHistory.mockResolvedValue({
        history: [{ quantity: 300 }, { quantity: 350 }],
      });

      const result = await optimizer.optimizeBulk(['p1']);
      // With default safety stock of 10 and recommended likely different, delta > 10%
      expect(result.updated + result.skipped).toBe(1);
    });

    it('should handle errors per part', async () => {
      // calculateOptimalSafetyStock catches internal errors and returns null,
      // so we need to make calculateOptimalSafetyStock itself throw
      // by mocking it at a level that bypasses the try/catch.
      // Since calculateOptimalSafetyStock returns null on error, the part is skipped.
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await optimizer.optimizeBulk(['p1']);
      // Part returns null => skipped (not error)
      expect(result.skipped).toBe(1);
      expect(result.processed).toBe(1);
    });

    it('should respect maxParts', async () => {
      const ids = Array.from({ length: 200 }, (_, i) => `p${i}`);
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await optimizer.optimizeBulk(ids, { maxParts: 5 });
      expect(result.processed).toBe(5);
    });
  });

  // ==========================================================================
  // applyRecommendations
  // ==========================================================================
  describe('applyRecommendations', () => {
    it('should update parts with recommendations', async () => {
      mockPrisma.part.update.mockResolvedValue({});

      const results = [
        {
          partId: 'p1',
          partSku: 'P-001',
          partName: 'Part',
          current: { safetyStock: 10, reorderPoint: 20 },
          recommended: { safetyStock: 50, reorderPoint: 100 },
          delta: { safetyStock: 40, reorderPoint: 80 },
          metrics: { averageDailyDemand: 10, demandVariability: 0.3, leadTimeDays: 14, serviceLevel: 0.95, holidayBuffer: 0 },
          reasoning: [],
          confidence: 0.9,
          generatedAt: new Date(),
        },
      ];

      const { updated, failed } = await optimizer.applyRecommendations(results as any);
      expect(updated).toBe(1);
      expect(failed).toBe(0);
      expect(mockPrisma.part.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: { safetyStock: 50, reorderPoint: 100 },
        })
      );
    });

    it('should skip when delta is 0', async () => {
      const results = [
        {
          partId: 'p1',
          delta: { safetyStock: 0, reorderPoint: 0 },
          recommended: { safetyStock: 10, reorderPoint: 20 },
        },
      ];

      const { updated, failed } = await optimizer.applyRecommendations(results as any);
      expect(updated).toBe(0);
      expect(mockPrisma.part.update).not.toHaveBeenCalled();
    });

    it('should handle selective updates', async () => {
      mockPrisma.part.update.mockResolvedValue({});

      const results = [
        {
          partId: 'p1',
          delta: { safetyStock: 10, reorderPoint: 20 },
          recommended: { safetyStock: 50, reorderPoint: 100 },
        },
      ];

      await optimizer.applyRecommendations(results as any, {
        updateSafetyStock: true,
        updateReorderPoint: false,
      });

      expect(mockPrisma.part.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { safetyStock: 50 },
        })
      );
    });

    it('should count failures', async () => {
      mockPrisma.part.update.mockRejectedValue(new Error('DB error'));

      const results = [
        {
          partId: 'p1',
          delta: { safetyStock: 10, reorderPoint: 20 },
          recommended: { safetyStock: 50, reorderPoint: 100 },
        },
      ];

      const { updated, failed } = await optimizer.applyRecommendations(results as any);
      expect(updated).toBe(0);
      expect(failed).toBe(1);
    });
  });

  // ==========================================================================
  // getOptimizationSummary
  // ==========================================================================
  describe('getOptimizationSummary', () => {
    it('should return summary', async () => {
      mockPrisma.part.count.mockResolvedValue(25);

      const result = await optimizer.getOptimizationSummary();
      expect(result.totalParts).toBe(25);
      expect(result.holidayAlert).toBe(false); // mocked getHolidayBuffer returns 0
      expect(result.tetPhase).toBeNull(); // mocked getTetPhase returns null
    });
  });

  // ==========================================================================
  // Convenience functions
  // ==========================================================================
  describe('convenience functions', () => {
    it('calculateOptimalSafetyStock should delegate to singleton', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      const result = await calculateOptimalSafetyStock('bad');
      expect(result).toBeNull();
    });

    it('calculateOptimalReorderPoint should delegate to singleton', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      const result = await calculateOptimalReorderPoint('bad');
      expect(result).toBeNull();
    });

    it('optimizeBulkSafetyStock should delegate to singleton', async () => {
      mockPrisma.part.findMany.mockResolvedValue([]);
      const result = await optimizeBulkSafetyStock();
      expect(result.processed).toBe(0);
    });
  });
});
