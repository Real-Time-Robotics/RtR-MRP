// =============================================================================
// QUALITY METRICS CALCULATOR
// Advanced quality metrics: PPM, Cpk, First Pass Yield, NCR Rate, etc.
// =============================================================================

import { prisma } from '@/lib/prisma';
import { getQualityDataExtractor } from './quality-data-extractor';

// =============================================================================
// TYPES
// =============================================================================

export interface PPMResult {
  partId: string;
  partSku: string;
  period: { start: Date; end: Date };
  totalQuantity: number;
  defectQuantity: number;
  ppm: number;
  trend: 'improving' | 'stable' | 'worsening';
  benchmark: number;
  status: 'excellent' | 'good' | 'acceptable' | 'warning' | 'critical';
}

export interface CpkResult {
  characteristicName: string;
  measurements: number[];
  mean: number;
  stdDev: number;
  usl: number;
  lsl: number;
  cpk: number;
  cpu: number;
  cpl: number;
  cp: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'poor';
  interpretation: string;
}

export interface FirstPassYieldResult {
  partId?: string;
  productId?: string;
  period: { start: Date; end: Date };
  totalInspections: number;
  passFirstTime: number;
  fpy: number;
  trend: 'improving' | 'stable' | 'worsening';
  target: number;
  gap: number;
}

export interface NCRRateResult {
  partId?: string;
  supplierId?: string;
  period: { start: Date; end: Date };
  totalLots: number;
  lotsWithNCR: number;
  ncrRate: number;
  ncrCount: number;
  avgDaysOpen: number;
  topCategories: { category: string; count: number; percentage: number }[];
  trend: 'improving' | 'stable' | 'worsening';
}

export interface SupplierQualityScore {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  components: {
    acceptanceRate: { value: number; weight: number; score: number };
    ncrRate: { value: number; weight: number; score: number };
    responseTime: { value: number; weight: number; score: number };
    deliveryQuality: { value: number; weight: number; score: number };
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'worsening';
  recommendations: string[];
}

// =============================================================================
// QUALITY METRICS CALCULATOR CLASS
// =============================================================================

export class QualityMetricsCalculator {
  private dataExtractor = getQualityDataExtractor();

  async calculatePPM(
    partId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PPMResult> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new Error('Part not found: ' + partId);

    const inspections = await prisma.inspection.findMany({
      where: { partId, status: 'completed', createdAt: { gte: start, lte: end } },
    });

    const ncrs = await prisma.nCR.findMany({
      where: { partId, createdAt: { gte: start, lte: end } },
    });

    const totalQuantity = inspections.reduce((sum, i) => sum + (i.quantityInspected || 0), 0);
    const defectQuantity = ncrs.reduce((sum, n) => sum + n.quantityAffected, 0);
    const ppm = totalQuantity > 0 ? (defectQuantity / totalQuantity) * 1_000_000 : 0;

    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const prevInspections = await prisma.inspection.findMany({
      where: { partId, status: 'completed', createdAt: { gte: prevStart, lt: start } },
    });
    const prevNCRs = await prisma.nCR.findMany({
      where: { partId, createdAt: { gte: prevStart, lt: start } },
    });

    const prevTotal = prevInspections.reduce((sum, i) => sum + (i.quantityInspected || 0), 0);
    const prevDefects = prevNCRs.reduce((sum, n) => sum + n.quantityAffected, 0);
    const prevPPM = prevTotal > 0 ? (prevDefects / prevTotal) * 1_000_000 : 0;

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (prevPPM > 0) {
      const change = ((ppm - prevPPM) / prevPPM) * 100;
      if (change < -10) trend = 'improving';
      else if (change > 10) trend = 'worsening';
    }

    let status: 'excellent' | 'good' | 'acceptable' | 'warning' | 'critical';
    if (ppm < 100) status = 'excellent';
    else if (ppm < 500) status = 'good';
    else if (ppm < 1000) status = 'acceptable';
    else if (ppm < 5000) status = 'warning';
    else status = 'critical';

    return {
      partId,
      partSku: part.partNumber,
      period: { start, end },
      totalQuantity,
      defectQuantity,
      ppm: Math.round(ppm),
      trend,
      benchmark: 500,
      status,
    };
  }

