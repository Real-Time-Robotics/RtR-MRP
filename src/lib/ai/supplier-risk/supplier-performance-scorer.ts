// =============================================================================
// SUPPLIER PERFORMANCE SCORER
// Calculates supplier scorecards with weighted dimensions
// =============================================================================

import { prisma } from '@/lib/prisma';
import {
  SupplierDataExtractor,
  getSupplierDataExtractor,
  DeliveryPerformanceData,
  QualityHistoryData,
  PricingTrendData,
  ResponseMetricsData,
} from './supplier-data-extractor';

// =============================================================================
// TYPES
// =============================================================================

export type SupplierGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SupplierScorecard {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  country: string;
  category: string | null;
  periodMonths: number;
  generatedAt: Date;
  overallScore: number;
  overallGrade: SupplierGrade;
  dimensions: {
    delivery: DimensionScore;
    quality: DimensionScore;
    cost: DimensionScore;
    responsiveness: DimensionScore;
  };
  trend: ScoreTrend;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  benchmarkComparison: BenchmarkComparison;
}

export interface DimensionScore {
  score: number;
  grade: SupplierGrade;
  weight: number;
  weightedScore: number;
  metrics: DimensionMetric[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface DimensionMetric {
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
  weight: number;
  contribution: number;
}

export interface ScoreTrend {
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  previousScore: number | null;
  history: { period: string; score: number }[];
}

export interface BenchmarkComparison {
  categoryAverage: number;
  percentile: number;
  rank: number;
  totalInCategory: number;
  aboveAverage: boolean;
}

export interface SupplierRanking {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  overallGrade: SupplierGrade;
  rank: number;
  deliveryScore: number;
  qualityScore: number;
  costScore: number;
  responsivenessScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface CategoryBenchmark {
  category: string;
  avgOverallScore: number;
  avgDeliveryScore: number;
  avgQualityScore: number;
  avgCostScore: number;
  avgResponsivenessScore: number;
  topPerformer: {
    supplierId: string;
    supplierName: string;
    score: number;
  } | null;
  supplierCount: number;
}

// =============================================================================
// DIMENSION WEIGHTS & THRESHOLDS
// =============================================================================

const DIMENSION_WEIGHTS = {
  delivery: 0.30,
  quality: 0.30,
  cost: 0.25,
  responsiveness: 0.15,
};

const GRADE_THRESHOLDS: { grade: SupplierGrade; min: number }[] = [
  { grade: 'A', min: 90 },
  { grade: 'B', min: 80 },
  { grade: 'C', min: 70 },
  { grade: 'D', min: 60 },
  { grade: 'F', min: 0 },
];

// Delivery metrics configuration
const DELIVERY_METRICS = {
  onTimeRate: { weight: 0.4, targets: { excellent: 98, good: 95, acceptable: 90, poor: 80 } },
  perfectOrderRate: { weight: 0.25, targets: { excellent: 95, good: 90, acceptable: 85, poor: 75 } },
  leadTimeVariance: { weight: 0.2, targets: { excellent: 5, good: 10, acceptable: 20, poor: 30 } }, // % variance
  avgDaysLate: { weight: 0.15, targets: { excellent: 0, good: 1, acceptable: 3, poor: 7 } },
};

// Quality metrics configuration
const QUALITY_METRICS = {
  acceptanceRate: { weight: 0.35, targets: { excellent: 99, good: 97, acceptable: 95, poor: 90 } },
  ppm: { weight: 0.25, targets: { excellent: 100, good: 500, acceptable: 1000, poor: 5000 } },
  ncrRate: { weight: 0.2, targets: { excellent: 0.5, good: 1, acceptable: 2, poor: 5 } }, // NCRs per 100 lots
  avgDaysToResolve: { weight: 0.2, targets: { excellent: 7, good: 14, acceptable: 21, poor: 30 } },
};

// Cost metrics configuration
const COST_METRICS = {
  priceStability: { weight: 0.35, targets: { excellent: 2, good: 5, acceptable: 10, poor: 20 } }, // % variance
  priceChangePercent: { weight: 0.35, targets: { excellent: -2, good: 0, acceptable: 3, poor: 10 } }, // % change
  competitivenessScore: { weight: 0.3, targets: { excellent: 90, good: 80, acceptable: 70, poor: 50 } },
};

// Responsiveness metrics configuration
const RESPONSIVENESS_METRICS = {
  avgNCRResolutionDays: { weight: 0.35, targets: { excellent: 5, good: 10, acceptable: 15, poor: 25 } },
  avgCAPAClosureDays: { weight: 0.3, targets: { excellent: 14, good: 21, acceptable: 30, poor: 45 } },
  fastResponseRate: { weight: 0.35, targets: { excellent: 90, good: 75, acceptable: 60, poor: 40 } },
};

// =============================================================================
// SUPPLIER PERFORMANCE SCORER CLASS
// =============================================================================

export class SupplierPerformanceScorer {
  private dataExtractor: SupplierDataExtractor;

  constructor() {
    this.dataExtractor = getSupplierDataExtractor();
  }

  /**
   * Generate a complete supplier scorecard
   */
  async generateScorecard(
    supplierId: string,
    months: number = 12
  ): Promise<SupplierScorecard | null> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) return null;

    // Extract all performance data
    const [delivery, quality, pricing, response] = await Promise.all([
      this.dataExtractor.extractDeliveryPerformance(supplierId, months),
      this.dataExtractor.extractQualityHistory(supplierId, months),
      this.dataExtractor.extractPricingTrends(supplierId, months),
      this.dataExtractor.extractResponseMetrics(supplierId, months),
    ]);

    // Calculate dimension scores
    const deliveryScore = this.calculateDeliveryScore(delivery);
    const qualityScore = this.calculateQualityScore(quality);
    const costScore = this.calculateCostScore(pricing);
    const responsivenessScore = this.calculateResponsivenessScore(response);

    // Calculate overall score
    const overallScore =
      deliveryScore.weightedScore +
      qualityScore.weightedScore +
      costScore.weightedScore +
      responsivenessScore.weightedScore;

    const overallGrade = this.getGrade(overallScore);

    // Get trend
    const trend = await this.calculateScoreTrend(supplierId, overallScore, months);

    // Get benchmark comparison
    const benchmark = await this.getBenchmarkComparison(supplierId, supplier.category, overallScore);

    // Generate insights
    const { strengths, weaknesses, recommendations } = this.generateInsights(
      deliveryScore,
      qualityScore,
      costScore,
      responsivenessScore
    );

    return {
      supplierId,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      country: supplier.country,
      category: supplier.category,
      periodMonths: months,
      generatedAt: new Date(),
      overallScore: Math.round(overallScore * 10) / 10,
      overallGrade,
      dimensions: {
        delivery: deliveryScore,
        quality: qualityScore,
        cost: costScore,
        responsiveness: responsivenessScore,
      },
      trend,
      strengths,
      weaknesses,
      recommendations,
      benchmarkComparison: benchmark,
    };
  }

  /**
   * Calculate delivery dimension score
   */
  private calculateDeliveryScore(data: DeliveryPerformanceData | null): DimensionScore {
    const weight = DIMENSION_WEIGHTS.delivery;

    if (!data || data.summary.totalOrders === 0) {
      return this.createDefaultDimensionScore('delivery', weight);
    }

    const metrics: DimensionMetric[] = [];

    // On-time rate
    const onTimeMetric = this.calculateMetric(
      'On-Time Delivery Rate',
      data.summary.onTimeRate,
      '%',
      DELIVERY_METRICS.onTimeRate.targets,
      DELIVERY_METRICS.onTimeRate.weight,
      'higher'
    );
    metrics.push(onTimeMetric);

    // Perfect order rate
    const perfectOrderMetric = this.calculateMetric(
      'Perfect Order Rate',
      data.summary.perfectOrderRate,
      '%',
      DELIVERY_METRICS.perfectOrderRate.targets,
      DELIVERY_METRICS.perfectOrderRate.weight,
      'higher'
    );
    metrics.push(perfectOrderMetric);

    // Lead time variance
    const leadTimeVarianceMetric = this.calculateMetric(
      'Lead Time Variance',
      Math.abs(data.leadTimeVariance.variancePercent),
      '%',
      DELIVERY_METRICS.leadTimeVariance.targets,
      DELIVERY_METRICS.leadTimeVariance.weight,
      'lower'
    );
    metrics.push(leadTimeVarianceMetric);

    // Average days late
    const avgDaysLateMetric = this.calculateMetric(
      'Avg Days Late',
      data.summary.avgDaysLate,
      'days',
      DELIVERY_METRICS.avgDaysLate.targets,
      DELIVERY_METRICS.avgDaysLate.weight,
      'lower'
    );
    metrics.push(avgDaysLateMetric);

    // Calculate dimension score
    const score = metrics.reduce((sum, m) => sum + m.contribution, 0);
    const trend = this.determineDimensionTrend(data.trend.map((t) => t.onTimeRate));

    return {
      score: Math.round(score * 10) / 10,
      grade: this.getGrade(score),
      weight,
      weightedScore: Math.round(score * weight * 10) / 10,
      metrics,
      trend,
    };
  }

  /**
   * Calculate quality dimension score
   */
  private calculateQualityScore(data: QualityHistoryData | null): DimensionScore {
    const weight = DIMENSION_WEIGHTS.quality;

    if (!data) {
      return this.createDefaultDimensionScore('quality', weight);
    }

    const metrics: DimensionMetric[] = [];

    // Acceptance rate
    const acceptanceMetric = this.calculateMetric(
      'Lot Acceptance Rate',
      data.summary.acceptanceRate,
      '%',
      QUALITY_METRICS.acceptanceRate.targets,
      QUALITY_METRICS.acceptanceRate.weight,
      'higher'
    );
    metrics.push(acceptanceMetric);

    // PPM
    const ppmMetric = this.calculateMetric(
      'Defect PPM',
      data.summary.ppm,
      'ppm',
      QUALITY_METRICS.ppm.targets,
      QUALITY_METRICS.ppm.weight,
      'lower'
    );
    metrics.push(ppmMetric);

    // NCR rate per 100 lots
    const ncrRateValue =
      data.summary.totalLotsReceived > 0
        ? (data.summary.totalNCRs / data.summary.totalLotsReceived) * 100
        : 0;
    const ncrRateMetric = this.calculateMetric(
      'NCR Rate (per 100 lots)',
      ncrRateValue,
      '%',
      QUALITY_METRICS.ncrRate.targets,
      QUALITY_METRICS.ncrRate.weight,
      'lower'
    );
    metrics.push(ncrRateMetric);

    // Avg days to resolve
    const resolutionMetric = this.calculateMetric(
      'Avg NCR Resolution Time',
      data.summary.avgDaysToResolveNCR,
      'days',
      QUALITY_METRICS.avgDaysToResolve.targets,
      QUALITY_METRICS.avgDaysToResolve.weight,
      'lower'
    );
    metrics.push(resolutionMetric);

    // Calculate dimension score
    const score = metrics.reduce((sum, m) => sum + m.contribution, 0);
    const trend = this.determineDimensionTrend(data.qualityTrend.map((t) => t.acceptanceRate));

    return {
      score: Math.round(score * 10) / 10,
      grade: this.getGrade(score),
      weight,
      weightedScore: Math.round(score * weight * 10) / 10,
      metrics,
      trend,
    };
  }

  /**
   * Calculate cost dimension score
   */
  private calculateCostScore(data: PricingTrendData | null): DimensionScore {
    const weight = DIMENSION_WEIGHTS.cost;

    if (!data || data.summary.totalSpend === 0) {
      return this.createDefaultDimensionScore('cost', weight);
    }

    const metrics: DimensionMetric[] = [];

    // Price stability (inverse of variance)
    const priceVariancePercent =
      data.summary.avgUnitPrice > 0
        ? (data.summary.priceVariance / data.summary.avgUnitPrice) * 100
        : 0;
    const stabilityMetric = this.calculateMetric(
      'Price Stability',
      priceVariancePercent,
      '%',
      COST_METRICS.priceStability.targets,
      COST_METRICS.priceStability.weight,
      'lower'
    );
    metrics.push(stabilityMetric);

    // Price change percent
    const priceChangeMetric = this.calculateMetric(
      'Price Change Trend',
      data.summary.priceChangePercent,
      '%',
      COST_METRICS.priceChangePercent.targets,
      COST_METRICS.priceChangePercent.weight,
      'lower'
    );
    metrics.push(priceChangeMetric);

    // Competitiveness score
    const competitivenessMetric = this.calculateMetric(
      'Competitiveness Score',
      data.summary.competitivenessScore,
      'pts',
      COST_METRICS.competitivenessScore.targets,
      COST_METRICS.competitivenessScore.weight,
      'higher'
    );
    metrics.push(competitivenessMetric);

    // Calculate dimension score
    const score = metrics.reduce((sum, m) => sum + m.contribution, 0);
    const trend = this.determineCostTrend(data.priceHistory);

    return {
      score: Math.round(score * 10) / 10,
      grade: this.getGrade(score),
      weight,
      weightedScore: Math.round(score * weight * 10) / 10,
      metrics,
      trend,
    };
  }

  /**
   * Calculate responsiveness dimension score
   */
  private calculateResponsivenessScore(data: ResponseMetricsData | null): DimensionScore {
    const weight = DIMENSION_WEIGHTS.responsiveness;

    if (!data) {
      return this.createDefaultDimensionScore('responsiveness', weight);
    }

    const metrics: DimensionMetric[] = [];

    // NCR resolution days
    const ncrResolutionMetric = this.calculateMetric(
      'NCR Resolution Time',
      data.summary.avgNCRResolutionDays,
      'days',
      RESPONSIVENESS_METRICS.avgNCRResolutionDays.targets,
      RESPONSIVENESS_METRICS.avgNCRResolutionDays.weight,
      'lower'
    );
    metrics.push(ncrResolutionMetric);

    // CAPA closure days
    const capaClosureMetric = this.calculateMetric(
      'CAPA Closure Time',
      data.summary.avgCAPAClosureDays,
      'days',
      RESPONSIVENESS_METRICS.avgCAPAClosureDays.targets,
      RESPONSIVENESS_METRICS.avgCAPAClosureDays.weight,
      'lower'
    );
    metrics.push(capaClosureMetric);

    // Fast response rate
    const fastResponseMetric = this.calculateMetric(
      'Fast Response Rate',
      data.summary.fastResponseRate,
      '%',
      RESPONSIVENESS_METRICS.fastResponseRate.targets,
      RESPONSIVENESS_METRICS.fastResponseRate.weight,
      'higher'
    );
    metrics.push(fastResponseMetric);

    // Calculate dimension score
    const score = metrics.reduce((sum, m) => sum + m.contribution, 0);
    const trend = this.determineResponseTrend(data);

    return {
      score: Math.round(score * 10) / 10,
      grade: this.getGrade(score),
      weight,
      weightedScore: Math.round(score * weight * 10) / 10,
      metrics,
      trend,
    };
  }

  /**
   * Calculate a single metric score
   */
  private calculateMetric(
    name: string,
    value: number,
    unit: string,
    targets: { excellent: number; good: number; acceptable: number; poor: number },
    weight: number,
    direction: 'higher' | 'lower'
  ): DimensionMetric {
    let score: number;
    let status: DimensionMetric['status'];

    if (direction === 'higher') {
      if (value >= targets.excellent) {
        score = 100;
        status = 'excellent';
      } else if (value >= targets.good) {
        score = 85 + ((value - targets.good) / (targets.excellent - targets.good)) * 15;
        status = 'good';
      } else if (value >= targets.acceptable) {
        score = 70 + ((value - targets.acceptable) / (targets.good - targets.acceptable)) * 15;
        status = 'acceptable';
      } else if (value >= targets.poor) {
        score = 50 + ((value - targets.poor) / (targets.acceptable - targets.poor)) * 20;
        status = 'poor';
      } else {
        score = Math.max(0, 50 * (value / targets.poor));
        status = 'critical';
      }
    } else {
      // Lower is better
      if (value <= targets.excellent) {
        score = 100;
        status = 'excellent';
      } else if (value <= targets.good) {
        score = 85 + ((targets.good - value) / (targets.good - targets.excellent)) * 15;
        status = 'good';
      } else if (value <= targets.acceptable) {
        score = 70 + ((targets.acceptable - value) / (targets.acceptable - targets.good)) * 15;
        status = 'acceptable';
      } else if (value <= targets.poor) {
        score = 50 + ((targets.poor - value) / (targets.poor - targets.acceptable)) * 20;
        status = 'poor';
      } else {
        score = Math.max(0, 50 * (targets.poor / value));
        status = 'critical';
      }
    }

    // Determine target based on direction
    const target = direction === 'higher' ? targets.good : targets.good;

    return {
      name,
      value: Math.round(value * 100) / 100,
      unit,
      target,
      status,
      weight,
      contribution: Math.round(score * weight * 10) / 10,
    };
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): SupplierGrade {
    for (const threshold of GRADE_THRESHOLDS) {
      if (score >= threshold.min) {
        return threshold.grade;
      }
    }
    return 'F';
  }

  /**
   * Create default dimension score for suppliers with no data
   */
  private createDefaultDimensionScore(
    dimension: string,
    weight: number
  ): DimensionScore {
    return {
      score: 70,
      grade: 'C',
      weight,
      weightedScore: 70 * weight,
      metrics: [
        {
          name: 'No data available',
          value: 0,
          unit: '',
          target: 0,
          status: 'acceptable',
          weight: 1,
          contribution: 70,
        },
      ],
      trend: 'stable',
    };
  }

  /**
   * Determine trend from historical values
   */
  private determineDimensionTrend(
    values: number[]
  ): 'improving' | 'stable' | 'declining' {
    if (values.length < 3) return 'stable';

    const recentAvg = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = values.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    if (changePercent > 5) return 'improving';
    if (changePercent < -5) return 'declining';
    return 'stable';
  }

  /**
   * Determine cost trend (lower prices = improving)
   */
  private determineCostTrend(
    priceHistory: { period: string; avgUnitPrice: number }[]
  ): 'improving' | 'stable' | 'declining' {
    if (priceHistory.length < 3) return 'stable';

    const recentPrices = priceHistory.slice(-3).map((h) => h.avgUnitPrice);
    const olderPrices = priceHistory.slice(0, 3).map((h) => h.avgUnitPrice);

    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;

    const changePercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    // For cost, lower is better (improving)
    if (changePercent < -3) return 'improving';
    if (changePercent > 3) return 'declining';
    return 'stable';
  }

  /**
   * Determine responsiveness trend
   */
  private determineResponseTrend(data: ResponseMetricsData): 'improving' | 'stable' | 'declining' {
    const recentNCRs = data.ncrResolutionHistory.slice(0, 5);
    const olderNCRs = data.ncrResolutionHistory.slice(-5);

    if (recentNCRs.length < 2 || olderNCRs.length < 2) return 'stable';

    const recentAvgDays =
      recentNCRs.reduce((sum, n) => sum + n.daysToResolve, 0) / recentNCRs.length;
    const olderAvgDays =
      olderNCRs.reduce((sum, n) => sum + n.daysToResolve, 0) / olderNCRs.length;

    const changePercent = olderAvgDays > 0 ? ((recentAvgDays - olderAvgDays) / olderAvgDays) * 100 : 0;

    // For response time, lower is better (improving)
    if (changePercent < -10) return 'improving';
    if (changePercent > 10) return 'declining';
    return 'stable';
  }

  /**
   * Calculate score trend over time
   */
  private async calculateScoreTrend(
    supplierId: string,
    currentScore: number,
    months: number
  ): Promise<ScoreTrend> {
    // Get previous risk score if exists
    const previousRiskScore = await prisma.supplierRiskScore.findUnique({
      where: { supplierId },
    });

    const previousScore = previousRiskScore?.overallScore || null;
    const changePercent =
      previousScore !== null ? ((currentScore - previousScore) / previousScore) * 100 : 0;

    let direction: ScoreTrend['direction'] = 'stable';
    if (changePercent > 3) direction = 'improving';
    else if (changePercent < -3) direction = 'declining';

    // Generate simulated history (in production, you'd store actual historical scores)
    const history = this.generateScoreHistory(currentScore, previousScore, months);

    return {
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      previousScore,
      history,
    };
  }

  /**
   * Generate score history for visualization
   */
  private generateScoreHistory(
    currentScore: number,
    previousScore: number | null,
    months: number
  ): { period: string; score: number }[] {
    const history: { period: string; score: number }[] = [];
    const now = new Date();

    // If we have a previous score, interpolate; otherwise use current with slight variance
    const startScore = previousScore || currentScore * 0.95;
    const scoreRange = currentScore - startScore;

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      // Interpolate score with some noise
      const progress = (months - 1 - i) / (months - 1);
      const baseScore = startScore + scoreRange * progress;
      const noise = (Math.random() - 0.5) * 5; // ±2.5 points variance
      const score = Math.max(0, Math.min(100, baseScore + noise));

      history.push({
        period,
        score: Math.round(score * 10) / 10,
      });
    }

    // Ensure the last entry matches current score
    if (history.length > 0) {
      history[history.length - 1].score = currentScore;
    }

    return history;
  }

