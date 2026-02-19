// =============================================================================
// AI SUPPLIER ANALYZER
// AI-powered supplier analysis, predictions, and recommendations
// =============================================================================

import { getAIProvider, AIProviderService, createSystemMessage, createUserMessage } from '@/lib/ai/provider';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  SupplierDataExtractor,
  getSupplierDataExtractor,
  ComprehensiveSupplierData,
} from './supplier-data-extractor';
import {
  SupplierPerformanceScorer,
  getSupplierPerformanceScorer,
  SupplierScorecard,
} from './supplier-performance-scorer';
import {
  RiskCalculator,
  getRiskCalculator,
  SupplierRiskAssessment,
} from './risk-calculator';
import {
  EarlyWarningSystem,
  getEarlyWarningSystem,
  EarlyWarningSignal,
  AlertSummary,
} from './early-warning-system';
import {
  SupplyChainRiskProfile,
} from './risk-calculator';
import {
  SupplierRanking,
} from './supplier-performance-scorer';

// =============================================================================
// INTERNAL TYPES FOR AI PARSING
// =============================================================================

/** Parsed mitigation strategy from risk assessment */
interface MitigationStrategy {
  priority: number;
  strategy: string;
  description: string;
  actions: string[];
  timeline: string;
  expectedRiskReduction: number;
}

/** Parsed contingency plan item */
interface ContingencyPlanItem {
  scenario: string;
  trigger: string;
  response: string[];
}

/** Raw recommendation from AI JSON parsing */
interface RawRecommendation {
  priority?: string | number;
  category?: string;
  title?: string;
  description?: string;
  expectedOutcome?: string;
  timeframe?: string;
  effortLevel?: string;
  roiPotential?: string;
}

/** Raw development plan from AI JSON parsing */
interface RawDevelopmentPlan {
  overallGoal?: string;
  currentState?: string;
  targetState?: string;
  timeline?: string;
  milestones?: RawMilestone[];
  successMetrics?: string[];
  resources?: string[];
}

/** Raw milestone from AI JSON parsing */
interface RawMilestone {
  name?: string;
  description?: string;
  targetDate?: string;
  dependencies?: string[];
}

/** Raw concern from AI JSON parsing */
interface RawConcern {
  severity?: string;
  title?: string;
  description?: string;
  affectedSuppliers?: string[];
  potentialImpact?: string;
  recommendedAction?: string;
}

/** Raw strategic initiative from AI JSON parsing */
interface RawStrategicInitiative {
  title?: string;
  description?: string;
  objective?: string;
  timeline?: string;
  expectedBenefit?: string;
  stakeholders?: string[];
}

/** Raw optimization from AI JSON parsing */
interface RawOptimization {
  type?: string;
  title?: string;
  description?: string;
  potentialSavings?: string;
  implementationComplexity?: string;
  timeToValue?: string;
}

// =============================================================================
// TYPES
// =============================================================================

export interface AISupplierInsight {
  supplierId: string;
  supplierName: string;
  generatedAt: Date;
  executiveSummary: string;
  performanceAnalysis: string;
  riskAssessment: string;
  strategicRecommendations: StrategicRecommendation[];
  predictedPerformance: PerformancePrediction;
  developmentPlan: SupplierDevelopmentPlan;
  confidenceLevel: 'high' | 'medium' | 'low';
  dataQuality: number;
}

export interface StrategicRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'risk_mitigation' | 'performance_improvement' | 'cost_optimization' | 'relationship' | 'diversification';
  title: string;
  description: string;
  expectedOutcome: string;
  timeframe: string;
  effortLevel: 'low' | 'medium' | 'high';
  roiPotential: 'low' | 'medium' | 'high';
}

export interface PerformancePrediction {
  nextQuarterScore: number;
  trend: 'improving' | 'stable' | 'declining';
  confidencePercent: number;
  keyDrivers: string[];
  risks: string[];
  opportunities: string[];
}

export interface SupplierDevelopmentPlan {
  overallGoal: string;
  currentState: string;
  targetState: string;
  timeline: string;
  milestones: DevelopmentMilestone[];
  successMetrics: string[];
  resources: string[];
}

export interface DevelopmentMilestone {
  name: string;
  description: string;
  targetDate: string;
  status: 'not_started' | 'in_progress' | 'completed';
  dependencies: string[];
}

