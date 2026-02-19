// =============================================================================
// AI FORECAST - ACCURACY TRACKING API ROUTE
// GET /api/ai/forecast/accuracy - Get accuracy metrics and reports
// POST /api/ai/forecast/accuracy - Record actual values
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  getAccuracyTrackerService,
  AccuracyMetrics,
} from '@/lib/ai/forecast';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// TYPES
// =============================================================================

interface AccuracyRequest {
  action: 'record' | 'sync' | 'compare' | 'recalculate';
  productId?: string;
  period?: string;
  actualQuantity?: number;
  periodType?: 'weekly' | 'monthly';
  periodsBack?: number;
}

interface AccuracyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  latency?: number;
}

// =============================================================================
// GET - Get Accuracy Metrics
// =============================================================================

export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  const startTime = Date.now();

  try {
const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const productId = searchParams.get('productId');
    const periodType = (searchParams.get('periodType') || 'monthly') as 'weekly' | 'monthly';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const accuracyTracker = getAccuracyTrackerService();

    let result: unknown;

    switch (action) {
      case 'summary': {
        // Get overall accuracy summary
        const summary = await accuracyTracker.getAccuracySummary();

        // Get additional stats
        const [totalForecasts, forecastsWithActuals] = await Promise.all([
          prisma.demandForecast.count(),
          prisma.demandForecast.count({
            where: {
              actualQty: { not: null },
            },
          }),
        ]);

        result = {
          ...summary,
          stats: {
            totalForecasts,
            forecastsWithActuals,
            coverageRate: totalForecasts > 0
              ? ((forecastsWithActuals / totalForecasts) * 100).toFixed(1) + '%'
              : '0%',
          },
        };
        break;
      }

      case 'models': {
        // Get model performance comparison
        const models = await accuracyTracker.getModelPerformance();

        result = {
          models,
          bestModel: models.reduce((best, current) => {
            const bestMAPE = best.avgMape ?? Infinity;
            const currentMAPE = current.avgMape ?? Infinity;
            return currentMAPE < bestMAPE ? current : best;
          }, models[0]),
        };
        break;
      }

      case 'product': {
        // Get accuracy for specific product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        const accuracy = await accuracyTracker.getProductAccuracy(productId, periodType);

        if (!accuracy) {
          return NextResponse.json(
            { success: false, error: 'Product not found or no accuracy data' },
            { status: 404 }
          );
        }

        // Get forecast vs actual comparison
        const comparison = await accuracyTracker.compareForecastVsActual(productId, periodType);

        result = {
          accuracy,
          comparison,
          periodsCompared: comparison.length,
        };
        break;
      }

      case 'leaderboard': {
        // Get accuracy leaderboard (best and worst performers)
        const products = await prisma.part.findMany({
          where: { partType: 'FINISHED_GOOD' },
          select: { id: true, partNumber: true, name: true },
          take: 200,
        });

        const productAccuracies: {
          productId: string;
          partNumber: string;
          name: string;
          metrics?: {
            mape: number;
            mae: number;
            rmse: number;
            bias: number;
            accuracy: number;
          };
        }[] = [];

        for (const product of products) {
          const accuracy = await accuracyTracker.getProductAccuracy(product.id, periodType);
          if (accuracy && accuracy.metrics) {
            productAccuracies.push({
              productId: product.id,
              partNumber: product.partNumber,
              name: product.name,
              metrics: accuracy.metrics,
            });
          }
        }

        // Sort by MAPE (lower is better)
        productAccuracies.sort((a, b) =>
          (a.metrics?.mape ?? 100) - (b.metrics?.mape ?? 100)
        );

        result = {
          topPerformers: productAccuracies.slice(0, limit),
          bottomPerformers: productAccuracies.slice(-limit).reverse(),
          totalAnalyzed: productAccuracies.length,
          averageMAPE: productAccuracies.length > 0
            ? productAccuracies.reduce((sum, p) => sum + (p.metrics?.mape ?? 0), 0) / productAccuracies.length
            : null,
        };
        break;
      }

      case 'trends': {
        // Get accuracy trends over time
        const forecasts = await prisma.demandForecast.findMany({
          where: {
            actualQty: { not: null },
            ...(productId ? { productId: productId } : {}),
          },
          select: {
            id: true,
            productId: true,
            period: true,
            forecastQty: true,
            actualQty: true,
            accuracy: true,
            model: true,
            createdAt: true,
          },
          orderBy: { period: 'asc' },
          take: limit * 10,
        });

        // Group by period and calculate average accuracy
        const periodGroups = new Map<string, { total: number; count: number }>();

        for (const forecast of forecasts) {
          const period = forecast.period;
          const accuracy = forecast.accuracy ?? 0;

          const existing = periodGroups.get(period) || { total: 0, count: 0 };
          existing.total += accuracy;
          existing.count += 1;
          periodGroups.set(period, existing);
        }

        const trends = Array.from(periodGroups.entries())
          .map(([period, data]) => ({
            period,
            averageAccuracy: data.total / data.count,
            sampleSize: data.count,
          }))
          .slice(-limit);

        result = {
          trends,
          periodsAnalyzed: trends.length,
          overallTrend: trends.length >= 2
            ? trends[trends.length - 1].averageAccuracy > trends[0].averageAccuracy
              ? 'improving'
              : 'declining'
            : 'insufficient_data',
        };
        break;
      }

      case 'history': {
        // Get accuracy history for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required for history' },
            { status: 400 }
          );
        }

        const forecasts = await prisma.demandForecast.findMany({
          where: {
            productId: productId,
            actualQty: { not: null },
          },
          select: {
            id: true,
            period: true,
            forecastQty: true,
            actualQty: true,
            accuracy: true,
            model: true,
            createdAt: true,
          },
          orderBy: { period: 'desc' },
          take: limit,
        });

        result = {
          history: forecasts.map(f => ({
            period: f.period,
            forecasted: f.forecastQty,
            actual: f.actualQty,
            accuracy: f.accuracy,
            error: f.forecastQty && f.actualQty
              ? Math.abs(f.forecastQty - f.actualQty)
              : null,
            percentError: f.forecastQty && f.actualQty
              ? ((Math.abs(f.forecastQty - f.actualQty) / f.actualQty) * 100).toFixed(1) + '%'
              : null,
            model: f.model,
          })),
          count: forecasts.length,
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      latency: Date.now() - startTime,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/forecast/accuracy' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch accuracy data',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Record Actual Values & Recalculate Accuracy
// =============================================================================

export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkHeavyEndpointLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          },
        }
      );
    }

  const startTime = Date.now();

  try {
const bodySchema = z.object({
      action: z.enum(['record', 'sync', 'compare', 'recalculate']),
      productId: z.string().optional(),
      period: z.string().optional(),
      actualQuantity: z.number().optional(),
      periodType: z.enum(['weekly', 'monthly']).optional(),
      periodsBack: z.number().optional(),
    });
    const rawBody = await request.json();
    const parseResult = bodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parseResult.data;
    const {
      action,
      productId,
      period,
      actualQuantity,
      periodType = 'monthly',
      periodsBack = 3,
    } = body;

    const accuracyTracker = getAccuracyTrackerService();

    let result: unknown;

    switch (action) {
      case 'record': {
        // Record actual value for a specific forecast
        if (!productId || !period || actualQuantity === undefined) {
          return NextResponse.json(
            {
              success: false,
              error: 'productId, period, and actualQuantity are required'
            },
            { status: 400 }
          );
        }

        // Find the forecast for this period
        const forecast = await prisma.demandForecast.findFirst({
          where: {
            productId: productId,
            period: period,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!forecast) {
          return NextResponse.json(
            { success: false, error: 'Forecast not found for this period' },
            { status: 404 }
          );
        }

        // Calculate accuracy
        const error = Math.abs(forecast.forecastQty - actualQuantity);
        const mape = actualQuantity > 0 ? (error / actualQuantity) * 100 : 100;
        const accuracy = Math.max(0, 100 - mape);

        // Update forecast with actual value
        await prisma.demandForecast.update({
          where: { id: forecast.id },
          data: {
            actualQty: actualQuantity,
            accuracy,
          },
        });

        result = {
          forecastId: forecast.id,
          period,
          forecasted: forecast.forecastQty,
          actual: actualQuantity,
          error,
          mape: mape.toFixed(2) + '%',
          accuracy: accuracy.toFixed(2) + '%',
          message: 'Actual value recorded and accuracy calculated',
        };
        break;
      }

      case 'sync': {
        // Sync actual values from sales data
        const syncResult = await accuracyTracker.autoRecordActuals(
          periodType,
          Math.min(periodsBack, 12)
        );

        result = {
          ...syncResult,
          message: `Synced ${syncResult.periodsProcessed} periods, updated ${syncResult.recordsUpdated} records`,
        };
        break;
      }

      case 'compare': {
        // Compare forecast vs actual for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        const comparison = await accuracyTracker.compareForecastVsActual(productId, periodType);

        result = {
          productId,
          comparison,
          periodsCompared: comparison.length,
          summary: comparison.length > 0 ? {
            avgError: comparison.reduce((sum, c) => sum + Math.abs(c.error || 0), 0) / comparison.length,
            avgAccuracy: comparison.reduce((sum, c) => sum + (100 - (c.percentError || 0)), 0) / comparison.length,
          } : null,
        };
        break;
      }

      case 'recalculate': {
        // Recalculate accuracy for all forecasts with actual values
        const forecasts = await prisma.demandForecast.findMany({
          where: {
            actualQty: { not: null },
            ...(productId ? { productId: productId } : {}),
          },
          select: {
            id: true,
            forecastQty: true,
            actualQty: true,
          },
        });

        let updated = 0;

        for (const forecast of forecasts) {
          if (forecast.actualQty !== null) {
            const error = Math.abs(forecast.forecastQty - forecast.actualQty);
            const mape = forecast.actualQty > 0
              ? (error / forecast.actualQty) * 100
              : 100;
            const accuracy = Math.max(0, 100 - mape);

            await prisma.demandForecast.update({
              where: { id: forecast.id },
              data: { accuracy },
            });
            updated++;
          }
        }

        result = {
          recalculated: updated,
          message: `Recalculated accuracy for ${updated} forecasts`,
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      latency: Date.now() - startTime,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/forecast/accuracy' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process accuracy data',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});
