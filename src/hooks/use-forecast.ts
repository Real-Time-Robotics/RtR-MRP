// =============================================================================
// FORECAST HOOKS
// React hooks for AI-powered demand forecasting
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { clientLogger } from '@/lib/client-logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ForecastPoint {
  period: string;
  quantity: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  factors?: {
    holiday?: number;
    seasonal?: number;
    trend?: number;
  };
}

export interface ForecastMetrics {
  mape: number;
  rmse: number;
  mae: number;
  bias: number;
}

export interface ForecastResult {
  productId: string;
  productName: string;
  productSku: string;
  model: string;
  predictions: ForecastPoint[];
  metrics: ForecastMetrics;
  trend: 'up' | 'down' | 'stable';
  seasonality: 'high' | 'medium' | 'low' | 'none';
  confidence: number;
  generatedAt: string;
  recommendations?: {
    safetyStock: number;
    reorderPoint: number;
    economicOrderQuantity: number;
  };
}

export interface EnhancedForecast extends ForecastResult {
  aiInsights?: {
    summary: string;
    keyDrivers: string[];
    risks: string[];
    opportunities: string[];
  };
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
    }>;
  };
  actionItems?: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    deadline: string;
    impact: string;
  }>;
}

export interface ProductSalesHistory {
  productId: string;
  productName: string;
  salesHistory: Array<{
    period: string;
    quantity: number;
    revenue: number;
  }>;
  totalQuantity: number;
  totalRevenue: number;
  trend: 'up' | 'down' | 'stable';
  volatility: number;
}

export interface AccuracySummary {
  averageAccuracy: number;
  totalForecasts: number;
  forecastsWithActuals: number;
  bestModel: string;
  worstModel: string;
  models: Array<{
    model: string;
    mape: number;
    count: number;
  }>;
}

