// =============================================================================
// COMPARISON API - Compare multiple simulation scenarios
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getScenarioBuilder,
  getSimulationEngine,
  getImpactAnalyzer,
  getAIScenarioAnalyzer,
  Scenario,
  SimulationResult,
} from '@/lib/ai/simulation';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioIds, generateAIInsight = true } = body;

    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 scenario IDs are required' },
        { status: 400 }
      );
    }

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
    console.error('[Comparison API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compare scenarios', details: (error as Error).message },
      { status: 500 }
    );
  }
}