  /**
   * Get benchmark comparison for supplier
   */
  private async getBenchmarkComparison(
    supplierId: string,
    category: string | null,
    currentScore: number
  ): Promise<BenchmarkComparison> {
    // Get all suppliers in same category
    const whereClause: Record<string, unknown> = { status: 'active' };
    if (category) {
      whereClause.category = category;
    }

    const suppliers = await prisma.supplier.findMany({
      where: whereClause,
      include: {
        riskScore: true,
      },
    });

    // Calculate scores for all suppliers (use risk scores if available)
    const scores = suppliers.map((s) => ({
      supplierId: s.id,
      score: s.riskScore?.overallScore || 70, // Default to 70 if no score
    }));

    // Add current supplier's score
    const currentSupplierIndex = scores.findIndex((s) => s.supplierId === supplierId);
    if (currentSupplierIndex >= 0) {
      scores[currentSupplierIndex].score = currentScore;
    } else {
      scores.push({ supplierId, score: currentScore });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Calculate metrics
    const totalInCategory = scores.length;
    const categoryAverage =
      scores.reduce((sum, s) => sum + s.score, 0) / totalInCategory;
    const rank = scores.findIndex((s) => s.supplierId === supplierId) + 1;
    const percentile = Math.round(((totalInCategory - rank + 1) / totalInCategory) * 100);

    return {
      categoryAverage: Math.round(categoryAverage * 10) / 10,
      percentile,
      rank,
      totalInCategory,
      aboveAverage: currentScore > categoryAverage,
    };
  }

  /**
   * Generate insights from scores
   */
  private generateInsights(
    delivery: DimensionScore,
    quality: DimensionScore,
    cost: DimensionScore,
    responsiveness: DimensionScore
  ): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze delivery
    if (delivery.grade === 'A') {
      strengths.push('Excellent on-time delivery performance');
    } else if (delivery.grade === 'D' || delivery.grade === 'F') {
      weaknesses.push('Delivery reliability needs significant improvement');
      recommendations.push('Implement delivery tracking and early warning alerts');
    }

    // Analyze quality
    if (quality.grade === 'A') {
      strengths.push('Outstanding quality consistency with minimal defects');
    } else if (quality.grade === 'D' || quality.grade === 'F') {
      weaknesses.push('Quality issues require immediate attention');
      recommendations.push('Conduct supplier quality audit and review processes');
    }

    // Analyze cost
    if (cost.grade === 'A') {
      strengths.push('Competitive and stable pricing');
    } else if (cost.grade === 'D' || cost.grade === 'F') {
      weaknesses.push('Pricing concerns - high variance or unfavorable trends');
      recommendations.push('Negotiate long-term pricing agreements');
    }

    // Analyze responsiveness
    if (responsiveness.grade === 'A') {
      strengths.push('Highly responsive communication and issue resolution');
    } else if (responsiveness.grade === 'D' || responsiveness.grade === 'F') {
      weaknesses.push('Poor responsiveness to issues and communications');
      recommendations.push('Establish escalation procedures and SLAs');
    }

    // Cross-dimension analysis
    if (delivery.trend === 'declining' || quality.trend === 'declining') {
      recommendations.push('Schedule quarterly business review to address declining performance');
    }

    if (strengths.length === 0) {
      strengths.push('Acceptable performance across all dimensions');
    }

    if (weaknesses.length === 0) {
      weaknesses.push('No critical weaknesses identified');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring performance and maintain relationship');
    }

    return { strengths, weaknesses, recommendations };
  }

