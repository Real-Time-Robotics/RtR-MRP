// =============================================================================
// SIMULATION RESULTS API - Get specific result
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import {
  getScenarioBuilder,
  getImpactAnalyzer,
  getAIScenarioAnalyzer,
} from '@/lib/ai/simulation';
import { z } from 'zod';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';
// In-memory cache (shared with main route - in production use Redis)
const simulationCache = new Map<string, any>();

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

  try {
const { id } = await context.params;

    // Check cache first
    const cached = simulationCache.get(id);
    if (cached) {
      return NextResponse.json(cached);
    }

    return NextResponse.json(
      { error: 'Result not found or expired' },
      { status: 404 }
    );
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/simulation/results/[id]' });
    return NextResponse.json(
      { error: 'Failed to fetch result' },
      { status: 500 }
    );
  }
});

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

  try {
const { id } = await context.params;
    const bodySchema = z.object({
      action: z.enum(['generateExecutiveSummary', 'generateWhatIfQuestions', 'export']),
      format: z.string().optional(),
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
    const { action } = body;

    // Get cached result
    const cached = simulationCache.get(id);
    if (!cached) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'generateExecutiveSummary': {
        const aiAnalyzer = getAIScenarioAnalyzer();
        const summary = await aiAnalyzer.generateExecutiveSummary(
          cached.scenario,
          cached.simulationResult,
          cached.aiInsight
        );

        return NextResponse.json({
          success: true,
          executiveSummary: summary,
        });
      }

      case 'generateWhatIfQuestions': {
        const aiAnalyzer = getAIScenarioAnalyzer();
        const questions = aiAnalyzer.generateWhatIfQuestions(
          cached.scenario,
          cached.simulationResult
        );

        return NextResponse.json({
          success: true,
          questions,
        });
      }

      case 'export': {
        const format = body.format || 'json';

        if (format === 'json') {
          return NextResponse.json(cached);
        }

        // CSV export for timeline data
        if (format === 'csv') {
          const timeline = cached.simulationResult?.timeline || [];
          const csv = [
            'Week,Date,Demand,Supply,Inventory,CapacityUsed,CapacityAvailable,Stockouts',
            ...timeline.map((t: { week: number; date: string; demand: number; supply: number; inventory: number; capacityUsed: number; capacityAvailable: number; stockouts: number }) =>
              [t.week, t.date, t.demand, t.supply, t.inventory, t.capacityUsed, t.capacityAvailable, t.stockouts].join(',')
            ),
          ].join('\n');

          return new NextResponse(csv, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="simulation-${id}.csv"`,
            },
          });
        }

        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/simulation/results/[id]' });
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
});

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

  try {
const { id } = await context.params;

    const deleted = simulationCache.delete(id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Result deleted' : 'Result not found',
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'DELETE /api/ai/simulation/results/[id]' });
    return NextResponse.json(
      { error: 'Failed to delete result' },
      { status: 500 }
    );
  }
});