  calculateCpk(
    measurements: number[],
    upperSpecLimit: number,
    lowerSpecLimit: number,
    characteristicName: string = 'Characteristic'
  ): CpkResult {
    if (measurements.length < 2) {
      return {
        characteristicName,
        measurements,
        mean: measurements[0] || 0,
        stdDev: 0,
        usl: upperSpecLimit,
        lsl: lowerSpecLimit,
        cpk: 0,
        cpu: 0,
        cpl: 0,
        cp: 0,
        status: 'poor',
        interpretation: 'Insufficient data for Cpk calculation',
      };
    }

    const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (measurements.length - 1);
    const stdDev = Math.sqrt(variance);

    const cp = stdDev > 0 ? (upperSpecLimit - lowerSpecLimit) / (6 * stdDev) : 0;
    const cpu = stdDev > 0 ? (upperSpecLimit - mean) / (3 * stdDev) : 0;
    const cpl = stdDev > 0 ? (mean - lowerSpecLimit) / (3 * stdDev) : 0;
    const cpk = Math.min(cpu, cpl);

    let status: 'excellent' | 'acceptable' | 'marginal' | 'poor';
    let interpretation: string;

    if (cpk >= 1.67) {
      status = 'excellent';
      interpretation = 'Process is highly capable. Six Sigma level performance.';
    } else if (cpk >= 1.33) {
      status = 'acceptable';
      interpretation = 'Process is capable. Acceptable for production.';
    } else if (cpk >= 1.0) {
      status = 'marginal';
      interpretation = 'Process is marginally capable. Improvement recommended.';
    } else {
      status = 'poor';
      interpretation = 'Process is not capable. Immediate action required.';
    }

    return {
      characteristicName,
      measurements,
      mean: Math.round(mean * 1000) / 1000,
      stdDev: Math.round(stdDev * 1000) / 1000,
      usl: upperSpecLimit,
      lsl: lowerSpecLimit,
      cpk: Math.round(cpk * 100) / 100,
      cpu: Math.round(cpu * 100) / 100,
      cpl: Math.round(cpl * 100) / 100,
      cp: Math.round(cp * 100) / 100,
      status,
      interpretation,
    };
  }

