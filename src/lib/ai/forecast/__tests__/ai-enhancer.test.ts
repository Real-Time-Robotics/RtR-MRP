import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIEnhancerService, getAIEnhancerService } from '../ai-enhancer';
import { ForecastResult, ForecastPoint } from '../forecast-engine';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

// Mock vn-calendar
vi.mock('../vn-calendar', () => ({
  getUpcomingHolidays: vi.fn().mockReturnValue([]),
  getTetPhase: vi.fn().mockReturnValue(null),
  VN_HOLIDAYS: [],
}));

// Mock data-extractor
vi.mock('../data-extractor', () => ({
  getDataExtractorService: vi.fn().mockReturnValue({}),
}));

// Mock fetch for Gemini API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// HELPERS
// =============================================================================

function createTestForecast(overrides: Partial<ForecastResult> = {}): ForecastResult {
  const baseDate = new Date(2025, 2, 1);
  const forecasts: ForecastPoint[] = [];

  for (let i = 0; i < 6; i++) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + i);
    forecasts.push({
      period: `2025-${String(date.getMonth() + 1).padStart(2, '0')}`,
      periodType: 'monthly',
      date,
      forecast: 100 + i * 10,
      lowerBound: 80 + i * 10,
      upperBound: 120 + i * 10,
      confidence: 0.8,
      factors: {
        baseValue: 100,
        trend: i * 2,
        seasonalIndex: 1.0,
        holidayFactor: 1.0,
        holidayNames: [],
        adjustments: [],
      },
    });
  }

  return {
    productId: 'prod-1',
    productSku: 'SKU-001',
    productName: 'Test Product',
    generatedAt: new Date(),
    periodType: 'monthly',
    model: 'holtwinters' as any,
    forecasts,
    metrics: {
      historicalAvg: 100,
      historicalStdDev: 15,
      trend: 'increasing',
      trendSlope: 3,
      seasonality: 'moderate',
      volatility: 'medium',
    },
    recommendations: {
      safetyStock: { current: 50, recommended: 60, reason: 'Increasing demand' },
      reorderPoint: { current: 80, recommended: 90, reason: 'Higher demand' },
      // @ts-expect-error test data
      orderQuantity: { current: 200, recommended: 220, reason: 'Trend adjustment' },
    },
    dataQuality: 'good',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('AIEnhancerService', () => {
  let service: AIEnhancerService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure no API key so we use rule-based insights
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    service = new AIEnhancerService();
  });

  // ===========================================================================
  // ENHANCE FORECAST (RULE-BASED, NO API KEY)
  // ===========================================================================

  describe('enhanceForecast', () => {
    it('returns enhanced forecast with insights, risk, and actions', async () => {
      const forecast = createTestForecast();
      const result = await service.enhanceForecast(forecast);

      expect(result.aiInsights).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.actionItems).toBeDefined();
      // Should carry over original forecast data
      expect(result.productId).toBe('prod-1');
      expect(result.forecasts).toHaveLength(6);
    });
  });

  // ===========================================================================
  // RULE-BASED INSIGHTS
  // ===========================================================================

  describe('rule-based insights', () => {
    it('detects increasing trend', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 15,
          trend: 'increasing',
          trendSlope: 3,
          seasonality: 'moderate',
          volatility: 'medium',
        },
      });

      const result = await service.enhanceForecast(forecast);
      expect(result.aiInsights.keyFactors).toContain('Upward demand trend detected');
      expect(result.aiInsights.keyFactorsVi).toContain('Xu hướng nhu cầu tăng');
    });

    it('detects decreasing trend', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 15,
          trend: 'decreasing',
          trendSlope: -3,
          seasonality: 'moderate',
          volatility: 'medium',
        },
      });

      const result = await service.enhanceForecast(forecast);
      expect(result.aiInsights.keyFactors).toContain('Downward demand trend detected');
    });

    it('detects strong seasonality', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 15,
          trend: 'stable',
          trendSlope: 0,
          seasonality: 'strong',
          volatility: 'medium',
        },
      });

      const result = await service.enhanceForecast(forecast);
      expect(result.aiInsights.keyFactors).toContain('Strong seasonal patterns observed');
    });

    it('detects high volatility', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 30,
          trend: 'stable',
          trendSlope: 0,
          seasonality: 'none',
          volatility: 'high',
        },
      });

      const result = await service.enhanceForecast(forecast);
      expect(result.aiInsights.keyFactors).toContain('High demand volatility - larger safety stock recommended');
    });

    it('detects demand spike anomalies', async () => {
      const forecasts: ForecastPoint[] = [];
      for (let i = 0; i < 6; i++) {
        forecasts.push({
          period: `2025-${String(i + 3).padStart(2, '0')}`,
          periodType: 'monthly',
          date: new Date(2025, i + 2, 1),
          forecast: i === 3 ? 300 : 100, // Spike at i=3
          lowerBound: 80,
          upperBound: 320,
          confidence: 0.8,
          factors: { baseValue: 100, trend: 0, seasonalIndex: 1, holidayFactor: 1, holidayNames: [], adjustments: [] },
        });
      }

      const forecast = createTestForecast({ forecasts });
      const result = await service.enhanceForecast(forecast);

      const spikeAnomaly = result.aiInsights.anomalies.find(a => a.type === 'spike');
      expect(spikeAnomaly).toBeDefined();
    });

    it('detects demand drop anomalies', async () => {
      const forecasts: ForecastPoint[] = [];
      for (let i = 0; i < 6; i++) {
        forecasts.push({
          period: `2025-${String(i + 3).padStart(2, '0')}`,
          periodType: 'monthly',
          date: new Date(2025, i + 2, 1),
          forecast: i === 3 ? 10 : 100, // Drop at i=3
          lowerBound: 5,
          upperBound: 120,
          confidence: 0.8,
          factors: { baseValue: 100, trend: 0, seasonalIndex: 1, holidayFactor: 1, holidayNames: [], adjustments: [] },
        });
      }

      const forecast = createTestForecast({ forecasts });
      const result = await service.enhanceForecast(forecast);

      const dropAnomaly = result.aiInsights.anomalies.find(a => a.type === 'drop');
      expect(dropAnomaly).toBeDefined();
    });

    it('generates summary text', async () => {
      const forecast = createTestForecast();
      const result = await service.enhanceForecast(forecast);

      expect(result.aiInsights.summary).toContain('Test Product');
      expect(result.aiInsights.summaryVi).toContain('Test Product');
    });

    it('sets confidence based on data quality', async () => {
      const goodForecast = createTestForecast({ dataQuality: 'good' });
      const poorForecast = createTestForecast({ dataQuality: 'poor' });

      const goodResult = await service.enhanceForecast(goodForecast);
      const poorResult = await service.enhanceForecast(poorForecast);

      expect(goodResult.aiInsights.confidence).toBe(0.85);
      expect(poorResult.aiInsights.confidence).toBe(0.5);
    });

    it('sets fair confidence for fair data quality', async () => {
      const forecast = createTestForecast({ dataQuality: 'fair' });
      const result = await service.enhanceForecast(forecast);
      expect(result.aiInsights.confidence).toBe(0.7);
    });
  });

  // ===========================================================================
  // RISK ASSESSMENT
  // ===========================================================================

  describe('risk assessment', () => {
    it('calculates stockout and overstock risk scores', async () => {
      const forecast = createTestForecast();
      const result = await service.enhanceForecast(forecast);

      expect(result.riskAssessment.stockoutRisk).toBeGreaterThanOrEqual(0);
      expect(result.riskAssessment.stockoutRisk).toBeLessThanOrEqual(100);
      expect(result.riskAssessment.overstockRisk).toBeGreaterThanOrEqual(0);
      expect(result.riskAssessment.overstockRisk).toBeLessThanOrEqual(100);
    });

    it('sets overall risk level', async () => {
      const forecast = createTestForecast();
      const result = await service.enhanceForecast(forecast);
      expect(['low', 'medium', 'high']).toContain(result.riskAssessment.overallRisk);
    });

    it('adds volatility risk factor for high volatility', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 30,
          trend: 'stable',
          trendSlope: 0,
          seasonality: 'none',
          volatility: 'high',
        },
      });

      const result = await service.enhanceForecast(forecast);
      const volFactor = result.riskAssessment.riskFactors.find(f => f.factor.includes('volatility'));
      expect(volFactor).toBeDefined();
      expect(volFactor!.impact).toBe('high');
    });

    it('adds data quality risk for poor data', async () => {
      const forecast = createTestForecast({ dataQuality: 'poor' });
      const result = await service.enhanceForecast(forecast);
      const dataFactor = result.riskAssessment.riskFactors.find(f => f.factor.includes('Limited historical data'));
      expect(dataFactor).toBeDefined();
    });

    it('adds rapidly increasing demand risk', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 15,
          trend: 'increasing',
          trendSlope: 10,
          seasonality: 'none',
          volatility: 'low',
        },
      });

      const result = await service.enhanceForecast(forecast);
      const trendFactor = result.riskAssessment.riskFactors.find(f => f.factor.includes('Rapidly'));
      expect(trendFactor).toBeDefined();
    });

    it('increases stockout risk for increasing trend', async () => {
      const increasing = createTestForecast({
        metrics: { historicalAvg: 100, historicalStdDev: 15, trend: 'increasing', trendSlope: 3, seasonality: 'none', volatility: 'low' },
      });
      const decreasing = createTestForecast({
        metrics: { historicalAvg: 100, historicalStdDev: 15, trend: 'decreasing', trendSlope: -3, seasonality: 'none', volatility: 'low' },
      });

      const incResult = await service.enhanceForecast(increasing);
      const decResult = await service.enhanceForecast(decreasing);

      expect(incResult.riskAssessment.stockoutRisk).toBeGreaterThan(decResult.riskAssessment.stockoutRisk);
    });
  });

  // ===========================================================================
  // ACTION ITEMS
  // ===========================================================================

  describe('action items', () => {
    it('generates action for high stockout risk', async () => {
      const forecast = createTestForecast({
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 30,
          trend: 'increasing',
          trendSlope: 3,
          seasonality: 'none',
          volatility: 'high',
        },
      });

      const result = await service.enhanceForecast(forecast);
      const stockAction = result.actionItems.find(a => a.action.includes('safety stock'));
      expect(stockAction).toBeDefined();
      if (stockAction) {
        expect(stockAction.priority).toBe('urgent');
      }
    });

    it('generates data quality action for poor data', async () => {
      const forecast = createTestForecast({ dataQuality: 'poor' });
      const result = await service.enhanceForecast(forecast);
      const dataAction = result.actionItems.find(a => a.action.includes('data quality'));
      expect(dataAction).toBeDefined();
      if (dataAction) {
        expect(dataAction.priority).toBe('low');
      }
    });

    it('sorts actions by priority', async () => {
      const forecast = createTestForecast({
        dataQuality: 'poor',
        metrics: {
          historicalAvg: 100,
          historicalStdDev: 30,
          trend: 'increasing',
          trendSlope: 3,
          seasonality: 'none',
          volatility: 'high',
        },
      });

      const result = await service.enhanceForecast(forecast);
      if (result.actionItems.length >= 2) {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        for (let i = 1; i < result.actionItems.length; i++) {
          expect(priorityOrder[result.actionItems[i].priority])
            .toBeGreaterThanOrEqual(priorityOrder[result.actionItems[i - 1].priority]);
        }
      }
    });
  });

  // ===========================================================================
  // EXPLAIN FORECAST
  // ===========================================================================

  describe('explainForecast', () => {
    it('explains all forecast points', async () => {
      const forecast = createTestForecast();
      const explanations = await service.explainForecast(forecast);

      expect(explanations).toHaveLength(6);
      for (const exp of explanations) {
        expect(exp.period).toBeTruthy();
        expect(exp.forecast).toBeGreaterThan(0);
        expect(exp.explanation).toBeTruthy();
        expect(exp.explanationVi).toBeTruthy();
      }
    });

    it('filters by specific period', async () => {
      const forecast = createTestForecast();
      const period = forecast.forecasts[2].period;
      const explanations = await service.explainForecast(forecast, period);

      expect(explanations).toHaveLength(1);
      expect(explanations[0].period).toBe(period);
    });

    it('includes trend factor when non-zero', async () => {
      const forecast = createTestForecast();
      // The test forecast has trend != 0 for later points
      const explanations = await service.explainForecast(forecast);
      const withTrend = explanations.find(e => e.factors.some(f => f.name === 'Trend'));
      expect(withTrend).toBeDefined();
    });

    it('includes seasonal factor when index is not 1', async () => {
      const forecast = createTestForecast();
      forecast.forecasts[0].factors.seasonalIndex = 1.3;
      const explanations = await service.explainForecast(forecast);
      const withSeasonal = explanations.find(e => e.factors.some(f => f.name === 'Seasonality'));
      expect(withSeasonal).toBeDefined();
    });

    it('includes holiday factor when not 1', async () => {
      const forecast = createTestForecast();
      forecast.forecasts[0].factors.holidayFactor = 0.7;
      forecast.forecasts[0].factors.holidayNames = ['Tet Holiday'];
      const explanations = await service.explainForecast(forecast);
      const withHoliday = explanations.find(e => e.factors.some(f => f.name === 'Tet Holiday'));
      expect(withHoliday).toBeDefined();
    });

    it('shows direction for factors', async () => {
      const forecast = createTestForecast();
      forecast.forecasts[0].factors.seasonalIndex = 1.3;
      const explanations = await service.explainForecast(forecast);
      const seasonalFactor = explanations[0].factors.find(f => f.name === 'Seasonality');
      expect(seasonalFactor).toBeDefined();
      expect(seasonalFactor!.direction).toBe('increase');
    });
  });
});

// =============================================================================
// SINGLETON
// =============================================================================

describe('getAIEnhancerService', () => {
  it('returns an AIEnhancerService instance', () => {
    const service = getAIEnhancerService();
    expect(service).toBeInstanceOf(AIEnhancerService);
  });
});
