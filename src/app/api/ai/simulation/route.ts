// =============================================================================
// SIMULATION API - Main endpoint
// POST: Run simulation, GET: List simulations
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import prisma from '@/lib/prisma';
import {
  getScenarioBuilder,
  getSimulationEngine,
  getMonteCarloEngine,
  getImpactAnalyzer,
  getAIScenarioAnalyzer,
  DEFAULT_MONTE_CARLO_CONFIG,
  ScenarioType,
  Scenario,
} from '@/lib/ai/simulation';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const simulationBodySchema = z.object({
  scenarioId: z.string().optional(),
  scenarioConfig: z.object({
    name: z.string(),
    type: z.string(),
    config: z.any(),
    description: z.string().optional(),
    horizonDays: z.number().optional(),
  }).optional(),
  runMonteCarlo: z.boolean().optional(),
  monteCarloConfig: z.any().optional(),
  generateAIInsight: z.boolean().optional(),
});
// In-memory cache for simulation results (in production, use Redis)
const simulationCache = new Map<string, any>();

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
const rawBody = await request.json();
    const parseResult = simulationBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      scenarioId,
      scenarioConfig,
      runMonteCarlo = false,
      monteCarloConfig,
      generateAIInsight = true,
    } = parseResult.data;

    const builder = getScenarioBuilder();
    const engine = getSimulationEngine();
    const impactAnalyzer = getImpactAnalyzer();

    let scenario: Scenario | null = null;

    // Get or create scenario
    if (scenarioId) {
      scenario = builder.getScenario(scenarioId) || null;
    } else if (scenarioConfig) {
      const { name, type, config, description, horizonDays } = scenarioConfig;

      if (!name || !type || !config) {
        return NextResponse.json(
          { error: 'Missing required scenario configuration' },
          { status: 400 }
        );
      }

      scenario = builder.createScenario(name, type as ScenarioType, config, {
        description,
        createdBy: session.user?.id || 'anonymous',
        simulationHorizonDays: horizonDays || 90,
      });
    }

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found or invalid configuration' },
        { status: 404 }
      );
    }

    // Validate scenario
    const validation = builder.validateScenario(scenario);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid scenario', errors: validation.errors },
        { status: 400 }
      );
    }

    // Run main simulation
    const simulationResult = await engine.runSimulation(scenario);

    // Run Monte Carlo if requested
    let monteCarloResult = null;
    if (runMonteCarlo) {
      const mcEngine = getMonteCarloEngine();
      monteCarloResult = await mcEngine.runMonteCarloSimulation(
        scenario,
        monteCarloConfig || DEFAULT_MONTE_CARLO_CONFIG
      );
    }

    // Analyze impacts
    const impactAnalysis = impactAnalyzer.analyzeSimulationImpact(
      simulationResult,
      monteCarloResult || undefined
    );

    // Generate AI insight if requested
    let aiInsight = null;
    if (generateAIInsight) {
      const aiAnalyzer = getAIScenarioAnalyzer();
      aiInsight = await aiAnalyzer.generateScenarioInsight(
        scenario,
        simulationResult,
        monteCarloResult || undefined,
        impactAnalysis
      );
    }

    // Generate result ID and cache
    const resultId = `result_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullResult = {
      id: resultId,
      scenario,
      simulationResult,
      monteCarloResult,
      impactAnalysis,
      aiInsight,
      warnings: validation.warnings,
      createdAt: new Date().toISOString(),
    };

    simulationCache.set(resultId, fullResult);

    return NextResponse.json({
      success: true,
      resultId,
      ...fullResult,
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/simulation' });
    return NextResponse.json(
      { error: 'Failed to run simulation', details: (error as Error).message },
      { status: 500 }
    );
  }
});

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
const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const includeTemplates = searchParams.get('templates') === 'true';

    const builder = getScenarioBuilder();

    // Get all scenarios
    let scenarios = builder.getAllScenarios();

    // Filter by type if specified
    if (type) {
      scenarios = scenarios.filter((s) => s.type === type);
    }

    // Get templates if requested
    let templates: unknown[] = [];
    if (includeTemplates) {
      templates = builder.getTemplates();
    }

    // Get cached results
    const cachedResults = Array.from(simulationCache.entries()).map(([id, result]) => ({
      id,
      scenarioName: result.scenario?.name,
      scenarioType: result.scenario?.type,
      status: result.simulationResult?.status,
      createdAt: result.createdAt,
    }));

    return NextResponse.json({
      scenarios,
      templates: includeTemplates ? templates : undefined,
      recentResults: cachedResults.slice(-10),
      templateCategories: builder.getTemplateCategories(),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'GET /api/ai/simulation' });
    return NextResponse.json(
      { error: 'Failed to fetch simulations' },
      { status: 500 }
    );
  }
});