  async calculateFirstPassYield(
    options: {
      partId?: string;
      productId?: string;
      supplierId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<FirstPassYieldResult> {
    const end = options.endDate || new Date();
    const start = options.startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const whereClause: Record<string, unknown> = {
      status: 'completed',
      createdAt: { gte: start, lte: end },
    };

    if (options.partId) whereClause.partId = options.partId;
    if (options.productId) whereClause.productId = options.productId;

    const inspections = await prisma.inspection.findMany({ where: whereClause });

    const totalInspections = inspections.length;
    const passFirstTime = inspections.filter((i) => i.result === 'PASS').length;
    const fpy = totalInspections > 0 ? (passFirstTime / totalInspections) * 100 : 100;

    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevInspections = await prisma.inspection.findMany({
      where: { ...whereClause, createdAt: { gte: prevStart, lt: start } },
    });

    const prevTotal = prevInspections.length;
    const prevPass = prevInspections.filter((i) => i.result === 'PASS').length;
    const prevFpy = prevTotal > 0 ? (prevPass / prevTotal) * 100 : 100;

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    const change = fpy - prevFpy;
    if (change > 2) trend = 'improving';
    else if (change < -2) trend = 'worsening';

    const target = 98;
    const gap = target - fpy;

    return {
      partId: options.partId,
      productId: options.productId,
      period: { start, end },
      totalInspections,
      passFirstTime,
      fpy: Math.round(fpy * 10) / 10,
      trend,
      target,
      gap: Math.round(gap * 10) / 10,
    };
  }

  async calculateNCRRate(
    options: {
      partId?: string;
      supplierId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<NCRRateResult> {
    const end = options.endDate || new Date();
    const start = options.startDate || new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

    const inspectionWhere: Record<string, unknown> = {
      type: 'RECEIVING',
      status: 'completed',
      createdAt: { gte: start, lte: end },
    };

    if (options.partId) inspectionWhere.partId = options.partId;

    const inspections = await prisma.inspection.findMany({ where: inspectionWhere });

    const ncrWhere: Record<string, unknown> = { createdAt: { gte: start, lte: end } };
    if (options.partId) ncrWhere.partId = options.partId;

    const ncrs = await prisma.nCR.findMany({ where: ncrWhere });

    const totalLots = inspections.length;
    const lotNumbers = new Set(inspections.map((i) => i.lotNumber).filter(Boolean));
    const lotsWithNCR = ncrs.filter((n) => n.lotNumber && lotNumbers.has(n.lotNumber)).length;
    const ncrRate = totalLots > 0 ? (lotsWithNCR / totalLots) * 100 : 0;

    const openDays = ncrs.map((n) => {
      const closed = n.status === 'closed' ? n.updatedAt : new Date();
      return Math.ceil((closed.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgDaysOpen = openDays.length > 0
      ? openDays.reduce((a, b) => a + b, 0) / openDays.length
      : 0;

    const categoryMap = new Map<string, number>();
    ncrs.forEach((n) => {
      const cat = n.defectCategory || 'Unknown';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: ncrs.length > 0 ? Math.round((count / ncrs.length) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevNCRs = await prisma.nCR.count({
      where: { ...ncrWhere, createdAt: { gte: prevStart, lt: start } },
    });
    const prevInspections = await prisma.inspection.count({
      where: { ...inspectionWhere, createdAt: { gte: prevStart, lt: start } },
    });

    const prevRate = prevInspections > 0 ? (prevNCRs / prevInspections) * 100 : 0;
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    const change = ncrRate - prevRate;
    if (change < -1) trend = 'improving';
    else if (change > 1) trend = 'worsening';

    return {
      partId: options.partId,
      supplierId: options.supplierId,
      period: { start, end },
      totalLots,
      lotsWithNCR,
      ncrRate: Math.round(ncrRate * 10) / 10,
      ncrCount: ncrs.length,
      avgDaysOpen: Math.round(avgDaysOpen),
      topCategories,
      trend,
    };
  }

  async calculateSupplierQualityScore(
    supplierId: string,
    months: number = 12
  ): Promise<SupplierQualityScore> {
    const supplierData = await this.dataExtractor.extractSupplierQualityData(supplierId, months);

    if (!supplierData) {
      throw new Error('Supplier not found: ' + supplierId);
    }

    const weights = {
      acceptanceRate: 0.40,
      ncrRate: 0.30,
      responseTime: 0.15,
      deliveryQuality: 0.15,
    };

    const acceptanceScore = Math.min(100, supplierData.acceptanceRate);
    const ncrRatePct = supplierData.totalLots > 0
      ? (supplierData.totalNCRs / supplierData.totalLots) * 100
      : 0;
    const ncrScore = Math.max(0, 100 - ncrRatePct * 10);
    const responseScore = Math.max(0, Math.min(100, 100 - (supplierData.avgDaysToResolve - 7) * 4));

    const recentTrend = supplierData.qualityTrend.slice(-3);
    const avgRecentAcceptance = recentTrend.length > 0
      ? recentTrend.reduce((sum, t) => sum + t.firstPassYield, 0) / recentTrend.length
      : supplierData.acceptanceRate;
    const deliveryScore = Math.min(100, avgRecentAcceptance);

    const overallScore = Math.round(
      acceptanceScore * weights.acceptanceRate +
      ncrScore * weights.ncrRate +
      responseScore * weights.responseTime +
      deliveryScore * weights.deliveryQuality
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (supplierData.qualityTrend.length >= 3) {
      const recent = supplierData.qualityTrend.slice(-3);
      const older = supplierData.qualityTrend.slice(0, 3);
      const recentAvg = recent.reduce((s, t) => s + t.firstPassYield, 0) / recent.length;
      const olderAvg = older.reduce((s, t) => s + t.firstPassYield, 0) / older.length;
      if (recentAvg > olderAvg + 2) trend = 'improving';
      else if (recentAvg < olderAvg - 2) trend = 'worsening';
    }

    const recommendations: string[] = [];
    if (acceptanceScore < 95) {
      recommendations.push('Improve incoming inspection pass rate through supplier development');
    }
    if (ncrScore < 70) {
      recommendations.push('Implement quality improvement program to reduce NCRs');
    }
    if (responseScore < 70) {
      recommendations.push('Expedite NCR resolution time through better communication');
    }
    if (grade === 'D' || grade === 'F') {
      recommendations.push('Consider qualifying alternative supplier');
    }
    if (supplierData.openNCRs > 0) {
      recommendations.push('Close ' + supplierData.openNCRs + ' open NCR(s) to improve score');
    }

    return {
      supplierId,
      supplierName: supplierData.supplierName,
      overallScore,
      components: {
        acceptanceRate: {
          value: supplierData.acceptanceRate,
          weight: weights.acceptanceRate,
          score: Math.round(acceptanceScore),
        },
        ncrRate: {
          value: ncrRatePct,
          weight: weights.ncrRate,
          score: Math.round(ncrScore),
        },
        responseTime: {
          value: supplierData.avgDaysToResolve,
          weight: weights.responseTime,
          score: Math.round(responseScore),
        },
        deliveryQuality: {
          value: avgRecentAcceptance,
          weight: weights.deliveryQuality,
          score: Math.round(deliveryScore),
        },
      },
      grade,
      trend,
      recommendations,
    };
  }

  async getQualityMetricsSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    overallFPY: number;
    overallPPM: number;
    openNCRs: number;
    openCAPAs: number;
    avgNCRResolutionDays: number;
    topDefectCategories: { category: string; count: number }[];
    qualityTrend: { period: string; fpy: number; ncrCount: number }[];
  }> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fpyResult = await this.calculateFirstPassYield({ startDate: start, endDate: end });

    const ncrs = await prisma.nCR.findMany({
      where: { createdAt: { gte: start, lte: end } },
    });
    const inspections = await prisma.inspection.findMany({
      where: { status: 'completed', createdAt: { gte: start, lte: end } },
    });

    const totalQty = inspections.reduce((s, i) => s + (i.quantityInspected || 0), 0);
    const defectQty = ncrs.reduce((s, n) => s + n.quantityAffected, 0);
    const overallPPM = totalQty > 0 ? Math.round((defectQty / totalQty) * 1_000_000) : 0;

    const [openNCRs, openCAPAs] = await Promise.all([
      prisma.nCR.count({ where: { status: { notIn: ['closed', 'voided'] } } }),
      prisma.cAPA.count({ where: { status: { notIn: ['closed'] } } }),
    ]);

    const closedNCRs = await prisma.nCR.findMany({
      where: { status: 'closed', createdAt: { gte: start } },
    });
    const avgNCRResolutionDays = closedNCRs.length > 0
      ? Math.round(
          closedNCRs.reduce((sum, n) => {
            const days = (n.updatedAt.getTime() - n.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / closedNCRs.length
        )
      : 0;

    const categoryMap = new Map<string, number>();
    ncrs.forEach((n) => {
      const cat = n.defectCategory || 'Unknown';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const topDefectCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const qualityTrend: { period: string; fpy: number; ncrCount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const monthEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0);
      const period = monthStart.getFullYear() + '-' + String(monthStart.getMonth() + 1).padStart(2, '0');

      const monthInsp = inspections.filter((insp) => {
        const d = new Date(insp.createdAt);
        return d >= monthStart && d <= monthEnd;
      });
      const monthPass = monthInsp.filter((i) => i.result === 'PASS').length;
      const monthFpy = monthInsp.length > 0 ? (monthPass / monthInsp.length) * 100 : 100;

      const monthNCRs = ncrs.filter((n) => {
        const d = new Date(n.createdAt);
        return d >= monthStart && d <= monthEnd;
      }).length;

      qualityTrend.push({
        period,
        fpy: Math.round(monthFpy * 10) / 10,
        ncrCount: monthNCRs,
      });
    }

    return {
      overallFPY: fpyResult.fpy,
      overallPPM,
      openNCRs,
      openCAPAs,
      avgNCRResolutionDays,
      topDefectCategories,
      qualityTrend,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let calculatorInstance: QualityMetricsCalculator | null = null;

export function getQualityMetricsCalculator(): QualityMetricsCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new QualityMetricsCalculator();
  }
  return calculatorInstance;
}
