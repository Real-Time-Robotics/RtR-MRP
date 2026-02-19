// =============================================================================
// AI FORECAST API ROUTE
// POST /api/ai/forecast - Generate demand forecast for a product
// GET /api/ai/forecast - Get forecast accuracy summary
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
  getForecastEngine,
  getAIEnhancerService,
  getAccuracyTrackerService,
  getDataExtractorService,
  ForecastConfig,
  ForecastResult,
  EnhancedForecast,
} from '@/lib/ai/forecast';
import { withAuth } from '@/lib/api/with-auth';
import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const forecastBodySchema = z.object({
  productId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  action: z.enum(['generate', 'enhance', 'bulk', 'history', 'accuracy', 'sync-actuals']).optional(),
  config: z.any().optional(),
  months: z.number().optional(),
  periodType: z.enum(['weekly', 'monthly']).optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface ForecastRequest {
  productId?: string;
  productIds?: string[];
  action?: 'generate' | 'enhance' | 'bulk' | 'history' | 'accuracy' | 'sync-actuals';
  config?: Partial<ForecastConfig>;
  months?: number;
  periodType?: 'weekly' | 'monthly';
}

interface ForecastResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  latency?: number;
}

// =============================================================================
// POST - Generate Forecast
// =============================================================================

export const POST = withAuth(async (request: NextRequest, context, session): Promise<Response> => {
  const startTime = Date.now();

  try {
    // Rate limiting (heavy endpoint)
    const rateLimit = await checkHeavyEndpointLimit(request);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } } as { status: number; headers: Record<string, string> }
      );
    }

    const rawBody = await request.json();
    const parseResult = forecastBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { productId, productIds, action = 'generate', config = {}, months = 24, periodType = 'monthly' } = parseResult.data;

    const forecastEngine = getForecastEngine();
    const aiEnhancer = getAIEnhancerService();
    const accuracyTracker = getAccuracyTrackerService();
    const dataExtractor = getDataExtractorService();

    let result: unknown;

    switch (action) {
      case 'generate': {
        // Generate forecast for single product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required for generate action' },
            { status: 400 }
          );
        }

        const forecast = await forecastEngine.generateForecast(productId, {
          ...config,
          periodType,
        });

        if (!forecast) {
          return NextResponse.json(
            { success: false, error: 'Insufficient data for forecasting. Need at least 6 periods of history.' },
            { status: 400 }
          );
        }

        // Save to database
        await forecastEngine.saveForecast(forecast);

        result = {
          forecast,
          message: `Forecast generated for ${forecast.productName}`,
        };
        break;
      }

      case 'enhance': {
        // Generate enhanced forecast with AI insights
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required for enhance action' },
            { status: 400 }
          );
        }

        const forecast = await forecastEngine.generateForecast(productId, {
          ...config,
          periodType,
        });

        if (!forecast) {
          return NextResponse.json(
            { success: false, error: 'Insufficient data for forecasting.' },
            { status: 400 }
          );
        }

        const enhanced = await aiEnhancer.enhanceForecast(forecast);

        // Save to database
        await forecastEngine.saveForecast(forecast);

        result = {
          forecast: enhanced,
          insights: enhanced.aiInsights,
          risks: enhanced.riskAssessment,
          actions: enhanced.actionItems,
          message: `Enhanced forecast generated for ${forecast.productName}`,
        };
        break;
      }

      case 'bulk': {
        // Generate forecasts for all products
        const bulkResult = await forecastEngine.generateAllForecasts({
          ...config,
          periodType,
        });

        result = {
          success: bulkResult.success,
          failed: bulkResult.failed,
          totalProducts: bulkResult.success + bulkResult.failed,
          message: `Generated forecasts for ${bulkResult.success} products, ${bulkResult.failed} failed`,
        };
        break;
      }

      case 'history': {
        // Get sales history for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required for history action' },
            { status: 400 }
          );
        }

        const history = await dataExtractor.extractProductSalesHistory(
          productId,
          months,
          periodType
        );

        if (!history) {
          return NextResponse.json(
            { success: false, error: 'Product not found or no sales history' },
            { status: 404 }
          );
        }

        result = {
          history,
          totalQuantity: history.totalQuantity,
          trend: history.trend,
          volatility: history.volatility,
        };
        break;
      }

      case 'accuracy': {
        // Get accuracy metrics for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required for accuracy action' },
            { status: 400 }
          );
        }

        const accuracy = await accuracyTracker.getProductAccuracy(
          productId,
          periodType
        );

        if (!accuracy) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }

        result = {
          accuracy,
          metrics: accuracy.metrics,
          trend: accuracy.trend,
          bestModel: accuracy.bestModel,
        };
        break;
      }

      case 'sync-actuals': {
        // Sync actual values from sales data
        const syncResult = await accuracyTracker.autoRecordActuals(
          periodType,
          months > 0 ? Math.min(months, 12) : 3
        );

        result = {
          ...syncResult,
          message: `Synced actuals for ${syncResult.periodsProcessed} periods, updated ${syncResult.recordsUpdated} records`,
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/forecast' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate forecast',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET - Accuracy Summary & Model Performance
// =============================================================================

export const GET = withAuth(async (request: NextRequest, context, session): Promise<Response> => {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const productId = searchParams.get('productId');
    const periodType = (searchParams.get('periodType') || 'monthly') as 'weekly' | 'monthly';

    const accuracyTracker = getAccuracyTrackerService();

    let result: unknown;

    switch (action) {
      case 'summary': {
        // Get overall accuracy summary
        const summary = await accuracyTracker.getAccuracySummary();
        result = summary;
        break;
      }

      case 'models': {
        // Get model performance comparison
        const models = await accuracyTracker.getModelPerformance();
        result = { models };
        break;
      }

      case 'compare': {
        // Compare forecast vs actual for a product
        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'productId is required for compare action' },
            { status: 400 }
          );
        }

        const comparison = await accuracyTracker.compareForecastVsActual(
          productId,
          periodType
        );

        result = {
          productId,
          comparison,
          periodsCompared: comparison.length,
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

        const accuracy = await accuracyTracker.getProductAccuracy(
          productId,
          periodType
        );

        if (!accuracy) {
          return NextResponse.json(
            { success: false, error: 'Product not found' },
            { status: 404 }
          );
        }

        result = accuracy;
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/forecast' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch forecast data',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});