export interface SupplyChainAIAnalysis {
  generatedAt: Date;
  overallAssessment: string;
  riskSummary: string;
  topConcerns: AIIdentifiedConcern[];
  strategicInitiatives: AIStrategicInitiative[];
  marketInsights: string[];
  optimizationOpportunities: OptimizationOpportunity[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface AIIdentifiedConcern {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedSuppliers: string[];
  potentialImpact: string;
  recommendedAction: string;
}

export interface AIStrategicInitiative {
  priority: number;
  title: string;
  description: string;
  objective: string;
  timeline: string;
  expectedBenefit: string;
  stakeholders: string[];
}

export interface OptimizationOpportunity {
  type: 'cost' | 'risk' | 'efficiency' | 'quality';
  title: string;
  description: string;
  potentialSavings: string;
  implementationComplexity: 'low' | 'medium' | 'high';
  timeToValue: string;
}

export interface SupplierComparisonAnalysis {
  generatedAt: Date;
  suppliers: string[];
  comparisonSummary: string;
  dimensionComparison: DimensionComparison[];
  strengthsWeaknesses: {
    supplierId: string;
    supplierName: string;
    strengths: string[];
    weaknesses: string[];
  }[];
  recommendation: string;
  bestFor: { category: string; supplierId: string; reason: string }[];
}

export interface DimensionComparison {
  dimension: string;
  rankings: { supplierId: string; score: number; rank: number }[];
  leader: string;
  analysis: string;
}

// =============================================================================
// AI SUPPLIER ANALYZER CLASS
// =============================================================================

export class AISupplierAnalyzer {
  private aiProvider: AIProviderService;
  private dataExtractor: SupplierDataExtractor;
  private performanceScorer: SupplierPerformanceScorer;
  private riskCalculator: RiskCalculator;
  private warningSystem: EarlyWarningSystem;

  constructor() {
    this.aiProvider = getAIProvider();
    this.dataExtractor = getSupplierDataExtractor();
    this.performanceScorer = getSupplierPerformanceScorer();
    this.riskCalculator = getRiskCalculator();
    this.warningSystem = getEarlyWarningSystem();
  }

  /**
   * Generate comprehensive AI-powered supplier insight
   */
  async generateSupplierInsight(
    supplierId: string,
    months: number = 12
  ): Promise<AISupplierInsight | null> {
    // Gather all data
    const [comprehensiveData, scorecard, riskAssessment, warningSignals] = await Promise.all([
      this.dataExtractor.extractComprehensiveData(supplierId, months),
      this.performanceScorer.generateScorecard(supplierId, months),
      this.riskCalculator.calculateSupplierRisk(supplierId, months),
      this.warningSystem.getEarlyWarningSignals(supplierId),
    ]);

    if (!comprehensiveData || !scorecard) {
      return null;
    }

    // Calculate data quality score
    const dataQuality = comprehensiveData.dataCompleteness;
    const confidenceLevel = this.determineConfidenceLevel(dataQuality);

    // Generate AI analysis
    const prompt = this.buildSupplierAnalysisPrompt(
      comprehensiveData,
      scorecard,
      riskAssessment,
      warningSignals
    );

    try {
      const aiResponseText = await this.callAI(prompt);
      const analysis = this.parseSupplierAnalysis(aiResponseText);

      return {
        supplierId,
        supplierName: comprehensiveData.supplierName,
        generatedAt: new Date(),
        executiveSummary: analysis.executiveSummary,
        performanceAnalysis: analysis.performanceAnalysis,
        riskAssessment: analysis.riskAssessment,
        strategicRecommendations: analysis.strategicRecommendations,
        predictedPerformance: this.predictPerformance(scorecard, riskAssessment),
        developmentPlan: analysis.developmentPlan,
        confidenceLevel,
        dataQuality,
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-supplier-analyzer', operation: 'generateInsight' });
      return this.generateFallbackInsight(
        supplierId,
        comprehensiveData,
        scorecard,
        riskAssessment,
        confidenceLevel,
        dataQuality
      );
    }
  }

  /**
   * Generate supply chain-wide AI analysis
   */
  async analyzeSupplyChain(months: number = 12): Promise<SupplyChainAIAnalysis> {
    // Get supply chain risk profile
    const riskProfile = await this.riskCalculator.calculateSupplyChainRisk(months);

    // Get alert summary
    const alertSummary = await this.warningSystem.getAlertSummary();

    // Get supplier rankings
    const rankings = await this.performanceScorer.getSupplierRankings(undefined, 20);

    // Generate AI analysis
    const prompt = this.buildSupplyChainAnalysisPrompt(riskProfile, alertSummary, rankings);

    try {
      const aiResponseText = await this.callAI(prompt);
      return this.parseSupplyChainAnalysis(aiResponseText, riskProfile, alertSummary);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-supplier-analyzer', operation: 'analyzeSupplyChain' });
      return this.generateFallbackSupplyChainAnalysis(riskProfile, alertSummary);
    }
  }

  /**
   * Compare multiple suppliers with AI analysis
   */
  async compareSuppliers(
    supplierIds: string[],
    months: number = 12
  ): Promise<SupplierComparisonAnalysis> {
    if (supplierIds.length < 2) {
      throw new Error('At least 2 suppliers required for comparison');
    }

    // Get scorecards for all suppliers
    const scorecards: { supplierId: string; scorecard: SupplierScorecard }[] = [];
    for (const supplierId of supplierIds) {
      const scorecard = await this.performanceScorer.generateScorecard(supplierId, months);
      if (scorecard) {
        scorecards.push({ supplierId, scorecard });
      }
    }

    // Generate comparison analysis
    const prompt = this.buildComparisonPrompt(scorecards);

    try {
      const aiResponseText = await this.callAI(prompt);
      return this.parseComparisonAnalysis(aiResponseText, scorecards);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-supplier-analyzer', operation: 'compareSuppliers' });
      return this.generateFallbackComparison(scorecards);
    }
  }

  /**
   * Get AI-powered risk mitigation recommendations
   */
  async getRiskMitigationPlan(
    supplierId: string
  ): Promise<{
    supplier: { id: string; name: string };
    currentRiskLevel: string;
    mitigationStrategies: {
      priority: number;
      strategy: string;
      description: string;
      actions: string[];
      timeline: string;
      expectedRiskReduction: number;
    }[];
    contingencyPlan: {
      scenario: string;
      trigger: string;
      response: string[];
    }[];
  } | null> {
    const riskAssessment = await this.riskCalculator.calculateSupplierRisk(supplierId, 12);
    if (!riskAssessment) return null;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    });

    if (!supplier) return null;

    // Generate mitigation strategies based on risk factors
    const strategies = this.generateMitigationStrategies(riskAssessment);
    const contingencyPlan = this.generateContingencyPlan(riskAssessment);

    return {
      supplier: { id: supplier.id, name: supplier.name },
      currentRiskLevel: riskAssessment.riskLevel,
      mitigationStrategies: strategies,
      contingencyPlan,
    };
  }

  /**
   * Generate natural language supplier report
   */
  async generateNarrativeReport(
    supplierId: string,
    reportType: 'executive' | 'detailed' | 'quarterly'
  ): Promise<string> {
    const [comprehensiveData, scorecard, riskAssessment] = await Promise.all([
      this.dataExtractor.extractComprehensiveData(supplierId, 12),
      this.performanceScorer.generateScorecard(supplierId, 12),
      this.riskCalculator.calculateSupplierRisk(supplierId, 12),
    ]);

    if (!comprehensiveData || !scorecard) {
      return 'Unable to generate report: insufficient data available.';
    }

    const prompt = this.buildReportPrompt(comprehensiveData, scorecard, riskAssessment, reportType);

    try {
      const aiResponseText = await this.callAI(prompt);
      return aiResponseText;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-supplier-analyzer', operation: 'generateReport' });
      return this.generateFallbackReport(comprehensiveData, scorecard, reportType);
    }
  }

  // =============================================================================
  // PRIVATE METHODS - PROMPT BUILDERS
  // =============================================================================

  private buildSupplierAnalysisPrompt(
    data: ComprehensiveSupplierData,
    scorecard: SupplierScorecard,
    riskAssessment: SupplierRiskAssessment | null,
    warningSignals: EarlyWarningSignal[]
  ): string {
    return `Analyze this supplier and provide strategic recommendations.

SUPPLIER: ${data.supplierName} (${data.supplierCode})
Country: ${data.country}
Category: ${data.category || 'General'}

PERFORMANCE SCORECARD:
- Overall Score: ${scorecard.overallScore}/100 (Grade: ${scorecard.overallGrade})
- Delivery: ${scorecard.dimensions.delivery.score}/100
- Quality: ${scorecard.dimensions.quality.score}/100
- Cost: ${scorecard.dimensions.cost.score}/100
- Responsiveness: ${scorecard.dimensions.responsiveness.score}/100
- Trend: ${scorecard.trend.direction}

DELIVERY PERFORMANCE:
- On-Time Rate: ${data.delivery.summary.onTimeRate}%
- Late Orders: ${data.delivery.summary.lateOrders}
- Avg Days Late: ${data.delivery.summary.avgDaysLate}

QUALITY METRICS:
- Acceptance Rate: ${data.quality.summary.acceptanceRate}%
- PPM: ${data.quality.summary.ppm}
- Open NCRs: ${data.quality.summary.openNCRs}
- Total NCRs: ${data.quality.summary.totalNCRs}

PRICING:
- Price Change: ${data.pricing.summary.priceChangePercent}%
- Total Spend: $${data.pricing.summary.totalSpend.toLocaleString()}

RISK LEVEL: ${riskAssessment?.riskLevel || 'Unknown'}
RISK SCORE: ${riskAssessment?.overallRiskScore || 'N/A'}

EARLY WARNING SIGNALS:
${warningSignals.map((s) => `- ${s.type}: ${s.description} (${s.severity})`).join('\n') || 'None detected'}

PARTS SUPPLIED: ${data.partsSupplied.length} parts (${data.partsSupplied.filter((p) => p.isPreferred).length} preferred)

Please provide:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. PERFORMANCE ANALYSIS (key insights)
3. RISK ASSESSMENT (main concerns)
4. STRATEGIC RECOMMENDATIONS (prioritized list)
5. DEVELOPMENT PLAN (improvement roadmap)

Format response as JSON with keys: executiveSummary, performanceAnalysis, riskAssessment, strategicRecommendations (array), developmentPlan`;
  }

  private buildSupplyChainAnalysisPrompt(
    riskProfile: SupplyChainRiskProfile,
    alertSummary: AlertSummary,
    rankings: SupplierRanking[]
  ): string {
    return `Analyze the overall supply chain health and provide strategic recommendations.

SUPPLY CHAIN METRICS:
- Total Active Suppliers: ${riskProfile.metrics.totalActiveSuppliers}
- Overall Risk Score: ${riskProfile.overallRiskScore}/100
- Risk Level: ${riskProfile.overallRiskLevel}
- Suppliers at Risk: ${riskProfile.metrics.suppliersAtRisk}
- Single Source Parts: ${riskProfile.metrics.singleSourcePartsPercent}%
- Geographic Diversity Score: ${riskProfile.metrics.geographicDiversityScore}

RISK BREAKDOWN:
- Supplier Performance Risk: ${riskProfile.riskBreakdown.supplierPerformance}
- Concentration Risk: ${riskProfile.riskBreakdown.concentration}
- Geographic Risk: ${riskProfile.riskBreakdown.geographic}
- Single Source Risk: ${riskProfile.riskBreakdown.singleSource}

ALERT SUMMARY:
- Total Active Alerts: ${alertSummary.totalActiveAlerts}
- Critical Alerts: ${alertSummary.alertsBySeverity.critical || 0}
- Warning Alerts: ${alertSummary.alertsBySeverity.warning || 0}

TOP PERFORMING SUPPLIERS:
${rankings.slice(0, 5).map((r, i) => `${i + 1}. ${r.supplierName}: ${r.overallScore} (${r.overallGrade})`).join('\n')}

Please provide:
1. OVERALL ASSESSMENT (current state summary)
2. TOP CONCERNS (prioritized list)
3. STRATEGIC INITIATIVES (recommended programs)
4. OPTIMIZATION OPPORTUNITIES

Format as JSON with keys: overallAssessment, riskSummary, topConcerns (array), strategicInitiatives (array), optimizationOpportunities (array)`;
  }

  private buildComparisonPrompt(
    scorecards: { supplierId: string; scorecard: SupplierScorecard }[]
  ): string {
    const supplierDetails = scorecards.map((s) => `
SUPPLIER: ${s.scorecard.supplierName}
- Overall: ${s.scorecard.overallScore} (${s.scorecard.overallGrade})
- Delivery: ${s.scorecard.dimensions.delivery.score}
- Quality: ${s.scorecard.dimensions.quality.score}
- Cost: ${s.scorecard.dimensions.cost.score}
- Responsiveness: ${s.scorecard.dimensions.responsiveness.score}
- Trend: ${s.scorecard.trend.direction}
- Strengths: ${s.scorecard.strengths.join(', ')}
- Weaknesses: ${s.scorecard.weaknesses.join(', ')}`).join('\n');

    return `Compare these suppliers and provide analysis.

${supplierDetails}

Please provide:
1. COMPARISON SUMMARY (overall comparison)
2. DIMENSION RANKINGS (for each dimension)
3. STRENGTHS & WEAKNESSES (per supplier)
4. RECOMMENDATION (which to prefer and when)
5. BEST FOR (which supplier is best for what)

Format as JSON with appropriate structure.`;
  }

  private buildReportPrompt(
    data: ComprehensiveSupplierData,
    scorecard: SupplierScorecard,
    riskAssessment: SupplierRiskAssessment | null,
    reportType: string
  ): string {
    const lengthGuidance = reportType === 'executive' ? '300 words' :
      reportType === 'detailed' ? '800 words' : '500 words';

    return `Generate a ${reportType} supplier performance report (${lengthGuidance}).

SUPPLIER: ${data.supplierName}
PERIOD: Last 12 months
OVERALL SCORE: ${scorecard.overallScore}/100 (${scorecard.overallGrade})

Key metrics:
- Delivery: ${scorecard.dimensions.delivery.score}% (${scorecard.dimensions.delivery.grade})
- Quality: ${scorecard.dimensions.quality.score}% (${scorecard.dimensions.quality.grade})
- Cost: ${scorecard.dimensions.cost.score}% (${scorecard.dimensions.cost.grade})
- Responsiveness: ${scorecard.dimensions.responsiveness.score}% (${scorecard.dimensions.responsiveness.grade})

Risk Level: ${riskAssessment?.riskLevel || 'Medium'}
Trend: ${scorecard.trend.direction}

Write a professional narrative report suitable for ${reportType === 'executive' ? 'senior leadership' : 'procurement team review'}.`;
  }

  // =============================================================================
  // PRIVATE METHODS - PARSERS
  // =============================================================================

  private parseSupplierAnalysis(aiText: string): {
    executiveSummary: string;
    performanceAnalysis: string;
    riskAssessment: string;
    strategicRecommendations: StrategicRecommendation[];
    developmentPlan: SupplierDevelopmentPlan;
  } {
    try {
      // Try to parse as JSON
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          executiveSummary: parsed.executiveSummary || 'Analysis not available',
          performanceAnalysis: parsed.performanceAnalysis || 'Analysis not available',
          riskAssessment: parsed.riskAssessment || 'Assessment not available',
          strategicRecommendations: this.parseRecommendations(parsed.strategicRecommendations),
          developmentPlan: this.parseDevelopmentPlan(parsed.developmentPlan),
        };
      }
    } catch (e) {
      // Fall through to text parsing
    }

