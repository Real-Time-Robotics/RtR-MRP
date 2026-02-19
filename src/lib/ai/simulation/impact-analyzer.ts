// =============================================================================
// IMPACT ANALYZER
// Analyze and compare simulation impacts across scenarios
// =============================================================================

import { prisma } from '@/lib/prisma';
import { SimulationResult, SimulationImpact, Bottleneck } from './simulation-engine';
import { MonteCarloResult, RiskMetrics } from './monte-carlo';

// =============================================================================
// TYPES
// =============================================================================

export interface ImpactSummary {
  category: 'positive' | 'negative' | 'neutral';
  overallImpactScore: number; // -100 to +100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyFindings: string[];
  criticalIssues: string[];
  opportunities: string[];
}

export interface ComparisonResult {
  scenarios: ScenarioComparisonItem[];
  recommendation: {
    bestScenario: string;
    reason: string;
    confidence: number;
  };
  tradeoffs: Tradeoff[];
  summary: string;
}

export interface ScenarioComparisonItem {
  scenarioId: string;
  scenarioName: string;
  overallScore: number;
  scores: {
    financial: number;
    operational: number;
    risk: number;
    serviceLevel: number;
  };
  rank: number;
  strengths: string[];
  weaknesses: string[];
}

export interface Tradeoff {
  scenario1: string;
  scenario2: string;
  dimension: string;
  description: string;
  recommendation: string;
}

export interface FinancialImpact {
  revenueImpact: number;
  costImpact: number;
  inventoryCarryingCost: number;
  stockoutCost: number;
  expeditingCost: number;
  totalImpact: number;
  roi: number;
  paybackPeriodDays: number;
}

export interface OperationalImpact {
  productionEfficiency: number;
  capacityUtilization: number;
  throughputChange: number;
  leadTimeChange: number;
  qualityImpact: number;
  laborImpact: number;
}

export interface RiskImpact {
  supplyChainRisk: number;
  demandRisk: number;
  operationalRisk: number;
  financialRisk: number;
  overallRiskScore: number;
  mitigationOptions: string[];
}

export interface DetailedImpactAnalysis {
  scenarioId: string;
  scenarioName: string;
  analyzedAt: Date;
  summary: ImpactSummary;
  financial: FinancialImpact;
  operational: OperationalImpact;
  risk: RiskImpact;
  affectedAreas: AffectedArea[];
  timelineImpact: TimelineImpactPoint[];
  recommendations: PrioritizedRecommendation[];
}

export interface AffectedArea {
  area: string;
  impactType: 'positive' | 'negative' | 'neutral';
  severity: number; // 0-100
  description: string;
  affectedItems: string[];
}

export interface TimelineImpactPoint {
  week: number;
  date: Date;
  impactScore: number;
  cumulativeImpact: number;
  alerts: string[];
}

export interface PrioritizedRecommendation {
  priority: 1 | 2 | 3 | 4 | 5;
  category: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  action: string;
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  dependencies: string[];
}

// =============================================================================
// IMPACT ANALYZER CLASS
// =============================================================================

export class ImpactAnalyzer {
  /**
   * Analyze impact from simulation result
   */
  analyzeSimulationImpact(
    result: SimulationResult,
    monteCarloResult?: MonteCarloResult
  ): DetailedImpactAnalysis {
    const summary = this.generateImpactSummary(result, monteCarloResult);
    const financial = this.analyzeFinancialImpact(result);
    const operational = this.analyzeOperationalImpact(result);
    const risk = this.analyzeRiskImpact(result, monteCarloResult);
    const affectedAreas = this.identifyAffectedAreas(result);
    const timelineImpact = this.analyzeTimelineImpact(result);
    const recommendations = this.generatePrioritizedRecommendations(
      result,
      summary,
      financial,
      risk
    );

    return {
      scenarioId: result.scenarioId,
      scenarioName: result.scenarioName,
      analyzedAt: new Date(),
      summary,
      financial,
      operational,
      risk,
      affectedAreas,
      timelineImpact,
      recommendations,
    };
  }

