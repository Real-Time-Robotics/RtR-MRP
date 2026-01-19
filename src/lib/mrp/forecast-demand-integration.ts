// =============================================================================
// FORECAST DEMAND INTEGRATION
// Integrates AI forecasts into MRP demand calculations
// =============================================================================

import { prisma } from '@/lib/prisma';
import {
  getForecastEngine,
  getHolidayBuffer,
  getSafetyStockOptimizer,
} from '@/lib/ai/forecast';

// =============================================================================
// TYPES
// =============================================================================

export interface ForecastDemand {
  partId: string;
  period: string;
  forecastQty: number;
  confidence: number;
  seasonalFactor: number;
  holidayFactor: number;
  adjustedQty: number;
}

export interface ForecastBasedMRPInput {
  partId: string;
  partSku: string;
  partName: string;
  grossDemand: number;
  forecastDemand: number;
  combinedDemand: number;
  recommendedSafetyStock: number;
  currentSafetyStock: number;
  forecastConfidence: number;
  demandSource: 'orders' | 'forecast' | 'combined';
}

export interface MRPForecastSummary {
  totalParts: number;
  partsWithForecast: number;
  partsOrdersOnly: number;
  avgForecastConfidence: number;
  holidayAdjustmentApplied: boolean;
  holidayBuffer: number;
}

// =============================================================================
// FORECAST DEMAND SERVICE
// =============================================================================

export class ForecastDemandIntegration {
  private forecastEngine: ReturnType<typeof getForecastEngine>;
  private safetyStockOptimizer: ReturnType<typeof getSafetyStockOptimizer>;

  constructor() {
    this.forecastEngine = getForecastEngine();
    this.safetyStockOptimizer = getSafetyStockOptimizer();
  }

  /**
   * Get forecast-based demand for a part
   */
  async getForecastDemand(
    partId: string,
    horizonWeeks: number = 12,
    periodType: 'weekly' | 'monthly' = 'weekly'
  ): Promise<ForecastDemand[]> {
    const forecast = await this.forecastEngine.generateForecast(partId, {
      periodType,
      periodsAhead: horizonWeeks,
    });

    if (!forecast) {
      return [];
    }

    return forecast.forecasts.map((pred) => ({
      partId,
      period: pred.period,
      forecastQty: pred.forecast,
      confidence: pred.confidence,
      seasonalFactor: pred.factors.seasonalIndex || 1,
      holidayFactor: pred.factors.holidayFactor || 1,
      adjustedQty: Math.ceil(
        pred.forecast * (pred.factors.seasonalIndex || 1) * (pred.factors.holidayFactor || 1)
      ),
    }));
  }

