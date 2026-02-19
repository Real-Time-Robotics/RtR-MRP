// =============================================================================
// AI FORECAST - MRP INTEGRATION API ROUTE
// GET /api/ai/forecast/mrp-integration - Get safety stock & ROP recommendations
// POST /api/ai/forecast/mrp-integration - Bulk recommendations or apply
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  getSafetyStockOptimizer,
  getHolidayBuffer,
  SafetyStockResult,
} from '@/lib/ai/forecast';
import { getTetPhase, getUpcomingHolidays } from '@/lib/ai/forecast';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// =============================================================================
// TYPES
// =============================================================================

interface MRPIntegrationRequest {
  action: 'recommendations' | 'apply' | 'summary' | 'bulk-optimize';
  partId?: string;
  partIds?: string[];
  options?: {
    serviceLevel?: number;
    includeHolidayBuffer?: boolean;
    updateSafetyStock?: boolean;
    updateReorderPoint?: boolean;
    maxParts?: number;
  };
}

interface IntegrationResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  latency?: number;
}

// =============================================================================
// GET - Get Recommendations & Status
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
    const partId = searchParams.get('partId');
    const serviceLevel = parseFloat(searchParams.get('serviceLevel') || '0.95');

    const optimizer = getSafetyStockOptimizer({ serviceLevel });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any>;

    switch (action) {
      case 'recommendation': {
        // Get recommendation for single part
        if (!partId) {
          return NextResponse.json(
            { success: false, error: 'partId is required' },
            { status: 400 }
          );
        }

        const recommendation = await optimizer.calculateOptimalSafetyStock(partId, {
          serviceLevel,
        });

        if (!recommendation) {
          return NextResponse.json(
            { success: false, error: 'Part not found or insufficient data' },
            { status: 404 }
          );
        }

        result = recommendation;
        break;
      }

      case 'summary': {
        // Get overall optimization summary
        const summary = await optimizer.getOptimizationSummary();
        const holidayBuffer = getHolidayBuffer(new Date());
        const tetPhase = getTetPhase(new Date());
        const upcomingHolidays = getUpcomingHolidays(1); // 1 month ahead

        result = {
          ...summary,
          holidayStatus: {
            buffer: holidayBuffer,
            bufferPercent: `${(holidayBuffer * 100).toFixed(0)}%`,
            tetPhase,
            upcomingHolidays: upcomingHolidays.map(h => {
              const daysUntil = Math.ceil((h.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return {
                name: h.nameVi,
                date: h.date.toISOString().split('T')[0],
                daysUntil,
              };
            }),
          },
          recommendations: {
            adjustSafetyStock: holidayBuffer > 0,
            reason: holidayBuffer > 0
              ? `Holiday period detected - recommend increasing safety stock by ${(holidayBuffer * 100).toFixed(0)}%`
              : 'Normal operations - standard safety stock levels recommended',
          },
        };
        break;
      }

      case 'parts-needing-adjustment': {
        // Get parts where current vs recommended has significant delta
        const optimizer = getSafetyStockOptimizer({ serviceLevel });

        // Get a sample of parts
        const parts = await prisma.part.findMany({
          where: { partType: { in: ['FINISHED_GOOD', 'COMPONENT'] } },
          select: { id: true },
          take: 50,
        });

        const partsNeedingAdjustment: SafetyStockResult[] = [];

        for (const part of parts) {
          const recommendation = await optimizer.calculateOptimalSafetyStock(part.id);
          if (recommendation) {
            const deltaPercent = recommendation.current.safetyStock > 0
              ? Math.abs(recommendation.delta.safetyStock / recommendation.current.safetyStock)
              : 1;

            if (deltaPercent > 0.2) { // 20% threshold
              partsNeedingAdjustment.push(recommendation);
            }
          }
        }

        // Sort by absolute delta
        partsNeedingAdjustment.sort(
          (a, b) => Math.abs(b.delta.safetyStock) - Math.abs(a.delta.safetyStock)
        );

        result = {
          count: partsNeedingAdjustment.length,
          parts: partsNeedingAdjustment.slice(0, 20),
          analyzed: parts.length,
        };
        break;
      }

      case 'holiday-impact': {
        // Get holiday impact analysis
        const today = new Date();
        const upcomingHolidays = getUpcomingHolidays(2); // 2 months ahead
        const tetPhase = getTetPhase(today);
        const currentBuffer = getHolidayBuffer(today);

        // Calculate buffers for next 4 weeks
        const weeklyBuffers = [];
        for (let i = 0; i < 4; i++) {
          const futureDate = new Date(today);
          futureDate.setDate(futureDate.getDate() + i * 7);
          weeklyBuffers.push({
            week: i + 1,
            date: futureDate.toISOString().split('T')[0],
            buffer: getHolidayBuffer(futureDate),
            bufferPercent: `${(getHolidayBuffer(futureDate) * 100).toFixed(0)}%`,
          });
        }

        result = {
          currentBuffer,
          currentBufferPercent: `${(currentBuffer * 100).toFixed(0)}%`,
          tetPhase,
          upcomingHolidays,
          weeklyBuffers,
          recommendation: currentBuffer > 0.3
            ? 'High buffer period - consider pre-building inventory'
            : currentBuffer > 0
              ? 'Moderate buffer - monitor inventory levels'
              : 'Normal period - standard operations',
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/forecast/mrp-integration' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch MRP integration data',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// POST - Apply Recommendations or Bulk Operations
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
      action: z.enum(['recommendations', 'apply', 'summary', 'bulk-optimize']),
      partId: z.string().optional(),
      partIds: z.array(z.string()).optional(),
      options: z.object({
        serviceLevel: z.number().optional(),
        includeHolidayBuffer: z.boolean().optional(),
        updateSafetyStock: z.boolean().optional(),
        updateReorderPoint: z.boolean().optional(),
        maxParts: z.number().optional(),
      }).optional(),
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
      partId,
      partIds,
      options = {},
    } = body;

    const optimizer = getSafetyStockOptimizer({
      serviceLevel: options.serviceLevel || 0.95,
      includeHolidayBuffer: options.includeHolidayBuffer ?? true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Record<string, any>;

    switch (action) {
      case 'recommendations': {
        // Get recommendations for multiple parts
        const targetIds = partIds || (partId ? [partId] : []);

        if (targetIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'partId or partIds required' },
            { status: 400 }
          );
        }

        const recommendations: SafetyStockResult[] = [];
        const errors: string[] = [];

        for (const id of targetIds.slice(0, options.maxParts || 50)) {
          try {
            const recommendation = await optimizer.calculateOptimalSafetyStock(id);
            if (recommendation) {
              recommendations.push(recommendation);
            }
          } catch (err) {
            errors.push(`Part ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        // Calculate summary
        const totalCurrentSS = recommendations.reduce((sum, r) => sum + r.current.safetyStock, 0);
        const totalRecommendedSS = recommendations.reduce((sum, r) => sum + r.recommended.safetyStock, 0);
        const avgConfidence = recommendations.length > 0
          ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
          : 0;

        result = {
          recommendations,
          summary: {
            partsAnalyzed: recommendations.length,
            totalCurrentSafetyStock: totalCurrentSS,
            totalRecommendedSafetyStock: totalRecommendedSS,
            netChange: totalRecommendedSS - totalCurrentSS,
            netChangePercent: totalCurrentSS > 0
              ? (((totalRecommendedSS - totalCurrentSS) / totalCurrentSS) * 100).toFixed(1) + '%'
              : 'N/A',
            avgConfidence: (avgConfidence * 100).toFixed(1) + '%',
          },
          errors: errors.length > 0 ? errors : undefined,
        };
        break;
      }

      case 'apply': {
        // Apply recommendations to parts
        if (!partIds || partIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'partIds required for apply action' },
            { status: 400 }
          );
        }

        // First get recommendations
        const recommendations: SafetyStockResult[] = [];
        for (const id of partIds) {
          const recommendation = await optimizer.calculateOptimalSafetyStock(id);
          if (recommendation) {
            recommendations.push(recommendation);
          }
        }

        // Apply updates
        const updateResult = await optimizer.applyRecommendations(recommendations, {
          updateSafetyStock: options.updateSafetyStock ?? true,
          updateReorderPoint: options.updateReorderPoint ?? true,
        });

        result = {
          ...updateResult,
          message: `Updated ${updateResult.updated} parts, ${updateResult.failed} failed`,
        };
        break;
      }

      case 'bulk-optimize': {
        // Bulk optimization
        const bulkResult = await optimizer.optimizeBulk(partIds, {
          maxParts: options.maxParts || 100,
        });

        result = {
          processed: bulkResult.processed,
          withSignificantChanges: bulkResult.updated,
          noChangesNeeded: bulkResult.skipped,
          summary: {
            partsWithIncrease: bulkResult.results.filter(r => r.delta.safetyStock > 0).length,
            partsWithDecrease: bulkResult.results.filter(r => r.delta.safetyStock < 0).length,
            partsUnchanged: bulkResult.results.filter(r => r.delta.safetyStock === 0).length,
          },
          topIncreases: bulkResult.results
            .filter(r => r.delta.safetyStock > 0)
            .sort((a, b) => b.delta.safetyStock - a.delta.safetyStock)
            .slice(0, 10),
          topDecreases: bulkResult.results
            .filter(r => r.delta.safetyStock < 0)
            .sort((a, b) => a.delta.safetyStock - b.delta.safetyStock)
            .slice(0, 10),
          errors: bulkResult.errors.length > 0 ? bulkResult.errors : undefined,
        };
        break;
      }

      case 'summary': {
        // Just get summary (same as GET)
        const summary = await optimizer.getOptimizationSummary();
        const holidayBuffer = getHolidayBuffer(new Date());

        result = {
          ...summary,
          holidayBuffer,
          holidayBufferPercent: `${(holidayBuffer * 100).toFixed(0)}%`,
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/forecast/mrp-integration' });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process MRP integration action',
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
});