  /**
   * Compare multiple scenarios
   */
  compareScenarios(results: SimulationResult[]): ComparisonResult {
    if (results.length < 2) {
      throw new Error('At least 2 scenarios required for comparison');
    }

    // Score each scenario
    const scoredScenarios = results.map((result) => {
      const scores = this.calculateScenarioScores(result);
      return {
        scenarioId: result.scenarioId,
        scenarioName: result.scenarioName,
        overallScore: this.calculateOverallScore(scores),
        scores,
        rank: 0,
        strengths: this.identifyStrengths(result, scores),
        weaknesses: this.identifyWeaknesses(result, scores),
      };
    });

    // Rank scenarios
    scoredScenarios.sort((a, b) => b.overallScore - a.overallScore);
    scoredScenarios.forEach((s, i) => (s.rank = i + 1));

    // Identify tradeoffs
    const tradeoffs = this.identifyTradeoffs(scoredScenarios);

    // Generate recommendation
    const bestScenario = scoredScenarios[0];
    const recommendation = {
      bestScenario: bestScenario.scenarioName,
      reason: this.generateRecommendationReason(bestScenario, scoredScenarios),
      confidence: this.calculateRecommendationConfidence(scoredScenarios),
    };

    // Generate summary
    const summary = this.generateComparisonSummary(scoredScenarios, bestScenario);

    return {
      scenarios: scoredScenarios,
      recommendation,
      tradeoffs,
      summary,
    };
  }

  /**
   * Generate impact summary
   */
  private generateImpactSummary(
    result: SimulationResult,
    monteCarloResult?: MonteCarloResult
  ): ImpactSummary {
    const impacts = result.impacts;
    const keyFindings: string[] = [];
    const criticalIssues: string[] = [];
    const opportunities: string[] = [];

    // Analyze demand impact
    if (impacts.demandChangePercent > 10) {
      keyFindings.push(`Demand increase of ${impacts.demandChangePercent}% projected`);
      if (impacts.demandChangePercent > 30) {
        criticalIssues.push('Significant demand surge may overwhelm current capacity');
      }
    } else if (impacts.demandChangePercent < -10) {
      keyFindings.push(`Demand decrease of ${Math.abs(impacts.demandChangePercent)}% projected`);
      opportunities.push('Opportunity to reduce inventory levels and costs');
    }

    // Analyze capacity impact
    if (impacts.capacityUtilizationChange > 15) {
      keyFindings.push(`Capacity utilization increase of ${impacts.capacityUtilizationChange}%`);
      if (result.simulated.capacityUtilization > 90) {
        criticalIssues.push('Capacity near maximum - bottleneck risk');
      }
    }

    // Analyze service level impact
    if (impacts.serviceLevelChange < -5) {
      criticalIssues.push(`Service level decline of ${Math.abs(impacts.serviceLevelChange)}%`);
    } else if (impacts.serviceLevelChange > 5) {
      opportunities.push('Service level improvement opportunity');
    }

    // Analyze cost impact
    if (impacts.costChangePercent > 15) {
      criticalIssues.push(`Cost increase of ${impacts.costChangePercent}% projected`);
    } else if (impacts.costChangePercent < -10) {
      opportunities.push(`Cost reduction of ${Math.abs(impacts.costChangePercent)}% possible`);
    }

    // Analyze bottlenecks
    result.bottlenecks.forEach((bn) => {
      if (bn.severity > 70) {
        criticalIssues.push(`${bn.type} bottleneck: ${bn.resource} (${bn.severity}% severity)`);
      }
    });

    // Add Monte Carlo insights if available
    if (monteCarloResult) {
      if (monteCarloResult.riskMetrics.stockoutProbability > 20) {
        criticalIssues.push(
          `${monteCarloResult.riskMetrics.stockoutProbability}% probability of stockouts`
        );
      }
      if (monteCarloResult.riskMetrics.capacityOverloadProbability > 30) {
        keyFindings.push(
          `${monteCarloResult.riskMetrics.capacityOverloadProbability}% probability of capacity overload`
        );
      }
    }

    // Calculate overall impact score
    let impactScore = 0;
    impactScore -= impacts.costChangePercent * 0.3;
    impactScore += impacts.serviceLevelChange * 0.3;
    impactScore -= impacts.riskScoreChange * 0.2;
    impactScore -= result.bottlenecks.filter((b) => b.severity > 50).length * 5;

    const category: 'positive' | 'negative' | 'neutral' =
      impactScore > 10 ? 'positive' : impactScore < -10 ? 'negative' : 'neutral';

    const riskLevel = this.determineRiskLevel(
      criticalIssues.length,
      result.alerts.filter((a) => a.severity === 'critical').length,
      monteCarloResult?.riskMetrics
    );

    return {
      category,
      overallImpactScore: Math.round(Math.max(-100, Math.min(100, impactScore))),
      riskLevel,
      keyFindings,
      criticalIssues,
      opportunities,
    };
  }

