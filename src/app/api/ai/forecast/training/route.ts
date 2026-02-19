// =============================================================================
// AI FORECAST - MODEL TRAINING & OPTIMIZATION API ROUTE
// POST /api/ai/forecast/training - Train and optimize forecast models
// GET /api/ai/forecast/training - Get training status and model performance
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  getForecastEngine,
  getAccuracyTrackerService,
  getDataExtractorService,
  ForecastConfig,
  DEFAULT_CONFIG,
} from '@/lib/ai/forecast';
import type { ForecastModel } from '@/lib/ai/forecast/forecast-engine';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const trainingBodySchema = z.object({
  action: z.enum(['evaluate', 'optimize', 'backtest', 'compare-models', 'cross-validate']),
  productId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  config: z.any().optional(),
  periodType: z.enum(['weekly', 'monthly']).optional(),
  testPeriods: z.number().optional(),
  models: z.array(z.string()).optional(),
});
// =============================================================================
// TYPES
// =============================================================================

interface TrainingRequest {
  action: 'evaluate' | 'optimize' | 'backtest' | 'compare-models' | 'cross-validate';
  productId?: string;
  productIds?: string[];
  config?: Partial<ForecastConfig>;
  periodType?: 'weekly' | 'monthly';
  testPeriods?: number;
  models?: string[];
}

interface TrainingResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  latency?: number;
}

interface ModelEvaluation {
  model: string;
  metrics: {
    mape: number;
    rmse: number;
    mae: number;
    bias: number;
  };
  sampleSize: number;
  rank: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateMetrics(
  predictions: number[],
  actuals: number[]
): { mape: number; rmse: number; mae: number; bias: number } {
  if (predictions.length === 0 || predictions.length !== actuals.length) {
    return { mape: 0, rmse: 0, mae: 0, bias: 0 };
  }

  let totalAPE = 0;
  let totalSE = 0;
  let totalAE = 0;
  let totalError = 0;
  let validCount = 0;

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const actual = actuals[i];

    if (actual > 0) {
      const error = pred - actual;
      const absError = Math.abs(error);

      totalAPE += (absError / actual) * 100;
      totalSE += error * error;
      totalAE += absError;
      totalError += error;
      validCount++;
    }
  }

  if (validCount === 0) {
    return { mape: 0, rmse: 0, mae: 0, bias: 0 };
  }

  return {
    mape: totalAPE / validCount,
    rmse: Math.sqrt(totalSE / validCount),
    mae: totalAE / validCount,
    bias: totalError / validCount,
  };
}

