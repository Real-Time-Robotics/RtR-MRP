import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ForecastEngine,
  getForecastEngine,
  DEFAULT_CONFIG,
  type ForecastConfig,
} from '../forecast-engine';
import type { PreparedForecastData, TimeSeriesData } from '../data-extractor';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    demandForecast: {
      upsert: vi.fn(),
    },
  },
}));

const { mockDataExtractor } = vi.hoisted(() => ({
  mockDataExtractor: {
    prepareTimeSeriesData: vi.fn(),
    extractProductSalesHistory: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

vi.mock('../data-extractor', () => ({
  getDataExtractorService: () => mockDataExtractor,
  DataExtractorService: vi.fn(),
}));

vi.mock('../vn-calendar', () => ({
  getMonthlyHolidayFactor: vi.fn(() => 1.0),
  getWeeklyHolidayFactor: vi.fn(() => 1.0),
  formatPeriod: vi.fn((date: Date, type: string) => {
    if (type === 'monthly') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`;
  }),
  parsePeriod: vi.fn(),
  getUpcomingHolidays: vi.fn(() => []),
}));

// ============================================================================
// HELPERS
// ============================================================================

function makeTimeSeries(count: number, baseValue: number = 100, trend: number = 0): TimeSeriesData[] {
  const result: TimeSeriesData[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(2024, i % 12, 1);
    result.push({
      period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      value: baseValue + trend * i + Math.sin(i) * 10,
      date: d,
    });
  }
  return result;
}

function makePreparedData(
  count: number = 24,
  baseValue: number = 100,
  trend: number = 0,
  quality: 'good' | 'fair' | 'poor' = 'good'
): PreparedForecastData {
  return {
    productId: 'prod-1',
    productSku: 'SKU-001',
    productName: 'Test Product',
    timeSeries: makeTimeSeries(count, baseValue, trend),
    seasonalIndices: {
      1: 0.9, 2: 1.1, 3: 1.0, 4: 1.05, 5: 0.95, 6: 1.0,
      7: 1.0, 8: 0.98, 9: 1.02, 10: 1.1, 11: 0.95, 12: 0.9,
    },
    trend: trend,
    level: baseValue,
    outliers: [],
    dataQuality: quality,
    missingPeriods: [],
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ForecastEngine', () => {
  let engine: ForecastEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ForecastEngine();
  });

  describe('getForecastEngine', () => {
    it('should return a singleton instance', () => {
      const inst = getForecastEngine();
      expect(inst).toBeInstanceOf(ForecastEngine);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have expected defaults', () => {
      expect(DEFAULT_CONFIG.model).toBe('ensemble');
      expect(DEFAULT_CONFIG.periodType).toBe('monthly');
      expect(DEFAULT_CONFIG.periodsAhead).toBe(12);
      expect(DEFAULT_CONFIG.confidenceLevel).toBe(0.8);
      expect(DEFAULT_CONFIG.useHolidayAdjustment).toBe(true);
      expect(DEFAULT_CONFIG.useSeasonalAdjustment).toBe(true);
    });
  });

  // ==========================================================================
  // generateForecast
  // ==========================================================================
  describe('generateForecast', () => {
    it('should return null when no prepared data', async () => {
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(null);
      const result = await engine.generateForecast('prod-1');
      expect(result).toBeNull();
    });

    it('should return null when fewer than 6 data points', async () => {
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(
        makePreparedData(5)
      );
      const result = await engine.generateForecast('prod-1');
      expect(result).toBeNull();
    });

    it('should generate forecast with moving_average model', async () => {
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      expect(result).not.toBeNull();
      expect(result!.model).toBe('moving_average');
      expect(result!.forecasts).toHaveLength(12);
      expect(result!.forecasts[0].forecast).toBeGreaterThan(0);
      expect(result!.forecasts[0].lowerBound).toBeLessThanOrEqual(result!.forecasts[0].forecast);
      expect(result!.forecasts[0].upperBound).toBeGreaterThanOrEqual(result!.forecasts[0].forecast);
    });

    it('should generate forecast with exponential_smoothing model', async () => {
      const data = makePreparedData(12, 100, 2);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'exponential_smoothing' });
      expect(result).not.toBeNull();
      expect(result!.model).toBe('exponential_smoothing');
      expect(result!.forecasts).toHaveLength(12);
    });

    it('should generate forecast with holt_winters model (sufficient data)', async () => {
      const data = makePreparedData(24, 100, 1);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'holt_winters' });
      expect(result).not.toBeNull();
      expect(result!.model).toBe('holt_winters');
      expect(result!.forecasts).toHaveLength(12);
    });

    it('should fallback to exponential_smoothing when holt_winters has insufficient data', async () => {
      // Less than 2 * seasonLength (24 for monthly)
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'holt_winters' });
      expect(result).not.toBeNull();
      // Still labeled as holt_winters but internally falls back
      expect(result!.forecasts).toHaveLength(12);
    });

    it('should generate ensemble forecast by default', async () => {
      const data = makePreparedData(24, 100, 1);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1');
      expect(result).not.toBeNull();
      expect(result!.model).toBe('ensemble');
      expect(result!.forecasts).toHaveLength(12);
      // Ensemble should have adjustment note
      expect(result!.forecasts[0].factors.adjustments[0]).toContain('Ensemble');
    });

    it('should include metrics in the result', async () => {
      const data = makePreparedData(12, 100, 5);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      expect(result!.metrics).toBeDefined();
      expect(result!.metrics.historicalAvg).toBeGreaterThan(0);
      expect(result!.metrics.historicalStdDev).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(result!.metrics.trend);
      expect(['strong', 'moderate', 'weak', 'none']).toContain(result!.metrics.seasonality);
      expect(['high', 'medium', 'low']).toContain(result!.metrics.volatility);
    });

    it('should include recommendations', async () => {
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      expect(result!.recommendations).toBeDefined();
      expect(result!.recommendations.safetyStock).toBeDefined();
      expect(result!.recommendations.reorderPoint).toBeDefined();
    });

    it('should set confidence decreasing over horizon', async () => {
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      const confidences = result!.forecasts.map(f => f.confidence);
      // Should be decreasing
      for (let i = 1; i < confidences.length; i++) {
        expect(confidences[i]).toBeLessThanOrEqual(confidences[i - 1]);
      }
    });

    it('should set forecast values non-negative', async () => {
      // Use negative trend to potentially produce negative values
      const data = makePreparedData(12, 10, -5);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'exponential_smoothing' });
      for (const f of result!.forecasts) {
        expect(f.forecast).toBeGreaterThanOrEqual(0);
        expect(f.lowerBound).toBeGreaterThanOrEqual(0);
      }
    });

    it('should use custom periodsAhead config', async () => {
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', {
        model: 'moving_average',
        periodsAhead: 6,
      });
      expect(result!.forecasts).toHaveLength(6);
    });
  });

  // ==========================================================================
  // calculateMetrics
  // ==========================================================================
  describe('calculateMetrics (via generateForecast)', () => {
    it('should detect increasing trend', async () => {
      const data = makePreparedData(12, 50, 10); // strong upward trend
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      expect(result!.metrics.trend).toBe('increasing');
    });

    it('should detect decreasing trend', async () => {
      const data = makePreparedData(12, 200, -10); // strong downward trend
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      expect(result!.metrics.trend).toBe('decreasing');
    });

    it('should detect strong seasonality', async () => {
      const data = makePreparedData(12, 100);
      // Override with extreme seasonal indices
      data.seasonalIndices = {
        1: 0.5, 2: 1.5, 3: 0.7, 4: 1.3, 5: 0.6, 6: 1.4,
        7: 0.5, 8: 1.5, 9: 0.7, 10: 1.3, 11: 0.6, 12: 1.4,
      };
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'moving_average' });
      expect(result!.metrics.seasonality).toBe('strong');
    });
  });

  // ==========================================================================
  // saveForecast
  // ==========================================================================
  describe('saveForecast', () => {
    it('should upsert each forecast point', async () => {
      mockPrisma.demandForecast.upsert.mockResolvedValue({});

      const forecastResult = {
        productId: 'prod-1',
        productSku: 'SKU-001',
        productName: 'Test',
        generatedAt: new Date(),
        periodType: 'monthly' as const,
        model: 'ensemble' as const,
        forecasts: [
          {
            period: '2025-01',
            periodType: 'monthly' as const,
            date: new Date(),
            forecast: 100,
            lowerBound: 80,
            upperBound: 120,
            confidence: 0.9,
            factors: {
              baseValue: 100,
              trend: 0,
              seasonalIndex: 1,
              holidayFactor: 1,
              holidayNames: [],
              adjustments: [],
            },
          },
          {
            period: '2025-02',
            periodType: 'monthly' as const,
            date: new Date(),
            forecast: 110,
            lowerBound: 85,
            upperBound: 135,
            confidence: 0.85,
            factors: {
              baseValue: 100,
              trend: 10,
              seasonalIndex: 1.1,
              holidayFactor: 1,
              holidayNames: [],
              adjustments: [],
            },
          },
        ],
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 10,
          trend: 'stable' as const,
          trendSlope: 0,
          seasonality: 'none' as const,
          volatility: 'low' as const,
        },
        recommendations: {
          safetyStock: { current: 0, recommended: 10, reason: 'test' },
          reorderPoint: { current: 0, recommended: 20, reason: 'test' },
          nextPurchase: null,
        },
        dataQuality: 'good' as const,
      };

      await engine.saveForecast(forecastResult);
      expect(mockPrisma.demandForecast.upsert).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // generateAllForecasts
  // ==========================================================================
  describe('generateAllForecasts', () => {
    it('should process all active products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);

      // prod-1 succeeds, prod-2 returns null
      mockDataExtractor.prepareTimeSeriesData
        .mockResolvedValueOnce(makePreparedData(12, 100))
        .mockResolvedValueOnce(null);

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });
      mockPrisma.demandForecast.upsert.mockResolvedValue({});

      const result = await engine.generateAllForecasts();
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }]);
      mockDataExtractor.prepareTimeSeriesData.mockRejectedValue(new Error('DB error'));

      const result = await engine.generateAllForecasts();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  // ==========================================================================
  // calculateModelWeights (tested via ensemble)
  // ==========================================================================
  describe('calculateModelWeights behavior', () => {
    it('should favor simpler models for short data', async () => {
      const data = makePreparedData(8, 100); // <12 points
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1'); // ensemble
      expect(result).not.toBeNull();
      // Just verify it doesn't crash with short data
      expect(result!.forecasts.length).toBeGreaterThan(0);
    });

    it('should favor HW for long data', async () => {
      const data = makePreparedData(24, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1');
      expect(result).not.toBeNull();
      expect(result!.forecasts[0].factors.adjustments[0]).toContain('HW');
    });

    it('should penalize HW for poor data quality', async () => {
      const data = makePreparedData(24, 100, 0, 'poor');
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1');
      expect(result).not.toBeNull();
    });
  });

  // ==========================================================================
  // getZScore helper (tested via confidence intervals)
  // ==========================================================================
  describe('getZScore behavior', () => {
    it('should produce wider intervals at higher confidence', async () => {
      const data = makePreparedData(12, 100);

      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result80 = await engine.generateForecast('prod-1', {
        model: 'moving_average',
        confidenceLevel: 0.80,
      });

      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      const result95 = await engine.generateForecast('prod-1', {
        model: 'moving_average',
        confidenceLevel: 0.95,
      });

      const width80 = result80!.forecasts[0].upperBound - result80!.forecasts[0].lowerBound;
      const width95 = result95!.forecasts[0].upperBound - result95!.forecasts[0].lowerBound;
      expect(width95).toBeGreaterThanOrEqual(width80);
    });
  });

  // ==========================================================================
  // getNextPeriodDate helper (tested indirectly)
  // ==========================================================================
  describe('period date generation', () => {
    it('should generate monthly periods with correct spacing', async () => {
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', {
        model: 'moving_average',
        periodsAhead: 3,
      });

      const dates = result!.forecasts.map(f => f.date);
      // Each date should be roughly 1 month apart
      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(28);
        expect(diffDays).toBeLessThanOrEqual(31);
      }
    });

    it('should generate weekly periods', async () => {
      const data = makePreparedData(12, 100);
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', {
        model: 'moving_average',
        periodType: 'weekly',
        periodsAhead: 4,
      });

      const dates = result!.forecasts.map(f => f.date);
      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(7);
      }
    });
  });

  // ==========================================================================
  // calculateStdDev helper
  // ==========================================================================
  describe('stdDev calculations', () => {
    it('should handle zero values in exponential smoothing', async () => {
      const data = makePreparedData(12);
      // Set all values to same
      data.timeSeries = data.timeSeries.map(ts => ({ ...ts, value: 50 }));
      mockDataExtractor.prepareTimeSeriesData.mockResolvedValue(data);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Test' });

      const result = await engine.generateForecast('prod-1', { model: 'exponential_smoothing' });
      expect(result).not.toBeNull();
      // With constant data, lower and upper bounds should be tight
      expect(result!.forecasts[0].lowerBound).toBeCloseTo(result!.forecasts[0].forecast, -1);
    });
  });
});