  /**
   * Analyze financial impact
   */
  private analyzeFinancialImpact(result: SimulationResult): FinancialImpact {
    const impacts = result.impacts;

    // Revenue impact (simplified - based on service level)
    const revenueImpact = impacts.serviceLevelChange * 1000; // $1000 per % service level

    // Direct cost impact
    const costImpact = impacts.costChange;

    // Inventory carrying cost (2% per month of inventory value)
    const inventoryValue = result.simulated.netInventory * 10; // $10 per unit
    const inventoryCarryingCost = inventoryValue * 0.02 * (result.horizonDays / 30);

    // Stockout cost (lost sales + expediting)
    const stockoutCount = result.timeline.reduce((sum, t) => sum + t.stockouts, 0);
    const stockoutCost = stockoutCount * 50; // $50 per stockout unit

    // Expediting cost (rush orders)
    const expeditingCost = result.alerts.filter((a) => a.type === 'delay').length * 500;

    const totalImpact = revenueImpact - costImpact - inventoryCarryingCost - stockoutCost - expeditingCost;

    // ROI calculation (simplified)
    const investmentRequired = Math.abs(costImpact) || 1;
    const roi = (totalImpact / investmentRequired) * 100;

    // Payback period
    const paybackPeriodDays = totalImpact > 0
      ? Math.round((investmentRequired / totalImpact) * result.horizonDays)
      : result.horizonDays * 2;

    return {
      revenueImpact: Math.round(revenueImpact),
      costImpact: Math.round(costImpact),
      inventoryCarryingCost: Math.round(inventoryCarryingCost),
      stockoutCost: Math.round(stockoutCost),
      expeditingCost: Math.round(expeditingCost),
      totalImpact: Math.round(totalImpact),
      roi: Math.round(roi * 10) / 10,
      paybackPeriodDays,
    };
  }

  /**
   * Analyze operational impact
   */
  private analyzeOperationalImpact(result: SimulationResult): OperationalImpact {
    const impacts = result.impacts;

    // Production efficiency (inverse of capacity utilization increase)
    const productionEfficiency = 100 - Math.max(0, result.simulated.capacityUtilization - 85);

    // Capacity utilization
    const capacityUtilization = result.simulated.capacityUtilization;

    // Throughput change (based on demand and capacity)
    const throughputChange = impacts.demandChangePercent * 0.8; // 80% of demand change

    // Lead time change
    const leadTimeChange = impacts.leadTimeChangePercent;

    // Quality impact (more stress = potential quality issues)
    const qualityImpact = capacityUtilization > 90 ? -10 : capacityUtilization > 80 ? -5 : 0;

    // Labor impact (based on capacity changes)
    const laborImpact = impacts.capacityUtilizationChange * 0.5;

    return {
      productionEfficiency: Math.round(productionEfficiency * 10) / 10,
      capacityUtilization: Math.round(capacityUtilization * 10) / 10,
      throughputChange: Math.round(throughputChange * 10) / 10,
      leadTimeChange: Math.round(leadTimeChange * 10) / 10,
      qualityImpact: Math.round(qualityImpact * 10) / 10,
      laborImpact: Math.round(laborImpact * 10) / 10,
    };
  }

