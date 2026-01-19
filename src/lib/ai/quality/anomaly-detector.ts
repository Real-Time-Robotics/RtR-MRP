// =============================================================================
// QUALITY ANOMALY DETECTOR
// Statistical Process Control (SPC) and Western Electric Rules
// =============================================================================

import { prisma } from '@/lib/prisma';
import { getQualityDataExtractor } from './quality-data-extractor';
import { getQualityMetricsCalculator } from './quality-metrics-calculator';

// =============================================================================
// TYPES
// =============================================================================

export interface SPCAnalysisResult {
  partId: string;
  partSku: string;
  characteristicName: string;
  controlLimits: {
    ucl: number; // Upper Control Limit
    lcl: number; // Lower Control Limit
    mean: number;
    usl: number | null; // Upper Spec Limit
    lsl: number | null; // Lower Spec Limit
  };
  measurements: SPCDataPoint[];
  violations: SPCViolation[];
  isInControl: boolean;
  processCapability: {
    cp: number;
    cpk: number;
    status: 'excellent' | 'acceptable' | 'marginal' | 'poor';
  };
  recommendations: string[];
}

export interface SPCDataPoint {
  date: Date;
  value: number;
  isOutOfControl: boolean;
  isOutOfSpec: boolean;
  violationRules: string[];
}

export interface SPCViolation {
  rule: string;
  ruleNumber: number;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  points: number[];
  startDate: Date;
  endDate: Date;
  recommendation: string;
}

export interface AnomalyDetectionResult {
  partId: string;
  partSku: string;
  anomalies: Anomaly[];
  anomalyCount: number;
  severityDistribution: {
    critical: number;
    major: number;
    minor: number;
  };
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  recommendations: string[];
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: 'critical' | 'major' | 'minor';
  detectedAt: Date;
  description: string;
  affectedMetric: string;
  expectedValue: number | string;
  actualValue: number | string;
  deviation: number;
  context: Record<string, unknown>;
  suggestedAction: string;
}

export type AnomalyType =
  | 'spc_violation'
  | 'sudden_shift'
  | 'trend_anomaly'
  | 'outlier'
  | 'quality_spike'
  | 'yield_drop'
  | 'ncr_cluster';

export interface QualitySpikeDetectionResult {
  partId: string;
  hasSpike: boolean;
  spikes: QualitySpike[];
  baseline: {
    avgNcrRate: number;
    avgDefectRate: number;
    period: string;
  };
  recommendations: string[];
}

export interface QualitySpike {
  period: string;
  metric: string;
  baselineValue: number;
  actualValue: number;
  spikeMultiplier: number;
  possibleCauses: string[];
}

// =============================================================================
// WESTERN ELECTRIC RULES
// =============================================================================