  /**
   * Get combined demand (orders + forecast) for MRP
   */
  async getMRPDemandInput(
    partId: string,
    options: {
      includeOpenOrders?: boolean;
      forecastWeight?: number; // 0-1, how much to weight forecast vs orders
      horizonWeeks?: number;
    } = {}
  ): Promise<ForecastBasedMRPInput | null> {
    const {
      includeOpenOrders = true,
      forecastWeight = 0.5,
      horizonWeeks = 12,
    } = options;

    // Get part info
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: {
        id: true,
        partNumber: true,
        name: true,
        safetyStock: true,
      },
    });

    if (!part) return null;

    // Get open orders demand
    let ordersDemand = 0;
    if (includeOpenOrders) {
      const orders = await prisma.salesOrderLine.aggregate({
        where: {
          product: { sku: part.partNumber },
          order: { status: { in: ['confirmed', 'in_production'] } },
        },
        _sum: { quantity: true },
      });
      ordersDemand = orders._sum.quantity || 0;
    }

    // Get forecast demand
    const forecastData = await this.getForecastDemand(partId, horizonWeeks, 'weekly');
    const forecastDemand = forecastData.reduce((sum, f) => sum + f.adjustedQty, 0);
    const avgConfidence = forecastData.length > 0
      ? forecastData.reduce((sum, f) => sum + f.confidence, 0) / forecastData.length
      : 0;

    // Combine demands based on weight
    let combinedDemand: number;
    let demandSource: 'orders' | 'forecast' | 'combined';

    if (ordersDemand > 0 && forecastDemand > 0) {
      combinedDemand = Math.ceil(
        ordersDemand * (1 - forecastWeight) + forecastDemand * forecastWeight
      );
      demandSource = 'combined';
    } else if (ordersDemand > 0) {
      combinedDemand = ordersDemand;
      demandSource = 'orders';
    } else {
      combinedDemand = forecastDemand;
      demandSource = 'forecast';
    }

    // Get safety stock recommendation
    const ssRecommendation = await this.safetyStockOptimizer.calculateOptimalSafetyStock(partId);

    return {
      partId,
      partSku: part.partNumber,
      partName: part.name,
      grossDemand: ordersDemand,
      forecastDemand,
      combinedDemand,
      recommendedSafetyStock: ssRecommendation?.recommended.safetyStock || part.safetyStock || 0,
      currentSafetyStock: part.safetyStock || 0,
      forecastConfidence: avgConfidence,
      demandSource,
    };
  }

  /**
   * Get MRP inputs for multiple parts
   */
  async getBulkMRPDemandInputs(
    partIds?: string[],
    options: {
      maxParts?: number;
      forecastWeight?: number;
      horizonWeeks?: number;
    } = {}
  ): Promise<{
    inputs: ForecastBasedMRPInput[];
    summary: MRPForecastSummary;
  }> {
    const { maxParts = 100, forecastWeight = 0.5, horizonWeeks = 12 } = options;

    // Get target parts
    let targetIds: string[];
    if (partIds && partIds.length > 0) {
      targetIds = partIds.slice(0, maxParts);
    } else {
      const parts = await prisma.part.findMany({
        where: { partType: { in: ['FINISHED_GOOD', 'COMPONENT'] } },
        select: { id: true },
        take: maxParts,
      });
      targetIds = parts.map((p) => p.id);
    }

    const inputs: ForecastBasedMRPInput[] = [];
    let partsWithForecast = 0;
    let partsOrdersOnly = 0;
    let totalConfidence = 0;

    for (const partId of targetIds) {
      const input = await this.getMRPDemandInput(partId, {
        forecastWeight,
        horizonWeeks,
      });

      if (input) {
        inputs.push(input);

        if (input.demandSource === 'forecast' || input.demandSource === 'combined') {
          partsWithForecast++;
          totalConfidence += input.forecastConfidence;
        } else {
          partsOrdersOnly++;
        }
      }
    }

    const holidayBuffer = getHolidayBuffer(new Date());

    return {
      inputs,
      summary: {
        totalParts: inputs.length,
        partsWithForecast,
        partsOrdersOnly,
        avgForecastConfidence: partsWithForecast > 0
          ? totalConfidence / partsWithForecast
          : 0,
        holidayAdjustmentApplied: holidayBuffer > 0,
        holidayBuffer,
      },
    };
  }

  /**
   * Get forecast-enhanced safety stock for MRP run
   */
  async getEnhancedSafetyStocks(
    partIds: string[]
  ): Promise<Map<string, { current: number; recommended: number; delta: number }>> {
    const result = new Map<string, { current: number; recommended: number; delta: number }>();

    for (const partId of partIds) {
      const ssResult = await this.safetyStockOptimizer.calculateOptimalSafetyStock(partId);
      if (ssResult) {
        result.set(partId, {
          current: ssResult.current.safetyStock,
          recommended: ssResult.recommended.safetyStock,
          delta: ssResult.delta.safetyStock,
        });
      }
    }

    return result;
  }

  /**
   * Generate forecast-based planned orders
   */
  async generateForecastBasedPlannedOrders(
    options: {
      partIds?: string[];
      horizonWeeks?: number;
      forecastWeight?: number;
      minQuantity?: number;
    } = {}
  ): Promise<{
    plannedOrders: Array<{
      partId: string;
      partSku: string;
      quantity: number;
      suggestedDate: Date;
      source: string;
      confidence: number;
      reason: string;
    }>;
    summary: {
      totalOrders: number;
      totalQuantity: number;
      avgConfidence: number;
    };
  }> {
    const {
      partIds,
      horizonWeeks = 12,
      forecastWeight = 0.5,
      minQuantity = 1,
    } = options;

    const { inputs, summary } = await this.getBulkMRPDemandInputs(partIds, {
      forecastWeight,
      horizonWeeks,
    });

    const plannedOrders: Array<{
      partId: string;
      partSku: string;
      quantity: number;
      suggestedDate: Date;
      source: string;
      confidence: number;
      reason: string;
    }> = [];

    for (const input of inputs) {
      // Get current inventory
      const inventory = await prisma.inventory.aggregate({
        where: { partId: input.partId },
        _sum: { quantity: true, reservedQty: true },
      });

      const availableStock = (inventory._sum.quantity || 0) - (inventory._sum.reservedQty || 0);
      const netRequired = input.combinedDemand + input.recommendedSafetyStock - availableStock;

      if (netRequired >= minQuantity) {
        // Get lead time
        const part = await prisma.part.findUnique({
          where: { id: input.partId },
          select: {
            leadTimeDays: true,
            partSuppliers: {
              where: { status: 'active' },
              orderBy: { isPreferred: 'desc' },
              take: 1,
              select: { leadTimeDays: true },
            },
          },
        });

        const leadTimeDays = part?.partSuppliers[0]?.leadTimeDays || part?.leadTimeDays || 14;
        const suggestedDate = new Date();
        suggestedDate.setDate(suggestedDate.getDate() + leadTimeDays);

        plannedOrders.push({
          partId: input.partId,
          partSku: input.partSku,
          quantity: Math.ceil(netRequired),
          suggestedDate,
          source: input.demandSource,
          confidence: input.forecastConfidence,
          reason: `Demand: ${input.combinedDemand}, SS: ${input.recommendedSafetyStock}, Stock: ${availableStock}`,
        });
      }
    }

    return {
      plannedOrders,
      summary: {
        totalOrders: plannedOrders.length,
        totalQuantity: plannedOrders.reduce((sum, o) => sum + o.quantity, 0),
        avgConfidence: summary.avgForecastConfidence,
      },
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let integrationInstance: ForecastDemandIntegration | null = null;

export function getForecastDemandIntegration(): ForecastDemandIntegration {
  if (!integrationInstance) {
    integrationInstance = new ForecastDemandIntegration();
  }
  return integrationInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export async function getForecastDemandForMRP(
  partId: string,
  options?: { forecastWeight?: number; horizonWeeks?: number }
): Promise<ForecastBasedMRPInput | null> {
  const integration = getForecastDemandIntegration();
  return integration.getMRPDemandInput(partId, options);
}

export async function getBulkForecastDemandForMRP(
  partIds?: string[],
  options?: { maxParts?: number; forecastWeight?: number }
): Promise<{
  inputs: ForecastBasedMRPInput[];
  summary: MRPForecastSummary;
}> {
  const integration = getForecastDemandIntegration();
  return integration.getBulkMRPDemandInputs(partIds, options);
}