  /**
   * Analyze risk impact
   */
  private analyzeRiskImpact(
    result: SimulationResult,
    monteCarloResult?: MonteCarloResult
  ): RiskImpact {
    // Supply chain risk
    const supplyBottlenecks = result.bottlenecks.filter((b) => b.type === 'supply');
    const supplyChainRisk = Math.min(
      100,
      supplyBottlenecks.reduce((sum, b) => sum + b.severity, 0) / Math.max(1, supplyBottlenecks.length)
    );

    // Demand risk
    const demandVolatility = Math.abs(result.impacts.demandChangePercent);
    const demandRisk = Math.min(100, demandVolatility * 2);

    // Operational risk
    const capacityRisk = result.simulated.capacityUtilization > 85
      ? (result.simulated.capacityUtilization - 85) * 3
      : 0;
    const stockoutRisk = result.simulated.stockoutRisk;
    const operationalRisk = Math.min(100, (capacityRisk + stockoutRisk) / 2);

    // Financial risk
    const costRisk = Math.max(0, result.impacts.costChangePercent * 2);
    const revenueRisk = Math.max(0, -result.impacts.serviceLevelChange * 3);
    const financialRisk = Math.min(100, (costRisk + revenueRisk) / 2);

    // Overall risk score
    const overallRiskScore = Math.round(
      supplyChainRisk * 0.3 +
      demandRisk * 0.2 +
      operationalRisk * 0.3 +
      financialRisk * 0.2
    );

    // Generate mitigation options
    const mitigationOptions: string[] = [];
    if (supplyChainRisk > 40) {
      mitigationOptions.push('Diversify supplier base');
      mitigationOptions.push('Build strategic buffer inventory');
    }
    if (demandRisk > 40) {
      mitigationOptions.push('Implement demand sensing');
      mitigationOptions.push('Increase forecast frequency');
    }
    if (operationalRisk > 40) {
      mitigationOptions.push('Add flexible capacity options');
      mitigationOptions.push('Cross-train workforce');
    }
    if (financialRisk > 40) {
      mitigationOptions.push('Negotiate pricing contracts');
      mitigationOptions.push('Implement cost monitoring');
    }

    return {
      supplyChainRisk: Math.round(supplyChainRisk),
      demandRisk: Math.round(demandRisk),
      operationalRisk: Math.round(operationalRisk),
      financialRisk: Math.round(financialRisk),
      overallRiskScore,
      mitigationOptions,
    };
  }

  /**
   * Identify affected areas
   */
  private identifyAffectedAreas(result: SimulationResult): AffectedArea[] {
    const areas: AffectedArea[] = [];

    // Inventory impact
    if (Math.abs(result.impacts.inventoryChangePercent) > 10) {
      areas.push({
        area: 'Inventory',
        impactType: result.impacts.inventoryChange > 0 ? 'positive' : 'negative',
        severity: Math.min(100, Math.abs(result.impacts.inventoryChangePercent)),
        description: result.impacts.inventoryChange > 0
          ? 'Inventory levels will increase'
          : 'Inventory levels will decrease',
        affectedItems: [],
      });
    }

    // Production impact
    if (Math.abs(result.impacts.capacityUtilizationChange) > 10) {
      areas.push({
        area: 'Production',
        impactType: result.simulated.capacityUtilization > 90 ? 'negative' : 'neutral',
        severity: Math.min(100, Math.abs(result.impacts.capacityUtilizationChange)),
        description: `Capacity utilization will change by ${result.impacts.capacityUtilizationChange}%`,
        affectedItems: [],
      });
    }

    // Purchasing impact
    if (Math.abs(result.impacts.supplyChangePercent) > 10) {
      areas.push({
        area: 'Purchasing',
        impactType: result.impacts.supplyChange > 0 ? 'positive' : 'negative',
        severity: Math.min(100, Math.abs(result.impacts.supplyChangePercent)),
        description: `Supply requirements will change by ${result.impacts.supplyChangePercent}%`,
        affectedItems: [],
      });
    }

    // Customer service impact
    if (Math.abs(result.impacts.serviceLevelChange) > 5) {
      areas.push({
        area: 'Customer Service',
        impactType: result.impacts.serviceLevelChange > 0 ? 'positive' : 'negative',
        severity: Math.min(100, Math.abs(result.impacts.serviceLevelChange) * 2),
        description: `Service level will ${result.impacts.serviceLevelChange > 0 ? 'improve' : 'decline'} by ${Math.abs(result.impacts.serviceLevelChange)}%`,
        affectedItems: [],
      });
    }

    // Finance impact
    if (Math.abs(result.impacts.costChangePercent) > 5) {
      areas.push({
        area: 'Finance',
        impactType: result.impacts.costChange < 0 ? 'positive' : 'negative',
        severity: Math.min(100, Math.abs(result.impacts.costChangePercent)),
        description: `Costs will ${result.impacts.costChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(result.impacts.costChangePercent)}%`,
        affectedItems: [],
      });
    }

    return areas;
  }

