// =============================================================================
// AI FORECAST - PRODUCT SPECIFIC API ROUTE
// GET /api/ai/forecast/[productId] - Get forecast for a specific product
// PUT /api/ai/forecast/[productId] - Update/regenerate forecast
// DELETE /api/ai/forecast/[productId] - Delete forecast records
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getForecastEngine,
  getAIEnhancerService,
  getAccuracyTrackerService,
  getDataExtractorService,
  ForecastConfig,
} from '@/lib/ai/forecast';

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
  data?: any;
  error?: string;
  latency?: number;
}

// =============================================================================
// GET - Get Product Forecast
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ForecastResponse>> {
  const startTime = Date.now();

  try {
    const { productId } = await params;
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

    let result: any;

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
    console.error('[AI Forecast] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update/Regenerate Forecast
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ForecastResponse>> {
  const startTime = Date.now();

  try {
    const { productId } = await params;
    const body = await request.json();
    const {
      config = {},
      enhance = false,
      periodType = 'monthly',
    } = body;

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
    let finalForecast: any = forecast;
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
    console.error('[AI Forecast] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete Forecast Records
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ForecastResponse>> {
  const startTime = Date.now();

  try {
    const { productId } = await params;
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
    console.error('[AI Forecast] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
