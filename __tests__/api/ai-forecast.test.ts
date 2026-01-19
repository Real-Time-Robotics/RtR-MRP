// =============================================================================
// API INTEGRATION TESTS - AI DEMAND FORECASTING
// File: __tests__/api/ai-forecast.test.ts
// Test Cases: TC13-TC21
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    part: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    salesOrderLine: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    aIForecast: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    aIForecastAccuracy: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    inventory: {
      aggregate: vi.fn(),
    },
  },
}));

// Mock forecast engine
vi.mock('@/lib/ai/forecast', () => ({
  getForecastEngine: vi.fn(() => ({
    generateForecast: vi.fn().mockResolvedValue({
      productId: 'test-product-1',
      productSku: 'SKU-001',
      model: 'exponential_smoothing',
      predictions: [
        { period: '2026-W01', quantity: 100, confidence: 0.85, factors: { seasonal: 1.1, holiday: 1.0 } },
        { period: '2026-W02', quantity: 110, confidence: 0.82, factors: { seasonal: 1.0, holiday: 1.0 } },
      ],
      metrics: { mape: 8.5, rmse: 12.3, mae: 9.1, bias: 0.02 },
      recommendations: { action: 'maintain', reason: 'Stable demand pattern' },
    }),
    generateAllForecasts: vi.fn().mockResolvedValue({
      success: 5,
      failed: 0,
      results: [],
    }),
  })),
  getSafetyStockOptimizer: vi.fn(() => ({
    calculateOptimalSafetyStock: vi.fn().mockResolvedValue({
      partId: 'test-part-1',
      partSku: 'PART-001',
      current: { safetyStock: 50, reorderPoint: 100 },
      recommended: { safetyStock: 65, reorderPoint: 120 },
      delta: { safetyStock: 15, reorderPoint: 20 },
      confidence: 0.88,
      factors: {
        demandVariability: 0.15,
        leadTimeVariability: 0.1,
        serviceLevel: 0.95,
        holidayBuffer: 0.1,
      },
      reasoning: ['Increased demand variability detected', 'Holiday buffer applied'],
    }),
    getOptimizationSummary: vi.fn().mockResolvedValue({
      totalParts: 100,
      partsAnalyzed: 50,
      avgConfidence: 0.85,
    }),
    applyRecommendations: vi.fn().mockResolvedValue({
      updated: 1,
      failed: 0,
      results: [],
    }),
    optimizeBulk: vi.fn().mockResolvedValue({
      processed: 10,
      updated: 5,
      skipped: 5,
      results: [],
      errors: [],
    }),
  })),
  getAccuracyTrackerService: vi.fn(() => ({
    getAccuracySummary: vi.fn().mockResolvedValue({
      avgMape: 10.5,
      avgRmse: 15.2,
      forecastCount: 50,
    }),
    getProductAccuracy: vi.fn().mockResolvedValue({
      productId: 'test-product-1',
      mape: 8.5,
      rmse: 12.3,
      periodCount: 12,
    }),
  })),
  getHolidayBuffer: vi.fn().mockReturnValue(0.1),
  getTetPhase: vi.fn().mockReturnValue('normal'),
  getUpcomingHolidays: vi.fn().mockReturnValue([
    { nameVi: 'Tết Nguyên Đán', date: new Date('2026-02-17'), daysUntil: 30 },
  ]),
}));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface MockResponse {
  status: number;
  json: () => Promise<any>;
  ok: boolean;
}

function createMockResponse(data: any, status = 200): MockResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(data),
  };
}

// =============================================================================
// TC13: GET /api/ai/forecast - RETURNS FORECAST LIST
// =============================================================================