  /**
   * Analyze timeline impact
   */
  private analyzeTimelineImpact(result: SimulationResult): TimelineImpactPoint[] {
    let cumulativeImpact = 0;

    return result.timeline.map((point) => {
      const weeklyImpact = this.calculateWeeklyImpact(point);
      cumulativeImpact += weeklyImpact;

      const alerts: string[] = [];
      if (point.stockouts > 0) alerts.push(`${point.stockouts} stockouts`);
      if (point.capacityUsed > point.capacityAvailable) alerts.push('Capacity exceeded');
      if (point.inventory < 0) alerts.push('Negative inventory');

      return {
        week: point.week,
        date: point.date,
        impactScore: Math.round(weeklyImpact),
        cumulativeImpact: Math.round(cumulativeImpact),
        alerts,
      };
    });
  }

  private calculateWeeklyImpact(point: { supply: number; demand: number; stockoutRisk?: number; inventoryCost?: number; utilizationRate?: number; stockouts?: number; capacityUsed?: number; capacityAvailable?: number }): number {
    let impact = 0;

    // Positive for meeting demand
    if (point.supply >= point.demand) impact += 10;
    else impact -= 10;

    // Negative for stockouts
    impact -= (point.stockouts ?? 0) * 2;

    // Negative for overcapacity
    if ((point.capacityUsed ?? 0) > (point.capacityAvailable ?? 0)) {
      impact -= ((point.capacityUsed ?? 0) - (point.capacityAvailable ?? 0)) / 10;
    }

    return impact;
  }