  /**
   * Get supplier rankings for a category
   */
  async getSupplierRankings(
    category?: string,
    limit: number = 20
  ): Promise<SupplierRanking[]> {
    const whereClause: Record<string, unknown> = { status: 'active' };
    if (category) {
      whereClause.category = category;
    }

    const suppliers = await prisma.supplier.findMany({
      where: whereClause,
      include: {
        riskScore: true,
      },
      take: limit * 2, // Get more to ensure we have enough after scoring
    });

    // Generate scorecards for all suppliers
    const rankings: SupplierRanking[] = [];

    for (const supplier of suppliers) {
      const scorecard = await this.generateScorecard(supplier.id, 6);
      if (scorecard) {
        rankings.push({
          supplierId: supplier.id,
          supplierName: supplier.name,
          overallScore: scorecard.overallScore,
          overallGrade: scorecard.overallGrade,
          rank: 0, // Will be set after sorting
          deliveryScore: scorecard.dimensions.delivery.score,
          qualityScore: scorecard.dimensions.quality.score,
          costScore: scorecard.dimensions.cost.score,
          responsivenessScore: scorecard.dimensions.responsiveness.score,
          trend: scorecard.trend.direction,
        });
      }
    }

    // Sort by overall score and assign ranks
    rankings.sort((a, b) => b.overallScore - a.overallScore);
    rankings.forEach((r, index) => {
      r.rank = index + 1;
    });

    return rankings.slice(0, limit);
  }

