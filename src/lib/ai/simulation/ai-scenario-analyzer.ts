// =============================================================================
// AI SCENARIO ANALYZER
// AI-powered analysis and recommendations for simulation scenarios
// =============================================================================

import { getAIProvider, AIProviderService, createSystemMessage, createUserMessage } from '@/lib/ai/provider';
import { logger } from '@/lib/logger';
import { Scenario, ScenarioType } from './scenario-builder';
import { SimulationResult, Bottleneck } from './simulation-engine';
import { MonteCarloResult } from './monte-carlo';
import { DetailedImpactAnalysis, ComparisonResult } from './impact-analyzer';

// =============================================================================
// TYPES
// =============================================================================

export interface AIScenarioInsight {
  scenarioId: string;
  scenarioName: string;
  generatedAt: Date;
  executiveSummary: string;
  situationAnalysis: string;
  impactAssessment: string;
  strategicRecommendations: AIRecommendation[];
  riskAnalysis: AIRiskAnalysis;
  actionPlan: AIActionPlan;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface AIRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'mitigation' | 'optimization' | 'strategic' | 'tactical';
  title: string;
  description: string;
  rationale: string;
  expectedOutcome: string;
  timeline: string;
  resources: string[];
  risks: string[];
}

export interface AIRiskAnalysis {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyRisks: AIRiskItem[];
  mitigationStrategies: string[];
  contingencyPlan: string;
}

export interface AIRiskItem {
  risk: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: 'supply' | 'demand' | 'operational' | 'financial';
}

export interface AIActionPlan {
  immediate: string[];
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
  milestones: AIMilestone[];
}

export interface AIMilestone {
  name: string;
  targetDate: string;
  criteria: string[];
  dependencies: string[];
}

export interface AIComparisonInsight {
  generatedAt: Date;
  overallAnalysis: string;
  scenarioRankings: AIScenarioRanking[];
  bestScenario: {
    id: string;
    name: string;
    rationale: string;
    confidence: number;
  };
  tradeoffAnalysis: string;
  hybridRecommendation: string | null;
  decisionFramework: string;
}

export interface AIScenarioRanking {
  scenarioId: string;
  scenarioName: string;
  rank: number;
  strengths: string[];
  weaknesses: string[];
  suitableFor: string[];
}

// =============================================================================
// AI SCENARIO ANALYZER CLASS
// =============================================================================

export class AIScenarioAnalyzer {
  private aiProvider: AIProviderService;

  constructor() {
    this.aiProvider = getAIProvider();
  }

  /**
   * Generate AI-powered insight for a simulation result
   */
  async generateScenarioInsight(
    scenario: Scenario,
    result: SimulationResult,
    monteCarloResult?: MonteCarloResult,
    impactAnalysis?: DetailedImpactAnalysis
  ): Promise<AIScenarioInsight> {
    const prompt = this.buildInsightPrompt(scenario, result, monteCarloResult, impactAnalysis);

    try {
      const aiResponseText = await this.callAI(prompt);
      const parsed = this.parseInsightResponse(aiResponseText);

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        generatedAt: new Date(),
        ...parsed,
        confidenceLevel: this.determineConfidenceLevel(result, monteCarloResult),
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-scenario-analyzer', operation: 'generateInsight' });
      return this.generateFallbackInsight(scenario, result, impactAnalysis);
    }
  }

