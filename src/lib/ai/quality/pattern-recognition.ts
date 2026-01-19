// =============================================================================
// QUALITY PATTERN RECOGNITION
// Detects quality drift, recurring issues, and correlations
// =============================================================================

import { prisma } from '@/lib/prisma';
import { getQualityDataExtractor, type InspectionHistoryPoint, type NCRHistoryPoint } from './quality-data-extractor';
import { getQualityMetricsCalculator } from './quality-metrics-calculator';

// =============================================================================
// TYPES
// =============================================================================

export interface QualityDriftResult {
  partId: string;
  partSku: string;
  hasDrift: boolean;
  driftDirection: 'degrading' | 'improving' | 'stable';
  driftMagnitude: number; // Percentage change
  confidence: number;
  trendData: {
    period: string;
    fpy: number;
    ppm: number;
    ncrCount: number;
  }[];
  movingAverage: {
    period: string;
    value: number;
  }[];
  driftStartDate: Date | null;
  alerts: string[];
  recommendations: string[];
}

export interface RecurringIssueResult {
  partId: string;
  partSku: string;
  hasRecurringIssues: boolean;
  issues: RecurringIssue[];
  totalOccurrences: number;
  impactScore: number;
  recommendations: string[];
}

export interface RecurringIssue {
  defectCategory: string;
  defectCode: string | null;
  occurrences: number;
  frequency: 'high' | 'medium' | 'low';
  lastOccurrence: Date;
  firstOccurrence: Date;
  avgQuantityAffected: number;
  totalQuantityAffected: number;
  associatedSuppliers: string[];
  commonRootCauses: string[];
  isResolved: boolean;
  pattern: string;
}

export interface SupplierCorrelationResult {
  partId: string;
  partSku: string;
  supplierId: string;
  supplierName: string;
  hasCorrelation: boolean;
  correlationStrength: 'strong' | 'moderate' | 'weak' | 'none';
  correlationScore: number; // 0-1
  supplierMetrics: {
    totalLots: number;
    defectiveLots: number;
    defectRate: number;
    avgDefectsPerLot: number;
    ncrCount: number;
  };
  overallMetrics: {
    totalLots: number;
    defectiveLots: number;
    defectRate: number;
    avgDefectsPerLot: number;
    ncrCount: number;
  };
  defectComparison: {
    category: string;
    supplierCount: number;
    overallCount: number;
    supplierPercentage: number;
    isOverrepresented: boolean;
  }[];
  recommendations: string[];
}

export interface ProductionCorrelationResult {
  partId: string;
  partSku: string;
  workOrderId: string;
  workOrderNumber: string;
  hasCorrelation: boolean;
  correlationFactors: ProductionCorrelationFactor[];
  riskScore: number;
  recommendations: string[];
}

export interface ProductionCorrelationFactor {
  factor: string;
  value: string | number;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

// =============================================================================
// PATTERN RECOGNITION CLASS
// =============================================================================

export class QualityPatternRecognition {
  private dataExtractor = getQualityDataExtractor();
  private metricsCalculator = getQualityMetricsCalculator();

  /**
   * Detect quality drift over time for a part
   */
  async detectQualityDrift(
    partId: string,
    months: number = 12
  ): Promise<QualityDriftResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, months);
    if (!qualitySummary) throw new Error('No quality data for part: ' + partId);

    const trendData = qualitySummary.qualityTrend.map((t) => ({
      period: t.period,
      fpy: t.firstPassYield,
      ppm: t.totalInspections > 0
        ? (t.ncrCount / t.totalInspections) * 1_000_000
        : 0,
      ncrCount: t.ncrCount,
    }));

    // Calculate moving average (3-month window)
    const movingAverage = this.calculateMovingAverage(
      trendData.map((t) => t.fpy),
      3
    ).map((value, idx) => ({
      period: trendData[idx]?.period || '',
      value,
    }));

    // Detect drift using linear regression
    const fpyValues = trendData.map((t) => t.fpy);
    const regression = this.linearRegression(fpyValues);
    const driftMagnitude = regression.slope * months;

    let driftDirection: 'degrading' | 'improving' | 'stable' = 'stable';
    if (driftMagnitude < -2) driftDirection = 'degrading';
    else if (driftMagnitude > 2) driftDirection = 'improving';

    const hasDrift = Math.abs(driftMagnitude) > 2;

    // Calculate confidence based on data quality
    const dataPoints = trendData.filter((t) => t.fpy < 100 || t.ncrCount > 0).length;
    const confidence = Math.min(0.95, 0.5 + (dataPoints / months) * 0.45);