  /**
   * Get category benchmarks
   */
  async getCategoryBenchmarks(): Promise<CategoryBenchmark[]> {
    const suppliers = await prisma.supplier.findMany({
      where: { status: 'active' },
      include: {
        riskScore: true,
      },
    });

    // Group by category
    const categoryMap = new Map<string, any[]>();
    suppliers.forEach((s) => {
      const cat = s.category || 'Uncategorized';
      const list = categoryMap.get(cat) || [];
      list.push(s);
      categoryMap.set(cat, list);
    });

    const benchmarks: CategoryBenchmark[] = [];

    for (const [category, categorySuppliers] of categoryMap) {
      if (categorySuppliers.length === 0) continue;

      // Calculate averages from risk scores
      const scores = categorySuppliers
        .filter((s) => s.riskScore)
        .map((s) => s.riskScore!);

      if (scores.length === 0) {
        benchmarks.push({
          category,
          avgOverallScore: 70,
          avgDeliveryScore: 70,
          avgQualityScore: 70,
          avgCostScore: 70,
          avgResponsivenessScore: 70,
          topPerformer: null,
          supplierCount: categorySuppliers.length,
        });
        continue;
      }

      const avgOverall = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length;
      const avgDelivery = scores.reduce((sum, s) => sum + s.deliveryScore, 0) / scores.length;
      const avgQuality = scores.reduce((sum, s) => sum + s.qualityScore, 0) / scores.length;
      const avgFinancial = scores.reduce((sum, s) => sum + s.financialScore, 0) / scores.length;
      const avgCommunication = scores.reduce((sum, s) => sum + s.communicationScore, 0) / scores.length;

      // Find top performer
      const topScore = Math.max(...scores.map((s) => s.overallScore));
      const topScoreRecord = scores.find((s) => s.overallScore === topScore);
      const topSupplier = topScoreRecord
        ? categorySuppliers.find((s) => s.id === topScoreRecord.supplierId)
        : null;

      benchmarks.push({
        category,
        avgOverallScore: Math.round(avgOverall * 10) / 10,
        avgDeliveryScore: Math.round(avgDelivery * 10) / 10,
        avgQualityScore: Math.round(avgQuality * 10) / 10,
        avgCostScore: Math.round(avgFinancial * 10) / 10,
        avgResponsivenessScore: Math.round(avgCommunication * 10) / 10,
        topPerformer: topSupplier
          ? {
              supplierId: topSupplier.id,
              supplierName: topSupplier.name,
              score: topScore,
            }
          : null,
        supplierCount: categorySuppliers.length,
      });
    }

    return benchmarks.sort((a, b) => b.avgOverallScore - a.avgOverallScore);
  }

