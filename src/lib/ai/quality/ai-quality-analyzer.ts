// =============================================================================
// AI QUALITY ANALYZER
// AI-powered root cause analysis and intelligent recommendations
// =============================================================================

import { getAIProvider, createSystemMessage, createUserMessage } from '@/lib/ai/provider';
import { logger } from '@/lib/logger';
import { getQualityDataExtractor } from './quality-data-extractor';
import { getQualityMetricsCalculator } from './quality-metrics-calculator';
import { getQualityPatternRecognition } from './pattern-recognition';
import { getQualityAnomalyDetector } from './anomaly-detector';
import { getQualityPredictionEngine } from './quality-prediction-engine';

// =============================================================================
// INTERNAL TYPES FOR AI CONTEXT & PARSING
// =============================================================================

/** Context structure for root cause analysis AI prompt */
interface RootCauseContext {
  ncr: {
    number: string;
    defectCategory: string | null;
    defectCode: string | null;
    source: string;
    quantityAffected: number;
    preliminaryCause: string | null;
    partSku: string | null;
    supplierName: string | null;
  };
  partHistory: {
    totalNCRs: number;
    fpy: number;
    topDefects: { category: string; count: number }[];
  } | null;
  supplierHistory: {
    acceptanceRate: number;
    totalNCRs: number;
    avgResolutionDays: number;
    defectCategories: { category: string; count: number }[];
  } | null;
  similarIncidents: {
    category: string | null;
    cause: string | null | undefined;
    disposition: string | null;
  }[];
}

/** Context structure for insight report AI prompt */
interface InsightReportContext {
  part: { partNumber?: string; sku?: string; name: string };
  performance: {
    fpy: number;
    totalInspections: number;
    totalNCRs: number;
    openNCRs: number;
    topDefects: { category: string; count: number }[];
  };
  risk: {
    score: number;
    level: string;
    factors: { name: string; score: number; impact: string }[];
  };
  patterns: {
    recurringIssues: {
      category: string;
      occurrences: number;
      frequency: string | number;
      isResolved: boolean;
    }[];
  };
  drift: { direction: string; magnitude: number };
  anomalies: { count: number; riskLevel: string; types: string[] };
  forecast: { trend: string; nextPeriod: { predictedFPY?: { expected?: number } } | undefined };
}

/** Context structure for supplier quality AI prompt */
interface SupplierQualityContext {
  supplier: { name: string; qualityScore: number; grade: string };
  metrics: {
    acceptanceRate: number;
    totalLots: number;
    totalNCRs: number;
    openNCRs: number;
    avgResolutionDays: number;
  };
  defectCategories: { category: string; count: number }[];
  trend: string;
  scoreComponents: Record<string, { score: number; weight: number }>;
}

/** Context structure for defect prediction AI prompt */
interface DefectPredictionContext {
  partSku: string;
  prediction: {
    probability: number;
    expectedCount: { min: number; max: number };
    confidenceLevel: number;
    riskFactors: string[];
    historicalRate: number;
    trend: string;
  };
  recurringIssues: { category: string; frequency: string; pattern: string }[];
  recentAnomalies: { type: string; severity: string; metric: string }[];
}

/** Parsed root cause analysis result */
interface ParsedRootCauseResult {
  primaryCauses: string[];
  contributingFactors: string[];
  evidenceBasis: string[];
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  preventionStrategies: string[];
  insights: string;
  confidenceLevel: number;
}

/** Parsed insight report response */
interface ParsedInsightReport {
  executiveSummary: string;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    recommendation: string;
    expectedImpact: string;
  }[];
  actionPlan: {
    action: string;
    owner: string;
    timeline: string;
    expectedOutcome: string;
  }[];
}

/** Parsed supplier analysis response */
interface ParsedSupplierAnalysis {
  strengths: string[];
  weaknesses: string[];
  improvementAreas: {
    area: string;
    currentState: string;
    targetState: string;
    aiSuggestion: string;
  }[];
  comparativeAnalysis: string;
  recommendation: string;
}

/** Parsed defect prediction response */
interface ParsedDefectPrediction {
  analysis: string;
  preventions: Record<string, string>;
  highRiskAreas: string[];
}

