// =============================================================================
// AI FORECAST - PRODUCT SPECIFIC API ROUTE
// GET /api/ai/forecast/[productId] - Get forecast for a specific product
// PUT /api/ai/forecast/[productId] - Update/regenerate forecast
// DELETE /api/ai/forecast/[productId] - Delete forecast records
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  getForecastEngine,
  getAIEnhancerService,
  getAccuracyTrackerService,
  getDataExtractorService,
  ForecastConfig,
} from '@/lib/ai/forecast';

const forecastPutSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional().default({}),
  enhance: z.boolean().optional().default(false),
  periodType: z.enum(['weekly', 'monthly']).optional().default('monthly'),
});

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{
    productId: string;
  }>;
}

interface ForecastResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  latency?: number;
}

// =============================================================================
// GET - Get Product Forecast
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
const { productId } = await context.params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'latest';
    const periodType = (searchParams.get('periodType') || 'monthly') as 'weekly' | 'monthly';
    const months = parseInt(searchParams.get('months') || '12', 10);

    // Validate productId
    const product = await prisma.part.findUnique({
      where: { id: productId },
      select: {
        id: true,
        partNumber: true,
        name: true,
        unitCost: true,
        safetyStock: true,
        reorderPoint: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const forecastEngine = getForecastEngine();
    const accuracyTracker = getAccuracyTrackerService();
    const dataExtractor = getDataExtractorService();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any>;

    switch (action) {
      case 'latest': {
        // Get the latest forecast for this product
        const latestForecast = await prisma.demandForecast.findFirst({
          where: { productId: productId },
          orderBy: { createdAt: 'desc' },
        });

        if (!latestForecast) {
          // Generate a new forecast if none exists
          const forecast = await forecastEngine.generateForecast(productId, { periodType });
          if (forecast) {
            await forecastEngine.saveForecast(forecast);
            result = {
              product,
              forecast,
              isNew: true,
            };
          } else {
            return NextResponse.json(
              { success: false, error: 'Insufficient data for forecasting' },
              { status: 400 }
            );
          }
        } else {
          result = {
            product,
            forecast: latestForecast,
            isNew: false,
          };
        }
        break;
      }

      case 'history': {
        // Get forecast history for this product
        const forecasts = await prisma.demandForecast.findMany({
          where: { productId: productId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        result = {
          product,
          forecasts,
          count: forecasts.length,
        };
        break;
      }

      case 'sales': {
        // Get sales history
        const salesHistory = await dataExtractor.extractProductSalesHistory(
          productId,
          months,
          periodType
        );

        if (!salesHistory) {
          return NextResponse.json(
            { success: false, error: 'No sales history available' },
            { status: 404 }
          );
        }

        result = {
          product,
          salesHistory,
        };
        break;
      }

      case 'accuracy': {
        // Get accuracy metrics for this product
        const accuracy = await accuracyTracker.getProductAccuracy(productId, periodType);

        if (!accuracy) {
          return NextResponse.json(
            { success: false, error: 'No accuracy data available' },
            { status: 404 }
          );
        }

        const comparison = await accuracyTracker.compareForecastVsActual(productId, periodType);

        result = {
          product,
          accuracy,
          comparison,
        };
        break;
      }

      case 'full': {
        // Get comprehensive forecast data
        const forecast = await forecastEngine.generateForecast(productId, { periodType });
        const salesHistory = await dataExtractor.extractProductSalesHistory(
          productId,
          months,
          periodType
        );
        const accuracy = await accuracyTracker.getProductAccuracy(productId, periodType);

        result = {
          product,
          forecast,
          salesHistory,
          accuracy,
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/forecast/[productId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product forecast',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// PUT - Update/Regenerate Forecast
// =============================================================================

export const PUT = withAuth(async (request, context, session) => {
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
const { productId } = await context.params;
    const body = await request.json();
    const parsed = forecastPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const { config, enhance, periodType } = parsed.data;

    // Validate productId
    const product = await prisma.part.findUnique({
      where: { id: productId },
      select: { id: true, partNumber: true, name: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const forecastEngine = getForecastEngine();
    const aiEnhancer = getAIEnhancerService();

    // Generate new forecast
    const forecast = await forecastEngine.generateForecast(productId, {
      ...config,
      periodType,
    });

    if (!forecast) {
      return NextResponse.json(
        { success: false, error: 'Insufficient data for forecasting' },
        { status: 400 }
      );
    }

    // Enhance with AI if requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalForecast: Record<string, any> = forecast as Record<string, any>;
    if (enhance) {
      finalForecast = await aiEnhancer.enhanceForecast(forecast);
    }

    // Save to database
    await forecastEngine.saveForecast(forecast);

    return NextResponse.json({
      success: true,
      data: {
        product,
        forecast: finalForecast,
        enhanced: enhance,
        message: `Forecast ${enhance ? 'enhanced and ' : ''}regenerated for ${product.name}`,
      },
      latency: Date.now() - startTime,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'PUT /api/ai/forecast/[productId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update forecast',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// DELETE - Delete Forecast Records
// =============================================================================

export const DELETE = withAuth(async (request, context, session) => {
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
const { productId } = await context.params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'old';
    const keepDays = parseInt(searchParams.get('keepDays') || '30', 10);

    // Validate productId
    const product = await prisma.part.findUnique({
      where: { id: productId },
      select: { id: true, partNumber: true, name: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    let deletedCount = 0;

    switch (scope) {
      case 'all': {
        // Delete all forecasts for this product
        const result = await prisma.demandForecast.deleteMany({
          where: { productId: productId },
        });
        deletedCount = result.count;
        break;
      }

      case 'old': {
        // Delete forecasts older than keepDays
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - keepDays);

        const result = await prisma.demandForecast.deleteMany({
          where: {
            productId: productId,
            createdAt: { lt: cutoffDate },
          },
        });
        deletedCount = result.count;
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown scope: ${scope}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        product,
        deletedCount,
        scope,
        message: `Deleted ${deletedCount} forecast records for ${product.name}`,
      },
      latency: Date.now() - startTime,
    });

  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/ai/forecast/[productId]' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete forecast records',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});