    // Fallback to text parsing
    return {
      executiveSummary: aiText.substring(0, 500),
      performanceAnalysis: 'See full analysis text',
      riskAssessment: 'See full analysis text',
      strategicRecommendations: [],
      developmentPlan: this.createDefaultDevelopmentPlan(),
    };
  }

  private parseRecommendations(raw: RawRecommendation[]): StrategicRecommendation[] {
    if (!Array.isArray(raw)) return [];

    const validCategories = ['risk_mitigation', 'performance_improvement', 'cost_optimization', 'relationship', 'diversification'] as const;
    const validEffort = ['low', 'medium', 'high'] as const;

    return raw.slice(0, 5).map((r, index) => ({
      priority: this.mapPriority(r.priority || index),
      category: (validCategories.includes(r.category as typeof validCategories[number])
        ? r.category as StrategicRecommendation['category']
        : 'performance_improvement') as StrategicRecommendation['category'],
      title: r.title || `Recommendation ${index + 1}`,
      description: r.description || '',
      expectedOutcome: r.expectedOutcome || 'Improved performance',
      timeframe: r.timeframe || '30-90 days',
      effortLevel: (validEffort.includes(r.effortLevel as typeof validEffort[number])
        ? r.effortLevel as StrategicRecommendation['effortLevel']
        : 'medium') as StrategicRecommendation['effortLevel'],
      roiPotential: (validEffort.includes(r.roiPotential as typeof validEffort[number])
        ? r.roiPotential as StrategicRecommendation['roiPotential']
        : 'medium') as StrategicRecommendation['roiPotential'],
    }));
  }

  private parseDevelopmentPlan(raw: RawDevelopmentPlan | undefined | null): SupplierDevelopmentPlan {
    if (!raw) return this.createDefaultDevelopmentPlan();

    return {
      overallGoal: raw.overallGoal || 'Improve supplier performance',
      currentState: raw.currentState || 'Current assessment in progress',
      targetState: raw.targetState || 'Achieve Grade A performance',
      timeline: raw.timeline || '12 months',
      milestones: (raw.milestones || []).slice(0, 4).map((m: RawMilestone, i: number) => ({
        name: m.name || `Milestone ${i + 1}`,
        description: m.description || '',
        targetDate: m.targetDate || 'TBD',
        status: 'not_started' as const,
        dependencies: m.dependencies || [],
      })),
      successMetrics: raw.successMetrics || ['On-time delivery > 95%', 'Quality acceptance > 98%'],
      resources: raw.resources || ['Procurement team', 'Quality team'],
    };
  }

  private parseSupplyChainAnalysis(
    aiText: string,
    riskProfile: SupplyChainRiskProfile,
    alertSummary: AlertSummary
  ): SupplyChainAIAnalysis {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          generatedAt: new Date(),
          overallAssessment: parsed.overallAssessment || 'Analysis in progress',
          riskSummary: parsed.riskSummary || 'Risk assessment pending',
          topConcerns: this.parseTopConcerns(parsed.topConcerns),
          strategicInitiatives: this.parseStrategicInitiatives(parsed.strategicInitiatives),
          marketInsights: parsed.marketInsights || [],
          optimizationOpportunities: this.parseOptimizations(parsed.optimizationOpportunities),
          confidenceLevel: 'medium',
        };
      }
    } catch (e) {
      // Fall through
    }

    return this.generateFallbackSupplyChainAnalysis(riskProfile, alertSummary);
  }

  private parseComparisonAnalysis(
    aiText: string,
    scorecards: { supplierId: string; scorecard: SupplierScorecard }[]
  ): SupplierComparisonAnalysis {
    // Generate structured comparison from scorecards
    const dimensionComparison: DimensionComparison[] = [
      this.createDimensionComparison('Delivery', scorecards, (s) => s.scorecard.dimensions.delivery.score),
      this.createDimensionComparison('Quality', scorecards, (s) => s.scorecard.dimensions.quality.score),
      this.createDimensionComparison('Cost', scorecards, (s) => s.scorecard.dimensions.cost.score),
      this.createDimensionComparison('Responsiveness', scorecards, (s) => s.scorecard.dimensions.responsiveness.score),
    ];

    const strengthsWeaknesses = scorecards.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.scorecard.supplierName,
      strengths: s.scorecard.strengths,
      weaknesses: s.scorecard.weaknesses,
    }));

    const bestSupplier = scorecards.reduce((best, current) =>
      current.scorecard.overallScore > best.scorecard.overallScore ? current : best
    );

    return {
      generatedAt: new Date(),
      suppliers: scorecards.map((s) => s.scorecard.supplierName),
      comparisonSummary: aiText.substring(0, 500) || `Comparison of ${scorecards.length} suppliers completed.`,
      dimensionComparison,
      strengthsWeaknesses,
      recommendation: `${bestSupplier.scorecard.supplierName} shows the strongest overall performance.`,
      bestFor: this.determineBestFor(scorecards),
    };
  }

  // =============================================================================
  // PRIVATE METHODS - HELPERS
  // =============================================================================

  private determineConfidenceLevel(dataQuality: number): 'high' | 'medium' | 'low' {
    if (dataQuality >= 80) return 'high';
    if (dataQuality >= 50) return 'medium';
    return 'low';
  }

  private mapPriority(value: string | number | undefined): StrategicRecommendation['priority'] {
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower.includes('critical')) return 'critical';
      if (lower.includes('high')) return 'high';
      if (lower.includes('low')) return 'low';
      return 'medium';
    }
    if (typeof value === 'number') {
      if (value === 0) return 'critical';
      if (value === 1) return 'high';
      if (value >= 3) return 'low';
      return 'medium';
    }
    return 'medium';
  }

  private createDefaultDevelopmentPlan(): SupplierDevelopmentPlan {
    return {
      overallGoal: 'Improve supplier performance to meet quality and delivery targets',
      currentState: 'Baseline assessment completed',
      targetState: 'Achieve consistent Grade A performance',
      timeline: '12 months',
      milestones: [
        {
          name: 'Establish Baseline',
          description: 'Complete current state assessment',
          targetDate: '30 days',
          status: 'completed',
          dependencies: [],
        },
        {
          name: 'Quick Wins',
          description: 'Address immediate improvement opportunities',
          targetDate: '60 days',
          status: 'not_started',
          dependencies: ['Establish Baseline'],
        },
      ],
      successMetrics: ['On-time delivery > 95%', 'Quality acceptance > 98%', 'Response time < 24 hours'],
      resources: ['Procurement team', 'Supplier quality engineer'],
    };
  }

  private predictPerformance(
    scorecard: SupplierScorecard,
    riskAssessment: SupplierRiskAssessment | null
  ): PerformancePrediction {
    const currentScore = scorecard.overallScore;
    const trend = scorecard.trend.direction;

    let predictedChange = 0;
    if (trend === 'improving') predictedChange = 3;
    else if (trend === 'declining') predictedChange = -5;

    return {
      nextQuarterScore: Math.max(0, Math.min(100, currentScore + predictedChange)),
      trend,
      confidencePercent: riskAssessment ? 75 : 60,
      keyDrivers: scorecard.strengths.slice(0, 3),
      risks: scorecard.weaknesses.slice(0, 3),
      opportunities: scorecard.recommendations.slice(0, 3),
    };
  }

  private generateMitigationStrategies(riskAssessment: SupplierRiskAssessment): MitigationStrategy[] {
    const strategies = [];
    let priority = 1;

    if (riskAssessment.riskFactors.dependency.score > 50) {
      strategies.push({
        priority: priority++,
        strategy: 'Dual Sourcing Initiative',
        description: 'Qualify alternate suppliers for critical single-source parts',
        actions: [
          'Identify all single-source parts',
          'Research potential alternate suppliers',
          'Begin qualification process for top 3 alternates',
        ],
        timeline: '90 days',
        expectedRiskReduction: 20,
      });
    }

    if (riskAssessment.riskFactors.performance.score > 50) {
      strategies.push({
        priority: priority++,
        strategy: 'Performance Improvement Program',
        description: 'Work with supplier to address performance gaps',
        actions: [
          'Conduct root cause analysis',
          'Develop corrective action plan',
          'Implement monitoring checkpoints',
        ],
        timeline: '60 days',
        expectedRiskReduction: 15,
      });
    }

    if (riskAssessment.riskFactors.external.score > 40) {
      strategies.push({
        priority: priority++,
        strategy: 'Geographic Diversification',
        description: 'Reduce reliance on high-risk regions',
        actions: [
          'Identify nearshore alternatives',
          'Evaluate total cost of ownership',
          'Begin supplier qualification',
        ],
        timeline: '180 days',
        expectedRiskReduction: 15,
      });
    }

    return strategies;
  }

  private generateContingencyPlan(riskAssessment: SupplierRiskAssessment): ContingencyPlanItem[] {
    return [
      {
        scenario: 'Supplier production halt',
        trigger: 'More than 5 consecutive days without shipment',
        response: [
          'Activate backup suppliers',
          'Assess available safety stock',
          'Communicate impact to production planning',
        ],
      },
      {
        scenario: 'Quality failure',
        trigger: 'More than 3 NCRs in 30 days',
        response: [
          'Implement 100% inspection',
          'Request supplier corrective action',
          'Evaluate alternative sourcing',
        ],
      },
      {
        scenario: 'Business continuity event',
        trigger: 'Force majeure or supplier bankruptcy',
        response: [
          'Activate emergency procurement',
          'Engage alternate qualified suppliers',
          'Assess inventory position for affected parts',
        ],
      },
    ];
  }

  private parseTopConcerns(raw: RawConcern[]): AIIdentifiedConcern[] {
    if (!Array.isArray(raw)) return [];
    const validSeverities = ['critical', 'high', 'medium', 'low'] as const;
    return raw.slice(0, 5).map((c) => ({
      severity: (validSeverities.includes(c.severity as typeof validSeverities[number])
        ? c.severity as AIIdentifiedConcern['severity']
        : 'medium') as AIIdentifiedConcern['severity'],
      title: c.title || 'Unnamed concern',
      description: c.description || '',
      affectedSuppliers: c.affectedSuppliers || [],
      potentialImpact: c.potentialImpact || 'Unknown',
      recommendedAction: c.recommendedAction || 'Review required',
    }));
  }

  private parseStrategicInitiatives(raw: RawStrategicInitiative[]): AIStrategicInitiative[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 4).map((s, i) => ({
      priority: i + 1,
      title: s.title || `Initiative ${i + 1}`,
      description: s.description || '',
      objective: s.objective || '',
      timeline: s.timeline || 'TBD',
      expectedBenefit: s.expectedBenefit || '',
      stakeholders: s.stakeholders || [],
    }));
  }

  private parseOptimizations(raw: RawOptimization[]): OptimizationOpportunity[] {
    if (!Array.isArray(raw)) return [];
    const validTypes = ['cost', 'risk', 'efficiency', 'quality'] as const;
    const validComplexity = ['low', 'medium', 'high'] as const;
    return raw.slice(0, 4).map((o) => ({
      type: (validTypes.includes(o.type as typeof validTypes[number])
        ? o.type as OptimizationOpportunity['type']
        : 'efficiency') as OptimizationOpportunity['type'],
      title: o.title || 'Optimization',
      description: o.description || '',
      potentialSavings: o.potentialSavings || 'TBD',
      implementationComplexity: (validComplexity.includes(o.implementationComplexity as typeof validComplexity[number])
        ? o.implementationComplexity as OptimizationOpportunity['implementationComplexity']
        : 'medium') as OptimizationOpportunity['implementationComplexity'],
      timeToValue: o.timeToValue || '3-6 months',
    }));
  }

  private createDimensionComparison(
    dimension: string,
    scorecards: { supplierId: string; scorecard: SupplierScorecard }[],
    getScore: (s: { supplierId: string; scorecard: SupplierScorecard }) => number
  ): DimensionComparison {
    const rankings = scorecards
      .map((s) => ({
        supplierId: s.supplierId,
        score: getScore(s),
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const leader = scorecards.find((s) => s.supplierId === rankings[0].supplierId);

    return {
      dimension,
      rankings,
      leader: leader?.scorecard.supplierName || 'Unknown',
      analysis: `${leader?.scorecard.supplierName} leads in ${dimension.toLowerCase()} with a score of ${rankings[0].score}`,
    };
  }

  private determineBestFor(
    scorecards: { supplierId: string; scorecard: SupplierScorecard }[]
  ): { category: string; supplierId: string; reason: string }[] {
    const categories = [
      { name: 'Delivery Performance', getter: (s: SupplierScorecard) => s.dimensions.delivery.score },
      { name: 'Quality Excellence', getter: (s: SupplierScorecard) => s.dimensions.quality.score },
      { name: 'Cost Competitiveness', getter: (s: SupplierScorecard) => s.dimensions.cost.score },
      { name: 'Responsiveness', getter: (s: SupplierScorecard) => s.dimensions.responsiveness.score },
    ];

    return categories.map((cat) => {
      const best = scorecards.reduce((b, c) =>
        cat.getter(c.scorecard) > cat.getter(b.scorecard) ? c : b
      );
      return {
        category: cat.name,
        supplierId: best.supplierId,
        reason: `Highest ${cat.name.toLowerCase()} score at ${cat.getter(best.scorecard)}`,
      };
    });
  }

  // =============================================================================
  // FALLBACK METHODS
  // =============================================================================

  private generateFallbackInsight(
    supplierId: string,
    data: ComprehensiveSupplierData,
    scorecard: SupplierScorecard,
    riskAssessment: SupplierRiskAssessment | null,
    confidenceLevel: 'high' | 'medium' | 'low',
    dataQuality: number
  ): AISupplierInsight {
    return {
      supplierId,
      supplierName: data.supplierName,
      generatedAt: new Date(),
      executiveSummary: `${data.supplierName} has an overall score of ${scorecard.overallScore} (${scorecard.overallGrade}). ` +
        `Key areas: Delivery at ${scorecard.dimensions.delivery.score}%, Quality at ${scorecard.dimensions.quality.score}%. ` +
        `Trend is ${scorecard.trend.direction}.`,
      performanceAnalysis: `Performance analysis based on ${data.orders.summary.totalOrders} orders. ` +
        `Delivery on-time rate: ${data.delivery.summary.onTimeRate}%. ` +
        `Quality acceptance: ${data.quality.summary.acceptanceRate}%.`,
      riskAssessment: riskAssessment
        ? `Risk level: ${riskAssessment.riskLevel}. Score: ${riskAssessment.overallRiskScore}/100.`
        : 'Risk assessment pending.',
      strategicRecommendations: scorecard.recommendations.map((r, i) => ({
        priority: i === 0 ? 'high' as const : 'medium' as const,
        category: 'performance_improvement' as const,
        title: r,
        description: r,
        expectedOutcome: 'Improved performance',
        timeframe: '30-90 days',
        effortLevel: 'medium' as const,
        roiPotential: 'medium' as const,
      })),
      predictedPerformance: this.predictPerformance(scorecard, riskAssessment),
      developmentPlan: this.createDefaultDevelopmentPlan(),
      confidenceLevel,
      dataQuality,
    };
  }

  private generateFallbackSupplyChainAnalysis(
    riskProfile: SupplyChainRiskProfile,
    alertSummary: AlertSummary
  ): SupplyChainAIAnalysis {
    return {
      generatedAt: new Date(),
      overallAssessment: `Supply chain risk score: ${riskProfile.overallRiskScore}/100 (${riskProfile.overallRiskLevel}). ` +
        `${riskProfile.metrics.totalActiveSuppliers} active suppliers with ${riskProfile.metrics.suppliersAtRisk} at elevated risk.`,
      riskSummary: `Key risk factors: Concentration at ${riskProfile.riskBreakdown.concentration}%, ` +
        `Geographic at ${riskProfile.riskBreakdown.geographic}%, ` +
        `Single source at ${riskProfile.riskBreakdown.singleSource}%.`,
      topConcerns: [
        {
          severity: riskProfile.riskBreakdown.singleSource > 30 ? 'critical' as const : 'medium' as const,
          title: 'Single Source Dependency',
          description: `${riskProfile.riskBreakdown.singleSource}% of parts have single source`,
          affectedSuppliers: [],
          potentialImpact: 'Production disruption risk',
          recommendedAction: 'Develop alternate suppliers',
        },
      ],
      strategicInitiatives: [
        {
          priority: 1,
          title: 'Supplier Diversification',
          description: 'Reduce dependency on single sources',
          objective: 'Reduce single source percentage to under 15%',
          timeline: '12 months',
          expectedBenefit: 'Reduced supply chain risk',
          stakeholders: ['Procurement', 'Engineering'],
        },
      ],
      marketInsights: [],
      optimizationOpportunities: [],
      confidenceLevel: 'medium',
    };
  }

  private generateFallbackComparison(
    scorecards: { supplierId: string; scorecard: SupplierScorecard }[]
  ): SupplierComparisonAnalysis {
    return this.parseComparisonAnalysis('', scorecards);
  }

  private generateFallbackReport(
    data: ComprehensiveSupplierData,
    scorecard: SupplierScorecard,
    reportType: string
  ): string {
    return `
# Supplier Performance Report: ${data.supplierName}

## Overview
${data.supplierName} (${data.supplierCode}) is a ${data.category || 'general'} supplier based in ${data.country}.

## Performance Summary
- **Overall Score:** ${scorecard.overallScore}/100 (Grade ${scorecard.overallGrade})
- **Trend:** ${scorecard.trend.direction}

## Key Metrics
- Delivery: ${scorecard.dimensions.delivery.score}% (${scorecard.dimensions.delivery.grade})
- Quality: ${scorecard.dimensions.quality.score}% (${scorecard.dimensions.quality.grade})
- Cost: ${scorecard.dimensions.cost.score}% (${scorecard.dimensions.cost.grade})
- Responsiveness: ${scorecard.dimensions.responsiveness.score}% (${scorecard.dimensions.responsiveness.grade})

## Strengths
${scorecard.strengths.map((s) => `- ${s}`).join('\n')}

## Areas for Improvement
${scorecard.weaknesses.map((w) => `- ${w}`).join('\n')}

## Recommendations
${scorecard.recommendations.map((r) => `- ${r}`).join('\n')}

---
Report generated: ${new Date().toISOString()}
    `.trim();
  }

  // =============================================================================
  // PRIVATE HELPER - AI CALL
  // =============================================================================

  private async callAI(prompt: string, systemPrompt: string = 'You are an AI supplier analyst providing strategic insights.'): Promise<string> {
    try {
      const response = await this.aiProvider.chat({
        messages: [
          createSystemMessage(systemPrompt),
          createUserMessage(prompt),
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });
      return response.content;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-supplier-analyzer', operation: 'callAI' });
      throw error;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let analyzerInstance: AISupplierAnalyzer | null = null;

export function getAISupplierAnalyzer(): AISupplierAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new AISupplierAnalyzer();
  }
  return analyzerInstance;
}