export interface UseForecastOptions {
  productId?: string;
  periodType?: 'weekly' | 'monthly';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseForecastListOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'accuracy' | 'trend' | 'date';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// HOOK: useForecast - Get forecast for a single product
// =============================================================================

export function useForecast(options: UseForecastOptions = {}) {
  const { productId, periodType = 'monthly', autoRefresh = false, refreshInterval = 60000 } = options;

  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [salesHistory, setSalesHistory] = useState<ProductSalesHistory | null>(null);
  const [accuracy, setAccuracy] = useState<ForecastMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast for product
  const fetchForecast = useCallback(async (pid?: string) => {
    const targetId = pid || productId;
    if (!targetId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai/forecast/${targetId}?action=full&periodType=${periodType}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forecast');
      }

      setForecast(data.data.forecast);
      setSalesHistory(data.data.salesHistory);
      setAccuracy(data.data.accuracy?.metrics || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [productId, periodType]);

  // Generate new forecast
  const generateForecast = useCallback(async (enhance: boolean = false) => {
    if (!productId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/forecast/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhance, periodType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate forecast');
      }

      setForecast(data.data.forecast);
      return data.data.forecast;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [productId, periodType]);

  // Auto-refresh
  useEffect(() => {
    if (productId) {
      fetchForecast();
    }
  }, [productId, fetchForecast]);

  useEffect(() => {
    if (!autoRefresh || !productId) return;

    const interval = setInterval(fetchForecast, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, productId, fetchForecast]);

  // Chart data transformation
  const chartData = useMemo(() => {
    if (!forecast && !salesHistory) return [];

    const data: Array<{
      period: string;
      actual?: number;
      forecast?: number;
      lowerBound?: number;
      upperBound?: number;
    }> = [];

    // Add historical data
    if (salesHistory?.salesHistory) {
      for (const point of salesHistory.salesHistory) {
        data.push({
          period: point.period,
          actual: point.quantity,
        });
      }
    }

    // Add forecast data
    if (forecast?.predictions) {
      for (const point of forecast.predictions) {
        const existing = data.find(d => d.period === point.period);
        if (existing) {
          existing.forecast = point.quantity;
          existing.lowerBound = point.lowerBound;
          existing.upperBound = point.upperBound;
        } else {
          data.push({
            period: point.period,
            forecast: point.quantity,
            lowerBound: point.lowerBound,
            upperBound: point.upperBound,
          });
        }
      }
    }

    return data.sort((a, b) => a.period.localeCompare(b.period));
  }, [forecast, salesHistory]);

  return {
    forecast,
    salesHistory,
    accuracy,
    chartData,
    isLoading,
    error,
    fetchForecast,
    generateForecast,
    refetch: () => fetchForecast(productId),
  };
}

// =============================================================================
// HOOK: useForecastList - Get list of forecasts for multiple products
// =============================================================================

export function useForecastList(options: UseForecastListOptions = {}) {
  const { page = 1, limit = 20, search, category, sortBy = 'date', sortOrder = 'desc' } = options;

  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(category && { category }),
      });

      const response = await fetch(`/api/ai/forecast/batch?action=summary&${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forecasts');
      }

      setForecasts(data.data.forecasts || []);
      setTotal(data.data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, category, sortBy, sortOrder]);

  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  return {
    forecasts,
    total,
    totalPages: Math.ceil(total / limit),
    isLoading,
    error,
    refetch: fetchForecasts,
  };
}

// =============================================================================
// HOOK: useForecastAccuracy - Get accuracy metrics
// =============================================================================

export function useForecastAccuracy(options: { periodType?: 'weekly' | 'monthly' } = {}) {
  const { periodType = 'monthly' } = options;

  const [summary, setSummary] = useState<AccuracySummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    topPerformers: Array<{ productId: string; partNumber: string; name: string; sku?: string; metrics?: { mape: number; mae: number } }>;
    bottomPerformers: Array<{ productId: string; partNumber: string; name: string; sku?: string; metrics?: { mape: number; mae: number } }>;
  } | null>(null);
  const [trends, setTrends] = useState<Array<{ period: string; accuracy: number; averageAccuracy?: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccuracy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [summaryRes, leaderboardRes, trendsRes] = await Promise.all([
        fetch(`/api/ai/forecast/accuracy?action=summary&periodType=${periodType}`),
        fetch(`/api/ai/forecast/accuracy?action=leaderboard&periodType=${periodType}&limit=10`),
        fetch(`/api/ai/forecast/accuracy?action=trends&periodType=${periodType}`),
      ]);

      const [summaryData, leaderboardData, trendsData] = await Promise.all([
        summaryRes.json(),
        leaderboardRes.json(),
        trendsRes.json(),
      ]);

      if (summaryData.success) {
        setSummary(summaryData.data);
      }
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.data);
      }
      if (trendsData.success) {
        setTrends(trendsData.data.trends || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [periodType]);

  useEffect(() => {
    fetchAccuracy();
  }, [fetchAccuracy]);

  return {
    summary,
    leaderboard,
    trends,
    isLoading,
    error,
    refetch: fetchAccuracy,
  };
}

// =============================================================================
// HOOK: useGenerateForecast - Generate forecasts (single or batch)
// =============================================================================

export function useGenerateForecast() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    forecasts: ForecastResult[];
  } | null>(null);

  // Generate single forecast
  const generateSingle = useCallback(async (
    productId: string,
    options: { enhance?: boolean; periodType?: 'weekly' | 'monthly' } = {}
  ): Promise<ForecastResult | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          action: options.enhance ? 'enhance' : 'generate',
          periodType: options.periodType || 'monthly',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate forecast');
      }

      return data.data.forecast;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Generate batch forecasts
  const generateBatch = useCallback(async (
    productIds?: string[],
    options: { enhance?: boolean; periodType?: 'weekly' | 'monthly'; skipExisting?: boolean } = {}
  ) => {
    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: productIds?.length || 0 });

    try {
      const response = await fetch('/api/ai/forecast/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: options.enhance ? 'enhance' : 'generate',
          productIds,
          periodType: options.periodType || 'monthly',
          options: { skipExisting: options.skipExisting },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate batch forecasts');
      }

      setResults({
        success: data.data.success,
        failed: data.data.failed,
        forecasts: data.data.results || [],
      });

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Generate all forecasts
  const generateAll = useCallback(async (
    options: { periodType?: 'weekly' | 'monthly'; skipExisting?: boolean } = {}
  ) => {
    return generateBatch(undefined, options);
  }, [generateBatch]);

  return {
    isGenerating,
    progress,
    error,
    results,
    generateSingle,
    generateBatch,
    generateAll,
  };
}

// =============================================================================
// HOOK: useForecastTraining - Model training and optimization
// =============================================================================

export function useForecastTraining() {
  const [isTraining, setIsTraining] = useState(false);
  const [modelStats, setModelStats] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get model statistics
  const fetchModelStats = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/forecast/training?action=model-stats');
      const data = await response.json();

      if (data.success) {
        setModelStats(data.data);
      }
    } catch (err) {
      clientLogger.error('Failed to fetch model stats', err);
    }
  }, []);

  // Evaluate models for a product
  const evaluateModels = useCallback(async (productId: string) => {
    setIsTraining(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/forecast/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          productId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate models');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsTraining(false);
    }
  }, []);

  // Optimize parameters for a product
  const optimizeParameters = useCallback(async (productId: string) => {
    setIsTraining(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/forecast/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize',
          productId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to optimize parameters');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsTraining(false);
    }
  }, []);

  // Backtest models
  const backtestModels = useCallback(async (productIds?: string[]) => {
    setIsTraining(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/forecast/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'backtest',
          productIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to backtest models');
      }

      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsTraining(false);
    }
  }, []);

  useEffect(() => {
    fetchModelStats();
  }, [fetchModelStats]);

  return {
    isTraining,
    modelStats,
    error,
    evaluateModels,
    optimizeParameters,
    backtestModels,
    refetchStats: fetchModelStats,
  };
}

// =============================================================================
// HOOK: useSyncActuals - Sync actual values for accuracy tracking
// =============================================================================

export function useSyncActuals() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncActuals = useCallback(async (
    options: { periodType?: 'weekly' | 'monthly'; periodsBack?: number } = {}
  ) => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/forecast/accuracy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          periodType: options.periodType || 'monthly',
          periodsBack: options.periodsBack || 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync actuals');
      }

      setLastSync(new Date());
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    lastSync,
    error,
    syncActuals,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  useForecast,
  useForecastList,
  useForecastAccuracy,
  useGenerateForecast,
  useForecastTraining,
  useSyncActuals,
};