  /**
   * Generate AI-powered comparison of multiple scenarios
   */
  async generateComparisonInsight(
    scenarios: Scenario[],
    results: SimulationResult[],
    comparison: ComparisonResult
  ): Promise<AIComparisonInsight> {
    const prompt = this.buildComparisonPrompt(scenarios, results, comparison);

    try {
      const aiResponseText = await this.callAI(prompt);
      const parsed = this.parseComparisonResponse(aiResponseText, comparison);

      return {
        generatedAt: new Date(),
        ...parsed,
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-scenario-analyzer', operation: 'generateComparison' });
      return {
        generatedAt: new Date(),
        ...this.generateFallbackComparison(comparison),
      };
    }
  }

  /**
   * Generate executive summary for presentation
   */
  async generateExecutiveSummary(
    scenario: Scenario,
    result: SimulationResult,
    insight: AIScenarioInsight
  ): Promise<string> {
    const prompt = `Generate a concise executive summary (3-4 paragraphs) for this simulation:

SCENARIO: ${scenario.name}
TYPE: ${scenario.type}
HORIZON: ${scenario.simulationHorizonDays} days

KEY METRICS:
- Demand Change: ${result.impacts.demandChangePercent}%
- Service Level: ${result.simulated.serviceLevel}%
- Capacity Utilization: ${result.simulated.capacityUtilization}%
- Cost Change: ${result.impacts.costChangePercent}%
- Risk Score: ${result.simulated.stockoutRisk}

BOTTLENECKS: ${result.bottlenecks.length}
CRITICAL ALERTS: ${result.alerts.filter((a) => a.severity === 'critical').length}

SITUATION: ${insight.situationAnalysis}
RECOMMENDATIONS: ${insight.strategicRecommendations.slice(0, 3).map((r) => r.title).join(', ')}

Please write a professional executive summary suitable for senior management.`;

    try {
      return await this.callAI(prompt);
    } catch (error) {
      return this.generateFallbackExecutiveSummary(scenario, result, insight);
    }
  }

  /**
   * Generate what-if questions for deeper analysis
   */
  generateWhatIfQuestions(
    scenario: Scenario,
    result: SimulationResult
  ): string[] {
    const questions: string[] = [];

    // Based on scenario type
    switch (scenario.type) {
      case 'demand':
        questions.push('What if demand increases by an additional 10%?');
        questions.push('What if demand drops more sharply in specific segments?');
        questions.push('What if seasonal patterns shift by 2 weeks?');
        break;
      case 'supply':
        questions.push('What if lead times increase by another 25%?');
        questions.push('What if a second supplier is disrupted?');
        questions.push('What if quality issues emerge with alternative suppliers?');
        break;
      case 'capacity':
        questions.push('What if overtime is limited to 20% increase?');
        questions.push('What if equipment maintenance extends downtime?');
        questions.push('What if workforce training takes longer than expected?');
        break;
      case 'custom':
        questions.push('What if only two of these factors occur?');
        questions.push('What if timing differs from projections?');
        break;
    }

    // Based on results
    if (result.simulated.capacityUtilization > 85) {
      questions.push('What if we invest in additional capacity?');
    }
    if (result.simulated.stockoutRisk > 20) {
      questions.push('What if we increase safety stock by 50%?');
    }
    if (result.impacts.costChangePercent > 10) {
      questions.push('What if we implement aggressive cost reduction?');
    }

    return questions.slice(0, 5);
  }

  // =============================================================================
  // PROMPT BUILDERS
  // =============================================================================

  private buildInsightPrompt(
    scenario: Scenario,
    result: SimulationResult,
    monteCarloResult?: MonteCarloResult,
    impactAnalysis?: DetailedImpactAnalysis
  ): string {
    return `Analyze this what-if simulation and provide strategic insights.

SCENARIO: ${scenario.name}
TYPE: ${scenario.type}
DESCRIPTION: ${scenario.description}
HORIZON: ${scenario.simulationHorizonDays} days

BASELINE STATE:
- Total Demand: ${result.baseline.totalDemand}
- Total Supply: ${result.baseline.totalSupply}
- Service Level: ${result.baseline.serviceLevel}%
- Capacity Utilization: ${result.baseline.capacityUtilization}%
- Total Cost: $${result.baseline.totalCost}

SIMULATED STATE:
- Total Demand: ${result.simulated.totalDemand} (${result.impacts.demandChangePercent > 0 ? '+' : ''}${result.impacts.demandChangePercent}%)
- Total Supply: ${result.simulated.totalSupply} (${result.impacts.supplyChangePercent > 0 ? '+' : ''}${result.impacts.supplyChangePercent}%)
- Service Level: ${result.simulated.serviceLevel}% (${result.impacts.serviceLevelChange > 0 ? '+' : ''}${result.impacts.serviceLevelChange})
- Capacity Utilization: ${result.simulated.capacityUtilization}% (${result.impacts.capacityUtilizationChange > 0 ? '+' : ''}${result.impacts.capacityUtilizationChange})
- Stockout Risk: ${result.simulated.stockoutRisk}%

BOTTLENECKS:
${result.bottlenecks.map((b) => `- ${b.type}: ${b.resource} (${b.severity}% severity)`).join('\n') || 'None identified'}

ALERTS:
${result.alerts.slice(0, 5).map((a) => `- [${a.severity.toUpperCase()}] ${a.message}`).join('\n') || 'No alerts'}

${monteCarloResult ? `
MONTE CARLO ANALYSIS (${monteCarloResult.iterations} iterations):
- Stockout Probability: ${monteCarloResult.riskMetrics.stockoutProbability}%
- Capacity Overload Probability: ${monteCarloResult.riskMetrics.capacityOverloadProbability}%
- Cost VaR (95%): $${monteCarloResult.riskMetrics.valueAtRisk.p95}
` : ''}

Please provide:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. SITUATION ANALYSIS (key findings)
3. IMPACT ASSESSMENT (business implications)
4. STRATEGIC RECOMMENDATIONS (prioritized list with rationale)
5. RISK ANALYSIS (key risks and mitigations)
6. ACTION PLAN (immediate, short-term, medium-term, long-term actions)

Format as JSON with keys: executiveSummary, situationAnalysis, impactAssessment, strategicRecommendations (array), riskAnalysis, actionPlan`;
  }

  private buildComparisonPrompt(
    scenarios: Scenario[],
    results: SimulationResult[],
    comparison: ComparisonResult
  ): string {
    const scenarioDetails = scenarios.map((s, i) => {
      const r = results[i];
      return `
SCENARIO ${i + 1}: ${s.name} (${s.type})
- Service Level: ${r.simulated.serviceLevel}%
- Capacity Utilization: ${r.simulated.capacityUtilization}%
- Cost Change: ${r.impacts.costChangePercent}%
- Stockout Risk: ${r.simulated.stockoutRisk}%
- Bottlenecks: ${r.bottlenecks.length}
- Overall Score: ${comparison.scenarios[i]?.overallScore || 'N/A'}`;
    }).join('\n');

    return `Compare these simulation scenarios and provide strategic guidance.

${scenarioDetails}

CURRENT RECOMMENDATION: ${comparison.recommendation.bestScenario}
TRADEOFFS: ${comparison.tradeoffs.map((t) => t.description).join('; ') || 'None identified'}

Please provide:
1. OVERALL ANALYSIS (comparative assessment)
2. SCENARIO RANKINGS (with strengths, weaknesses, suitable situations)
3. BEST SCENARIO RECOMMENDATION (with detailed rationale)
4. TRADEOFF ANALYSIS (what you're giving up with each choice)
5. HYBRID RECOMMENDATION (if combining elements would be beneficial)
6. DECISION FRAMEWORK (how to choose based on different priorities)

Format as JSON with keys: overallAnalysis, scenarioRankings (array), bestScenario, tradeoffAnalysis, hybridRecommendation, decisionFramework`;
  }

  // =============================================================================
  // RESPONSE PARSERS
  // =============================================================================

  private parseInsightResponse(response: string): Omit<AIScenarioInsight, 'scenarioId' | 'scenarioName' | 'generatedAt' | 'confidenceLevel'> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          executiveSummary: parsed.executiveSummary || 'Analysis completed.',
          situationAnalysis: parsed.situationAnalysis || 'See simulation results.',
          impactAssessment: parsed.impactAssessment || 'Review impact metrics.',
          strategicRecommendations: this.parseRecommendations(parsed.strategicRecommendations),
          riskAnalysis: this.parseRiskAnalysis(parsed.riskAnalysis),
          actionPlan: this.parseActionPlan(parsed.actionPlan),
        };
      }
    } catch (e) {
      logger.logError(e instanceof Error ? e : new Error(String(e)), { context: 'ai-scenario-analyzer', operation: 'parseResponse' });
    }

    // Fallback: use response as summary
    return {
      executiveSummary: response.substring(0, 500),
      situationAnalysis: 'See simulation results for details.',
      impactAssessment: 'Review impact metrics in the dashboard.',
      strategicRecommendations: [],
      riskAnalysis: {
        overallRiskLevel: 'medium',
        keyRisks: [],
        mitigationStrategies: [],
        contingencyPlan: 'Develop contingency plan based on identified risks.',
      },
      actionPlan: {
        immediate: ['Review simulation results'],
        shortTerm: ['Develop action plan'],
        mediumTerm: ['Implement key recommendations'],
        longTerm: ['Monitor and adjust'],
        milestones: [],
      },
    };
  }

  private parseRecommendations(raw: Partial<AIRecommendation>[]): AIRecommendation[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 5).map((r) => ({
      priority: r.priority || 'medium',
      category: r.category || 'strategic',
      title: r.title || 'Recommendation',
      description: r.description || '',
      rationale: r.rationale || '',
      expectedOutcome: r.expectedOutcome || '',
      timeline: r.timeline || 'TBD',
      resources: r.resources || [],
      risks: r.risks || [],
    }));
  }

  private parseRiskAnalysis(raw: Partial<AIRiskAnalysis> | null | undefined): AIRiskAnalysis {
    if (!raw) {
      return {
        overallRiskLevel: 'medium',
        keyRisks: [],
        mitigationStrategies: [],
        contingencyPlan: '',
      };
    }
    return {
      overallRiskLevel: raw.overallRiskLevel || 'medium',
      keyRisks: Array.isArray(raw.keyRisks) ? raw.keyRisks : [],
      mitigationStrategies: Array.isArray(raw.mitigationStrategies) ? raw.mitigationStrategies : [],
      contingencyPlan: raw.contingencyPlan || '',
    };
  }

  private parseActionPlan(raw: Partial<AIActionPlan> | null | undefined): AIActionPlan {
    if (!raw) {
      return {
        immediate: [],
        shortTerm: [],
        mediumTerm: [],
        longTerm: [],
        milestones: [],
      };
    }
    return {
      immediate: Array.isArray(raw.immediate) ? raw.immediate : [],
      shortTerm: Array.isArray(raw.shortTerm) ? raw.shortTerm : [],
      mediumTerm: Array.isArray(raw.mediumTerm) ? raw.mediumTerm : [],
      longTerm: Array.isArray(raw.longTerm) ? raw.longTerm : [],
      milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
    };
  }

  private parseComparisonResponse(
    response: string,
    comparison: ComparisonResult
  ): Omit<AIComparisonInsight, 'generatedAt'> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overallAnalysis: parsed.overallAnalysis || comparison.summary,
          scenarioRankings: this.parseScenarioRankings(parsed.scenarioRankings, comparison),
          bestScenario: parsed.bestScenario || {
            id: comparison.recommendation.bestScenario,
            name: comparison.recommendation.bestScenario,
            rationale: comparison.recommendation.reason,
            confidence: comparison.recommendation.confidence,
          },
          tradeoffAnalysis: parsed.tradeoffAnalysis || '',
          hybridRecommendation: parsed.hybridRecommendation || null,
          decisionFramework: parsed.decisionFramework || '',
        };
      }
    } catch (e) {
      logger.logError(e instanceof Error ? e : new Error(String(e)), { context: 'ai-scenario-analyzer', operation: 'parseResponse' });
    }

    return this.generateFallbackComparison(comparison);
  }

  private parseScenarioRankings(raw: Partial<AIScenarioRanking>[] | null | undefined, comparison: ComparisonResult): AIScenarioRanking[] {
    if (!Array.isArray(raw)) {
      return comparison.scenarios.map((s) => ({
        scenarioId: s.scenarioId,
        scenarioName: s.scenarioName,
        rank: s.rank,
        strengths: s.strengths,
        weaknesses: s.weaknesses,
        suitableFor: [],
      }));
    }
    return raw.map((r, i) => ({
      scenarioId: comparison.scenarios[i]?.scenarioId || '',
      scenarioName: r.scenarioName || comparison.scenarios[i]?.scenarioName || '',
      rank: r.rank || i + 1,
      strengths: r.strengths || [],
      weaknesses: r.weaknesses || [],
      suitableFor: r.suitableFor || [],
    }));
  }

  // =============================================================================
  // FALLBACK GENERATORS
  // =============================================================================

  private generateFallbackInsight(
    scenario: Scenario,
    result: SimulationResult,
    impactAnalysis?: DetailedImpactAnalysis
  ): AIScenarioInsight {
    const isPositive = result.impacts.serviceLevelChange >= 0 && result.impacts.costChangePercent <= 10;
    const hasRisk = result.simulated.stockoutRisk > 20 || result.bottlenecks.length > 2;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      generatedAt: new Date(),
      executiveSummary: `The "${scenario.name}" scenario projects a ${Math.abs(result.impacts.demandChangePercent)}% change in demand over ${scenario.simulationHorizonDays} days. ` +
        `Service level is projected at ${result.simulated.serviceLevel}% with ${result.bottlenecks.length} identified bottleneck(s).`,
      situationAnalysis: `This ${scenario.type} scenario models ${this.getScenarioDescription(scenario)}. ` +
        `Current capacity utilization would reach ${result.simulated.capacityUtilization}%.`,
      impactAssessment: `Key impacts include: demand ${result.impacts.demandChange > 0 ? 'increase' : 'decrease'} of ${Math.abs(result.impacts.demandChangePercent)}%, ` +
        `cost ${result.impacts.costChange > 0 ? 'increase' : 'decrease'} of ${Math.abs(result.impacts.costChangePercent)}%, ` +
        `and inventory ${result.impacts.inventoryChange > 0 ? 'buildup' : 'reduction'} of ${Math.abs(result.impacts.inventoryChangePercent)}%.`,
      strategicRecommendations: result.recommendations.slice(0, 5).map((r, i) => ({
        priority: i === 0 ? 'high' : 'medium' as const,
        category: 'strategic' as const,
        title: r,
        description: r,
        rationale: 'Based on simulation analysis',
        expectedOutcome: 'Improved performance',
        timeline: i === 0 ? '1-2 weeks' : '1-3 months',
        resources: [],
        risks: [],
      })),
      riskAnalysis: {
        overallRiskLevel: hasRisk ? 'high' : isPositive ? 'low' : 'medium',
        keyRisks: result.bottlenecks.map((b) => ({
          risk: `${b.type} bottleneck: ${b.resource}`,
          probability: b.severity > 70 ? 'high' : b.severity > 40 ? 'medium' : 'low' as const,
          impact: b.severity > 70 ? 'high' : 'medium' as const,
          category: b.type as 'supply' | 'demand' | 'operational' | 'financial',
        })),
        mitigationStrategies: result.bottlenecks.flatMap((b) => b.recommendations),
        contingencyPlan: 'Activate backup suppliers and adjust production schedule if bottlenecks materialize.',
      },
      actionPlan: {
        immediate: result.alerts.filter((a) => a.severity === 'critical').map((a) => a.recommendedAction),
        shortTerm: result.recommendations.slice(0, 2),
        mediumTerm: result.recommendations.slice(2, 4),
        longTerm: ['Review and update strategic plans based on outcomes'],
        milestones: [],
      },
      confidenceLevel: this.determineConfidenceLevel(result),
    };
  }

  private generateFallbackComparison(comparison: ComparisonResult): Omit<AIComparisonInsight, 'generatedAt'> {
    return {
      overallAnalysis: comparison.summary,
      scenarioRankings: comparison.scenarios.map((s) => ({
        scenarioId: s.scenarioId,
        scenarioName: s.scenarioName,
        rank: s.rank,
        strengths: s.strengths,
        weaknesses: s.weaknesses,
        suitableFor: s.strengths.length > s.weaknesses.length
          ? ['Stable market conditions']
          : ['Risk-tolerant organizations'],
      })),
      bestScenario: {
        id: comparison.scenarios[0]?.scenarioId || '',
        name: comparison.recommendation.bestScenario,
        rationale: comparison.recommendation.reason,
        confidence: comparison.recommendation.confidence,
      },
      tradeoffAnalysis: comparison.tradeoffs.map((t) => t.description).join('. ') || 'No significant tradeoffs identified.',
      hybridRecommendation: null,
      decisionFramework: 'Evaluate scenarios based on: 1) Risk tolerance, 2) Cost constraints, 3) Service level requirements, 4) Implementation complexity.',
    };
  }

  private generateFallbackExecutiveSummary(
    scenario: Scenario,
    result: SimulationResult,
    insight: AIScenarioInsight
  ): string {
    return `Executive Summary: ${scenario.name}

The simulation projects significant changes over the ${scenario.simulationHorizonDays}-day horizon. Key findings include a ${result.impacts.demandChangePercent}% demand change and ${result.impacts.costChangePercent}% cost impact.

Service levels are projected at ${result.simulated.serviceLevel}% with capacity utilization reaching ${result.simulated.capacityUtilization}%. ${result.bottlenecks.length} bottleneck(s) have been identified that require attention.

Recommended actions focus on ${insight.strategicRecommendations[0]?.title || 'operational improvements'}. The overall risk level is assessed as ${insight.riskAnalysis.overallRiskLevel}.`;
  }

  private getScenarioDescription(scenario: Scenario): string {
    switch (scenario.type) {
      case 'demand':
        return 'changes in customer demand patterns';
      case 'supply':
        return 'disruptions or changes in the supply chain';
      case 'capacity':
        return 'production capacity adjustments';
      case 'custom':
        return 'combined business scenario factors';
      default:
        return 'business changes';
    }
  }

  private determineConfidenceLevel(
    result: SimulationResult,
    monteCarloResult?: MonteCarloResult
  ): 'high' | 'medium' | 'low' {
    // Higher confidence with Monte Carlo results
    if (monteCarloResult && monteCarloResult.iterations >= 1000) {
      const convergenceCheck = monteCarloResult.convergenceData.slice(-1)[0]?.isConverged;
      if (convergenceCheck) return 'high';
    }

    // Check data quality
    const hasGoodData = result.baseline.totalDemand > 0 && result.baseline.totalSupply > 0;
    const hasReasonableResults = result.simulated.serviceLevel > 0 && result.simulated.serviceLevel <= 100;

    if (hasGoodData && hasReasonableResults) return 'medium';
    return 'low';
  }

  // =============================================================================
  // PRIVATE HELPER - AI CALL
  // =============================================================================

  private async callAI(prompt: string): Promise<string> {
    try {
      const response = await this.aiProvider.chat({
        messages: [
          createSystemMessage('You are an AI supply chain analyst providing strategic insights for what-if simulations.'),
          createUserMessage(prompt),
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });
      return response.content;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-scenario-analyzer', operation: 'callAI' });
      throw error;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let analyzerInstance: AIScenarioAnalyzer | null = null;

export function getAIScenarioAnalyzer(): AIScenarioAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new AIScenarioAnalyzer();
  }
  return analyzerInstance;
}
