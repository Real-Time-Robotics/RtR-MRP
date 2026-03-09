import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AccuracyTrackerService,
  getAccuracyTrackerService,
} from '../accuracy-tracker';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    demandForecast: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    salesOrderLine: {
      aggregate: vi.fn(),
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
  parsePeriod: vi.fn((period: string) => {
    const match = period.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
      };
    }
    return null;
  }),
}));

// ============================================================================
// TESTS
// ============================================================================

describe('AccuracyTrackerService', () => {
  let service: AccuracyTrackerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccuracyTrackerService();
  });

  describe('getAccuracyTrackerService', () => {
    it('should return a singleton instance', () => {
      const inst = getAccuracyTrackerService();
      expect(inst).toBeInstanceOf(AccuracyTrackerService);
    });
  });

  // ==========================================================================
  // recordActual
  // ==========================================================================
  describe('recordActual', () => {
    it('should update existing forecast with accuracy', async () => {
      mockPrisma.demandForecast.findUnique.mockResolvedValue({
        id: 'f1',
        forecastQty: 100,
      });
      mockPrisma.demandForecast.update.mockResolvedValue({});

      const result = await service.recordActual('prod-1', '2025-06', 'monthly', 90);
      expect(result.forecast).toBe(100);
      expect(result.actual).toBe(90);
      // Error = |100-90| = 10, percentError = 10/90*100 = 11.11%, accuracy = 88.89
      expect(result.accuracy).toBeCloseTo(88.89, 0);
      expect(mockPrisma.demandForecast.update).toHaveBeenCalled();
    });

    it('should handle actual = 0 with forecast > 0', async () => {
      mockPrisma.demandForecast.findUnique.mockResolvedValue({
        id: 'f1',
        forecastQty: 50,
      });
      mockPrisma.demandForecast.update.mockResolvedValue({});

      const result = await service.recordActual('prod-1', '2025-06', 'monthly', 0);
      // When actual = 0 and forecast > 0, percentError = 100, accuracy = 0
      expect(result.accuracy).toBe(0);
    });

    it('should handle both actual and forecast = 0', async () => {
      mockPrisma.demandForecast.findUnique.mockResolvedValue({
        id: 'f1',
        forecastQty: 0,
      });
      mockPrisma.demandForecast.update.mockResolvedValue({});

      const result = await service.recordActual('prod-1', '2025-06', 'monthly', 0);
      expect(result.accuracy).toBe(100);
    });

    it('should create new record when no forecast exists', async () => {
      mockPrisma.demandForecast.findUnique.mockResolvedValue(null);
      mockPrisma.demandForecast.create.mockResolvedValue({});

      const result = await service.recordActual('prod-1', '2025-06', 'monthly', 100);
      expect(result.forecast).toBeNull();
      expect(result.actual).toBe(100);
      expect(result.accuracy).toBeNull();
      expect(mockPrisma.demandForecast.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: 'actual_only',
            actualQty: 100,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // autoRecordActuals
  // ==========================================================================
  describe('autoRecordActuals', () => {
    it('should process periods and products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({ _sum: { quantity: 50 } });
      mockPrisma.demandForecast.findUnique.mockResolvedValue({ id: 'f1', forecastQty: 45 });
      mockPrisma.demandForecast.update.mockResolvedValue({});

      const result = await service.autoRecordActuals('monthly', 2);
      expect(result.periodsProcessed).toBe(2);
      // 2 periods x 2 products = 4 calls
      expect(result.recordsUpdated).toBe(4);
    });

    it('should skip products with zero demand', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.autoRecordActuals('monthly', 1);
      expect(result.recordsUpdated).toBe(0);
    });

    it('should skip null demand', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      mockPrisma.salesOrderLine.aggregate.mockResolvedValue({ _sum: { quantity: null } });

      const result = await service.autoRecordActuals('monthly', 1);
      expect(result.recordsUpdated).toBe(0);
    });
  });

  // ==========================================================================
  // getProductAccuracy
  // ==========================================================================
  describe('getProductAccuracy', () => {
    it('should return null when product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      const result = await service.getProductAccuracy('bad-id');
      expect(result).toBeNull();
    });

    it('should return default metrics when no forecasts with actuals', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test',
      });
      mockPrisma.demandForecast.findMany.mockResolvedValue([]);

      const result = await service.getProductAccuracy('prod-1');
      expect(result).not.toBeNull();
      expect(result!.periodsTracked).toBe(0);
      expect(result!.metrics.accuracy).toBe(100);
      expect(result!.metrics.mape).toBe(0);
    });

    it('should calculate MAPE, MAE, RMSE, bias correctly', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        sku: 'SKU-001',
        name: 'Test',
      });
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { period: '2025-06', forecastQty: 100, actualQty: 90, model: 'ensemble' },
        { period: '2025-05', forecastQty: 80, actualQty: 100, model: 'ensemble' },
      ]);

      const result = await service.getProductAccuracy('prod-1');
      expect(result).not.toBeNull();
      expect(result!.periodsTracked).toBe(2);

      // Error1: |100-90| = 10, %: 10/90 = 11.11%
      // Error2: |80-100| = 20, %: 20/100 = 20%
      // MAPE = (11.11 + 20) / 2 = 15.56
      expect(result!.metrics.mape).toBeCloseTo(15.56, 0);
      // MAE = (10 + 20) / 2 = 15
      expect(result!.metrics.mae).toBe(15);
      // RMSE = sqrt((100 + 400) / 2) = sqrt(250) = 15.81
      expect(result!.metrics.rmse).toBeCloseTo(15.81, 0);
      // Bias = (10 + -20) / 2 = -5
      expect(result!.metrics.bias).toBe(-5);
      // Accuracy = 100 - MAPE
      expect(result!.metrics.accuracy).toBeCloseTo(84.44, 0);
    });

    it('should detect improving trend', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', sku: 'SKU-001', name: 'Test',
      });
      // Recent errors are much smaller (listed desc by period)
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { period: '2025-06', forecastQty: 100, actualQty: 99, model: 'e' },  // 1% error
        { period: '2025-05', forecastQty: 100, actualQty: 98, model: 'e' },  // 2% error
        { period: '2025-04', forecastQty: 100, actualQty: 70, model: 'e' },  // 30% error
        { period: '2025-03', forecastQty: 100, actualQty: 60, model: 'e' },  // 40% error
      ]);

      const result = await service.getProductAccuracy('prod-1');
      expect(result!.trend).toBe('improving');
    });

    it('should detect declining trend', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', sku: 'SKU-001', name: 'Test',
      });
      // Recent errors are much larger
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { period: '2025-06', forecastQty: 100, actualQty: 50, model: 'e' },  // 50% error
        { period: '2025-05', forecastQty: 100, actualQty: 60, model: 'e' },  // 40% error
        { period: '2025-04', forecastQty: 100, actualQty: 99, model: 'e' },  // 1% error
        { period: '2025-03', forecastQty: 100, actualQty: 98, model: 'e' },  // 2% error
      ]);

      const result = await service.getProductAccuracy('prod-1');
      expect(result!.trend).toBe('declining');
    });

    it('should identify best model', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', sku: 'SKU-001', name: 'Test',
      });
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { period: '2025-06', forecastQty: 100, actualQty: 99, model: 'moving_average' },
        { period: '2025-05', forecastQty: 100, actualQty: 80, model: 'ensemble' },
      ]);

      const result = await service.getProductAccuracy('prod-1');
      expect(result!.bestModel).toBe('moving_average');
    });

    it('should mark outliers (percentError > 50)', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', sku: 'SKU-001', name: 'Test',
      });
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { period: '2025-06', forecastQty: 200, actualQty: 100, model: 'e' }, // 100% error
        { period: '2025-05', forecastQty: 100, actualQty: 99, model: 'e' },  // ~1% error
      ]);

      const result = await service.getProductAccuracy('prod-1');
      expect(result!.periodDetails[0].isOutlier).toBe(true);
      expect(result!.periodDetails[1].isOutlier).toBe(false);
    });
  });

  // ==========================================================================
  // getModelPerformance
  // ==========================================================================
  describe('getModelPerformance', () => {
    it('should return model performance sorted by MAPE', async () => {
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { productId: 'p1', forecastQty: 100, actualQty: 95, model: 'ensemble', product: { name: 'A' } },
        { productId: 'p1', forecastQty: 100, actualQty: 90, model: 'moving_average', product: { name: 'A' } },
        { productId: 'p2', forecastQty: 50, actualQty: 40, model: 'ensemble', product: { name: 'B' } },
      ]);

      const result = await service.getModelPerformance();
      expect(result.length).toBe(2);
      // Sorted by avgMape ascending
      expect(result[0].avgMape).toBeLessThanOrEqual(result[1].avgMape);
    });

    it('should count unique products per model', async () => {
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { productId: 'p1', forecastQty: 100, actualQty: 95, model: 'ensemble', product: { name: 'A' } },
        { productId: 'p2', forecastQty: 100, actualQty: 90, model: 'ensemble', product: { name: 'B' } },
      ]);

      const result = await service.getModelPerformance();
      expect(result[0].model).toBe('ensemble');
      expect(result[0].productCount).toBe(2);
    });

    it('should handle actual = 0', async () => {
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        { productId: 'p1', forecastQty: 50, actualQty: 0, model: 'ensemble', product: { name: 'A' } },
      ]);

      const result = await service.getModelPerformance();
      expect(result[0].avgMape).toBe(100); // 100% error when actual=0, forecast>0
    });
  });

  // ==========================================================================
  // compareForecastVsActual
  // ==========================================================================
  describe('compareForecastVsActual', () => {
    it('should compare forecast vs actual', async () => {
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        {
          period: '2025-01',
          forecastQty: 100,
          actualQty: 90,
          lowerBound: 80,
          upperBound: 120,
        },
        {
          period: '2025-02',
          forecastQty: 100,
          actualQty: 130,
          lowerBound: 80,
          upperBound: 120,
        },
      ]);

      const result = await service.compareForecastVsActual('prod-1');
      expect(result).toHaveLength(2);

      // First period: actual within bounds
      expect(result[0].withinBounds).toBe(true);
      expect(result[0].error).toBe(10); // 100 - 90

      // Second period: actual outside bounds
      expect(result[1].withinBounds).toBe(false);
      expect(result[1].error).toBe(-30); // 100 - 130
    });

    it('should handle zero actual', async () => {
      mockPrisma.demandForecast.findMany.mockResolvedValue([
        {
          period: '2025-01',
          forecastQty: 50,
          actualQty: 0,
          lowerBound: 30,
          upperBound: 70,
        },
      ]);

      const result = await service.compareForecastVsActual('prod-1');
      expect(result[0].percentError).toBe(100);
    });
  });

  // ==========================================================================
  // getAccuracySummary
  // ==========================================================================
  describe('getAccuracySummary', () => {
    it('should return summary with all fields', async () => {
      mockPrisma.product.count.mockResolvedValue(10);
      mockPrisma.demandForecast.groupBy.mockResolvedValue([
        { productId: 'p1', _avg: { accuracy: 95 } }, // <10% MAPE => excellent
        { productId: 'p2', _avg: { accuracy: 85 } }, // 15% MAPE => good
        { productId: 'p3', _avg: { accuracy: 75 } }, // 25% MAPE => fair
        { productId: 'p4', _avg: { accuracy: 60 } }, // 40% MAPE => poor
      ]);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', sku: 'SKU-1' },
        { id: 'p2', sku: 'SKU-2' },
        { id: 'p3', sku: 'SKU-3' },
        { id: 'p4', sku: 'SKU-4' },
      ]);

      const result = await service.getAccuracySummary();
      expect(result.totalProducts).toBe(10);
      expect(result.trackedProducts).toBe(4);
      expect(result.accuracyDistribution.excellent).toBe(1);
      expect(result.accuracyDistribution.good).toBe(1);
      expect(result.accuracyDistribution.fair).toBe(1);
      expect(result.accuracyDistribution.poor).toBe(1);
      expect(result.topPerformers.length).toBeLessThanOrEqual(5);
      expect(result.needsImprovement.length).toBeLessThanOrEqual(5);
    });

    it('should handle no tracked products', async () => {
      mockPrisma.product.count.mockResolvedValue(5);
      mockPrisma.demandForecast.groupBy.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await service.getAccuracySummary();
      expect(result.trackedProducts).toBe(0);
      expect(result.avgAccuracy).toBe(0);
      expect(result.avgMape).toBe(100);
    });
  });
});