  /**
   * Generate prioritized recommendations
   */
  private generatePrioritizedRecommendations(
    result: SimulationResult,
    summary: ImpactSummary,
    financial: FinancialImpact,
    risk: RiskImpact
  ): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];

    // Critical issues get highest priority
    summary.criticalIssues.forEach((issue, index) => {
      recommendations.push({
        priority: 1,
        category: 'immediate',
        action: `Address: ${issue}`,
        expectedBenefit: 'Risk mitigation',
        effort: 'high',
        timeline: '1-2 weeks',
        dependencies: [],
      });
    });

    // Bottleneck-specific recommendations
    result.bottlenecks.forEach((bn) => {
      bn.recommendations.forEach((rec) => {
        recommendations.push({
          priority: bn.severity > 70 ? 2 : 3,
          category: bn.severity > 70 ? 'short_term' : 'medium_term',
          action: rec,
          expectedBenefit: `Reduce ${bn.type} bottleneck`,
          effort: 'medium',
          timeline: bn.severity > 70 ? '2-4 weeks' : '1-2 months',
          dependencies: [],
        });
      });
    });

    // Risk mitigation recommendations
    risk.mitigationOptions.forEach((option) => {
      if (!recommendations.some((r) => r.action.includes(option))) {
        recommendations.push({
          priority: 3,
          category: 'medium_term',
          action: option,
          expectedBenefit: 'Risk reduction',
          effort: 'medium',
          timeline: '1-3 months',
          dependencies: [],
        });
      }
    });

    // Opportunity-based recommendations
    summary.opportunities.forEach((opp) => {
      recommendations.push({
        priority: 4,
        category: 'medium_term',
        action: opp,
        expectedBenefit: 'Performance improvement',
        effort: 'low',
        timeline: '1-2 months',
        dependencies: [],
      });
    });

    // Sort by priority and limit
    return recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10);
  }

  /**
   * Calculate scenario scores for comparison
   */
  private calculateScenarioScores(result: SimulationResult): {
    financial: number;
    operational: number;
    risk: number;
    serviceLevel: number;
  } {
    // Financial score (lower cost is better)
    const costChange = result.impacts.costChangePercent;
    const financial = Math.max(0, 100 - Math.abs(costChange) * 2);

    // Operational score (balanced capacity is better)
    const capacityUtil = result.simulated.capacityUtilization;
    const operational = capacityUtil > 90
      ? 100 - (capacityUtil - 90) * 2
      : capacityUtil < 60
        ? 60 + (capacityUtil - 60)
        : 85;

    // Risk score (lower risk is better)
    const riskScore = result.simulated.stockoutRisk + result.simulated.excessInventoryRisk;
    const risk = Math.max(0, 100 - riskScore / 2);

    // Service level score
    const serviceLevel = result.simulated.serviceLevel;

    return { financial, operational, risk, serviceLevel };
  }

  private calculateOverallScore(scores: {
    financial: number;
    operational: number;
    risk: number;
    serviceLevel: number;
  }): number {
    return Math.round(
      scores.financial * 0.25 +
      scores.operational * 0.25 +
      scores.risk * 0.25 +
      scores.serviceLevel * 0.25
    );
  }

  private identifyStrengths(
    result: SimulationResult,
    scores: { financial: number; operational: number; risk: number; serviceLevel: number }
  ): string[] {
    const strengths: string[] = [];
    if (scores.financial > 80) strengths.push('Strong financial performance');
    if (scores.operational > 80) strengths.push('Efficient operations');
    if (scores.risk > 80) strengths.push('Low risk profile');
    if (scores.serviceLevel > 95) strengths.push('Excellent service level');
    if (result.impacts.costChangePercent < -5) strengths.push('Cost reduction');
    return strengths;
  }

  private identifyWeaknesses(
    result: SimulationResult,
    scores: { financial: number; operational: number; risk: number; serviceLevel: number }
  ): string[] {
    const weaknesses: string[] = [];
    if (scores.financial < 60) weaknesses.push('High cost impact');
    if (scores.operational < 60) weaknesses.push('Operational challenges');
    if (scores.risk < 60) weaknesses.push('Elevated risk');
    if (scores.serviceLevel < 90) weaknesses.push('Service level concerns');
    if (result.bottlenecks.length > 2) weaknesses.push('Multiple bottlenecks');
    return weaknesses;
  }

  private identifyTradeoffs(scenarios: ScenarioComparisonItem[]): Tradeoff[] {
    const tradeoffs: Tradeoff[] = [];

    for (let i = 0; i < scenarios.length - 1; i++) {
      for (let j = i + 1; j < scenarios.length; j++) {
        const s1 = scenarios[i];
        const s2 = scenarios[j];

        // Financial vs Service Level tradeoff
        if (s1.scores.financial > s2.scores.financial && s1.scores.serviceLevel < s2.scores.serviceLevel) {
          tradeoffs.push({
            scenario1: s1.scenarioName,
            scenario2: s2.scenarioName,
            dimension: 'Cost vs Service',
            description: `${s1.scenarioName} has lower cost but ${s2.scenarioName} has better service level`,
            recommendation: 'Choose based on strategic priority',
          });
        }

        // Risk vs Efficiency tradeoff
        if (s1.scores.risk > s2.scores.risk && s1.scores.operational < s2.scores.operational) {
          tradeoffs.push({
            scenario1: s1.scenarioName,
            scenario2: s2.scenarioName,
            dimension: 'Risk vs Efficiency',
            description: `${s1.scenarioName} has lower risk but ${s2.scenarioName} is more efficient`,
            recommendation: 'Evaluate risk tolerance',
          });
        }
      }
    }

    return tradeoffs.slice(0, 5);
  }

  private generateRecommendationReason(
    best: ScenarioComparisonItem,
    all: ScenarioComparisonItem[]
  ): string {
    const reasons: string[] = [];
    reasons.push(`Highest overall score of ${best.overallScore}`);
    if (best.strengths.length > 0) {
      reasons.push(best.strengths.slice(0, 2).join(', '));
    }
    return reasons.join('. ');
  }

  private calculateRecommendationConfidence(scenarios: ScenarioComparisonItem[]): number {
    if (scenarios.length < 2) return 100;

    const scoreDiff = scenarios[0].overallScore - scenarios[1].overallScore;
    if (scoreDiff > 20) return 95;
    if (scoreDiff > 10) return 85;
    if (scoreDiff > 5) return 75;
    return 60;
  }

  private generateComparisonSummary(
    scenarios: ScenarioComparisonItem[],
    best: ScenarioComparisonItem
  ): string {
    return `Analysis of ${scenarios.length} scenarios shows "${best.scenarioName}" as the recommended option with a score of ${best.overallScore}. ` +
      `Key strengths: ${best.strengths.slice(0, 2).join(', ') || 'balanced performance'}. ` +
      `Consideration: ${best.weaknesses[0] || 'no major concerns'}.`;
  }

  private determineRiskLevel(
    criticalCount: number,
    alertCount: number,
    metrics?: RiskMetrics
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (criticalCount > 2 || (metrics && metrics.stockoutProbability > 40)) return 'critical';
    if (criticalCount > 0 || alertCount > 3 || (metrics && metrics.stockoutProbability > 20)) return 'high';
    if (alertCount > 1 || (metrics && metrics.stockoutProbability > 10)) return 'medium';
    return 'low';
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let analyzerInstance: ImpactAnalyzer | null = null;

export function getImpactAnalyzer(): ImpactAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new ImpactAnalyzer();
  }
  return analyzerInstance;
}