/** Quality summary used for executive summary generation */
interface QualitySummaryData {
  partSku: string;
  firstPassYield: number;
}

/** Risk score data used for executive summary generation */
interface RiskScoreData {
  riskLevel: string;
}

// =============================================================================
// TYPES
// =============================================================================

export interface RootCauseAnalysisResult {
  ncrId: string;
  ncrNumber: string;
  defectDescription: string;
  analysis: {
    primaryCauses: string[];
    contributingFactors: string[];
    evidenceBasis: string[];
    confidenceLevel: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  similarIncidents: {
    ncrNumber: string;
    date: Date;
    similarity: number;
    resolution: string | null;
  }[];
  preventionStrategies: string[];
  aiInsights: string;
  generatedAt: Date;
}

export interface QualityInsightReport {
  partId: string;
  partSku: string;
  reportPeriod: { start: Date; end: Date };
  executiveSummary: string;
  keyFindings: Finding[];
  riskAssessment: {
    currentRiskLevel: string;
    riskFactors: string[];
    mitigationRecommendations: string[];
  };
  performanceTrends: {
    metric: string;
    trend: string;
    insight: string;
  }[];
  aiRecommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    recommendation: string;
    expectedImpact: string;
  }[];
  actionPlan: {
    action: string;
    owner: string;
    timeline: string;
    expectedOutcome: string;
  }[];
  generatedAt: Date;
}

export interface Finding {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  dataSupport: string;
}

export interface SupplierQualityInsight {
  supplierId: string;
  supplierName: string;
  qualityScore: number;
  strengthsAnalysis: string[];
  weaknessesAnalysis: string[];
  improvementAreas: {
    area: string;
    currentState: string;
    targetState: string;
    aiSuggestion: string;
  }[];
  riskProfile: {
    level: 'high' | 'medium' | 'low';
    factors: string[];
    mitigations: string[];
  };
  comparativeAnalysis: string;
  aiRecommendation: string;
  generatedAt: Date;
}

export interface DefectPredictionInsight {
  partId: string;
  partSku: string;
  predictionWindow: string;
  predictedDefects: {
    category: string;
    probability: number;
    expectedCount: number;
    preventionSuggestion: string;
  }[];
  earlyWarningSignals: {
    signal: string;
    severity: 'high' | 'medium' | 'low';
    action: string;
  }[];
  aiAnalysis: string;
  confidenceLevel: number;
  generatedAt: Date;
}

// =============================================================================
// AI QUALITY ANALYZER CLASS
// =============================================================================

export class AIQualityAnalyzer {
  private aiProvider = getAIProvider();
  private dataExtractor = getQualityDataExtractor();
  private metricsCalculator = getQualityMetricsCalculator();
  private patternRecognition = getQualityPatternRecognition();
  private anomalyDetector = getQualityAnomalyDetector();
  private predictionEngine = getQualityPredictionEngine();

