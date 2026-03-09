import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock client-logger
vi.mock('@/lib/client-logger', () => ({
  clientLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  useForecast,
  useForecastList,
  useForecastAccuracy,
  useGenerateForecast,
  useForecastTraining,
  useSyncActuals,
} from '../use-forecast';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// =============================================================================
// TESTS
// =============================================================================

describe('useForecast', () => {
  it('should initialize with null forecast and not loading when no productId', () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const { result } = renderHook(() => useForecast());

    expect(result.current.forecast).toBeNull();
    expect(result.current.salesHistory).toBeNull();
    expect(result.current.accuracy).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.chartData).toEqual([]);
  });

  it('should fetch forecast when productId is provided', async () => {
    const mockData = {
      data: {
        forecast: {
          productId: 'prod-1',
          productName: 'Widget',
          productSku: 'WDG-001',
          model: 'exponential_smoothing',
          predictions: [
            { period: '2026-04', quantity: 100, lowerBound: 80, upperBound: 120, confidence: 0.85 },
          ],
          metrics: { mape: 12, rmse: 5, mae: 4, bias: 1 },
          trend: 'up',
          seasonality: 'medium',
          confidence: 0.85,
          generatedAt: '2026-03-01',
        },
        salesHistory: {
          productId: 'prod-1',
          productName: 'Widget',
          salesHistory: [
            { period: '2026-03', quantity: 90, revenue: 9000 },
          ],
          totalQuantity: 90,
          totalRevenue: 9000,
          trend: 'up',
          volatility: 0.1,
        },
        accuracy: {
          metrics: { mape: 12, rmse: 5, mae: 4, bias: 1 },
        },
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() =>
      useForecast({ productId: 'prod-1', periodType: 'monthly' })
    );

    await waitFor(() => {
      expect(result.current.forecast).not.toBeNull();
    });

    expect(result.current.forecast?.productId).toBe('prod-1');
    expect(result.current.salesHistory?.totalQuantity).toBe(90);
    expect(result.current.accuracy?.mape).toBe(12);
    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/forecast/prod-1?action=full&periodType=monthly'
    );
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not found' }),
    });

    const { result } = renderHook(() => useForecast({ productId: 'prod-bad' }));

    await waitFor(() => {
      expect(result.current.error).toBe('Not found');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should compute chartData from sales history and predictions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          forecast: {
            predictions: [
              { period: '2026-04', quantity: 100, lowerBound: 80, upperBound: 120, confidence: 0.85 },
            ],
          },
          salesHistory: {
            salesHistory: [
              { period: '2026-03', quantity: 90, revenue: 9000 },
            ],
          },
          accuracy: null,
        },
      }),
    });

    const { result } = renderHook(() => useForecast({ productId: 'prod-1' }));

    await waitFor(() => {
      expect(result.current.chartData.length).toBeGreaterThan(0);
    });

    expect(result.current.chartData).toHaveLength(2);
    // Sorted by period
    expect(result.current.chartData[0].period).toBe('2026-03');
    expect(result.current.chartData[0].actual).toBe(90);
    expect(result.current.chartData[1].period).toBe('2026-04');
    expect(result.current.chartData[1].forecast).toBe(100);
  });

  it('should generate forecast via PUT', async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { forecast: null, salesHistory: null, accuracy: null } }),
    });

    const { result } = renderHook(() => useForecast({ productId: 'prod-1' }));

    // Generate forecast call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          forecast: { productId: 'prod-1', model: 'arima', predictions: [] },
        },
      }),
    });

    await act(async () => {
      const forecast = await result.current.generateForecast(true);
      expect(forecast).toBeDefined();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/ai/forecast/prod-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enhance: true, periodType: 'monthly' }),
    });
  });
});

