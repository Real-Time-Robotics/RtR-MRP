// =============================================================================
// SAFETY STOCK OPTIMIZER
// AI-powered safety stock and reorder point optimization
// Integrates with demand forecasting and MRP
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getForecastEngine } from './forecast-engine';
import { getDataExtractorService } from './data-extractor';
import {
  isHolidayPeriod,
  getTetPhase,
  getUpcomingHolidays,
  getHolidayFactor,
} from './vn-calendar';

// =============================================================================
// TYPES
// =============================================================================

export interface SafetyStockConfig {
  serviceLevel: number; // 0.90 = 90%, 0.95 = 95%, 0.99 = 99%
  reviewPeriodDays: number; // Order review period
  includeHolidayBuffer: boolean;
  maxBufferMultiplier: number; // Maximum safety stock multiplier (e.g., 2.0 = max 200%)
}

export interface SafetyStockResult {
  partId: string;
  partSku: string;
  partName: string;
  current: {
    safetyStock: number;
    reorderPoint: number;
  };
  recommended: {
    safetyStock: number;
    reorderPoint: number;
  };
  delta: {
    safetyStock: number;
    reorderPoint: number;
  };
  metrics: {
    averageDailyDemand: number;
    demandVariability: number;
    leadTimeDays: number;
    serviceLevel: number;
    holidayBuffer: number;
  };
  reasoning: string[];
  confidence: number;
  generatedAt: Date;
}

export interface ReorderPointResult {
  partId: string;
  current: number;
  recommended: number;
  delta: number;
  leadTimeDemand: number;
  safetyStock: number;
  reasoning: string;
}

export interface BulkOptimizationResult {
  processed: number;
  updated: number;
  skipped: number;
  results: SafetyStockResult[];
  errors: string[];
}

// =============================================================================
// SERVICE LEVEL Z-SCORES
// =============================================================================

const SERVICE_LEVEL_Z: Record<number, number> = {
  0.80: 0.84,
  0.85: 1.04,
  0.90: 1.28,
  0.95: 1.65,
  0.97: 1.88,
  0.98: 2.05,
  0.99: 2.33,
  0.995: 2.58,
};

function getZScore(serviceLevel: number): number {
  // Find closest service level
  const levels = Object.keys(SERVICE_LEVEL_Z).map(Number).sort((a, b) => a - b);
  let closest = levels[0];
  let minDiff = Math.abs(serviceLevel - closest);

  for (const level of levels) {
    const diff = Math.abs(serviceLevel - level);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }

  return SERVICE_LEVEL_Z[closest] || 1.65; // Default to 95%
}

// =============================================================================
// HOLIDAY BUFFER CALCULATION
// =============================================================================

export function getHolidayBuffer(date: Date = new Date()): number {
  const tetPhase = getTetPhase(date);

  // Tết preparation phase - highest buffer
  if (tetPhase === 'pre-tet') {
    const daysToTet = getTetDaysRemaining(date);
    if (daysToTet <= 14) return 0.50; // +50% within 2 weeks
    if (daysToTet <= 30) return 0.30; // +30% within 1 month
    return 0.15; // +15% within pre-tet phase
  }

  // During Tết - low demand, minimal buffer
  if (tetPhase === 'tet') {
    return -0.20; // -20% during Tết (factories closed)
  }

  // Post-Tết recovery
  if (tetPhase === 'post-tet') {
    return 0.20; // +20% for restart ramp-up
  }

  // Check other holidays (next 1 month)
  const upcomingHolidays = getUpcomingHolidays(1);
  if (upcomingHolidays.length > 0) {
    return 0.15; // +15% buffer for other holidays
  }

  return 0; // Normal period
}

