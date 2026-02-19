// =============================================================================
// QUALITY PREDICTION ENGINE
// Risk scoring, NCR prediction, and quality forecasting
// =============================================================================

import { prisma } from '@/lib/prisma';
import { getQualityDataExtractor, PartQualitySummary, QualityTrendData } from './quality-data-extractor';
import { getQualityMetricsCalculator } from './quality-metrics-calculator';
import { getQualityPatternRecognition } from './pattern-recognition';
import { getQualityAnomalyDetector } from './anomaly-detector';

// =============================================================================
// TYPES
// =============================================================================

export interface QualityRiskScore {
  partId: string;
  partSku: string;
  partName: string;
  overallRiskScore: number; // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  riskFactors: RiskFactor[];
  historicalPerformance: {
    avgFPY: number;
    avgPPM: number;
    ncrFrequency: number;
    trendDirection: 'improving' | 'stable' | 'degrading';
  };
  predictedOutcome: {
    nextMonthNCRProbability: number;
    expectedFPY: number;
    confidenceLevel: number;
  };
  recommendations: string[];
  lastUpdated: Date;
}

export interface RiskFactor {
  name: string;
  category: 'historical' | 'supplier' | 'process' | 'pattern' | 'anomaly';
  score: number; // 0-100
  weight: number;
  impact: 'high' | 'medium' | 'low';
  description: string;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface NCRPrediction {
  partId: string;
  partSku: string;
  predictionPeriod: {
    start: Date;
    end: Date;
  };
  probability: number; // 0-1
  confidenceLevel: number;
  expectedNCRCount: {
    min: number;
    expected: number;
    max: number;
  };
  riskFactors: string[];
  mitigatingFactors: string[];
  historicalBasis: {
    periodsAnalyzed: number;
    historicalRate: number;
    recentTrend: 'improving' | 'stable' | 'worsening';
  };
  recommendations: string[];
}

export interface QualityForecast {
  partId: string;
  partSku: string;
  forecastPeriods: ForecastPeriod[];
  overallTrend: 'improving' | 'stable' | 'degrading';
  confidenceLevel: number;
  keyAssumptions: string[];
  risks: string[];
  opportunities: string[];
}

export interface ForecastPeriod {
  period: string;
  predictedFPY: {
    low: number;
    expected: number;
    high: number;
  };
  predictedNCRCount: {
    low: number;
    expected: number;
    high: number;
  };
  predictedPPM: {
    low: number;
    expected: number;
    high: number;
  };
  confidenceLevel: number;
  riskEvents: string[];
}

export interface BatchRiskAssessment {
  assessmentDate: Date;
  partsAssessed: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    minimal: number;
  };
  topRiskParts: QualityRiskScore[];
  systemwideMetrics: {
    avgRiskScore: number;
    avgFPY: number;
    totalOpenNCRs: number;
    trendingWorse: number;
  };
  recommendations: string[];
}

// =============================================================================
// QUALITY PREDICTION ENGINE CLASS
// =============================================================================

export class QualityPredictionEngine {
  private dataExtractor = getQualityDataExtractor();
  private metricsCalculator = getQualityMetricsCalculator();
  private patternRecognition = getQualityPatternRecognition();
  private anomalyDetector = getQualityAnomalyDetector();

  /**
   * Calculate comprehensive quality risk score for a part
   */
  async calculateRiskScore(
    partId: string,
    months: number = 12
  ): Promise<QualityRiskScore> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const riskFactors: RiskFactor[] = [];