describe('useForecastList', () => {
  it('should fetch forecasts with default parameters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          forecasts: [
            { productId: 'prod-1', productName: 'Widget A' },
          ],
          total: 1,
        },
      }),
    });

    const { result } = renderHook(() => useForecastList());

    await waitFor(() => {
      expect(result.current.forecasts).toHaveLength(1);
    });

    expect(result.current.total).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass search and category parameters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { forecasts: [], total: 0 } }),
    });

    renderHook(() =>
      useForecastList({ page: 2, limit: 10, search: 'widget', category: 'electronics' })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('page=2');
    expect(callUrl).toContain('limit=10');
    expect(callUrl).toContain('search=widget');
    expect(callUrl).toContain('category=electronics');
  });

  it('should handle error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const { result } = renderHook(() => useForecastList());

    await waitFor(() => {
      expect(result.current.error).toBe('Unauthorized');
    });
  });
});

describe('useForecastAccuracy', () => {
  it('should fetch accuracy summary, leaderboard, and trends', async () => {
    mockFetch
      // summary
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            averageAccuracy: 88,
            totalForecasts: 50,
            forecastsWithActuals: 30,
            bestModel: 'arima',
            worstModel: 'naive',
            models: [],
          },
        }),
      })
      // leaderboard
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            topPerformers: [{ productId: 'p1', partNumber: 'PN-001', name: 'Top', metrics: { mape: 5, mae: 3 } }],
            bottomPerformers: [],
          },
        }),
      })
      // trends
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            trends: [{ period: '2026-01', accuracy: 90 }],
          },
        }),
      });

    const { result } = renderHook(() => useForecastAccuracy());

    await waitFor(() => {
      expect(result.current.summary).toBeDefined();
    });

    expect(result.current.summary?.averageAccuracy).toBe(88);
    expect(result.current.leaderboard?.topPerformers).toHaveLength(1);
    expect(result.current.trends).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle error during accuracy fetch', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useForecastAccuracy());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });
});

describe('useGenerateForecast', () => {
  it('should generate a single forecast', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          forecast: { productId: 'prod-1', model: 'arima', predictions: [] },
        },
      }),
    });

    const { result } = renderHook(() => useGenerateForecast());

    let forecast: unknown;
    await act(async () => {
      forecast = await result.current.generateSingle('prod-1');
    });

    expect(forecast).toBeDefined();
    expect(result.current.isGenerating).toBe(false);
  });

  it('should generate batch forecasts', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          success: 5,
          failed: 1,
          results: [],
        },
      }),
    });

    const { result } = renderHook(() => useGenerateForecast());

    await act(async () => {
      await result.current.generateBatch(['p1', 'p2'], { periodType: 'weekly' });
    });

    expect(result.current.results?.success).toBe(5);
    expect(result.current.results?.failed).toBe(1);
  });

  it('should handle error in single generation', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Generation failed' }),
    });

    const { result } = renderHook(() => useGenerateForecast());

    await act(async () => {
      const forecast = await result.current.generateSingle('prod-bad');
      expect(forecast).toBeNull();
    });

    expect(result.current.error).toBe('Generation failed');
  });
});

describe('useForecastTraining', () => {
  it('should fetch model stats on mount', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { totalModels: 3 },
      }),
    });

    const { result } = renderHook(() => useForecastTraining());

    await waitFor(() => {
      expect(result.current.modelStats).toBeDefined();
    });

    expect(result.current.modelStats).toEqual({ totalModels: 3 });
  });

  it('should evaluate models for a product', async () => {
    // First call: model stats
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });

    const { result } = renderHook(() => useForecastTraining());

    // Evaluate call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { bestModel: 'arima', metrics: {} } }),
    });

    await act(async () => {
      const evaluation = await result.current.evaluateModels('prod-1');
      expect(evaluation).toBeDefined();
    });
  });
});

describe('useSyncActuals', () => {
  it('should sync actuals successfully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { synced: 10 } }),
    });

    const { result } = renderHook(() => useSyncActuals());

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastSync).toBeNull();

    await act(async () => {
      const syncResult = await result.current.syncActuals({ periodType: 'monthly' });
      expect(syncResult).toEqual({ synced: 10 });
    });

    expect(result.current.lastSync).toBeInstanceOf(Date);
    expect(result.current.isSyncing).toBe(false);
  });

  it('should handle sync error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Sync failed' }),
    });

    const { result } = renderHook(() => useSyncActuals());

    await act(async () => {
      const syncResult = await result.current.syncActuals();
      expect(syncResult).toBeNull();
    });

    expect(result.current.error).toBe('Sync failed');
  });
});