  /**
   * Save scorecard to database
   */
  async saveScorecard(scorecard: SupplierScorecard): Promise<void> {
    await prisma.supplierRiskScore.upsert({
      where: { supplierId: scorecard.supplierId },
      update: {
        overallScore: Math.round(scorecard.overallScore),
        riskLevel: this.gradeToRiskLevel(scorecard.overallGrade),
        deliveryScore: Math.round(scorecard.dimensions.delivery.score),
        qualityScore: Math.round(scorecard.dimensions.quality.score),
        financialScore: Math.round(scorecard.dimensions.cost.score),
        geographicScore: 70, // Default for now
        communicationScore: Math.round(scorecard.dimensions.responsiveness.score),
        trend: scorecard.trend.direction.toUpperCase(),
        previousScore: scorecard.trend.previousScore,
        strengths: scorecard.strengths,
        risks: scorecard.weaknesses,
        recommendations: scorecard.recommendations,
        lastCalculated: new Date(),
      },
      create: {
        supplierId: scorecard.supplierId,
        overallScore: Math.round(scorecard.overallScore),
        riskLevel: this.gradeToRiskLevel(scorecard.overallGrade),
        deliveryScore: Math.round(scorecard.dimensions.delivery.score),
        qualityScore: Math.round(scorecard.dimensions.quality.score),
        financialScore: Math.round(scorecard.dimensions.cost.score),
        geographicScore: 70,
        communicationScore: Math.round(scorecard.dimensions.responsiveness.score),
        trend: scorecard.trend.direction.toUpperCase(),
        previousScore: scorecard.trend.previousScore,
        strengths: scorecard.strengths,
        risks: scorecard.weaknesses,
        recommendations: scorecard.recommendations,
        lastCalculated: new Date(),
      },
    });
  }

  /**
   * Convert grade to risk level
   */
  private gradeToRiskLevel(grade: SupplierGrade): string {
    switch (grade) {
      case 'A':
        return 'LOW';
      case 'B':
        return 'LOW';
      case 'C':
        return 'MEDIUM';
      case 'D':
        return 'HIGH';
      case 'F':
        return 'CRITICAL';
      default:
        return 'MEDIUM';
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let scorerInstance: SupplierPerformanceScorer | null = null;

export function getSupplierPerformanceScorer(): SupplierPerformanceScorer {
  if (!scorerInstance) {
    scorerInstance = new SupplierPerformanceScorer();
  }
  return scorerInstance;
}