    // Get quality data
    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, months);

    // 1. Historical Performance Risk
    const historicalRisk = this.calculateHistoricalRisk(qualitySummary);
    riskFactors.push(historicalRisk);

    // 2. Supplier Risk
    const supplierRisk = await this.calculateSupplierRisk(partId, months);
    riskFactors.push(supplierRisk);

    // 3. Pattern Risk (recurring issues)
    const patternRisk = await this.calculatePatternRisk(partId, months);
    riskFactors.push(patternRisk);

    // 4. Anomaly Risk
    const anomalyRisk = await this.calculateAnomalyRisk(partId, months);
    riskFactors.push(anomalyRisk);

    // 5. Process Risk (based on drift)
    const processRisk = await this.calculateProcessRisk(partId, months);
    riskFactors.push(processRisk);

    // Calculate overall risk score (weighted average)
    const totalWeight = riskFactors.reduce((sum, f) => sum + f.weight, 0);
    const weightedScore = riskFactors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const overallRiskScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Determine risk level
    let riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'minimal' = 'minimal';
    if (overallRiskScore >= 80) riskLevel = 'critical';
    else if (overallRiskScore >= 60) riskLevel = 'high';
    else if (overallRiskScore >= 40) riskLevel = 'medium';
    else if (overallRiskScore >= 20) riskLevel = 'low';

    // Calculate historical performance metrics
    const trend = qualitySummary?.qualityTrend || [];
    const avgFPY = trend.length > 0
      ? trend.reduce((sum, t) => sum + t.firstPassYield, 0) / trend.length
      : 100;
    const ncrFrequency = trend.length > 0
      ? trend.reduce((sum, t) => sum + t.ncrCount, 0) / trend.length
      : 0;

    // Determine trend direction
    let trendDirection: 'improving' | 'stable' | 'degrading' = 'stable';
    if (trend.length >= 3) {
      const recentFPY = trend.slice(-3).reduce((s, t) => s + t.firstPassYield, 0) / 3;
      const olderFPY = trend.slice(0, 3).reduce((s, t) => s + t.firstPassYield, 0) / 3;
      if (recentFPY > olderFPY + 2) trendDirection = 'improving';
      else if (recentFPY < olderFPY - 2) trendDirection = 'degrading';
    }

    // Predict next month outcome
    const ncrPrediction = await this.predictNCR(partId, 1);
    const predictedOutcome = {
      nextMonthNCRProbability: ncrPrediction.probability,
      expectedFPY: this.predictFPY(trend),
      confidenceLevel: ncrPrediction.confidenceLevel,
    };

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(riskFactors, riskLevel);

    return {
      partId,
      partSku: part.partNumber,
      partName: part.name,
      overallRiskScore,
      riskLevel,
      riskFactors,
      historicalPerformance: {
        avgFPY: Math.round(avgFPY * 10) / 10,
        avgPPM: qualitySummary?.totalNCRs || 0,
        ncrFrequency: Math.round(ncrFrequency * 10) / 10,
        trendDirection,
      },
      predictedOutcome,
      recommendations,
      lastUpdated: new Date(),
    };
  }

  /**
   * Predict NCR occurrence for a part
   */
  async predictNCR(
    partId: string,
    monthsAhead: number = 1
  ): Promise<NCRPrediction> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const ncrHistory = await this.dataExtractor.extractNCRHistory({ partId, months: 12 });
    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, 12);

    // Calculate historical NCR rate
    const monthlyNCRs = new Map<string, number>();
    ncrHistory.forEach((ncr) => {
      const key = ncr.createdAt.getFullYear() + '-' + String(ncr.createdAt.getMonth() + 1).padStart(2, '0');
      monthlyNCRs.set(key, (monthlyNCRs.get(key) || 0) + 1);
    });

    const monthlyRates = Array.from(monthlyNCRs.values());
    const avgMonthlyRate = monthlyRates.length > 0
      ? monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length
      : 0;

    // Calculate trend
    let recentTrend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (monthlyRates.length >= 3) {
      const recentAvg = monthlyRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = monthlyRates.slice(0, Math.max(1, monthlyRates.length - 3))
        .reduce((a, b) => a + b, 0) / Math.max(1, monthlyRates.length - 3);
      if (recentAvg < olderAvg * 0.8) recentTrend = 'improving';
      else if (recentAvg > olderAvg * 1.2) recentTrend = 'worsening';
    }

    // Predict probability (Poisson-like approach)
    const lambda = avgMonthlyRate * (recentTrend === 'worsening' ? 1.2 : recentTrend === 'improving' ? 0.8 : 1);
    const probability = 1 - Math.exp(-lambda);

    // Expected count range
    const expectedMin = Math.max(0, Math.floor(lambda - Math.sqrt(lambda)));
    const expectedMax = Math.ceil(lambda + Math.sqrt(lambda) * 2);
    const expected = Math.round(lambda);

    // Confidence based on data quality
    const confidenceLevel = Math.min(0.95, 0.5 + (monthlyRates.length / 12) * 0.45);

    // Identify risk factors
    const riskFactors: string[] = [];
    if (recentTrend === 'worsening') riskFactors.push('Increasing NCR trend');
    if (qualitySummary && qualitySummary.openNCRs > 0) riskFactors.push(qualitySummary.openNCRs + ' open NCR(s)');
    if (qualitySummary && qualitySummary.firstPassYield < 95) riskFactors.push('Below-target FPY');

    const mitigatingFactors: string[] = [];
    if (recentTrend === 'improving') mitigatingFactors.push('Improving quality trend');
    if (qualitySummary && qualitySummary.firstPassYield >= 98) mitigatingFactors.push('Excellent FPY');

    // Generate recommendations
    const recommendations: string[] = [];
    if (probability > 0.7) {
      recommendations.push('High NCR probability - increase inspection frequency');
      recommendations.push('Review recent quality data for early warning signs');
    } else if (probability > 0.4) {
      recommendations.push('Moderate NCR risk - maintain vigilance');
    }
    if (recentTrend === 'worsening') {
      recommendations.push('Address root causes of quality decline');
    }

    // Calculate prediction period
    const start = new Date();
    start.setMonth(start.getMonth() + 1);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + monthsAhead);
    end.setDate(0);

    return {
      partId,
      partSku: part.partNumber,
      predictionPeriod: { start, end },
      probability: Math.round(probability * 100) / 100,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      expectedNCRCount: {
        min: expectedMin,
        expected,
        max: expectedMax,
      },
      riskFactors,
      mitigatingFactors,
      historicalBasis: {
        periodsAnalyzed: monthlyRates.length,
        historicalRate: Math.round(avgMonthlyRate * 10) / 10,
        recentTrend,
      },
      recommendations,
    };
  }

  /**
   * Generate quality forecast for a part
   */
  async generateForecast(
    partId: string,
    periodsAhead: number = 3
  ): Promise<QualityForecast> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, 12);
    const trend = qualitySummary?.qualityTrend || [];

    // Calculate trend parameters using simple exponential smoothing
    const fpyValues = trend.map((t) => t.firstPassYield);
    const ncrValues = trend.map((t) => t.ncrCount);

    const fpyForecast = this.exponentialSmoothing(fpyValues, 0.3);
    const ncrForecast = this.exponentialSmoothing(ncrValues, 0.3);

    // Generate forecast periods
    const forecastPeriods: ForecastPeriod[] = [];
    const now = new Date();

    for (let i = 1; i <= periodsAhead; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = forecastDate.getFullYear() + '-' + String(forecastDate.getMonth() + 1).padStart(2, '0');

      // Decay confidence over time
      const baseConfidence = Math.min(0.9, 0.5 + (trend.length / 12) * 0.4);
      const confidenceLevel = Math.max(0.3, baseConfidence - (i - 1) * 0.15);

      // FPY prediction with uncertainty
      const fpyPredicted = Math.max(0, Math.min(100, fpyForecast));
      const fpyUncertainty = (100 - baseConfidence * 100) * 0.3 + i * 2;

      // NCR prediction with uncertainty
      const ncrPredicted = Math.max(0, ncrForecast);
      const ncrUncertainty = Math.max(0.5, ncrPredicted * 0.3 + i * 0.5);

      // PPM prediction (rough estimate based on NCR count)
      const avgInspected = trend.length > 0
        ? trend.reduce((s, t) => s + t.totalInspections, 0) / trend.length
        : 10;
      const ppmPredicted = avgInspected > 0 ? (ncrPredicted / avgInspected) * 1_000_000 : 0;
      const ppmUncertainty = ppmPredicted * 0.4;

      // Risk events
      const riskEvents: string[] = [];
      if (fpyPredicted < 95) riskEvents.push('FPY below target');
      if (ncrPredicted > 2) riskEvents.push('Elevated NCR count expected');

      forecastPeriods.push({
        period,
        predictedFPY: {
          low: Math.round(Math.max(0, fpyPredicted - fpyUncertainty) * 10) / 10,
          expected: Math.round(fpyPredicted * 10) / 10,
          high: Math.round(Math.min(100, fpyPredicted + fpyUncertainty) * 10) / 10,
        },
        predictedNCRCount: {
          low: Math.max(0, Math.floor(ncrPredicted - ncrUncertainty)),
          expected: Math.round(ncrPredicted),
          high: Math.ceil(ncrPredicted + ncrUncertainty),
        },
        predictedPPM: {
          low: Math.max(0, Math.round(ppmPredicted - ppmUncertainty)),
          expected: Math.round(ppmPredicted),
          high: Math.round(ppmPredicted + ppmUncertainty),
        },
        confidenceLevel: Math.round(confidenceLevel * 100) / 100,
        riskEvents,
      });
    }

    // Determine overall trend
    let overallTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (fpyValues.length >= 3) {
      const recentAvg = fpyValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = fpyValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      if (recentAvg > olderAvg + 2) overallTrend = 'improving';
      else if (recentAvg < olderAvg - 2) overallTrend = 'degrading';
    }

    // Key assumptions
    const keyAssumptions = [
      'No major process changes',
      'Consistent supplier quality',
      'Normal demand patterns',
    ];

    // Risks and opportunities
    const risks: string[] = [];
    const opportunities: string[] = [];

    if (overallTrend === 'degrading') {
      risks.push('Quality degradation trend may continue');
    }
    if (qualitySummary && qualitySummary.openNCRs > 2) {
      risks.push('Multiple open NCRs may indicate systemic issues');
    }

    if (overallTrend === 'improving') {
      opportunities.push('Quality improvement momentum can be leveraged');
    }
    if (qualitySummary && qualitySummary.firstPassYield > 98) {
      opportunities.push('Maintain excellent quality through process standardization');
    }

    return {
      partId,
      partSku: part.partNumber,
      forecastPeriods,
      overallTrend,
      confidenceLevel: Math.min(0.9, 0.5 + (trend.length / 12) * 0.4),
      keyAssumptions,
      risks,
      opportunities,
    };
  }

  /**
   * Perform batch risk assessment for all parts
   */
  async performBatchRiskAssessment(
    partType?: string,
    limit: number = 100
  ): Promise<BatchRiskAssessment> {
    // Get parts to assess
    const whereClause: Record<string, unknown> = { status: 'ACTIVE' };
    if (partType) whereClause.type = partType;

    const parts = await prisma.part.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const riskScores: QualityRiskScore[] = [];
    const riskDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      minimal: 0,
    };

    let totalRiskScore = 0;
    let totalFPY = 0;
    let trendingWorse = 0;

    // Calculate risk for each part
    for (const part of parts) {
      try {
        const riskScore = await this.calculateRiskScore(part.id, 6);
        riskScores.push(riskScore);
        riskDistribution[riskScore.riskLevel]++;
        totalRiskScore += riskScore.overallRiskScore;
        totalFPY += riskScore.historicalPerformance.avgFPY;
        if (riskScore.historicalPerformance.trendDirection === 'degrading') {
          trendingWorse++;
        }
      } catch (error) {
        // Skip parts with insufficient data
        continue;
      }
    }

    // Get top risk parts
    const topRiskParts = riskScores
      .sort((a, b) => b.overallRiskScore - a.overallRiskScore)
      .slice(0, 10);

    // Get total open NCRs
    const totalOpenNCRs = await prisma.nCR.count({
      where: { status: { notIn: ['closed', 'voided'] } },
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskDistribution.critical > 0) {
      recommendations.push('Immediate attention required for ' + riskDistribution.critical + ' critical-risk part(s)');
    }
    if (riskDistribution.high > 5) {
      recommendations.push('Implement quality improvement program for high-risk parts');
    }
    if (trendingWorse > riskScores.length * 0.2) {
      recommendations.push('Review root causes of widespread quality degradation');
    }
    if (totalOpenNCRs > 10) {
      recommendations.push('Prioritize closure of ' + totalOpenNCRs + ' open NCRs');
    }

    return {
      assessmentDate: new Date(),
      partsAssessed: riskScores.length,
      riskDistribution,
      topRiskParts,
      systemwideMetrics: {
        avgRiskScore: riskScores.length > 0 ? Math.round(totalRiskScore / riskScores.length) : 0,
        avgFPY: riskScores.length > 0 ? Math.round((totalFPY / riskScores.length) * 10) / 10 : 100,
        totalOpenNCRs,
        trendingWorse,
      },
      recommendations,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private calculateHistoricalRisk(qualitySummary: PartQualitySummary | null): RiskFactor {
    if (!qualitySummary) {
      return {
        name: 'Historical Performance',
        category: 'historical',
        score: 20,
        weight: 0.3,
        impact: 'low',
        description: 'No historical data available',
        trend: 'stable',
      };
    }

    const fpy = qualitySummary.firstPassYield;
    let score = 0;
    let impact: 'high' | 'medium' | 'low' = 'low';

    if (fpy < 85) { score = 90; impact = 'high'; }
    else if (fpy < 90) { score = 70; impact = 'high'; }
    else if (fpy < 95) { score = 50; impact = 'medium'; }
    else if (fpy < 98) { score = 30; impact = 'low'; }
    else { score = 10; impact = 'low'; }

    // Adjust for open NCRs
    if (qualitySummary.openNCRs > 0) {
      score = Math.min(100, score + qualitySummary.openNCRs * 10);
    }

    const trend = qualitySummary.qualityTrend || [];
    let trendDirection: 'improving' | 'stable' | 'worsening' = 'stable';
    if (trend.length >= 3) {
      const recent = trend.slice(-3).reduce((s: number, t: QualityTrendData) => s + t.firstPassYield, 0) / 3;
      const older = trend.slice(0, 3).reduce((s: number, t: QualityTrendData) => s + t.firstPassYield, 0) / 3;
      if (recent > older + 2) trendDirection = 'improving';
      else if (recent < older - 2) trendDirection = 'worsening';
    }

    return {
      name: 'Historical Performance',
      category: 'historical',
      score,
      weight: 0.3,
      impact,
      description: 'FPY: ' + fpy.toFixed(1) + '%, ' + qualitySummary.totalNCRs + ' NCRs',
      trend: trendDirection,
    };
  }

  private async calculateSupplierRisk(partId: string, months: number): Promise<RiskFactor> {
    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, months);
    if (!qualitySummary || qualitySummary.supplierQuality.length === 0) {
      return {
        name: 'Supplier Quality',
        category: 'supplier',
        score: 20,
        weight: 0.2,
        impact: 'low',
        description: 'No supplier data available',
        trend: 'stable',
      };
    }

    const avgAcceptance = qualitySummary.supplierQuality
      .reduce((sum, s) => sum + s.acceptanceRate, 0) / qualitySummary.supplierQuality.length;

    let score = 0;
    let impact: 'high' | 'medium' | 'low' = 'low';

    if (avgAcceptance < 85) { score = 90; impact = 'high'; }
    else if (avgAcceptance < 90) { score = 70; impact = 'high'; }
    else if (avgAcceptance < 95) { score = 50; impact = 'medium'; }
    else if (avgAcceptance < 98) { score = 30; impact = 'low'; }
    else { score = 10; impact = 'low'; }

    return {
      name: 'Supplier Quality',
      category: 'supplier',
      score,
      weight: 0.2,
      impact,
      description: 'Avg supplier acceptance: ' + avgAcceptance.toFixed(1) + '%',
      trend: 'stable',
    };
  }

  private async calculatePatternRisk(partId: string, months: number): Promise<RiskFactor> {
    try {
      const patternResult = await this.patternRecognition.detectRecurringIssues(partId, months);

      let score = 0;
      let impact: 'high' | 'medium' | 'low' = 'low';

      const unresolvedCount = patternResult.issues.filter((i) => !i.isResolved).length;
      const highFreqCount = patternResult.issues.filter((i) => i.frequency === 'high').length;

      if (highFreqCount > 0 || unresolvedCount > 2) { score = 80; impact = 'high'; }
      else if (unresolvedCount > 0) { score = 50; impact = 'medium'; }
      else if (patternResult.issues.length > 0) { score = 30; impact = 'low'; }
      else { score = 10; impact = 'low'; }

      return {
        name: 'Recurring Issues',
        category: 'pattern',
        score,
        weight: 0.2,
        impact,
        description: patternResult.issues.length + ' recurring issue(s), ' + unresolvedCount + ' unresolved',
        trend: unresolvedCount > 0 ? 'worsening' : 'stable',
      };
    } catch {
      return {
        name: 'Recurring Issues',
        category: 'pattern',
        score: 20,
        weight: 0.2,
        impact: 'low',
        description: 'Insufficient data for pattern analysis',
        trend: 'stable',
      };
    }
  }

  private async calculateAnomalyRisk(partId: string, months: number): Promise<RiskFactor> {
    try {
      const anomalyResult = await this.anomalyDetector.detectAnomalies(partId, months);

      let score = 0;
      let impact: 'high' | 'medium' | 'low' = 'low';

      if (anomalyResult.riskLevel === 'high') { score = 90; impact = 'high'; }
      else if (anomalyResult.riskLevel === 'medium') { score = 60; impact = 'medium'; }
      else if (anomalyResult.riskLevel === 'low') { score = 30; impact = 'low'; }
      else { score = 10; impact = 'low'; }

      return {
        name: 'Anomaly Detection',
        category: 'anomaly',
        score,
        weight: 0.15,
        impact,
        description: anomalyResult.anomalyCount + ' anomalies (' + anomalyResult.severityDistribution.critical + ' critical)',
        trend: anomalyResult.anomalyCount > 2 ? 'worsening' : 'stable',
      };
    } catch {
      return {
        name: 'Anomaly Detection',
        category: 'anomaly',
        score: 20,
        weight: 0.15,
        impact: 'low',
        description: 'Insufficient data for anomaly detection',
        trend: 'stable',
      };
    }
  }

  private async calculateProcessRisk(partId: string, months: number): Promise<RiskFactor> {
    try {
      const driftResult = await this.patternRecognition.detectQualityDrift(partId, months);

      let score = 0;
      let impact: 'high' | 'medium' | 'low' = 'low';
      let trend: 'improving' | 'stable' | 'worsening' = 'stable';

      if (driftResult.driftDirection === 'degrading') {
        if (Math.abs(driftResult.driftMagnitude) > 10) { score = 85; impact = 'high'; }
        else if (Math.abs(driftResult.driftMagnitude) > 5) { score = 60; impact = 'medium'; }
        else { score = 40; impact = 'low'; }
        trend = 'worsening';
      } else if (driftResult.driftDirection === 'improving') {
        score = 15;
        impact = 'low';
        trend = 'improving';
      } else {
        score = 25;
        impact = 'low';
      }

      return {
        name: 'Process Stability',
        category: 'process',
        score,
        weight: 0.15,
        impact,
        description: 'Drift: ' + driftResult.driftMagnitude.toFixed(1) + '% (' + driftResult.driftDirection + ')',
        trend,
      };
    } catch {
      return {
        name: 'Process Stability',
        category: 'process',
        score: 20,
        weight: 0.15,
        impact: 'low',
        description: 'Insufficient data for drift analysis',
        trend: 'stable',
      };
    }
  }

  private predictFPY(trend: QualityTrendData[]): number {
    if (trend.length < 2) return 95;

    // Simple linear extrapolation
    const fpyValues = trend.map((t) => t.firstPassYield);
    const n = fpyValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += fpyValues[i];
      sumXY += i * fpyValues[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predicted = slope * n + intercept;
    return Math.round(Math.max(0, Math.min(100, predicted)) * 10) / 10;
  }

  private exponentialSmoothing(values: number[], alpha: number): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    let forecast = values[0];
    for (let i = 1; i < values.length; i++) {
      forecast = alpha * values[i] + (1 - alpha) * forecast;
    }

    return forecast;
  }

  private generateRiskRecommendations(
    riskFactors: RiskFactor[],
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];

    // High-risk factors
    const highImpactFactors = riskFactors.filter((f) => f.impact === 'high');
    for (const factor of highImpactFactors) {
      switch (factor.category) {
        case 'historical':
          recommendations.push('Implement quality improvement program to improve FPY');
          break;
        case 'supplier':
          recommendations.push('Conduct supplier quality audit');
          break;
        case 'pattern':
          recommendations.push('Address recurring defects through root cause analysis');
          break;
        case 'anomaly':
          recommendations.push('Investigate detected quality anomalies');
          break;
        case 'process':
          recommendations.push('Stabilize process to prevent further quality drift');
          break;
      }
    }

    // Risk-level specific
    if (riskLevel === 'critical') {
      recommendations.push('Escalate to quality leadership immediately');
      recommendations.push('Consider production hold pending investigation');
    } else if (riskLevel === 'high') {
      recommendations.push('Schedule immediate quality review meeting');
    }

    // Worsening trends
    const worseningFactors = riskFactors.filter((f) => f.trend === 'worsening');
    if (worseningFactors.length > 0) {
      recommendations.push('Monitor worsening trends in: ' + worseningFactors.map((f) => f.name).join(', '));
    }

    return recommendations.slice(0, 5); // Limit to top 5
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let engineInstance: QualityPredictionEngine | null = null;

export function getQualityPredictionEngine(): QualityPredictionEngine {
  if (!engineInstance) {
    engineInstance = new QualityPredictionEngine();
  }
  return engineInstance;
}