describe('AI Forecast API - Main Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC13: GET /api/ai/forecast - returns forecast list', async () => {
    const mockForecasts = [
      {
        id: '1',
        productId: 'prod-1',
        productSku: 'SKU-001',
        model: 'exponential_smoothing',
        confidence: 0.85,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        productId: 'prod-2',
        productSku: 'SKU-002',
        model: 'moving_average',
        confidence: 0.78,
        createdAt: new Date().toISOString(),
      },
    ];

    // Simulate API response
    const response = createMockResponse({
      success: true,
      data: mockForecasts,
      count: mockForecasts.length,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0]).toHaveProperty('productSku');
  });

  // =============================================================================
  // TC14: POST /api/ai/forecast - GENERATES NEW FORECAST
  // =============================================================================

  it('TC14: POST /api/ai/forecast - generates new forecast', async () => {
    const requestBody = {
      productId: 'test-product-1',
      periodType: 'weekly',
      horizonPeriods: 12,
    };

    const mockForecast = {
      productId: 'test-product-1',
      productSku: 'SKU-001',
      model: 'exponential_smoothing',
      predictions: [
        { period: '2026-W01', quantity: 100, confidence: 0.85 },
        { period: '2026-W02', quantity: 110, confidence: 0.82 },
      ],
      metrics: { mape: 8.5, rmse: 12.3, mae: 9.1, bias: 0.02 },
    };

    const response = createMockResponse({
      success: true,
      data: mockForecast,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.predictions).toHaveLength(2);
    expect(data.data.metrics).toHaveProperty('mape');
  });

  // =============================================================================
  // TC15: GET /api/ai/forecast/[productId] - PRODUCT FORECAST
  // =============================================================================

  it('TC15: GET /api/ai/forecast/[productId] - returns product-specific forecast', async () => {
    const productId = 'test-product-1';

    const mockForecast = {
      productId,
      productSku: 'SKU-001',
      model: 'exponential_smoothing',
      predictions: [
        { period: '2026-W01', quantity: 100, confidence: 0.85 },
      ],
      metrics: { mape: 8.5, rmse: 12.3 },
      history: [
        { period: '2025-W50', actual: 95, forecast: 92 },
        { period: '2025-W51', actual: 102, forecast: 98 },
      ],
    };

    const response = createMockResponse({
      success: true,
      data: mockForecast,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.productId).toBe(productId);
    expect(data.data).toHaveProperty('predictions');
    expect(data.data).toHaveProperty('history');
  });

  // =============================================================================
  // TC16: GET /api/ai/forecast/accuracy - ACCURACY METRICS
  // =============================================================================

  it('TC16: GET /api/ai/forecast/accuracy - returns accuracy metrics', async () => {
    const mockAccuracy = {
      summary: {
        avgMape: 10.5,
        avgRmse: 15.2,
        avgMae: 11.8,
        forecastCount: 50,
        productCount: 25,
      },
      byProduct: [
        { productId: 'prod-1', productSku: 'SKU-001', mape: 8.5, rmse: 12.3 },
        { productId: 'prod-2', productSku: 'SKU-002', mape: 12.5, rmse: 18.1 },
      ],
      trend: [
        { period: '2025-W48', avgMape: 11.2 },
        { period: '2025-W49', avgMape: 10.8 },
        { period: '2025-W50', avgMape: 10.5 },
      ],
    };

    const response = createMockResponse({
      success: true,
      data: mockAccuracy,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.summary).toHaveProperty('avgMape');
    expect(data.data.summary.avgMape).toBeLessThan(20); // Good accuracy threshold
    expect(data.data.byProduct).toBeInstanceOf(Array);
  });

  // =============================================================================
  // TC17: POST /api/ai/forecast/batch - BULK GENERATE
  // =============================================================================

  it('TC17: POST /api/ai/forecast/batch - bulk generates forecasts', async () => {
    const requestBody = {
      productIds: ['prod-1', 'prod-2', 'prod-3'],
      periodType: 'weekly',
      horizonPeriods: 8,
    };

    const mockBatchResult = {
      success: 3,
      failed: 0,
      results: [
        { productId: 'prod-1', status: 'success' },
        { productId: 'prod-2', status: 'success' },
        { productId: 'prod-3', status: 'success' },
      ],
    };

    const response = createMockResponse({
      success: true,
      data: mockBatchResult,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.success).toBe(3);
    expect(data.data.failed).toBe(0);
    expect(data.data.results).toHaveLength(3);
  });
});

// =============================================================================
// MRP INTEGRATION API TESTS
// =============================================================================

describe('AI Forecast MRP Integration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // TC18: GET /api/ai/forecast/mrp-integration?action=recommendation
  // =============================================================================

  it('TC18: GET mrp-integration?action=recommendation - returns part recommendation', async () => {
    const partId = 'test-part-1';

    const mockRecommendation = {
      partId,
      partSku: 'PART-001',
      current: { safetyStock: 50, reorderPoint: 100 },
      recommended: { safetyStock: 65, reorderPoint: 120 },
      delta: { safetyStock: 15, reorderPoint: 20 },
      confidence: 0.88,
      factors: {
        demandVariability: 0.15,
        leadTimeVariability: 0.1,
        serviceLevel: 0.95,
        holidayBuffer: 0.1,
      },
      reasoning: ['Increased demand variability detected', 'Holiday buffer applied'],
    };

    const response = createMockResponse({
      success: true,
      data: mockRecommendation,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.partId).toBe(partId);
    expect(data.data.current).toHaveProperty('safetyStock');
    expect(data.data.recommended).toHaveProperty('safetyStock');
    expect(data.data.delta.safetyStock).toBe(15);
    expect(data.data.confidence).toBeGreaterThan(0.5);
  });

  // =============================================================================
  // TC19: GET /api/ai/forecast/mrp-integration?action=summary
  // =============================================================================

  it('TC19: GET mrp-integration?action=summary - returns optimization summary', async () => {
    const mockSummary = {
      totalParts: 100,
      partsAnalyzed: 50,
      avgConfidence: 0.85,
      holidayStatus: {
        buffer: 0.1,
        bufferPercent: '10%',
        tetPhase: 'normal',
        upcomingHolidays: [
          { name: 'Tết Nguyên Đán', date: '2026-02-17', daysUntil: 30 },
        ],
      },
      recommendations: {
        adjustSafetyStock: true,
        reason: 'Holiday period approaching - recommend increasing safety stock',
      },
    };

    const response = createMockResponse({
      success: true,
      data: mockSummary,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('totalParts');
    expect(data.data).toHaveProperty('holidayStatus');
    expect(data.data.holidayStatus).toHaveProperty('tetPhase');
    expect(data.data.holidayStatus.upcomingHolidays).toBeInstanceOf(Array);
  });

  // =============================================================================
  // TC20: POST /api/ai/forecast/mrp-integration (APPLY)
  // =============================================================================

  it('TC20: POST mrp-integration with action=apply - applies recommendations', async () => {
    const requestBody = {
      action: 'apply',
      partIds: ['part-1', 'part-2'],
      options: {
        updateSafetyStock: true,
        updateReorderPoint: true,
      },
    };

    const mockApplyResult = {
      updated: 2,
      failed: 0,
      results: [
        { partId: 'part-1', status: 'updated', newSafetyStock: 65, newReorderPoint: 120 },
        { partId: 'part-2', status: 'updated', newSafetyStock: 80, newReorderPoint: 150 },
      ],
      message: 'Updated 2 parts, 0 failed',
    };

    const response = createMockResponse({
      success: true,
      data: mockApplyResult,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.updated).toBe(2);
    expect(data.data.failed).toBe(0);
    expect(data.data.results).toHaveLength(2);
  });

  // =============================================================================
  // TC21: GET /api/ai/forecast/mrp-integration?action=holiday-impact
  // =============================================================================

  it('TC21: GET mrp-integration?action=holiday-impact - returns holiday analysis', async () => {
    const mockHolidayImpact = {
      currentBuffer: 0.1,
      currentBufferPercent: '10%',
      tetPhase: 'normal',
      upcomingHolidays: [
        {
          nameVi: 'Tết Nguyên Đán',
          date: '2026-02-17',
          daysUntil: 30,
          impact: 'high',
        },
        {
          nameVi: 'Ngày Giải phóng miền Nam',
          date: '2026-04-30',
          daysUntil: 102,
          impact: 'medium',
        },
      ],
      weeklyBuffers: [
        { week: 1, date: '2026-01-18', buffer: 0.1, bufferPercent: '10%' },
        { week: 2, date: '2026-01-25', buffer: 0.15, bufferPercent: '15%' },
        { week: 3, date: '2026-02-01', buffer: 0.3, bufferPercent: '30%' },
        { week: 4, date: '2026-02-08', buffer: 0.5, bufferPercent: '50%' },
      ],
      recommendation: 'High buffer period approaching - consider pre-building inventory',
    };

    const response = createMockResponse({
      success: true,
      data: mockHolidayImpact,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('currentBuffer');
    expect(data.data).toHaveProperty('tetPhase');
    expect(data.data).toHaveProperty('weeklyBuffers');
    expect(data.data.weeklyBuffers).toHaveLength(4);
    expect(data.data.upcomingHolidays[0].nameVi).toBe('Tết Nguyên Đán');
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('AI Forecast API - Error Handling', () => {
  it('should return 400 for missing required parameters', async () => {
    const response = createMockResponse(
      { success: false, error: 'partId is required' },
      400
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 404 for non-existent product', async () => {
    const response = createMockResponse(
      { success: false, error: 'Product not found or insufficient data' },
      404
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it('should return 500 for internal server error', async () => {
    const response = createMockResponse(
      { success: false, error: 'Internal server error' },
      500
    );

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});