const WESTERN_ELECTRIC_RULES = [
  {
    number: 1,
    name: 'Beyond 3 sigma',
    description: 'Any single point falls outside the 3-sigma limits',
    severity: 'critical' as const,
    check: (values: number[], mean: number, sigma: number): number[] => {
      const violations: number[] = [];
      const ucl = mean + 3 * sigma;
      const lcl = mean - 3 * sigma;
      values.forEach((v, i) => {
        if (v > ucl || v < lcl) violations.push(i);
      });
      return violations;
    },
  },
  {
    number: 2,
    name: 'Zone A',
    description: '2 out of 3 consecutive points fall beyond 2 sigma on the same side',
    severity: 'major' as const,
    check: (values: number[], mean: number, sigma: number): number[] => {
      const violations: number[] = [];
      const upperZoneA = mean + 2 * sigma;
      const lowerZoneA = mean - 2 * sigma;
      for (let i = 2; i < values.length; i++) {
        const window = [values[i - 2], values[i - 1], values[i]];
        const aboveCount = window.filter((v) => v > upperZoneA).length;
        const belowCount = window.filter((v) => v < lowerZoneA).length;
        if (aboveCount >= 2 || belowCount >= 2) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
  {
    number: 3,
    name: 'Zone B',
    description: '4 out of 5 consecutive points fall beyond 1 sigma on the same side',
    severity: 'major' as const,
    check: (values: number[], mean: number, sigma: number): number[] => {
      const violations: number[] = [];
      const upperZoneB = mean + sigma;
      const lowerZoneB = mean - sigma;
      for (let i = 4; i < values.length; i++) {
        const window = values.slice(i - 4, i + 1);
        const aboveCount = window.filter((v) => v > upperZoneB).length;
        const belowCount = window.filter((v) => v < lowerZoneB).length;
        if (aboveCount >= 4 || belowCount >= 4) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
  {
    number: 4,
    name: 'Run',
    description: '8 consecutive points fall on the same side of the center line',
    severity: 'minor' as const,
    check: (values: number[], mean: number): number[] => {
      const violations: number[] = [];
      let consecutiveAbove = 0;
      let consecutiveBelow = 0;
      for (let i = 0; i < values.length; i++) {
        if (values[i] > mean) {
          consecutiveAbove++;
          consecutiveBelow = 0;
        } else if (values[i] < mean) {
          consecutiveBelow++;
          consecutiveAbove = 0;
        }
        if (consecutiveAbove >= 8 || consecutiveBelow >= 8) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
  {
    number: 5,
    name: 'Trend',
    description: '6 consecutive points trending up or down',
    severity: 'minor' as const,
    check: (values: number[]): number[] => {
      const violations: number[] = [];
      let trendUp = 0;
      let trendDown = 0;
      for (let i = 1; i < values.length; i++) {
        if (values[i] > values[i - 1]) {
          trendUp++;
          trendDown = 0;
        } else if (values[i] < values[i - 1]) {
          trendDown++;
          trendUp = 0;
        } else {
          trendUp = 0;
          trendDown = 0;
        }
        if (trendUp >= 6 || trendDown >= 6) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
  {
    number: 6,
    name: 'Stratification',
    description: '15 consecutive points fall within 1 sigma of the center line',
    severity: 'minor' as const,
    check: (values: number[], mean: number, sigma: number): number[] => {
      const violations: number[] = [];
      const upper = mean + sigma;
      const lower = mean - sigma;
      let consecutive = 0;
      for (let i = 0; i < values.length; i++) {
        if (values[i] > lower && values[i] < upper) {
          consecutive++;
        } else {
          consecutive = 0;
        }
        if (consecutive >= 15) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
  {
    number: 7,
    name: 'Mixture',
    description: '8 consecutive points with none within 1 sigma',
    severity: 'major' as const,
    check: (values: number[], mean: number, sigma: number): number[] => {
      const violations: number[] = [];
      const upper = mean + sigma;
      const lower = mean - sigma;
      let consecutive = 0;
      for (let i = 0; i < values.length; i++) {
        if (values[i] <= lower || values[i] >= upper) {
          consecutive++;
        } else {
          consecutive = 0;
        }
        if (consecutive >= 8) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
  {
    number: 8,
    name: 'Over-control',
    description: '14 consecutive points alternating up and down',
    severity: 'minor' as const,
    check: (values: number[]): number[] => {
      const violations: number[] = [];
      let alternating = 0;
      let lastDirection: 'up' | 'down' | null = null;
      for (let i = 1; i < values.length; i++) {
        const currentDirection = values[i] > values[i - 1] ? 'up' : values[i] < values[i - 1] ? 'down' : null;
        if (currentDirection && currentDirection !== lastDirection) {
          alternating++;
          lastDirection = currentDirection;
        } else {
          alternating = 0;
          lastDirection = currentDirection;
        }
        if (alternating >= 14) {
          if (!violations.includes(i)) violations.push(i);
        }
      }
      return violations;
    },
  },
];

// =============================================================================
// ANOMALY DETECTOR CLASS
// =============================================================================

export class QualityAnomalyDetector {
  private dataExtractor = getQualityDataExtractor();
  private metricsCalculator = getQualityMetricsCalculator();

  /**
   * Perform SPC analysis on inspection measurements
   */
  async performSPCAnalysis(
    partId: string,
    characteristicId: string,
    months: number = 6
  ): Promise<SPCAnalysisResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const characteristic = await prisma.inspectionCharacteristic.findUnique({
      where: { id: characteristicId },
    });
    if (!characteristic) throw new Error('Characteristic not found: ' + characteristicId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get measurements for this characteristic
    const results = await prisma.inspectionResult.findMany({
      where: {
        characteristicId,
        measuredValue: { not: null },
        inspection: {
          partId,
          status: 'completed',
          createdAt: { gte: startDate },
        },
      },
      include: {
        inspection: true,
      },
      orderBy: {
        inspection: { createdAt: 'asc' },
      },
    });

    const measurements = results
      .filter((r) => r.measuredValue !== null)
      .map((r) => ({
        date: r.inspection.createdAt,
        value: r.measuredValue as number,
      }));

    if (measurements.length < 2) {
      return {
        partId,
        partSku: part.partNumber,
        characteristicName: characteristic.name,
        controlLimits: {
          ucl: 0,
          lcl: 0,
          mean: 0,
          usl: characteristic.upperLimit,
          lsl: characteristic.lowerLimit,
        },
        measurements: [],
        violations: [],
        isInControl: true,
        processCapability: { cp: 0, cpk: 0, status: 'poor' },
        recommendations: ['Insufficient data for SPC analysis (need more measurements)'],
      };
    }

    // Calculate statistics
    const values = measurements.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    const sigma = Math.sqrt(variance);

    // Control limits (3-sigma)
    const ucl = mean + 3 * sigma;
    const lcl = mean - 3 * sigma;

    // Check Western Electric Rules
    const violations: SPCViolation[] = [];
    for (const rule of WESTERN_ELECTRIC_RULES) {
      const violatingIndices = rule.check(values, mean, sigma);
      if (violatingIndices.length > 0) {
        const startIdx = Math.min(...violatingIndices);
        const endIdx = Math.max(...violatingIndices);
        violations.push({
          rule: rule.name,
          ruleNumber: rule.number,
          description: rule.description,
          severity: rule.severity,
          points: violatingIndices,
          startDate: measurements[startIdx].date,
          endDate: measurements[endIdx].date,
          recommendation: this.getViolationRecommendation(rule.number),
        });
      }
    }

    // Create data points with violation info
    const dataPoints: SPCDataPoint[] = measurements.map((m, i) => {
      const violationRules = violations
        .filter((v) => v.points.includes(i))
        .map((v) => v.rule);
      return {
        date: m.date,
        value: m.value,
        isOutOfControl: m.value > ucl || m.value < lcl,
        isOutOfSpec: (characteristic.upperLimit !== null && m.value > characteristic.upperLimit) ||
                     (characteristic.lowerLimit !== null && m.value < characteristic.lowerLimit),
        violationRules,
      };
    });

    // Calculate process capability
    let cp = 0, cpk = 0;
    let capabilityStatus: 'excellent' | 'acceptable' | 'marginal' | 'poor' = 'poor';

    if (characteristic.upperLimit !== null && characteristic.lowerLimit !== null && sigma > 0) {
      cp = (characteristic.upperLimit - characteristic.lowerLimit) / (6 * sigma);
      const cpu = (characteristic.upperLimit - mean) / (3 * sigma);
      const cpl = (mean - characteristic.lowerLimit) / (3 * sigma);
      cpk = Math.min(cpu, cpl);

      if (cpk >= 1.67) capabilityStatus = 'excellent';
      else if (cpk >= 1.33) capabilityStatus = 'acceptable';
      else if (cpk >= 1.0) capabilityStatus = 'marginal';
    }

    const isInControl = violations.filter((v) => v.severity === 'critical').length === 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (!isInControl) {
      recommendations.push('Process is out of control - investigate root cause immediately');
    }
    if (capabilityStatus === 'poor') {
      recommendations.push('Process capability is poor (Cpk < 1.0) - improve process or widen specifications');
    } else if (capabilityStatus === 'marginal') {
      recommendations.push('Process capability is marginal - consider improvement actions');
    }
    if (violations.length > 0) {
      const criticalCount = violations.filter((v) => v.severity === 'critical').length;
      if (criticalCount > 0) {
        recommendations.push('Address ' + criticalCount + ' critical SPC violation(s) first');
      }
    }

    return {
      partId,
      partSku: part.partNumber,
      characteristicName: characteristic.name,
      controlLimits: {
        ucl: Math.round(ucl * 1000) / 1000,
        lcl: Math.round(lcl * 1000) / 1000,
        mean: Math.round(mean * 1000) / 1000,
        usl: characteristic.upperLimit,
        lsl: characteristic.lowerLimit,
      },
      measurements: dataPoints,
      violations,
      isInControl,
      processCapability: {
        cp: Math.round(cp * 100) / 100,
        cpk: Math.round(cpk * 100) / 100,
        status: capabilityStatus,
      },
      recommendations,
    };
  }

  /**
   * Detect quality anomalies for a part
   */
  async detectAnomalies(
    partId: string,
    months: number = 6
  ): Promise<AnomalyDetectionResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const anomalies: Anomaly[] = [];

    // 1. Check for NCR clusters
    const ncrAnomalies = await this.detectNCRClusters(partId, months);
    anomalies.push(...ncrAnomalies);

    // 2. Check for yield drops
    const yieldAnomalies = await this.detectYieldDrops(partId, months);
    anomalies.push(...yieldAnomalies);

    // 3. Check for quality spikes
    const spikeResult = await this.detectQualitySpikes(partId, months);
    if (spikeResult.hasSpike) {
      for (const spike of spikeResult.spikes) {
        anomalies.push({
          id: 'spike-' + spike.period + '-' + spike.metric,
          type: 'quality_spike',
          severity: spike.spikeMultiplier > 3 ? 'critical' : spike.spikeMultiplier > 2 ? 'major' : 'minor',
          detectedAt: new Date(),
          description: 'Quality spike detected in ' + spike.metric,
          affectedMetric: spike.metric,
          expectedValue: spike.baselineValue,
          actualValue: spike.actualValue,
          deviation: spike.spikeMultiplier,
          context: { period: spike.period, possibleCauses: spike.possibleCauses },
          suggestedAction: 'Investigate root cause of quality spike',
        });
      }
    }

    // 4. Check for outliers in inspection data
    const outlierAnomalies = await this.detectOutliers(partId, months);
    anomalies.push(...outlierAnomalies);

    // Calculate severity distribution
    const severityDistribution = {
      critical: anomalies.filter((a) => a.severity === 'critical').length,
      major: anomalies.filter((a) => a.severity === 'major').length,
      minor: anomalies.filter((a) => a.severity === 'minor').length,
    };

    // Determine risk level
    let riskLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
    if (severityDistribution.critical > 0) riskLevel = 'high';
    else if (severityDistribution.major > 1) riskLevel = 'high';
    else if (severityDistribution.major > 0) riskLevel = 'medium';
    else if (severityDistribution.minor > 2) riskLevel = 'medium';
    else if (severityDistribution.minor > 0) riskLevel = 'low';

    // Generate recommendations
    const recommendations: string[] = [];
    if (riskLevel === 'high') {
      recommendations.push('Immediate investigation required for critical/major anomalies');
    }
    if (severityDistribution.critical > 0) {
      const criticalTypes = [...new Set(anomalies.filter((a) => a.severity === 'critical').map((a) => a.type))];
      recommendations.push('Address critical issues: ' + criticalTypes.join(', '));
    }
    if (anomalies.length > 3) {
      recommendations.push('Multiple anomalies detected - consider comprehensive quality review');
    }

    return {
      partId,
      partSku: part.partNumber,
      anomalies,
      anomalyCount: anomalies.length,
      severityDistribution,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Detect quality spikes
   */
  async detectQualitySpikes(
    partId: string,
    months: number = 6
  ): Promise<QualitySpikeDetectionResult> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, months);
    if (!qualitySummary) {
      return {
        partId,
        hasSpike: false,
        spikes: [],
        baseline: { avgNcrRate: 0, avgDefectRate: 0, period: 'N/A' },
        recommendations: [],
      };
    }

    const trend = qualitySummary.qualityTrend;
    if (trend.length < 3) {
      return {
        partId,
        hasSpike: false,
        spikes: [],
        baseline: { avgNcrRate: 0, avgDefectRate: 0, period: 'N/A' },
        recommendations: ['Insufficient data for spike detection'],
      };
    }

    // Calculate baseline (excluding last month)
    const baselinePeriods = trend.slice(0, -1);
    const avgNcrRate = baselinePeriods.reduce((sum, t) => sum + t.ncrCount, 0) / baselinePeriods.length;
    const avgDefectRate = baselinePeriods.reduce((sum, t) => sum + t.avgDefectsPerLot, 0) / baselinePeriods.length;

    // Detect spikes
    const spikes: QualitySpike[] = [];
    const latestPeriod = trend[trend.length - 1];

    // NCR spike
    if (avgNcrRate > 0 && latestPeriod.ncrCount > avgNcrRate * 2) {
      spikes.push({
        period: latestPeriod.period,
        metric: 'NCR Count',
        baselineValue: Math.round(avgNcrRate * 10) / 10,
        actualValue: latestPeriod.ncrCount,
        spikeMultiplier: Math.round((latestPeriod.ncrCount / avgNcrRate) * 10) / 10,
        possibleCauses: ['New supplier lot', 'Process change', 'Measurement issue', 'Material variation'],
      });
    }

    // FPY drop (inverse spike)
    const avgFpy = baselinePeriods.reduce((sum, t) => sum + t.firstPassYield, 0) / baselinePeriods.length;
    if (avgFpy > 0 && latestPeriod.firstPassYield < avgFpy * 0.85) {
      spikes.push({
        period: latestPeriod.period,
        metric: 'First Pass Yield',
        baselineValue: Math.round(avgFpy * 10) / 10,
        actualValue: latestPeriod.firstPassYield,
        spikeMultiplier: Math.round((avgFpy / Math.max(latestPeriod.firstPassYield, 1)) * 10) / 10,
        possibleCauses: ['Inspection criteria change', 'Process variation', 'Equipment issue', 'Operator error'],
      });
    }

    const recommendations: string[] = [];
    if (spikes.length > 0) {
      recommendations.push('Investigate recent quality spikes');
      recommendations.push('Review changes made in the affected period');
    }

    return {
      partId,
      hasSpike: spikes.length > 0,
      spikes,
      baseline: {
        avgNcrRate: Math.round(avgNcrRate * 10) / 10,
        avgDefectRate: Math.round(avgDefectRate * 100) / 100,
        period: baselinePeriods[0]?.period + ' to ' + baselinePeriods[baselinePeriods.length - 1]?.period,
      },
      recommendations,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private getViolationRecommendation(ruleNumber: number): string {
    const recommendations: Record<number, string> = {
      1: 'Investigate immediate cause - this point is significantly outside normal variation',
      2: 'Process is shifting - check for tool wear, material changes, or environmental factors',
      3: 'Process variability increasing - review setup procedures and measurement systems',
      4: 'Process has shifted to a new level - identify the cause of the sustained change',
      5: 'Process is trending - check for wear, drift, or systematic changes',
      6: 'Unusual lack of variation - verify measurement system is working correctly',
      7: 'Multiple populations present - check for mixing of different sources or processes',
      8: 'Over-adjustment suspected - review control procedures and avoid unnecessary adjustments',
    };
    return recommendations[ruleNumber] || 'Investigate root cause of variation';
  }

  private async detectNCRClusters(partId: string, months: number): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const ncrHistory = await this.dataExtractor.extractNCRHistory({ partId, months });

    if (ncrHistory.length < 3) return anomalies;

    // Group NCRs by week
    const weeklyNCRs = new Map<string, typeof ncrHistory>();
    ncrHistory.forEach((ncr) => {
      const weekStart = this.getWeekStart(ncr.createdAt);
      const key = weekStart.toISOString().split('T')[0];
      const week = weeklyNCRs.get(key) || [];
      week.push(ncr);
      weeklyNCRs.set(key, week);
    });

    // Find clusters (3+ NCRs in a week)
    for (const [week, ncrs] of weeklyNCRs.entries()) {
      if (ncrs.length >= 3) {
        const totalQuantity = ncrs.reduce((sum, n) => sum + n.quantityAffected, 0);
        anomalies.push({
          id: 'ncr-cluster-' + week,
          type: 'ncr_cluster',
          severity: ncrs.length >= 5 ? 'critical' : ncrs.length >= 4 ? 'major' : 'minor',
          detectedAt: new Date(week),
          description: ncrs.length + ' NCRs created in week of ' + week,
          affectedMetric: 'NCR Count',
          expectedValue: 'Less than 3 per week',
          actualValue: ncrs.length,
          deviation: ncrs.length,
          context: {
            totalQuantityAffected: totalQuantity,
            categories: [...new Set(ncrs.map((n) => n.defectCategory))],
          },
          suggestedAction: 'Investigate root cause of NCR cluster',
        });
      }
    }

    return anomalies;
  }

  private async detectYieldDrops(partId: string, months: number): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const qualitySummary = await this.dataExtractor.extractPartQualitySummary(partId, months);

    if (!qualitySummary || qualitySummary.qualityTrend.length < 2) return anomalies;

    const trend = qualitySummary.qualityTrend;

    // Compare each period to previous
    for (let i = 1; i < trend.length; i++) {
      const current = trend[i];
      const previous = trend[i - 1];

      if (previous.firstPassYield > 0) {
        const drop = previous.firstPassYield - current.firstPassYield;
        const dropPercent = (drop / previous.firstPassYield) * 100;

        if (drop > 5 && dropPercent > 5) {
          anomalies.push({
            id: 'yield-drop-' + current.period,
            type: 'yield_drop',
            severity: dropPercent > 15 ? 'critical' : dropPercent > 10 ? 'major' : 'minor',
            detectedAt: new Date(current.period + '-01'),
            description: 'FPY dropped ' + drop.toFixed(1) + '% from ' + previous.period + ' to ' + current.period,
            affectedMetric: 'First Pass Yield',
            expectedValue: previous.firstPassYield,
            actualValue: current.firstPassYield,
            deviation: dropPercent,
            context: {
              previousPeriod: previous.period,
              ncrCountChange: current.ncrCount - previous.ncrCount,
            },
            suggestedAction: 'Review changes between ' + previous.period + ' and ' + current.period,
          });
        }
      }
    }

    return anomalies;
  }

  private async detectOutliers(partId: string, months: number): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const inspections = await this.dataExtractor.extractInspectionHistory(partId, months);

    if (inspections.length < 5) return anomalies;

    // Check for inspections with high defect counts
    const defectCounts = inspections.map((i) => i.defectCount);
    const mean = defectCounts.reduce((a, b) => a + b, 0) / defectCounts.length;
    const stdDev = Math.sqrt(
      defectCounts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / defectCounts.length
    );

    const threshold = mean + 3 * stdDev;

    for (const inspection of inspections) {
      if (inspection.defectCount > threshold && inspection.defectCount > 0) {
        anomalies.push({
          id: 'outlier-' + inspection.id,
          type: 'outlier',
          severity: inspection.criticalDefects > 0 ? 'critical' : 'major',
          detectedAt: inspection.date,
          description: 'Inspection ' + inspection.inspectionNumber + ' has ' + inspection.defectCount + ' defects (expected < ' + Math.ceil(threshold) + ')',
          affectedMetric: 'Defect Count',
          expectedValue: mean,
          actualValue: inspection.defectCount,
          deviation: (inspection.defectCount - mean) / Math.max(stdDev, 1),
          context: {
            inspectionNumber: inspection.inspectionNumber,
            lotNumber: inspection.lotNumber,
            criticalDefects: inspection.criticalDefects,
          },
          suggestedAction: 'Review lot ' + inspection.lotNumber + ' for quality issues',
        });
      }
    }

    return anomalies;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let detectorInstance: QualityAnomalyDetector | null = null;

export function getQualityAnomalyDetector(): QualityAnomalyDetector {
  if (!detectorInstance) {
    detectorInstance = new QualityAnomalyDetector();
  }
  return detectorInstance;
}