    // Find drift start date
    let driftStartDate: Date | null = null;
    if (hasDrift) {
      const changePoints = this.detectChangePoints(fpyValues);
      if (changePoints.length > 0) {
        const idx = changePoints[0];
        if (trendData[idx]) {
          const [year, month] = trendData[idx].period.split('-').map(Number);
          driftStartDate = new Date(year, month - 1, 1);
        }
      }
    }

    // Generate alerts
    const alerts: string[] = [];
    if (driftDirection === 'degrading' && Math.abs(driftMagnitude) > 5) {
      alerts.push('Critical: Quality degradation detected (' + Math.abs(driftMagnitude).toFixed(1) + '% over ' + months + ' months)');
    }
    if (qualitySummary.firstPassYield < 95) {
      alerts.push('Warning: First pass yield (' + qualitySummary.firstPassYield.toFixed(1) + '%) below target (95%)');
    }
    if (qualitySummary.openNCRs > 0) {
      alerts.push('Info: ' + qualitySummary.openNCRs + ' open NCR(s) requiring attention');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (driftDirection === 'degrading') {
      recommendations.push('Conduct root cause analysis for recent quality issues');
      recommendations.push('Review supplier quality performance');
      recommendations.push('Consider increasing inspection frequency');
    }
    if (qualitySummary.topDefects.length > 0) {
      const topDefect = qualitySummary.topDefects[0];
      recommendations.push('Focus improvement on "' + topDefect.category + '" defects (' + topDefect.count + ' occurrences)');
    }

    return {
      partId,
      partSku: part.partNumber,
      hasDrift,
      driftDirection,
      driftMagnitude: Math.round(driftMagnitude * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      trendData,
      movingAverage,
      driftStartDate,
      alerts,
      recommendations,
    };
  }

  /**
   * Detect recurring issues for a part
   */
  async detectRecurringIssues(
    partId: string,
    months: number = 12
  ): Promise<RecurringIssueResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const ncrHistory = await this.dataExtractor.extractNCRHistory({ partId, months });

    // Group NCRs by defect category
    const categoryGroups = new Map<string, NCRHistoryPoint[]>();
    ncrHistory.forEach((ncr) => {
      const key = ncr.defectCategory || 'Unknown';
      const group = categoryGroups.get(key) || [];
      group.push(ncr);
      categoryGroups.set(key, group);
    });

    // Analyze each category for recurring patterns
    const issues: RecurringIssue[] = [];
    let totalOccurrences = 0;
    let totalImpact = 0;

    for (const [category, ncrs] of categoryGroups.entries()) {
      if (ncrs.length < 2) continue; // Need at least 2 occurrences to be recurring

      const occurrences = ncrs.length;
      totalOccurrences += occurrences;

      // Determine frequency
      const monthsSpan = this.calculateMonthsSpan(ncrs);
      const occurrencesPerMonth = monthsSpan > 0 ? occurrences / monthsSpan : occurrences;
      let frequency: 'high' | 'medium' | 'low' = 'low';
      if (occurrencesPerMonth >= 2) frequency = 'high';
      else if (occurrencesPerMonth >= 0.5) frequency = 'medium';

      // Calculate quantities
      const quantities = ncrs.map((n) => n.quantityAffected);
      const totalQuantityAffected = quantities.reduce((a, b) => a + b, 0);
      const avgQuantityAffected = totalQuantityAffected / occurrences;
      totalImpact += totalQuantityAffected;

      // Get associated suppliers
      const supplierNames = [...new Set(ncrs.map((n) => n.supplierName).filter(Boolean))] as string[];

      // Get common root causes
      const rootCauses = ncrs
        .map((n) => n.rootCause || n.preliminaryCause)
        .filter(Boolean) as string[];
      const uniqueRootCauses = [...new Set(rootCauses)].slice(0, 3);

      // Check if issue is resolved (no recent occurrences)
      const recentCutoff = new Date();
      recentCutoff.setMonth(recentCutoff.getMonth() - 2);
      const recentNCRs = ncrs.filter((n) => n.createdAt >= recentCutoff);
      const isResolved = recentNCRs.length === 0;

      // Identify pattern
      const pattern = this.identifyPattern(ncrs);

      const dates = ncrs.map((n) => n.createdAt);
      const defectCodes = [...new Set(ncrs.map((n) => n.defectCode).filter(Boolean))];

      issues.push({
        defectCategory: category,
        defectCode: defectCodes[0] || null,
        occurrences,
        frequency,
        lastOccurrence: new Date(Math.max(...dates.map((d) => d.getTime()))),
        firstOccurrence: new Date(Math.min(...dates.map((d) => d.getTime()))),
        avgQuantityAffected: Math.round(avgQuantityAffected),
        totalQuantityAffected,
        associatedSuppliers: supplierNames,
        commonRootCauses: uniqueRootCauses,
        isResolved,
        pattern,
      });
    }

    // Sort by occurrences
    issues.sort((a, b) => b.occurrences - a.occurrences);

    // Calculate impact score (0-100)
    const maxImpact = 1000; // Threshold for max impact
    const impactScore = Math.min(100, Math.round((totalImpact / maxImpact) * 100));

    // Generate recommendations
    const recommendations: string[] = [];
    const unresolvedIssues = issues.filter((i) => !i.isResolved);
    if (unresolvedIssues.length > 0) {
      recommendations.push('Address ' + unresolvedIssues.length + ' unresolved recurring issue(s)');
      const topUnresolved = unresolvedIssues[0];
      recommendations.push('Priority: Fix "' + topUnresolved.defectCategory + '" (' + topUnresolved.occurrences + ' occurrences)');
    }

    const highFrequencyIssues = issues.filter((i) => i.frequency === 'high');
    if (highFrequencyIssues.length > 0) {
      recommendations.push('Implement permanent corrective actions for high-frequency defects');
    }

    const supplierRelated = issues.filter((i) => i.associatedSuppliers.length > 0);
    if (supplierRelated.length > 0) {
      recommendations.push('Review supplier quality for: ' + [...new Set(supplierRelated.flatMap((i) => i.associatedSuppliers))].join(', '));
    }

    return {
      partId,
      partSku: part.partNumber,
      hasRecurringIssues: issues.length > 0,
      issues,
      totalOccurrences,
      impactScore,
      recommendations,
    };
  }

