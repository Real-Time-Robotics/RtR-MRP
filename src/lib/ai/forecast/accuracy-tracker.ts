// =============================================================================
// ACCURACY TRACKER SERVICE
// Track and measure forecast accuracy over time
// =============================================================================

import { prisma } from '@/lib/prisma';
import { formatPeriod, parsePeriod } from './vn-calendar';

// =============================================================================
// TYPES
// =============================================================================

export interface AccuracyMetrics {
  productId: string;
  productSku: string;
  productName: string;
  periodType: 'weekly' | 'monthly';
  periodsTracked: number;
  metrics: {
    mape: number; // Mean Absolute Percentage Error
    mae: number; // Mean Absolute Error
    rmse: number; // Root Mean Square Error
    bias: number; // Systematic over/under forecasting
    accuracy: number; // 100 - MAPE
  };
  trend: 'improving' | 'stable' | 'declining';
  bestModel: string;
  periodDetails: PeriodAccuracy[];
}

export interface PeriodAccuracy {
  period: string;
  forecast: number;
  actual: number;
  error: number;
  percentError: number;
  isOutlier: boolean;
}

export interface ModelPerformance {
  model: string;
  productCount: number;
  avgMape: number;
  avgAccuracy: number;
  bestFor: string[];
}

export interface ForecastComparison {
  period: string;
  forecast: number;
  actual: number;
  lowerBound: number;
  upperBound: number;
  withinBounds: boolean;
  error: number;
  percentError: number;
}

// =============================================================================
// ACCURACY TRACKER SERVICE
// =============================================================================

export class AccuracyTrackerService {
  // ===========================================================================
  // RECORD ACTUAL VALUES
  // ===========================================================================

  /**
   * Record actual demand for a period
   */
  async recordActual(
    productId: string,
    period: string,
    periodType: 'weekly' | 'monthly',
    actualQty: number
  ): Promise<{
    forecast: number | null;
    actual: number;
    accuracy: number | null;
  }> {
    // Find existing forecast
    const existingForecast = await prisma.demandForecast.findUnique({
      where: {
        productId_period_periodType: {
          productId,
          period,
          periodType,
        },
      },
    });

    if (existingForecast) {
      // Calculate accuracy
      const error = Math.abs(existingForecast.forecastQty - actualQty);
      const percentError =
        actualQty > 0 ? (error / actualQty) * 100 : existingForecast.forecastQty > 0 ? 100 : 0;
      const accuracy = Math.max(0, 100 - percentError);

      // Update forecast with actual
      await prisma.demandForecast.update({
        where: { id: existingForecast.id },
        data: {
          actualQty,
          accuracy,
          updatedAt: new Date(),
        },
      });

      return {
        forecast: existingForecast.forecastQty,
        actual: actualQty,
        accuracy,
      };
    }

    // No forecast exists, create record with actual only
    await prisma.demandForecast.create({
      data: {
        productId,
        period,
        periodType,
        forecastQty: 0,
        lowerBound: 0,
        upperBound: 0,
        confidence: 0,
        actualQty,
        accuracy: null,
        model: 'actual_only',
      },
    });

    return {
      forecast: null,
      actual: actualQty,
      accuracy: null,
    };
  }

