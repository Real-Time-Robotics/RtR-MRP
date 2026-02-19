// =============================================================================
// COMPARISON API - Compare multiple simulation scenarios
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/api/with-auth';
import {
  getScenarioBuilder,
  getSimulationEngine,
  getImpactAnalyzer,
  getAIScenarioAnalyzer,
  Scenario,
  SimulationResult,
} from '@/lib/ai/simulation';

import { checkHeavyEndpointLimit } from '@/lib/rate-limit';

const compareBodySchema = z.object({
  scenarioIds: z.array(z.string()).min(2, 'At least 2 scenario IDs are required'),
  generateAIInsight: z.boolean().optional(),
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
const rawBody = await request.json();
    const parseResult = compareBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { scenarioIds, generateAIInsight = true } = parseResult.data;

    if (scenarioIds.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 scenarios can be compared at once' },
        { status: 400 }
      );
    }

    const builder = getScenarioBuilder();
    const engine = getSimulationEngine();
    const impactAnalyzer = getImpactAnalyzer();

    // Get scenarios
    const scenarios: Scenario[] = [];
    for (const id of scenarioIds) {
      const scenario = builder.getScenario(id);
      if (!scenario) {
        return NextResponse.json(
          { error: `Scenario not found: ${id}` },
          { status: 404 }
        );
      }
      scenarios.push(scenario);
    }

    // Run simulations for each scenario
    const results: SimulationResult[] = [];
    for (const scenario of scenarios) {
      const result = await engine.runSimulation(scenario);
      results.push(result);
    }

    // Compare scenarios
    const comparison = impactAnalyzer.compareScenarios(results);

    // Generate AI insight if requested
    let aiInsight = null;
    if (generateAIInsight) {
      const aiAnalyzer = getAIScenarioAnalyzer();
      aiInsight = await aiAnalyzer.generateComparisonInsight(
        scenarios,
        results,
        comparison
      );
    }

    return NextResponse.json({
      success: true,
      comparison,
      aiInsight,
      scenarios: scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        description: s.description,
      })),
      results: results.map((r) => ({
        scenarioId: r.scenarioId,
        scenarioName: r.scenarioName,
        status: r.status,
        baseline: r.baseline,
        simulated: r.simulated,
        impacts: r.impacts,
        alertCount: r.alerts.length,
        bottleneckCount: r.bottlenecks.length,
      })),
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'POST /api/ai/simulation/compare' });
    return NextResponse.json(
      { error: 'Failed to compare scenarios', details: (error as Error).message },
      { status: 500 }
    );
  }
});