function getTetDaysRemaining(date: Date): number {
  // Simplified - actual implementation would use lunar calendar
  const year = date.getFullYear();
  // Approximate Tết dates (late Jan/early Feb)
  const tetDates: Record<number, Date> = {
    2025: new Date('2025-01-29'),
    2026: new Date('2026-02-17'),
    2027: new Date('2027-02-06'),
  };

  const tetDate = tetDates[year] || tetDates[year + 1];
  if (!tetDate) return 365;

  const diff = tetDate.getTime() - date.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// =============================================================================
// SAFETY STOCK OPTIMIZER SERVICE
// =============================================================================

export class SafetyStockOptimizerService {
  private config: SafetyStockConfig;

  constructor(config: Partial<SafetyStockConfig> = {}) {
    this.config = {
      serviceLevel: config.serviceLevel ?? 0.95,
      reviewPeriodDays: config.reviewPeriodDays ?? 7,
      includeHolidayBuffer: config.includeHolidayBuffer ?? true,
      maxBufferMultiplier: config.maxBufferMultiplier ?? 2.5,
    };
  }

  /**
   * Calculate optimal safety stock for a single part
   */
  async calculateOptimalSafetyStock(
    partId: string,
    options: Partial<SafetyStockConfig> = {}
  ): Promise<SafetyStockResult | null> {
    const config = { ...this.config, ...options };

    try {
      // Get part data
      const part = await prisma.part.findUnique({
        where: { id: partId },
        include: {
          partSuppliers: {
            where: { status: 'active' },
            orderBy: { isPreferred: 'desc' },
            take: 1,
          },
        },
      });

      if (!part) return null;

      // Get forecast data
      const forecastEngine = getForecastEngine();
      const dataExtractor = getDataExtractorService();

      const forecast = await forecastEngine.generateForecast(partId, {
        periodType: 'weekly',
        periodsAhead: 12,
      });

      const salesHistory = await dataExtractor.extractProductSalesHistory(
        partId,
        12,
        'monthly'
      );

      // Calculate demand metrics
      let averageDailyDemand = 0;
      let demandVariability = 0;

      if (salesHistory && salesHistory.history.length > 0) {
        const monthlyDemands = salesHistory.history.map(h => h.quantity);
        const avgMonthlyDemand = monthlyDemands.reduce((a, b) => a + b, 0) / monthlyDemands.length;
        averageDailyDemand = avgMonthlyDemand / 30;

        // Calculate standard deviation
        const variance = monthlyDemands.reduce(
          (sum, d) => sum + Math.pow(d - avgMonthlyDemand, 2),
          0
        ) / monthlyDemands.length;
        const stdDev = Math.sqrt(variance);
        demandVariability = avgMonthlyDemand > 0 ? stdDev / avgMonthlyDemand : 0;
      } else if (forecast) {
        // Use forecast if no history
        const avgWeeklyDemand = forecast.forecasts.reduce(
          (sum, p) => sum + p.forecast,
          0
        ) / forecast.forecasts.length;
        averageDailyDemand = avgWeeklyDemand / 7;
        demandVariability = 0.3; // Assume moderate variability
      }

      // Get lead time from supplier or use default
      const leadTimeDays = part.partSuppliers[0]?.leadTimeDays || 14;

      // Calculate Z-score for service level
      const zScore = getZScore(config.serviceLevel);

      // Calculate daily demand standard deviation
      const dailyStdDev = averageDailyDemand * demandVariability;

      // Safety Stock Formula: SS = Z × σ × √(LT + RP)
      // Where: LT = Lead Time, RP = Review Period
      const totalCycleTime = leadTimeDays + config.reviewPeriodDays;
      let safetyStock = Math.ceil(
        zScore * dailyStdDev * Math.sqrt(totalCycleTime)
      );

      // Apply holiday buffer
      let holidayBuffer = 0;
      if (config.includeHolidayBuffer) {
        holidayBuffer = getHolidayBuffer(new Date());
        safetyStock = Math.ceil(safetyStock * (1 + holidayBuffer));
      }

      // Apply maximum buffer limit
      const maxSafetyStock = Math.ceil(
        averageDailyDemand * leadTimeDays * config.maxBufferMultiplier
      );
      safetyStock = Math.min(safetyStock, maxSafetyStock);

      // Ensure minimum safety stock
      const minSafetyStock = Math.ceil(averageDailyDemand * 3); // At least 3 days coverage
      safetyStock = Math.max(safetyStock, minSafetyStock);

      // Calculate optimal reorder point
      const leadTimeDemand = Math.ceil(averageDailyDemand * leadTimeDays);
      const reorderPoint = leadTimeDemand + safetyStock;

      // Get current values
      const currentSafetyStock = part.safetyStock || 0;
      const currentReorderPoint = part.reorderPoint || 0;

      // Build reasoning
      const reasoning: string[] = [];

      if (demandVariability > 0.4) {
        reasoning.push('High demand variability detected - increased safety stock recommended');
      } else if (demandVariability < 0.15) {
        reasoning.push('Low demand variability - standard safety stock sufficient');
      }

      if (holidayBuffer > 0) {
        const phase = getTetPhase(new Date());
        if (phase === 'pre-tet') {
          reasoning.push(`Tết approaching - ${(holidayBuffer * 100).toFixed(0)}% buffer applied`);
        } else {
          reasoning.push(`Holiday period detected - ${(holidayBuffer * 100).toFixed(0)}% buffer applied`);
        }
      }

      if (leadTimeDays > 21) {
        reasoning.push(`Long lead time (${leadTimeDays} days) requires higher safety stock`);
      }

      if (safetyStock > currentSafetyStock * 1.2) {
        reasoning.push('Current safety stock may be insufficient for service level target');
      } else if (safetyStock < currentSafetyStock * 0.8) {
        reasoning.push('Current safety stock may be excessive - capital optimization possible');
      }

      // Calculate confidence based on data quality
      let confidence = 0.7;
      if (salesHistory && salesHistory.history.length >= 6) confidence += 0.1;
      if (salesHistory && salesHistory.history.length >= 12) confidence += 0.1;
      if (forecast && forecast.dataQuality === 'good') confidence += 0.1;
      confidence = Math.min(confidence, 0.95);

      return {
        partId,
        partSku: part.partNumber,
        partName: part.name,
        current: {
          safetyStock: currentSafetyStock,
          reorderPoint: currentReorderPoint,
        },
        recommended: {
          safetyStock,
          reorderPoint,
        },
        delta: {
          safetyStock: safetyStock - currentSafetyStock,
          reorderPoint: reorderPoint - currentReorderPoint,
        },
        metrics: {
          averageDailyDemand,
          demandVariability,
          leadTimeDays,
          serviceLevel: config.serviceLevel,
          holidayBuffer,
        },
        reasoning,
        confidence,
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'safety-stock-optimizer', partId });
      return null;
    }
  }

  /**
   * Calculate optimal reorder point for a single part
   */
  async calculateOptimalReorderPoint(
    partId: string,
    options: Partial<SafetyStockConfig> = {}
  ): Promise<ReorderPointResult | null> {
    const ssResult = await this.calculateOptimalSafetyStock(partId, options);
    if (!ssResult) return null;

    return {
      partId,
      current: ssResult.current.reorderPoint,
      recommended: ssResult.recommended.reorderPoint,
      delta: ssResult.delta.reorderPoint,
      leadTimeDemand: Math.ceil(
        ssResult.metrics.averageDailyDemand * ssResult.metrics.leadTimeDays
      ),
      safetyStock: ssResult.recommended.safetyStock,
      reasoning: `ROP = Lead Time Demand (${Math.ceil(ssResult.metrics.averageDailyDemand * ssResult.metrics.leadTimeDays)}) + Safety Stock (${ssResult.recommended.safetyStock})`,
    };
  }

  /**
   * Bulk optimization for multiple parts
   */
  async optimizeBulk(
    partIds?: string[],
    options: Partial<SafetyStockConfig> & { maxParts?: number } = {}
  ): Promise<BulkOptimizationResult> {
    const maxParts = options.maxParts || 100;
    let targetParts: string[];

    if (partIds && partIds.length > 0) {
      targetParts = partIds.slice(0, maxParts);
    } else {
      // Get parts that have inventory
      const parts = await prisma.part.findMany({
        where: {
          partType: { in: ['FINISHED_GOOD', 'COMPONENT'] },
        },
        select: { id: true },
        take: maxParts,
      });
      targetParts = parts.map(p => p.id);
    }

    const results: SafetyStockResult[] = [];
    const errors: string[] = [];
    let updated = 0;
    let skipped = 0;

    for (const partId of targetParts) {
      try {
        const result = await this.calculateOptimalSafetyStock(partId, options);
        if (result) {
          results.push(result);
          // Only count as significant if delta > 10%
          const deltaPercent = result.current.safetyStock > 0
            ? Math.abs(result.delta.safetyStock / result.current.safetyStock)
            : 1;
          if (deltaPercent > 0.1) {
            updated++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(`Part ${partId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      processed: targetParts.length,
      updated,
      skipped,
      results,
      errors,
    };
  }

  /**
   * Apply recommendations to parts
   */
  async applyRecommendations(
    results: SafetyStockResult[],
    options: { updateSafetyStock?: boolean; updateReorderPoint?: boolean } = {}
  ): Promise<{ updated: number; failed: number }> {
    const { updateSafetyStock = true, updateReorderPoint = true } = options;
    let updated = 0;
    let failed = 0;

    for (const result of results) {
      try {
        const updateData: Record<string, number> = {};

        if (updateSafetyStock && result.delta.safetyStock !== 0) {
          updateData.safetyStock = result.recommended.safetyStock;
        }

        if (updateReorderPoint && result.delta.reorderPoint !== 0) {
          updateData.reorderPoint = result.recommended.reorderPoint;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.part.update({
            where: { id: result.partId },
            data: updateData,
          });
          updated++;
        }
      } catch (err) {
        logger.logError(err instanceof Error ? err : new Error(String(err)), { context: 'safety-stock-optimizer', partId: result.partId });
        failed++;
      }
    }

    return { updated, failed };
  }

  /**
   * Get optimization summary for dashboard
   */
  async getOptimizationSummary(): Promise<{
    totalParts: number;
    partsWithIssues: number;
    potentialSavings: number;
    riskReductions: number;
    holidayAlert: boolean;
    tetPhase: string | null;
  }> {
    // Get parts count
    const totalParts = await prisma.part.count({
      where: { partType: { in: ['FINISHED_GOOD', 'COMPONENT'] } },
    });

    // Get current Tết phase
    const tetPhase = getTetPhase(new Date());
    const holidayBuffer = getHolidayBuffer(new Date());

    return {
      totalParts,
      partsWithIssues: 0, // Would require analysis
      potentialSavings: 0, // Would require analysis
      riskReductions: 0, // Would require analysis
      holidayAlert: holidayBuffer > 0,
      tetPhase,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let optimizerInstance: SafetyStockOptimizerService | null = null;

export function getSafetyStockOptimizer(
  config?: Partial<SafetyStockConfig>
): SafetyStockOptimizerService {
  if (!optimizerInstance) {
    optimizerInstance = new SafetyStockOptimizerService(config);
  }
  return optimizerInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export async function calculateOptimalSafetyStock(
  partId: string,
  options?: Partial<SafetyStockConfig>
): Promise<SafetyStockResult | null> {
  const optimizer = getSafetyStockOptimizer();
  return optimizer.calculateOptimalSafetyStock(partId, options);
}

export async function calculateOptimalReorderPoint(
  partId: string,
  options?: Partial<SafetyStockConfig>
): Promise<ReorderPointResult | null> {
  const optimizer = getSafetyStockOptimizer();
  return optimizer.calculateOptimalReorderPoint(partId, options);
}

export async function optimizeBulkSafetyStock(
  partIds?: string[],
  options?: Partial<SafetyStockConfig> & { maxParts?: number }
): Promise<BulkOptimizationResult> {
  const optimizer = getSafetyStockOptimizer();
  return optimizer.optimizeBulk(partIds, options);
}