  /**
   * Auto-record actuals from completed sales orders
   */
  async autoRecordActuals(
    periodType: 'weekly' | 'monthly' = 'monthly',
    periodsBack: number = 3
  ): Promise<{
    periodsProcessed: number;
    recordsUpdated: number;
  }> {
    let recordsUpdated = 0;

    // Calculate periods to process
    const periods: string[] = [];
    const today = new Date();

    for (let i = 1; i <= periodsBack; i++) {
      const periodDate = new Date(today);
      if (periodType === 'monthly') {
        periodDate.setMonth(periodDate.getMonth() - i);
      } else {
        periodDate.setDate(periodDate.getDate() - i * 7);
      }
      periods.push(formatPeriod(periodDate, periodType));
    }

    // Get all products with forecasts
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      select: { id: true },
    });

    for (const period of periods) {
      const dateRange = parsePeriod(period);
      if (!dateRange) continue;

      for (const product of products) {
        // Calculate actual demand from sales orders
        const salesLines = await prisma.salesOrderLine.aggregate({
          where: {
            productId: product.id,
            order: {
              orderDate: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
              status: { in: ['completed', 'shipped', 'delivered', 'confirmed'] },
            },
          },
          _sum: { quantity: true },
        });

        const actualQty = salesLines._sum.quantity || 0;

        // Only record if there was any demand
        if (actualQty > 0) {
          const result = await this.recordActual(product.id, period, periodType, actualQty);
          if (result.accuracy !== null) {
            recordsUpdated++;
          }
        }
      }
    }

    return {
      periodsProcessed: periods.length,
      recordsUpdated,
    };
  }

  // ===========================================================================
  // ACCURACY METRICS
  // ===========================================================================

  /**
   * Calculate accuracy metrics for a product
   */
  async getProductAccuracy(
    productId: string,
    periodType: 'weekly' | 'monthly' = 'monthly',
    periodsBack: number = 12
  ): Promise<AccuracyMetrics | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true },
    });

    if (!product) return null;

    // Get forecasts with actuals
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        productId,
        periodType,
        actualQty: { not: null },
      },
      orderBy: { period: 'desc' },
      take: periodsBack,
    });

    if (forecasts.length === 0) {
      return {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        periodType,
        periodsTracked: 0,
        metrics: {
          mape: 0,
          mae: 0,
          rmse: 0,
          bias: 0,
          accuracy: 100,
        },
        trend: 'stable',
        bestModel: 'unknown',
        periodDetails: [],
      };
    }

    // Calculate metrics
    const periodDetails: PeriodAccuracy[] = [];
    let sumAbsError = 0;
    let sumAbsPercentError = 0;
    let sumSquaredError = 0;
    let sumBias = 0;

    for (const f of forecasts) {
      const actual = f.actualQty!;
      const error = f.forecastQty - actual;
      const absError = Math.abs(error);
      const percentError = actual > 0 ? (absError / actual) * 100 : f.forecastQty > 0 ? 100 : 0;

      periodDetails.push({
        period: f.period,
        forecast: f.forecastQty,
        actual,
        error,
        percentError,
        isOutlier: percentError > 50,
      });

      sumAbsError += absError;
      sumAbsPercentError += percentError;
      sumSquaredError += error * error;
      sumBias += error;
    }

    const n = forecasts.length;
    const mape = sumAbsPercentError / n;
    const mae = sumAbsError / n;
    const rmse = Math.sqrt(sumSquaredError / n);
    const bias = sumBias / n;
    const accuracy = Math.max(0, 100 - mape);

    // Determine trend (compare recent vs older)
    const midpoint = Math.floor(n / 2);
    const recentErrors = periodDetails.slice(0, midpoint);
    const olderErrors = periodDetails.slice(midpoint);

    const recentAvgError =
      recentErrors.reduce((a, p) => a + p.percentError, 0) / Math.max(1, recentErrors.length);
    const olderAvgError =
      olderErrors.reduce((a, p) => a + p.percentError, 0) / Math.max(1, olderErrors.length);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvgError < olderAvgError * 0.85) trend = 'improving';
    else if (recentAvgError > olderAvgError * 1.15) trend = 'declining';

    // Find best model
    const modelCounts = new Map<string, { errors: number[]; count: number }>();
    for (const f of forecasts) {
      const model = f.model;
      const error = Math.abs((f.forecastQty - f.actualQty!) / (f.actualQty! || 1)) * 100;
      const existing = modelCounts.get(model) || { errors: [], count: 0 };
      existing.errors.push(error);
      existing.count++;
      modelCounts.set(model, existing);
    }

    let bestModel = 'ensemble';
    let bestMape = Infinity;
    for (const [model, data] of modelCounts) {
      const avgMape = data.errors.reduce((a, b) => a + b, 0) / data.errors.length;
      if (avgMape < bestMape) {
        bestMape = avgMape;
        bestModel = model;
      }
    }

    return {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      periodType,
      periodsTracked: n,
      metrics: {
        mape: Math.round(mape * 100) / 100,
        mae: Math.round(mae * 100) / 100,
        rmse: Math.round(rmse * 100) / 100,
        bias: Math.round(bias * 100) / 100,
        accuracy: Math.round(accuracy * 100) / 100,
      },
      trend,
      bestModel,
      periodDetails,
    };
  }

  /**
   * Get overall model performance across all products
   */
  async getModelPerformance(): Promise<ModelPerformance[]> {
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        actualQty: { not: null },
      },
      include: {
        product: { select: { name: true } },
      },
    });

    const modelStats = new Map<
      string,
      {
        errors: number[];
        products: Set<string>;
      }
    >();

    for (const f of forecasts) {
      const model = f.model;
      const actual = f.actualQty!;
      const percentError = actual > 0
        ? (Math.abs(f.forecastQty - actual) / actual) * 100
        : f.forecastQty > 0 ? 100 : 0;

      const existing = modelStats.get(model) || { errors: [], products: new Set() };
      existing.errors.push(percentError);
      existing.products.add(f.productId);
      modelStats.set(model, existing);
    }

    const results: ModelPerformance[] = [];

    for (const [model, stats] of modelStats) {
      const avgMape = stats.errors.reduce((a, b) => a + b, 0) / stats.errors.length;
      results.push({
        model,
        productCount: stats.products.size,
        avgMape: Math.round(avgMape * 100) / 100,
        avgAccuracy: Math.round((100 - avgMape) * 100) / 100,
        bestFor: [], // Would need more analysis
      });
    }

    return results.sort((a, b) => a.avgMape - b.avgMape);
  }

  // ===========================================================================
  // FORECAST VS ACTUAL COMPARISON
  // ===========================================================================

  /**
   * Compare forecasts vs actuals for a product
   */
  async compareForecastVsActual(
    productId: string,
    periodType: 'weekly' | 'monthly' = 'monthly',
    periodsBack: number = 12
  ): Promise<ForecastComparison[]> {
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        productId,
        periodType,
        actualQty: { not: null },
      },
      orderBy: { period: 'asc' },
      take: periodsBack,
    });

    return forecasts.map((f) => {
      const actual = f.actualQty!;
      const error = f.forecastQty - actual;
      const percentError = actual > 0
        ? (Math.abs(error) / actual) * 100
        : f.forecastQty > 0 ? 100 : 0;

      return {
        period: f.period,
        forecast: f.forecastQty,
        actual,
        lowerBound: f.lowerBound,
        upperBound: f.upperBound,
        withinBounds: actual >= f.lowerBound && actual <= f.upperBound,
        error,
        percentError: Math.round(percentError * 100) / 100,
      };
    });
  }

  // ===========================================================================
  // ACCURACY SUMMARY
  // ===========================================================================

  /**
   * Get accuracy summary across all products
   */
  async getAccuracySummary(): Promise<{
    totalProducts: number;
    trackedProducts: number;
    avgAccuracy: number;
    avgMape: number;
    accuracyDistribution: {
      excellent: number; // < 10% MAPE
      good: number; // 10-20% MAPE
      fair: number; // 20-30% MAPE
      poor: number; // > 30% MAPE
    };
    topPerformers: Array<{
      productId: string;
      productSku: string;
      accuracy: number;
    }>;
    needsImprovement: Array<{
      productId: string;
      productSku: string;
      accuracy: number;
    }>;
  }> {
    // Get all products
    const totalProducts = await prisma.product.count({
      where: { status: 'active' },
    });

    // Get products with tracked forecasts
    const trackedForecasts = await prisma.demandForecast.groupBy({
      by: ['productId'],
      where: {
        actualQty: { not: null },
      },
      _avg: {
        accuracy: true,
      },
    });

    const trackedProducts = trackedForecasts.length;

    // Calculate overall metrics
    let totalAccuracy = 0;
    let excellent = 0;
    let good = 0;
    let fair = 0;
    let poor = 0;

    const productAccuracies: Array<{
      productId: string;
      accuracy: number;
    }> = [];

    for (const f of trackedForecasts) {
      const accuracy = f._avg.accuracy || 0;
      totalAccuracy += accuracy;
      productAccuracies.push({ productId: f.productId, accuracy });

      const mape = 100 - accuracy;
      if (mape < 10) excellent++;
      else if (mape < 20) good++;
      else if (mape < 30) fair++;
      else poor++;
    }

    const avgAccuracy = trackedProducts > 0 ? totalAccuracy / trackedProducts : 0;
    const avgMape = 100 - avgAccuracy;

    // Sort by accuracy
    productAccuracies.sort((a, b) => b.accuracy - a.accuracy);

    // Get product details for top/bottom
    const topIds = productAccuracies.slice(0, 5).map((p) => p.productId);
    const bottomIds = productAccuracies.slice(-5).map((p) => p.productId);

    const topProducts = await prisma.product.findMany({
      where: { id: { in: topIds } },
      select: { id: true, sku: true },
    });

    const bottomProducts = await prisma.product.findMany({
      where: { id: { in: bottomIds } },
      select: { id: true, sku: true },
    });

    const topPerformers = productAccuracies.slice(0, 5).map((p) => {
      const product = topProducts.find((tp) => tp.id === p.productId);
      return {
        productId: p.productId,
        productSku: product?.sku || 'Unknown',
        accuracy: Math.round(p.accuracy * 100) / 100,
      };
    });

    const needsImprovement = productAccuracies
      .slice(-5)
      .reverse()
      .map((p) => {
        const product = bottomProducts.find((bp) => bp.id === p.productId);
        return {
          productId: p.productId,
          productSku: product?.sku || 'Unknown',
          accuracy: Math.round(p.accuracy * 100) / 100,
        };
      });

    return {
      totalProducts,
      trackedProducts,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      avgMape: Math.round(avgMape * 100) / 100,
      accuracyDistribution: {
        excellent,
        good,
        fair,
        poor,
      },
      topPerformers,
      needsImprovement,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let accuracyTrackerInstance: AccuracyTrackerService | null = null;

export function getAccuracyTrackerService(): AccuracyTrackerService {
  if (!accuracyTrackerInstance) {
    accuracyTrackerInstance = new AccuracyTrackerService();
  }
  return accuracyTrackerInstance;
}

export default AccuracyTrackerService;