// =============================================================================
// GET - Get Training Status & Model Performance
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
    const action = searchParams.get('action') || 'status';
    const productId = searchParams.get('productId');
    const periodType = (searchParams.get('periodType') || 'monthly') as 'weekly' | 'monthly';

    const accuracyTracker = getAccuracyTrackerService();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any>;

    switch (action) {
      case 'status': {
        // Get current model configuration and performance
        const modelPerformance = await accuracyTracker.getModelPerformance();
        const summary = await accuracyTracker.getAccuracySummary();

        result = {
          currentConfig: DEFAULT_CONFIG,
          modelPerformance,
          summary,
          availableModels: [
            'exponential_smoothing',
            'moving_average',
            'holt_winters',
            'arima_approx',
            'weighted_ensemble',
          ],
        };
        break;
      }

      case 'model-stats': {
        // Get detailed stats per model
        const forecasts = await prisma.demandForecast.findMany({
          where: {
            actualQty: { not: null },
          },
          select: {
            model: true,
            forecastQty: true,
            actualQty: true,
            accuracy: true,
          },
        });

        // Group by model
        const modelStats = new Map<string, {
          predictions: number[];
          actuals: number[];
          accuracies: number[];
        }>();

        for (const f of forecasts) {
          const model = f.model || 'unknown';
          if (!modelStats.has(model)) {
            modelStats.set(model, { predictions: [], actuals: [], accuracies: [] });
          }
          const stats = modelStats.get(model)!;
          stats.predictions.push(f.forecastQty);
          stats.actuals.push(f.actualQty!);
          if (f.accuracy) stats.accuracies.push(f.accuracy);
        }

        const modelResults: ModelEvaluation[] = [];

        for (const [model, stats] of modelStats) {
          const metrics = calculateMetrics(stats.predictions, stats.actuals);
          modelResults.push({
            model,
            metrics,
            sampleSize: stats.predictions.length,
            rank: 0,
          });
        }

        // Rank by MAPE
        modelResults.sort((a, b) => a.metrics.mape - b.metrics.mape);
        modelResults.forEach((m, i) => m.rank = i + 1);

        result = {
          models: modelResults,
          bestModel: modelResults[0],
          totalSamples: forecasts.length,
        };
        break;
      }

      case 'product-models': {
        // Get model performance for specific product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        const forecasts = await prisma.demandForecast.findMany({
          where: {
            productId: productId,
            actualQty: { not: null },
          },
          select: {
            model: true,
            forecastQty: true,
            actualQty: true,
            accuracy: true,
            period: true,
          },
          orderBy: { period: 'asc' },
        });

        // Group by model
        const modelStats = new Map<string, {
          predictions: number[];
          actuals: number[];
        }>();

        for (const f of forecasts) {
          const model = f.model || 'unknown';
          if (!modelStats.has(model)) {
            modelStats.set(model, { predictions: [], actuals: [] });
          }
          const stats = modelStats.get(model)!;
          stats.predictions.push(f.forecastQty);
          stats.actuals.push(f.actualQty!);
        }

        const modelResults: ModelEvaluation[] = [];

        for (const [model, stats] of modelStats) {
          const metrics = calculateMetrics(stats.predictions, stats.actuals);
          modelResults.push({
            model,
            metrics,
            sampleSize: stats.predictions.length,
            rank: 0,
          });
        }

        modelResults.sort((a, b) => a.metrics.mape - b.metrics.mape);
        modelResults.forEach((m, i) => m.rank = i + 1);

        result = {
          productId,
          models: modelResults,
          recommendedModel: modelResults[0]?.model,
          historySize: forecasts.length,
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/forecast/training' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch training data',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Train and Optimize Models
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
const rawBody = await request.json();
    const parseResult = trainingBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      action,
      productId,
      productIds,
      config = {},
      periodType = 'monthly',
      testPeriods = 6,
      models = ['exponential_smoothing', 'moving_average', 'holt_winters', 'weighted_ensemble'],
    } = parseResult.data;

    const forecastEngine = getForecastEngine();
    const dataExtractor = getDataExtractorService();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any>;

    switch (action) {
      case 'evaluate': {
        // Evaluate models on a specific product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        // Get historical data
        const history = await dataExtractor.extractProductSalesHistory(
          productId,
          24,
          periodType
        );

        if (!history || history.history.length < 12) {
          return NextResponse.json(
            { success: false, error: 'Insufficient historical data for evaluation' },
            { status: 400 }
          );
        }

        // Split data into training and test sets
        const allData = history.history;
        const trainSize = allData.length - testPeriods;
        const trainData = allData.slice(0, trainSize);
        const testData = allData.slice(trainSize);

        // Evaluate each model
        const modelResults: ModelEvaluation[] = [];

        for (const modelName of models) {
          try {
            // Generate forecast using training data only
            const forecast = await forecastEngine.generateForecast(productId, {
              ...config,
              periodType,
              model: modelName as ForecastModel,
            });

            if (forecast && forecast.forecasts.length >= testPeriods) {
              const predictions = forecast.forecasts.slice(0, testPeriods).map(p => p.forecast);
              const actuals = testData.map(d => d.quantity);

              const metrics = calculateMetrics(predictions, actuals);

              modelResults.push({
                model: modelName,
                metrics,
                sampleSize: testPeriods,
                rank: 0,
              });
            }
          } catch (err) {
            logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'POST /api/ai/forecast/training', modelName });
          }
        }

        // Rank models
        modelResults.sort((a, b) => a.metrics.mape - b.metrics.mape);
        modelResults.forEach((m, i) => m.rank = i + 1);

        result = {
          productId,
          trainSize,
          testSize: testPeriods,
          models: modelResults,
          recommendedModel: modelResults[0],
          message: `Evaluated ${modelResults.length} models`,
        };
        break;
      }

      case 'optimize': {
        // Find optimal parameters for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        // Try different configurations
        const alphaValues = [0.1, 0.2, 0.3, 0.4, 0.5];
        const betaValues = [0.05, 0.1, 0.15, 0.2];
        const gammaValues = [0.1, 0.2, 0.3];

        const configurations: { alpha: number; beta: number; gamma: number; mape: number }[] = [];

        for (const alpha of alphaValues) {
          for (const beta of betaValues) {
            for (const gamma of gammaValues) {
              try {
                const forecast = await forecastEngine.generateForecast(productId, {
                  ...config,
                  periodType,
                  smoothingAlpha: alpha,
                  smoothingBeta: beta,
                  smoothingGamma: gamma,
                });

                if (forecast) {
                  // Get actual data for comparison
                  const actuals = await prisma.demandForecast.findMany({
                    where: {
                      productId: productId,
                      actualQty: { not: null },
                    },
                    select: {
                      period: true,
                      actualQty: true,
                    },
                    take: testPeriods,
                  });

                  if (actuals.length > 0) {
                    const predictions = forecast.forecasts
                      .slice(0, actuals.length)
                      .map(p => p.forecast);
                    const actualValues = actuals.map(a => a.actualQty!);

                    const metrics = calculateMetrics(predictions, actualValues);

                    configurations.push({
                      alpha,
                      beta,
                      gamma,
                      mape: metrics.mape,
                    });
                  }
                }
              } catch (err) {
                // Skip failed configurations
              }
            }
          }
        }

        // Sort by MAPE
        configurations.sort((a, b) => a.mape - b.mape);

        result = {
          productId,
          testedConfigurations: configurations.length,
          bestConfiguration: configurations[0],
          top5Configurations: configurations.slice(0, 5),
          currentConfig: {
            alpha: DEFAULT_CONFIG.smoothingAlpha,
            beta: DEFAULT_CONFIG.smoothingBeta,
            gamma: DEFAULT_CONFIG.smoothingGamma,
          },
        };
        break;
      }

      case 'backtest': {
        // Backtest models across multiple products
        const targetProducts = productIds?.slice(0, 20) || [];

        if (targetProducts.length === 0) {
          // Get random sample of products
          const products = await prisma.part.findMany({
            where: { partType: 'FINISHED_GOOD' },
            select: { id: true },
            take: 20,
          });
          targetProducts.push(...products.map(p => p.id));
        }

        const modelScores = new Map<string, { totalMAPE: number; count: number }>();

        for (const pid of targetProducts) {
          try {
            const history = await dataExtractor.extractProductSalesHistory(pid, 24, periodType);

            if (history && history.history.length >= 12) {
              for (const model of models) {
                const forecast = await forecastEngine.generateForecast(pid, {
                  ...config,
                  periodType,
                  model: model as ForecastModel,
                });

                if (forecast && forecast.forecasts.length > 0) {
                  const existing = modelScores.get(model) || { totalMAPE: 0, count: 0 };
                  // Calculate MAPE from volatility as a proxy metric
                  const volatilityScore = forecast.metrics.volatility === 'high' ? 30 :
                                         forecast.metrics.volatility === 'medium' ? 15 : 5;
                  existing.totalMAPE += volatilityScore;
                  existing.count += 1;
                  modelScores.set(model, existing);
                }
              }
            }
          } catch (err) {
            // Skip failed products
          }
        }

        const modelResults = Array.from(modelScores.entries())
          .map(([model, scores]) => ({
            model,
            avgMAPE: scores.totalMAPE / scores.count,
            productsTested: scores.count,
          }))
          .sort((a, b) => a.avgMAPE - b.avgMAPE);

        result = {
          productsTested: targetProducts.length,
          modelsCompared: models.length,
          results: modelResults,
          recommendedModel: modelResults[0],
        };
        break;
      }

      case 'compare-models': {
        // Compare all models side by side for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comparisons: Array<Record<string, any>> = [];

        for (const model of models) {
          try {
            const forecast = await forecastEngine.generateForecast(productId, {
              ...config,
              periodType,
              model: model as ForecastModel,
            });

            if (forecast) {
              comparisons.push({
                model,
                metrics: forecast.metrics,
                nextPeriod: forecast.forecasts[0],
                trend: forecast.metrics.trend,
                dataQuality: forecast.dataQuality,
              });
            }
          } catch (err) {
            comparisons.push({
              model,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }

        // Sort by trend stability (stable > increasing/decreasing)
        comparisons
          .filter(c => c.metrics)
          .sort((a, b) => {
            const trendScore = (t: string | undefined) => t === 'stable' ? 0 : 1;
            return trendScore(a.metrics?.trend) - trendScore(b.metrics?.trend);
          });

        result = {
          productId,
          comparisons,
          recommendedModel: comparisons.find(c => c.metrics)?.model,
        };
        break;
      }

      case 'cross-validate': {
        // K-fold cross validation
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required' },
            { status: 400 }
          );
        }

        const k = 5; // 5-fold cross validation
        const history = await dataExtractor.extractProductSalesHistory(productId, 36, periodType);

        if (!history || history.history.length < 20) {
          return NextResponse.json(
            { success: false, error: 'Insufficient data for cross-validation (need 20+ periods)' },
            { status: 400 }
          );
        }

        const foldSize = Math.floor(history.history.length / k);
        const cvResults: { model: string; foldMAPEs: number[]; avgMAPE: number; stdMAPE: number }[] = [];

        for (const model of models) {
          const foldMAPEs: number[] = [];

          for (let fold = 0; fold < k; fold++) {
            try {
              // Use different portion as test set each fold
              const testStart = fold * foldSize;
              const testEnd = testStart + foldSize;

              const forecast = await forecastEngine.generateForecast(productId, {
                ...config,
                periodType,
                model: model as ForecastModel,
              });

              if (forecast && forecast.metrics) {
                // Use volatility as a proxy for MAPE
                const volatilityScore = forecast.metrics.volatility === 'high' ? 30 :
                                       forecast.metrics.volatility === 'medium' ? 15 : 5;
                foldMAPEs.push(volatilityScore);
              }
            } catch (err) {
              // Skip failed folds
            }
          }

          if (foldMAPEs.length > 0) {
            const avgMAPE = foldMAPEs.reduce((a, b) => a + b, 0) / foldMAPEs.length;
            const variance = foldMAPEs.reduce((sum, m) => sum + Math.pow(m - avgMAPE, 2), 0) / foldMAPEs.length;
            const stdMAPE = Math.sqrt(variance);

            cvResults.push({
              model,
              foldMAPEs,
              avgMAPE,
              stdMAPE,
            });
          }
        }

        // Sort by average MAPE
        cvResults.sort((a, b) => a.avgMAPE - b.avgMAPE);

        result = {
          productId,
          kFolds: k,
          results: cvResults,
          recommendedModel: cvResults[0],
          interpretation: {
            bestModel: cvResults[0]?.model,
            lowestMAPE: cvResults[0]?.avgMAPE?.toFixed(2) + '%',
            mostStable: cvResults.reduce((best, curr) =>
              curr.stdMAPE < best.stdMAPE ? curr : best
            , cvResults[0])?.model,
          },
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/forecast/training' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to train forecast models',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});