  /**
   * Correlate quality issues with a specific supplier
   */
  async correlateWithSupplier(
    partId: string,
    supplierId: string,
    months: number = 12
  ): Promise<SupplierCorrelationResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new Error('Supplier not found: ' + supplierId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get all inspections for this part
    const allInspections = await prisma.inspection.findMany({
      where: {
        partId,
        type: 'RECEIVING',
        status: 'completed',
        createdAt: { gte: startDate },
      },
    });

    // Get all NCRs for this part
    const allNCRs = await this.dataExtractor.extractNCRHistory({ partId, months });

    // For now, we'll assume supplier correlation based on receiving inspections
    // In a real system, you'd track which supplier provided each lot
    const supplierData = await this.dataExtractor.extractSupplierQualityData(supplierId, months);

    // Calculate overall metrics
    const overallTotalLots = allInspections.length;
    const overallDefectiveLots = allInspections.filter((i) => i.result === 'FAIL').length;
    const overallDefectRate = overallTotalLots > 0
      ? (overallDefectiveLots / overallTotalLots) * 100
      : 0;
    const overallAvgDefects = overallTotalLots > 0
      ? allNCRs.length / overallTotalLots
      : 0;

    // Calculate supplier-specific metrics
    const supplierTotalLots = supplierData?.totalLots || 0;
    const supplierDefectiveLots = supplierData?.rejectedLots || 0;
    const supplierDefectRate = supplierTotalLots > 0
      ? (supplierDefectiveLots / supplierTotalLots) * 100
      : 0;
    const supplierAvgDefects = supplierTotalLots > 0
      ? (supplierData?.totalNCRs || 0) / supplierTotalLots
      : 0;
    const supplierNCRCount = supplierData?.totalNCRs || 0;

    // Calculate correlation score
    // If supplier defect rate is significantly higher than overall, there's correlation
    const rateDifference = supplierDefectRate - overallDefectRate;
    let correlationScore = 0;
    if (overallDefectRate > 0 && supplierDefectRate > 0) {
      correlationScore = Math.min(1, Math.max(0, rateDifference / 20 + 0.5));
    }

    let correlationStrength: 'strong' | 'moderate' | 'weak' | 'none' = 'none';
    if (correlationScore >= 0.7) correlationStrength = 'strong';
    else if (correlationScore >= 0.5) correlationStrength = 'moderate';
    else if (correlationScore >= 0.3) correlationStrength = 'weak';

    const hasCorrelation = correlationStrength !== 'none';

    // Compare defect categories
    const overallCategories = new Map<string, number>();
    allNCRs.forEach((n) => {
      const cat = n.defectCategory || 'Unknown';
      overallCategories.set(cat, (overallCategories.get(cat) || 0) + 1);
    });

    const supplierCategories = supplierData?.defectCategories || [];
    const defectComparison = supplierCategories.map((sc) => {
      const overallCount = overallCategories.get(sc.category) || 0;
      const supplierPercentage = supplierNCRCount > 0
        ? (sc.count / supplierNCRCount) * 100
        : 0;
      const overallPercentage = allNCRs.length > 0
        ? (overallCount / allNCRs.length) * 100
        : 0;
      return {
        category: sc.category,
        supplierCount: sc.count,
        overallCount,
        supplierPercentage: Math.round(supplierPercentage * 10) / 10,
        isOverrepresented: supplierPercentage > overallPercentage * 1.2,
      };
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (hasCorrelation && correlationStrength === 'strong') {
      recommendations.push('Strong correlation found - implement supplier improvement program');
      recommendations.push('Consider qualifying alternative supplier');
    } else if (hasCorrelation && correlationStrength === 'moderate') {
      recommendations.push('Moderate correlation - increase incoming inspection for this supplier');
      recommendations.push('Schedule supplier quality review meeting');
    }

    const overrepresented = defectComparison.filter((d) => d.isOverrepresented);
    if (overrepresented.length > 0) {
      recommendations.push('Address overrepresented defects: ' + overrepresented.map((d) => d.category).join(', '));
    }

    return {
      partId,
      partSku: part.partNumber,
      supplierId,
      supplierName: supplier.name,
      hasCorrelation,
      correlationStrength,
      correlationScore: Math.round(correlationScore * 100) / 100,
      supplierMetrics: {
        totalLots: supplierTotalLots,
        defectiveLots: supplierDefectiveLots,
        defectRate: Math.round(supplierDefectRate * 10) / 10,
        avgDefectsPerLot: Math.round(supplierAvgDefects * 100) / 100,
        ncrCount: supplierNCRCount,
      },
      overallMetrics: {
        totalLots: overallTotalLots,
        defectiveLots: overallDefectiveLots,
        defectRate: Math.round(overallDefectRate * 10) / 10,
        avgDefectsPerLot: Math.round(overallAvgDefects * 100) / 100,
        ncrCount: allNCRs.length,
      },
      defectComparison,
      recommendations,
    };
  }

  /**
   * Correlate quality issues with production (work order)
   */
  async correlateWithProduction(
    partId: string,
    workOrderId: string
  ): Promise<ProductionCorrelationResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        product: true,
        operations: {
          include: {
            workCenter: true,
          },
        },
      },
    });
    if (!workOrder) throw new Error('Work order not found: ' + workOrderId);

    // Get production quality data
    const productionQuality = await this.dataExtractor.extractProductionQualityData(workOrderId);

    // Analyze correlation factors
    const correlationFactors: ProductionCorrelationFactor[] = [];

    // Factor 1: Yield rate comparison
    const overallYield = productionQuality?.yieldRate || 100;
    if (overallYield < 95) {
      correlationFactors.push({
        factor: 'Low Yield Rate',
        value: overallYield,
        impact: overallYield < 85 ? 'high' : overallYield < 90 ? 'medium' : 'low',
        description: 'Production yield (' + overallYield.toFixed(1) + '%) below target (95%)',
      });
    }

    // Factor 2: Defect rate
    const defectRate = productionQuality?.defectRate || 0;
    if (defectRate > 1) {
      correlationFactors.push({
        factor: 'High Defect Rate',
        value: defectRate,
        impact: defectRate > 5 ? 'high' : defectRate > 2 ? 'medium' : 'low',
        description: 'Defect rate (' + defectRate.toFixed(2) + '%) exceeds threshold',
      });
    }

    // Factor 3: NCR count
    const ncrCount = productionQuality?.ncrs.length || 0;
    if (ncrCount > 0) {
      correlationFactors.push({
        factor: 'NCR Issues',
        value: ncrCount,
        impact: ncrCount > 3 ? 'high' : ncrCount > 1 ? 'medium' : 'low',
        description: ncrCount + ' NCR(s) associated with this production run',
      });
    }

    // Factor 4: Critical defects
    const criticalDefects = productionQuality?.inspections
      .reduce((sum, i) => sum + i.criticalDefects, 0) || 0;
    if (criticalDefects > 0) {
      correlationFactors.push({
        factor: 'Critical Defects',
        value: criticalDefects,
        impact: 'high',
        description: criticalDefects + ' critical defect(s) detected',
      });
    }

    // Factor 5: Work order status issues
    if (workOrder.status === 'ON_HOLD') {
      correlationFactors.push({
        factor: 'Production Hold',
        value: 'ON_HOLD',
        impact: 'medium',
        description: 'Work order currently on hold',
      });
    }

    // Calculate risk score
    const impactWeights = { high: 3, medium: 2, low: 1 };
    const totalWeight = correlationFactors.reduce(
      (sum, f) => sum + impactWeights[f.impact],
      0
    );
    const maxWeight = correlationFactors.length * 3;
    const riskScore = maxWeight > 0
      ? Math.round((totalWeight / maxWeight) * 100)
      : 0;

    const hasCorrelation = correlationFactors.length > 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (criticalDefects > 0) {
      recommendations.push('Immediate review required for critical defects');
    }
    if (overallYield < 90) {
      recommendations.push('Analyze production process for yield improvement');
    }
    if (ncrCount > 2) {
      recommendations.push('Conduct root cause analysis for multiple NCRs');
    }
    const highImpactFactors = correlationFactors.filter((f) => f.impact === 'high');
    if (highImpactFactors.length > 0) {
      recommendations.push('Address high-impact factors: ' + highImpactFactors.map((f) => f.factor).join(', '));
    }

    return {
      partId,
      partSku: part.partNumber,
      workOrderId,
      workOrderNumber: workOrder.woNumber,
      hasCorrelation,
      correlationFactors,
      riskScore,
      recommendations,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowValues = values.slice(start, i + 1);
      const avg = windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
      result.push(Math.round(avg * 10) / 10);
    }
    return result;
  }

  /**
   * Simple linear regression
   */
  private linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
      sumY2 += values[i] * values[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssTot += Math.pow(values[i] - yMean, 2);
      ssRes += Math.pow(values[i] - predicted, 2);
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
  }

  /**
   * Detect change points in time series
   */
  private detectChangePoints(values: number[]): number[] {
    const changePoints: number[] = [];
    if (values.length < 4) return changePoints;

    // Simple change point detection using mean shift
    const windowSize = Math.max(2, Math.floor(values.length / 4));

    for (let i = windowSize; i < values.length - windowSize; i++) {
      const leftMean = values.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize;
      const rightMean = values.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;

      const diff = Math.abs(rightMean - leftMean);
      const threshold = Math.abs(leftMean) * 0.15; // 15% change threshold

      if (diff > threshold && diff > 3) {
        changePoints.push(i);
      }
    }

    return changePoints;
  }

  /**
   * Calculate months span for a set of NCRs
   */
  private calculateMonthsSpan(ncrs: NCRHistoryPoint[]): number {
    if (ncrs.length < 2) return 1;

    const dates = ncrs.map((n) => n.createdAt.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    return Math.max(1, Math.ceil((maxDate - minDate) / msPerMonth));
  }

  /**
   * Identify pattern in NCR occurrences
   */
  private identifyPattern(ncrs: NCRHistoryPoint[]): string {
    if (ncrs.length < 3) return 'Insufficient data';

    // Sort by date
    const sorted = [...ncrs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Calculate intervals between occurrences
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const daysDiff = Math.ceil(
        (sorted[i].createdAt.getTime() - sorted[i - 1].createdAt.getTime()) /
        (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    // Analyze pattern
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgInterval > 0 ? stdDev / avgInterval : 0;

    // Check for regular pattern
    if (cv < 0.3 && avgInterval < 45) {
      return 'Regular pattern (every ~' + Math.round(avgInterval) + ' days)';
    }

    // Check for clustering
    const shortIntervals = intervals.filter((i) => i < 14).length;
    if (shortIntervals > intervals.length * 0.5) {
      return 'Clustered occurrences';
    }

    // Check for increasing frequency
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg < firstAvg * 0.7) {
      return 'Increasing frequency';
    } else if (secondAvg > firstAvg * 1.5) {
      return 'Decreasing frequency';
    }

    return 'Sporadic occurrences';
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let patternInstance: QualityPatternRecognition | null = null;

export function getQualityPatternRecognition(): QualityPatternRecognition {
  if (!patternInstance) {
    patternInstance = new QualityPatternRecognition();
  }
  return patternInstance;
}