  /**
   * Perform AI-powered root cause analysis for an NCR
   */
  async analyzeRootCause(ncrId: string): Promise<RootCauseAnalysisResult> {
    // Get NCR data
    const ncrHistory = await this.dataExtractor.extractNCRHistory({});
    const ncr = ncrHistory.find((n) => n.id === ncrId);

    if (!ncr) {
      throw new Error('NCR not found: ' + ncrId);
    }

    // Get related data
    const partQuality = ncr.partId
      ? await this.dataExtractor.extractPartQualitySummary(ncr.partId, 12)
      : null;

    const supplierData = ncr.supplierId
      ? await this.dataExtractor.extractSupplierQualityData(ncr.supplierId, 12)
      : null;

    // Find similar incidents
    const similarNCRs = ncrHistory.filter((n) =>
      n.id !== ncrId &&
      n.defectCategory === ncr.defectCategory &&
      n.partId === ncr.partId
    ).slice(0, 5);

    // Build context for AI
    const contextData = {
      ncr: {
        number: ncr.ncrNumber,
        defectCategory: ncr.defectCategory,
        defectCode: ncr.defectCode,
        source: ncr.source,
        quantityAffected: ncr.quantityAffected,
        preliminaryCause: ncr.preliminaryCause,
        disposition: ncr.disposition,
        partSku: ncr.partSku,
        supplierName: ncr.supplierName,
      },
      partHistory: partQuality
        ? {
            totalNCRs: partQuality.totalNCRs,
            fpy: partQuality.firstPassYield,
            topDefects: partQuality.topDefects,
          }
        : null,
      supplierHistory: supplierData
        ? {
            acceptanceRate: supplierData.acceptanceRate,
            totalNCRs: supplierData.totalNCRs,
            avgResolutionDays: supplierData.avgDaysToResolve,
            defectCategories: supplierData.defectCategories,
          }
        : null,
      similarIncidents: similarNCRs.map((n) => ({
        category: n.defectCategory,
        cause: n.rootCause || n.preliminaryCause,
        disposition: n.disposition,
      })),
    };

    // Call AI for analysis
    const aiResponse = await this.callAI(
      this.buildRootCausePrompt(contextData),
      'You are a quality engineering expert specializing in root cause analysis using 5-Why methodology and Ishikawa diagrams. Analyze manufacturing defects and provide actionable recommendations.'
    );

    // Parse AI response
    const analysis = this.parseRootCauseResponse(aiResponse);

    return {
      ncrId,
      ncrNumber: ncr.ncrNumber,
      defectDescription: ncr.defectCategory || 'Unknown defect',
      analysis: {
        primaryCauses: analysis.primaryCauses || ['Requires further investigation'],
        contributingFactors: analysis.contributingFactors || [],
        evidenceBasis: analysis.evidenceBasis || [],
        confidenceLevel: analysis.confidenceLevel || 0.6,
      },
      recommendations: {
        immediate: analysis.immediateActions || [],
        shortTerm: analysis.shortTermActions || [],
        longTerm: analysis.longTermActions || [],
      },
      similarIncidents: similarNCRs.map((n) => ({
        ncrNumber: n.ncrNumber,
        date: n.createdAt,
        similarity: 0.8,
        resolution: n.disposition,
      })),
      preventionStrategies: analysis.preventionStrategies || [],
      aiInsights: analysis.insights || 'Analysis complete. Review recommendations for corrective actions.',
      generatedAt: new Date(),
    };
  }

  /**
   * Generate comprehensive quality insight report
   */
  async generateInsightReport(
    partId: string,
    months: number = 6
  ): Promise<QualityInsightReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Gather all quality data
    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, months);
    if (!qualitySummary) {
      throw new Error('Part not found: ' + partId);
    }

    const riskScore = await this.predictionEngine.calculateRiskScore(partId, months);
    const patterns = await this.patternRecognition.detectRecurringIssues(partId, months);
    const drift = await this.patternRecognition.detectQualityDrift(partId, months);
    const anomalies = await this.anomalyDetector.detectAnomalies(partId, months);
    const forecast = await this.predictionEngine.generateForecast(partId, 3);

    // Build context for AI
    const contextData = {
      part: {
        sku: qualitySummary.partSku,
        name: qualitySummary.partName,
      },
      performance: {
        fpy: qualitySummary.firstPassYield,
        totalInspections: qualitySummary.totalInspections,
        totalNCRs: qualitySummary.totalNCRs,
        openNCRs: qualitySummary.openNCRs,
        topDefects: qualitySummary.topDefects,
      },
      risk: {
        score: riskScore.overallRiskScore,
        level: riskScore.riskLevel,
        factors: riskScore.riskFactors.map((f) => ({
          name: f.name,
          score: f.score,
          impact: f.impact,
        })),
      },
      patterns: {
        recurringIssues: patterns.issues.map((i) => ({
          category: i.defectCategory,
          occurrences: i.occurrences,
          frequency: i.frequency,
          isResolved: i.isResolved,
        })),
      },
      drift: {
        direction: drift.driftDirection,
        magnitude: drift.driftMagnitude,
      },
      anomalies: {
        count: anomalies.anomalyCount,
        riskLevel: anomalies.riskLevel,
        types: anomalies.anomalies.map((a) => a.type),
      },
      forecast: {
        trend: forecast.overallTrend,
        nextPeriod: forecast.forecastPeriods[0],
      },
    };

    // Call AI for analysis
    const aiResponse = await this.callAI(
      this.buildInsightReportPrompt(contextData),
      'You are a senior quality manager creating an executive quality report. Provide strategic insights, prioritized recommendations, and actionable improvement plans.'
    );

    // Parse AI response
    const reportData = this.parseInsightReportResponse(aiResponse);

    // Build findings
    const keyFindings: Finding[] = [];

    // Positive findings
    if (qualitySummary.firstPassYield >= 98) {
      keyFindings.push({
        type: 'positive',
        title: 'Excellent First Pass Yield',
        description: 'FPY of ' + qualitySummary.firstPassYield.toFixed(1) + '% exceeds target',
        impact: 'low',
        dataSupport: 'Based on ' + qualitySummary.totalInspections + ' inspections',
      });
    }

    // Negative findings
    if (drift.driftDirection === 'degrading') {
      keyFindings.push({
        type: 'negative',
        title: 'Quality Degradation Trend',
        description: 'Quality declining by ' + Math.abs(drift.driftMagnitude).toFixed(1) + '% over period',
        impact: Math.abs(drift.driftMagnitude) > 10 ? 'high' : 'medium',
        dataSupport: 'Statistical trend analysis',
      });
    }

    if (patterns.hasRecurringIssues) {
      const unresolvedCount = patterns.issues.filter((i) => !i.isResolved).length;
      keyFindings.push({
        type: 'negative',
        title: 'Recurring Quality Issues',
        description: unresolvedCount + ' unresolved recurring issue(s) identified',
        impact: unresolvedCount > 2 ? 'high' : 'medium',
        dataSupport: patterns.totalOccurrences + ' total occurrences',
      });
    }

    return {
      partId,
      partSku: qualitySummary.partSku,
      reportPeriod: { start: startDate, end: endDate },
      executiveSummary: reportData.executiveSummary || this.generateExecutiveSummary(qualitySummary, riskScore),
      keyFindings,
      riskAssessment: {
        currentRiskLevel: riskScore.riskLevel,
        riskFactors: riskScore.riskFactors.map((f) => f.name + ': ' + f.description),
        mitigationRecommendations: riskScore.recommendations,
      },
      performanceTrends: [
        {
          metric: 'First Pass Yield',
          trend: drift.driftDirection,
          insight: 'FPY ' + drift.driftDirection + ' by ' + Math.abs(drift.driftMagnitude).toFixed(1) + '% over ' + months + ' months',
        },
        {
          metric: 'NCR Rate',
          trend: riskScore.historicalPerformance.trendDirection,
          insight: 'Averaging ' + riskScore.historicalPerformance.ncrFrequency.toFixed(1) + ' NCRs per month',
        },
      ],
      aiRecommendations: reportData.recommendations || [],
      actionPlan: reportData.actionPlan || [],
      generatedAt: new Date(),
    };
  }

  /**
   * Generate supplier quality insights
   */
  async analyzeSupplierQuality(
    supplierId: string,
    months: number = 12
  ): Promise<SupplierQualityInsight> {
    const supplierData = await this.dataExtractor.extractSupplierQualityData(supplierId, months);
    if (!supplierData) {
      throw new Error('Supplier not found: ' + supplierId);
    }

    const supplierScore = await this.metricsCalculator.calculateSupplierQualityScore(supplierId, months);

    // Build context for AI
    const contextData = {
      supplier: {
        name: supplierData.supplierName,
        qualityScore: supplierScore.overallScore,
        grade: supplierScore.grade,
      },
      metrics: {
        acceptanceRate: supplierData.acceptanceRate,
        totalLots: supplierData.totalLots,
        totalNCRs: supplierData.totalNCRs,
        openNCRs: supplierData.openNCRs,
        avgResolutionDays: supplierData.avgDaysToResolve,
      },
      defectCategories: supplierData.defectCategories,
      trend: supplierScore.trend,
      scoreComponents: supplierScore.components,
    };

    // Call AI for analysis
    const aiResponse = await this.callAI(
      this.buildSupplierAnalysisPrompt(contextData),
      'You are a supply chain quality specialist. Analyze supplier performance, identify improvement opportunities, and provide strategic recommendations for supplier development.'
    );

    // Parse AI response
    const analysisData = this.parseSupplierAnalysisResponse(aiResponse);

    return {
      supplierId,
      supplierName: supplierData.supplierName,
      qualityScore: supplierScore.overallScore,
      strengthsAnalysis: analysisData.strengths || [],
      weaknessesAnalysis: analysisData.weaknesses || [],
      improvementAreas: analysisData.improvementAreas || [],
      riskProfile: {
        level: supplierScore.grade === 'D' || supplierScore.grade === 'F' ? 'high' :
               supplierScore.grade === 'C' ? 'medium' : 'low',
        factors: supplierScore.recommendations.filter((r) => r.includes('NCR') || r.includes('quality')),
        mitigations: supplierScore.recommendations,
      },
      comparativeAnalysis: analysisData.comparativeAnalysis || 'Supplier performance analysis complete.',
      aiRecommendation: analysisData.recommendation || 'Continue monitoring supplier quality metrics.',
      generatedAt: new Date(),
    };
  }

  /**
   * Generate defect prediction insights
   */
  async predictDefects(
    partId: string,
    monthsAhead: number = 1
  ): Promise<DefectPredictionInsight> {
    const ncrPrediction = await this.predictionEngine.predictNCR(partId, monthsAhead);
    const patterns = await this.patternRecognition.detectRecurringIssues(partId, 12);
    const anomalies = await this.anomalyDetector.detectAnomalies(partId, 6);

    // Build context for AI
    const contextData = {
      partSku: ncrPrediction.partSku,
      prediction: {
        probability: ncrPrediction.probability,
        expectedCount: ncrPrediction.expectedNCRCount,
        confidenceLevel: ncrPrediction.confidenceLevel,
        riskFactors: ncrPrediction.riskFactors,
        historicalRate: ncrPrediction.historicalBasis.historicalRate,
        trend: ncrPrediction.historicalBasis.recentTrend,
      },
      recurringIssues: patterns.issues.filter((i) => !i.isResolved).map((i) => ({
        category: i.defectCategory,
        frequency: i.frequency,
        pattern: i.pattern,
      })),
      recentAnomalies: anomalies.anomalies.slice(0, 3).map((a) => ({
        type: a.type,
        severity: a.severity,
        metric: a.affectedMetric,
      })),
    };

    // Call AI for analysis
    const aiResponse = await this.callAI(
      this.buildDefectPredictionPrompt(contextData),
      'You are a predictive quality analyst. Analyze quality data patterns to forecast potential defects and recommend preventive measures.'
    );

    // Parse AI response
    const predictionData = this.parseDefectPredictionResponse(aiResponse);

    // Build predicted defects from patterns
    const predictedDefects = patterns.issues
      .filter((i) => !i.isResolved && i.frequency !== 'low')
      .map((i) => ({
        category: i.defectCategory,
        probability: i.frequency === 'high' ? 0.7 : 0.4,
        expectedCount: Math.ceil(i.occurrences / 6),
        preventionSuggestion: predictionData.preventions?.[i.defectCategory] ||
          'Implement targeted quality controls for ' + i.defectCategory,
      }));

    // Build early warning signals
    const earlyWarningSignals = anomalies.anomalies
      .filter((a) => a.severity !== 'minor')
      .map((a) => ({
        signal: a.description,
        severity: a.severity as 'high' | 'medium' | 'low',
        action: a.suggestedAction,
      }));

    return {
      partId,
      partSku: ncrPrediction.partSku,
      predictionWindow: 'Next ' + monthsAhead + ' month(s)',
      predictedDefects,
      earlyWarningSignals,
      aiAnalysis: predictionData.analysis || 'Prediction analysis complete. Monitor identified risk areas.',
      confidenceLevel: ncrPrediction.confidenceLevel,
      generatedAt: new Date(),
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private async callAI(prompt: string, systemPrompt: string): Promise<string> {
    try {
      const response = await this.aiProvider.chat({
        messages: [
          createSystemMessage(systemPrompt),
          createUserMessage(prompt),
        ],
        temperature: 0.7,
        maxTokens: 2048,
      });
      return response.content;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-quality-analyzer' });
      return ''; // Return empty string to handle gracefully
    }
  }

  private buildRootCausePrompt(context: RootCauseContext): string {
    return `Analyze this quality non-conformance and provide root cause analysis:

NCR Details:
- Number: ${context.ncr.number}
- Defect Category: ${context.ncr.defectCategory || 'Not specified'}
- Defect Code: ${context.ncr.defectCode || 'Not specified'}
- Source: ${context.ncr.source}
- Quantity Affected: ${context.ncr.quantityAffected}
- Preliminary Cause: ${context.ncr.preliminaryCause || 'Not identified'}
- Part: ${context.ncr.partSku || 'Unknown'}
- Supplier: ${context.ncr.supplierName || 'Unknown'}

Part Quality History:
${context.partHistory ? `- Total NCRs: ${context.partHistory.totalNCRs}
- First Pass Yield: ${context.partHistory.fpy}%
- Top Defects: ${context.partHistory.topDefects.map((d: { category: string }) => d.category).join(', ')}` : 'No history available'}

Supplier History:
${context.supplierHistory ? `- Acceptance Rate: ${context.supplierHistory.acceptanceRate}%
- Total NCRs: ${context.supplierHistory.totalNCRs}
- Avg Resolution: ${context.supplierHistory.avgResolutionDays} days
- Common Issues: ${context.supplierHistory.defectCategories.map((d: { category: string }) => d.category).join(', ')}` : 'No history available'}

Similar Past Incidents:
${context.similarIncidents.length > 0 ? context.similarIncidents.map((i) =>
  `- Category: ${i.category}, Cause: ${i.cause || 'Unknown'}, Resolution: ${i.disposition || 'Pending'}`
).join('\n') : 'No similar incidents found'}

Please provide:
1. PRIMARY_CAUSES: List the most likely root causes (2-4 items)
2. CONTRIBUTING_FACTORS: List contributing factors
3. EVIDENCE_BASIS: What data supports these conclusions
4. IMMEDIATE_ACTIONS: What should be done immediately
5. SHORT_TERM_ACTIONS: Actions for the next 1-4 weeks
6. LONG_TERM_ACTIONS: Systemic improvements needed
7. PREVENTION_STRATEGIES: How to prevent recurrence
8. INSIGHTS: Key insight summary (2-3 sentences)
9. CONFIDENCE_LEVEL: Your confidence in this analysis (0-1)

Format your response with clear section headers.`;
  }

  private buildInsightReportPrompt(context: InsightReportContext): string {
    return `Generate a quality insight report for this part:

Part: ${context.part.partNumber} - ${context.part.name}

Performance Metrics:
- First Pass Yield: ${context.performance.fpy}%
- Total Inspections: ${context.performance.totalInspections}
- Total NCRs: ${context.performance.totalNCRs}
- Open NCRs: ${context.performance.openNCRs}
- Top Defects: ${context.performance.topDefects.map((d: { category: string; count: number }) => `${d.category} (${d.count})`).join(', ')}

Risk Assessment:
- Risk Score: ${context.risk.score}/100
- Risk Level: ${context.risk.level}
- Key Factors: ${context.risk.factors.map((f: { name: string; score: number }) => `${f.name}: ${f.score}`).join(', ')}

Quality Patterns:
- Recurring Issues: ${context.patterns.recurringIssues.map((i) =>
    `${i.category} (${i.occurrences}x, ${i.frequency} freq, ${i.isResolved ? 'resolved' : 'open'})`
  ).join('; ')}

Drift Analysis:
- Direction: ${context.drift.direction}
- Magnitude: ${context.drift.magnitude}%

Anomaly Detection:
- Total Anomalies: ${context.anomalies.count}
- Risk Level: ${context.anomalies.riskLevel}
- Types: ${context.anomalies.types.join(', ')}

Forecast (Next Period):
- Trend: ${context.forecast.trend}
- Expected FPY: ${context.forecast.nextPeriod?.predictedFPY?.expected || 'N/A'}%

Please provide:
1. EXECUTIVE_SUMMARY: 2-3 sentence overview for leadership
2. RECOMMENDATIONS: List of prioritized recommendations with format:
   - priority: high/medium/low
   - category: (e.g., Process, Supplier, Equipment)
   - recommendation: specific action
   - expectedImpact: expected result
3. ACTION_PLAN: Specific actions with:
   - action: what to do
   - owner: suggested role/team
   - timeline: when to complete
   - expectedOutcome: result

Format your response with clear section headers.`;
  }

  private buildSupplierAnalysisPrompt(context: SupplierQualityContext): string {
    return `Analyze this supplier's quality performance:

Supplier: ${context.supplier.name}
- Quality Score: ${context.supplier.qualityScore}/100 (Grade: ${context.supplier.grade})
- Trend: ${context.trend}

Metrics:
- Acceptance Rate: ${context.metrics.acceptanceRate}%
- Total Lots: ${context.metrics.totalLots}
- Total NCRs: ${context.metrics.totalNCRs}
- Open NCRs: ${context.metrics.openNCRs}
- Avg Resolution Time: ${context.metrics.avgResolutionDays} days

Defect Categories: ${context.defectCategories.map((d: { category: string; count: number }) => `${d.category}: ${d.count}`).join(', ')}

Score Components:
- Acceptance Rate: ${context.scoreComponents.acceptanceRate.score}/100 (weight: ${context.scoreComponents.acceptanceRate.weight})
- NCR Rate: ${context.scoreComponents.ncrRate.score}/100 (weight: ${context.scoreComponents.ncrRate.weight})
- Response Time: ${context.scoreComponents.responseTime.score}/100 (weight: ${context.scoreComponents.responseTime.weight})
- Delivery Quality: ${context.scoreComponents.deliveryQuality.score}/100 (weight: ${context.scoreComponents.deliveryQuality.weight})

Please provide:
1. STRENGTHS: List supplier's quality strengths (2-4 items)
2. WEAKNESSES: List areas needing improvement (2-4 items)
3. IMPROVEMENT_AREAS: Specific improvement areas with:
   - area: what to improve
   - currentState: current performance
   - targetState: target performance
   - aiSuggestion: how to achieve it
4. COMPARATIVE_ANALYSIS: How this supplier compares to industry standards
5. RECOMMENDATION: Overall strategic recommendation for this supplier

Format your response with clear section headers.`;
  }

  private buildDefectPredictionPrompt(context: DefectPredictionContext): string {
    return `Predict potential quality defects for this part:

Part: ${context.partSku}

NCR Prediction:
- Probability of NCR: ${(context.prediction.probability * 100).toFixed(0)}%
- Expected Count: ${context.prediction.expectedCount.min}-${context.prediction.expectedCount.max}
- Confidence: ${(context.prediction.confidenceLevel * 100).toFixed(0)}%
- Historical Rate: ${context.prediction.historicalRate} NCRs/month
- Recent Trend: ${context.prediction.trend}
- Risk Factors: ${context.prediction.riskFactors.join(', ')}

Recurring Issues (Unresolved):
${context.recurringIssues.map((i) =>
  `- ${i.category}: ${i.frequency} frequency, Pattern: ${i.pattern}`
).join('\n') || 'None identified'}

Recent Anomalies:
${context.recentAnomalies.map((a) =>
  `- ${a.type} (${a.severity}): ${a.metric}`
).join('\n') || 'None detected'}

Please provide:
1. ANALYSIS: Overall defect prediction analysis (2-3 sentences)
2. PREVENTIONS: For each recurring issue category, suggest specific prevention measure
   Format: CategoryName: Prevention suggestion
3. HIGH_RISK_AREAS: List the highest risk defect categories to watch

Format your response with clear section headers.`;
  }

  // =============================================================================
  // RESPONSE PARSERS
  // =============================================================================

  private parseRootCauseResponse(response: string): ParsedRootCauseResult {
    const result: ParsedRootCauseResult = {
      primaryCauses: [],
      contributingFactors: [],
      evidenceBasis: [],
      immediateActions: [],
      shortTermActions: [],
      longTermActions: [],
      preventionStrategies: [],
      insights: '',
      confidenceLevel: 0.6,
    };

    if (!response) return result;

    // Simple parsing - extract sections
    const sections = response.split(/\n(?=[A-Z_]+:)/);

    for (const section of sections) {
      const match = section.match(/^([A-Z_]+):\s*([\s\S]*)/);
      if (!match) continue;

      const [, key, content] = match;
      const items = content.split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line) => line.length > 0);

      switch (key) {
        case 'PRIMARY_CAUSES':
          result.primaryCauses = items;
          break;
        case 'CONTRIBUTING_FACTORS':
          result.contributingFactors = items;
          break;
        case 'EVIDENCE_BASIS':
          result.evidenceBasis = items;
          break;
        case 'IMMEDIATE_ACTIONS':
          result.immediateActions = items;
          break;
        case 'SHORT_TERM_ACTIONS':
          result.shortTermActions = items;
          break;
        case 'LONG_TERM_ACTIONS':
          result.longTermActions = items;
          break;
        case 'PREVENTION_STRATEGIES':
          result.preventionStrategies = items;
          break;
        case 'INSIGHTS':
          result.insights = items.join(' ');
          break;
        case 'CONFIDENCE_LEVEL':
          const conf = parseFloat(items[0]);
          if (!isNaN(conf)) result.confidenceLevel = Math.min(1, Math.max(0, conf));
          break;
      }
    }

    return result;
  }

  private parseInsightReportResponse(response: string): ParsedInsightReport {
    const result: ParsedInsightReport = {
      executiveSummary: '',
      recommendations: [],
      actionPlan: [],
    };

    if (!response) return result;

    // Extract executive summary
    const summaryMatch = response.match(/EXECUTIVE_SUMMARY:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/);
    if (summaryMatch) {
      result.executiveSummary = summaryMatch[1].trim();
    }

    // For now, return basic structure - AI response parsing can be enhanced
    return result;
  }

  private parseSupplierAnalysisResponse(response: string): ParsedSupplierAnalysis {
    const result: ParsedSupplierAnalysis = {
      strengths: [],
      weaknesses: [],
      improvementAreas: [],
      comparativeAnalysis: '',
      recommendation: '',
    };

    if (!response) return result;

    const sections = response.split(/\n(?=[A-Z_]+:)/);

    for (const section of sections) {
      const match = section.match(/^([A-Z_]+):\s*([\s\S]*)/);
      if (!match) continue;

      const [, key, content] = match;
      const items = content.split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter((line) => line.length > 0);

      switch (key) {
        case 'STRENGTHS':
          result.strengths = items;
          break;
        case 'WEAKNESSES':
          result.weaknesses = items;
          break;
        case 'COMPARATIVE_ANALYSIS':
          result.comparativeAnalysis = items.join(' ');
          break;
        case 'RECOMMENDATION':
          result.recommendation = items.join(' ');
          break;
      }
    }

    return result;
  }

  private parseDefectPredictionResponse(response: string): ParsedDefectPrediction {
    const result: ParsedDefectPrediction = {
      analysis: '',
      preventions: {},
      highRiskAreas: [],
    };

    if (!response) return result;

    const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]*?)(?=\n[A-Z_]+:|$)/);
    if (analysisMatch) {
      result.analysis = analysisMatch[1].trim();
    }

    return result;
  }

  private generateExecutiveSummary(qualitySummary: QualitySummaryData, riskScore: RiskScoreData): string {
    const fpy = qualitySummary.firstPassYield;
    const risk = riskScore.riskLevel;

    if (fpy >= 98 && (risk === 'low' || risk === 'minimal')) {
      return `Part ${qualitySummary.partSku} demonstrates excellent quality performance with ${fpy.toFixed(1)}% FPY. Risk level is ${risk}. Continue current quality practices.`;
    } else if (fpy >= 95) {
      return `Part ${qualitySummary.partSku} shows good quality performance at ${fpy.toFixed(1)}% FPY. Risk level is ${risk}. Minor improvements recommended to reach excellence.`;
    } else {
      return `Part ${qualitySummary.partSku} requires attention with ${fpy.toFixed(1)}% FPY. Risk level is ${risk}. Immediate improvement actions needed.`;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let analyzerInstance: AIQualityAnalyzer | null = null;

export function getAIQualityAnalyzer(): AIQualityAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new AIQualityAnalyzer();
  }
  return analyzerInstance;
}
