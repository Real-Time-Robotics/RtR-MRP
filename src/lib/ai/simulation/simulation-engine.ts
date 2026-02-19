// =============================================================================
// SIMULATION ENGINE
// Core engine for running MRP, Capacity, and Supply Chain simulations
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  Scenario,
  ScenarioConfig,
  DemandScenarioConfig,
  SupplyScenarioConfig,
  CapacityScenarioConfig,
  CustomScenarioConfig,
  getScenarioBuilder,
} from './scenario-builder';

// =============================================================================
// TYPES
// =============================================================================

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  executedAt: Date;
  executionTimeMs: number;
  status: 'success' | 'partial' | 'failed';
  horizonDays: number;
  baseline: SimulationState;
  simulated: SimulationState;
  impacts: SimulationImpact;
  timeline: TimelinePoint[];
  alerts: SimulationAlert[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
}

export interface SimulationState {
  totalDemand: number;
  totalSupply: number;
  netInventory: number;
  serviceLevel: number;
  capacityUtilization: number;
  totalCost: number;
  leadTimeAvg: number;
  stockoutRisk: number;
  excessInventoryRisk: number;
  orderCount: number;
}

export interface SimulationImpact {
  demandChange: number;
  demandChangePercent: number;
  supplyChange: number;
  supplyChangePercent: number;
  inventoryChange: number;
  inventoryChangePercent: number;
  serviceLevelChange: number;
  capacityUtilizationChange: number;
  costChange: number;
  costChangePercent: number;
  leadTimeChange: number;
  leadTimeChangePercent: number;
  riskScoreChange: number;
}

export interface TimelinePoint {
  date: Date;
  week: number;
  demand: number;
  supply: number;
  inventory: number;
  capacityUsed: number;
  capacityAvailable: number;
  stockouts: number;
  backorders: number;
}

export interface SimulationAlert {
  type: 'stockout' | 'capacity' | 'supply' | 'cost' | 'delay';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affectedItems: string[];
  occurDate: Date;
  recommendedAction: string;
}

export interface Bottleneck {
  type: 'capacity' | 'supply' | 'material';
  resource: string;
  resourceId: string;
  severity: number; // 0-100
  impactedParts: string[];
  week: number;
  utilizationRate: number;
  shortfall: number;
  recommendations: string[];
}

/** Baseline data loaded from the database for simulation */
interface BaselineData {
  inventory: Array<{ partId: string; quantity: number }>;
  openOrders: Array<Record<string, unknown>>;
  plannedOrders: Array<Record<string, unknown>>;
  workOrders: Array<Record<string, unknown>>;
  capacity: Array<{
    workCenterId: string;
    name: string;
    dailyCapacityHours: number;
    efficiency: number | null;
  }>;
}

interface PartDemand {
  partId: string;
  partNumber: string;
  week: number;
  demand: number;
  supply: number;
  inventory: number;
}

interface CapacityPlan {
  workCenterId: string;
  workCenterName: string;
  week: number;
  requiredHours: number;
  availableHours: number;
  utilization: number;
  overflow: number;
}

// =============================================================================
// SIMULATION ENGINE CLASS
// =============================================================================

export class SimulationEngine {
  private builder = getScenarioBuilder();

  /**
   * Run a complete simulation for a scenario
   */
  async runSimulation(scenario: Scenario): Promise<SimulationResult> {
    const startTime = Date.now();

    try {
      // Load baseline data
      const baselineData = await this.builder.loadBaselineData(scenario.id);

      // Calculate baseline state
      const baseline = await this.calculateBaselineState(
        scenario.baselineDate,
        scenario.simulationHorizonDays
      );

      // Run simulated state based on scenario type
      const simulated = await this.calculateSimulatedState(
        scenario,
        baselineData
      );

      // Calculate impacts
      const impacts = this.calculateImpacts(baseline, simulated);

      // Generate timeline
      const timeline = await this.generateTimeline(
        scenario,
        baselineData
      );

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(timeline, scenario);

      // Generate alerts
      const alerts = this.generateAlerts(timeline, bottlenecks, scenario);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        impacts,
        bottlenecks,
        alerts
      );

      const executionTimeMs = Date.now() - startTime;

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        executedAt: new Date(),
        executionTimeMs,
        status: 'success',
        horizonDays: scenario.simulationHorizonDays,
        baseline,
        simulated,
        impacts,
        timeline,
        alerts,
        bottlenecks,
        recommendations,
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'simulation-engine' });
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        executedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
        status: 'failed',
        horizonDays: scenario.simulationHorizonDays,
        baseline: this.getEmptyState(),
        simulated: this.getEmptyState(),
        impacts: this.getEmptyImpacts(),
        timeline: [],
        alerts: [{
          type: 'cost',
          severity: 'critical',
          message: 'Simulation failed: ' + (error as Error).message,
          affectedItems: [],
          occurDate: new Date(),
          recommendedAction: 'Review scenario configuration and try again',
        }],
        bottlenecks: [],
        recommendations: ['Review scenario configuration and retry'],
      };
    }
  }

  /**
   * Calculate baseline state without scenario changes
   */
  private async calculateBaselineState(
    baselineDate: Date,
    horizonDays: number
  ): Promise<SimulationState> {
    const endDate = new Date(baselineDate.getTime() + horizonDays * 24 * 60 * 60 * 1000);

    // Get demand from sales orders
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        requiredDate: { gte: baselineDate, lte: endDate },
        status: { in: ['confirmed', 'in_production'] },
      },
      include: { lines: true },
    });

    const totalDemand = salesOrders.reduce(
      (sum, so) => sum + so.lines.reduce((ls, l) => ls + l.quantity, 0),
      0
    );

    // Get supply from POs and inventory
    const inventory = await prisma.inventory.aggregate({
      _sum: { quantity: true },
    });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        expectedDate: { gte: baselineDate, lte: endDate },
        status: { in: ['submitted', 'confirmed', 'partial'] },
      },
      include: { lines: true },
    });

    const incomingSupply = purchaseOrders.reduce(
      (sum, po) => sum + po.lines.reduce((ls, l) => ls + l.quantity, 0),
      0
    );

    const totalSupply = (inventory._sum.quantity || 0) + incomingSupply;

    // Get capacity utilization
    const workOrders = await prisma.workOrder.findMany({
      where: {
        plannedStart: { gte: baselineDate, lte: endDate },
        status: { in: ['planned', 'released', 'in_progress'] },
      },
    });

    const workCenters = await prisma.workCenter.findMany({
      where: { status: 'active' },
    });

    const totalCapacityHours = workCenters.reduce(
      (sum, wc) => sum + wc.capacityPerDay * (horizonDays / 7) * 5,
      0
    );

    // Estimate hours per work order based on quantity (simplified)
    const usedCapacityHours = workOrders.reduce(
      (sum, wo) => sum + (wo.quantity * 0.1), // Assume 0.1 hours per unit
      0
    );

    const capacityUtilization = totalCapacityHours > 0
      ? (usedCapacityHours / totalCapacityHours) * 100
      : 0;

    // Calculate service level
    const fulfilledOrders = salesOrders.filter(
      (so) => so.status === 'in_production' || so.status === 'completed'
    ).length;
    const serviceLevel = salesOrders.length > 0
      ? (fulfilledOrders / salesOrders.length) * 100
      : 100;

    // Estimate costs
    const totalCost = await this.calculateTotalCost(
      purchaseOrders,
      workOrders,
      inventory._sum.quantity || 0
    );

    // Calculate average lead time
    const avgLeadTime = await this.calculateAverageLeadTime();

    return {
      totalDemand,
      totalSupply,
      netInventory: totalSupply - totalDemand,
      serviceLevel,
      capacityUtilization,
      totalCost,
      leadTimeAvg: avgLeadTime,
      stockoutRisk: this.calculateStockoutRisk(totalSupply, totalDemand),
      excessInventoryRisk: this.calculateExcessRisk(totalSupply, totalDemand),
      orderCount: salesOrders.length + purchaseOrders.length,
    };
  }

  /**
   * Calculate simulated state with scenario changes
   */
  private async calculateSimulatedState(
    scenario: Scenario,
    baselineData: BaselineData
  ): Promise<SimulationState> {
    const baseline = await this.calculateBaselineState(
      scenario.baselineDate,
      scenario.simulationHorizonDays
    );

    let simulatedDemand = baseline.totalDemand;
    let simulatedSupply = baseline.totalSupply;
    let capacityChange = 0;
    let leadTimeChange = 0;
    let costChange = 0;

    // Apply scenario factors
    switch (scenario.config.type) {
      case 'demand':
        const demandConfig = scenario.config as DemandScenarioConfig;
        simulatedDemand *= 1 + demandConfig.parameters.demandChange / 100;
        break;

      case 'supply':
        const supplyConfig = scenario.config as SupplyScenarioConfig;
        if (supplyConfig.parameters.leadTimeChange) {
          leadTimeChange = supplyConfig.parameters.leadTimeChange;
        }
        if (supplyConfig.parameters.priceChange) {
          costChange = supplyConfig.parameters.priceChange;
        }
        if (supplyConfig.parameters.supplierDisruption?.length) {
          const avgSeverity = supplyConfig.parameters.supplierDisruption.reduce(
            (sum, d) => sum + d.severity,
            0
          ) / supplyConfig.parameters.supplierDisruption.length;
          simulatedSupply *= 1 - avgSeverity / 100;
        }
        break;

      case 'capacity':
        const capacityConfig = scenario.config as CapacityScenarioConfig;
        if (capacityConfig.parameters.capacityChange) {
          capacityChange = capacityConfig.parameters.capacityChange;
        }
        if (capacityConfig.parameters.addShift) {
          capacityChange += 33;
        }
        if (capacityConfig.parameters.removeShift) {
          capacityChange -= 33;
        }
        if (capacityConfig.parameters.efficiencyChange) {
          capacityChange += capacityConfig.parameters.efficiencyChange;
        }
        break;

      case 'custom':
        const customConfig = scenario.config as CustomScenarioConfig;
        if (customConfig.parameters.demandFactors?.demandChange) {
          simulatedDemand *= 1 + customConfig.parameters.demandFactors.demandChange / 100;
        }
        if (customConfig.parameters.supplyFactors?.leadTimeChange) {
          leadTimeChange = customConfig.parameters.supplyFactors.leadTimeChange;
        }
        if (customConfig.parameters.supplyFactors?.priceChange) {
          costChange = customConfig.parameters.supplyFactors.priceChange;
        }
        if (customConfig.parameters.capacityFactors?.capacityChange) {
          capacityChange = customConfig.parameters.capacityFactors.capacityChange;
        }
        break;
    }

    const simulatedCapacity = baseline.capacityUtilization / (1 + capacityChange / 100);
    const simulatedLeadTime = baseline.leadTimeAvg * (1 + leadTimeChange / 100);
    const simulatedCost = baseline.totalCost * (1 + costChange / 100);

    return {
      totalDemand: Math.round(simulatedDemand),
      totalSupply: Math.round(simulatedSupply),
      netInventory: Math.round(simulatedSupply - simulatedDemand),
      serviceLevel: this.calculateServiceLevel(simulatedSupply, simulatedDemand),
      capacityUtilization: Math.min(150, Math.max(0, simulatedCapacity)),
      totalCost: simulatedCost,
      leadTimeAvg: simulatedLeadTime,
      stockoutRisk: this.calculateStockoutRisk(simulatedSupply, simulatedDemand),
      excessInventoryRisk: this.calculateExcessRisk(simulatedSupply, simulatedDemand),
      orderCount: baseline.orderCount,
    };
  }

  /**
   * Generate timeline with weekly projections
   */
  private async generateTimeline(
    scenario: Scenario,
    baselineData: BaselineData
  ): Promise<TimelinePoint[]> {
    const timeline: TimelinePoint[] = [];
    const weeks = Math.ceil(scenario.simulationHorizonDays / 7);
    const startDate = scenario.baselineDate;

    // Get baseline weekly demand
    const baseWeeklyDemand = await this.getWeeklyDemand(startDate, weeks);
    const baseWeeklySupply = await this.getWeeklySupply(startDate, weeks);
    const baseCapacity = await this.getWeeklyCapacity(weeks);

    let runningInventory = baselineData.inventory.reduce(
      (sum: number, i: { partId: string; quantity: number }) => sum + i.quantity,
      0
    );

    // Apply scenario factors
    const factors = this.extractScenarioFactors(scenario.config);

    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000);

      // Apply ramp-up if configured
      const rampFactor = this.calculateRampFactor(week, factors.rampUpWeeks || 0);

      // Calculate adjusted values
      const demand = Math.round(
        (baseWeeklyDemand[week] || 0) * (1 + (factors.demandChange || 0) / 100 * rampFactor)
      );
      const supply = Math.round(
        (baseWeeklySupply[week] || 0) * (1 - (factors.supplyReduction || 0) / 100)
      );
      const capacityAvailable = Math.round(
        (baseCapacity[week] || 0) * (1 + (factors.capacityChange || 0) / 100)
      );

      // Calculate inventory position
      runningInventory = runningInventory + supply - demand;
      const stockouts = runningInventory < 0 ? Math.abs(runningInventory) : 0;
      const backorders = stockouts;

      if (runningInventory < 0) {
        runningInventory = 0;
      }

      // Calculate capacity usage
      const capacityUsed = Math.min(demand * 0.1, capacityAvailable); // Simplified

      timeline.push({
        date: weekStart,
        week: week + 1,
        demand,
        supply,
        inventory: runningInventory,
        capacityUsed,
        capacityAvailable,
        stockouts,
        backorders,
      });
    }

    return timeline;
  }

  /**
   * Identify bottlenecks from simulation results
   */
  private identifyBottlenecks(
    timeline: TimelinePoint[],
    scenario: Scenario
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Check for capacity bottlenecks
    const capacityIssues = timeline.filter(
      (t) => t.capacityUsed / t.capacityAvailable > 0.9
    );

    if (capacityIssues.length > 0) {
      const maxUtilization = Math.max(
        ...capacityIssues.map((t) => t.capacityUsed / t.capacityAvailable)
      );
      bottlenecks.push({
        type: 'capacity',
        resource: 'Production Capacity',
        resourceId: 'overall',
        severity: Math.min(100, Math.round(maxUtilization * 100)),
        impactedParts: [],
        week: capacityIssues[0].week,
        utilizationRate: maxUtilization * 100,
        shortfall: Math.round(
          capacityIssues.reduce((sum, t) => sum + (t.capacityUsed - t.capacityAvailable), 0)
        ),
        recommendations: [
          'Consider adding overtime or additional shifts',
          'Evaluate outsourcing options for peak periods',
          'Review production scheduling efficiency',
        ],
      });
    }

    // Check for material bottlenecks (stockouts)
    const stockoutIssues = timeline.filter((t) => t.stockouts > 0);

    if (stockoutIssues.length > 0) {
      const totalStockouts = stockoutIssues.reduce((sum, t) => sum + t.stockouts, 0);
      bottlenecks.push({
        type: 'material',
        resource: 'Inventory',
        resourceId: 'overall',
        severity: Math.min(100, Math.round(stockoutIssues.length / timeline.length * 100)),
        impactedParts: [],
        week: stockoutIssues[0].week,
        utilizationRate: 0,
        shortfall: totalStockouts,
        recommendations: [
          'Increase safety stock levels',
          'Expedite pending purchase orders',
          'Identify alternative suppliers',
        ],
      });
    }

    // Check for supply chain bottlenecks
    const supplyShortages = timeline.filter(
      (t) => t.supply < t.demand * 0.8
    );

    if (supplyShortages.length > 0) {
      bottlenecks.push({
        type: 'supply',
        resource: 'Supply Chain',
        resourceId: 'overall',
        severity: Math.min(100, Math.round(supplyShortages.length / timeline.length * 100)),
        impactedParts: [],
        week: supplyShortages[0].week,
        utilizationRate: 0,
        shortfall: supplyShortages.reduce((sum, t) => sum + (t.demand - t.supply), 0),
        recommendations: [
          'Diversify supplier base',
          'Build strategic buffer inventory',
          'Negotiate priority allocation with key suppliers',
        ],
      });
    }

    return bottlenecks;
  }

  /**
   * Generate alerts based on simulation results
   */
  private generateAlerts(
    timeline: TimelinePoint[],
    bottlenecks: Bottleneck[],
    scenario: Scenario
  ): SimulationAlert[] {
    const alerts: SimulationAlert[] = [];

    // Stockout alerts
    const stockoutWeeks = timeline.filter((t) => t.stockouts > 0);
    if (stockoutWeeks.length > 0) {
      alerts.push({
        type: 'stockout',
        severity: stockoutWeeks.length > 3 ? 'critical' : 'warning',
        message: `Projected stockouts in ${stockoutWeeks.length} of ${timeline.length} weeks`,
        affectedItems: [],
        occurDate: stockoutWeeks[0].date,
        recommendedAction: 'Review safety stock levels and expedite pending orders',
      });
    }

    // Capacity alerts
    const overcapacityWeeks = timeline.filter(
      (t) => t.capacityUsed > t.capacityAvailable
    );
    if (overcapacityWeeks.length > 0) {
      alerts.push({
        type: 'capacity',
        severity: overcapacityWeeks.length > 2 ? 'critical' : 'warning',
        message: `Capacity exceeded in ${overcapacityWeeks.length} weeks`,
        affectedItems: [],
        occurDate: overcapacityWeeks[0].date,
        recommendedAction: 'Consider overtime, additional shifts, or outsourcing',
      });
    }

    // Supply alerts
    const lowSupplyWeeks = timeline.filter(
      (t) => t.supply < t.demand * 0.7
    );
    if (lowSupplyWeeks.length > 0) {
      alerts.push({
        type: 'supply',
        severity: 'warning',
        message: `Supply falls below 70% of demand in ${lowSupplyWeeks.length} weeks`,
        affectedItems: [],
        occurDate: lowSupplyWeeks[0].date,
        recommendedAction: 'Expedite supply orders and identify alternative sources',
      });
    }

    // Cost alerts
    const factors = this.extractScenarioFactors(scenario.config);
    if (factors.priceChange && factors.priceChange > 10) {
      alerts.push({
        type: 'cost',
        severity: factors.priceChange > 25 ? 'critical' : 'warning',
        message: `Cost increase of ${factors.priceChange}% projected`,
        affectedItems: [],
        occurDate: scenario.baselineDate,
        recommendedAction: 'Negotiate pricing with suppliers or identify alternatives',
      });
    }

    // Delay alerts
    if (factors.leadTimeChange && factors.leadTimeChange > 25) {
      alerts.push({
        type: 'delay',
        severity: factors.leadTimeChange > 50 ? 'critical' : 'warning',
        message: `Lead time increase of ${factors.leadTimeChange}% projected`,
        affectedItems: [],
        occurDate: scenario.baselineDate,
        recommendedAction: 'Adjust order timing and increase buffer stock',
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations based on impacts and bottlenecks
   */
  private generateRecommendations(
    impacts: SimulationImpact,
    bottlenecks: Bottleneck[],
    alerts: SimulationAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // Demand-based recommendations
    if (impacts.demandChangePercent > 20) {
      recommendations.push('Consider increasing production capacity to meet demand surge');
      recommendations.push('Review safety stock levels for high-demand items');
    } else if (impacts.demandChangePercent < -20) {
      recommendations.push('Reduce inventory holding to avoid excess stock');
      recommendations.push('Consider delaying non-critical purchase orders');
    }

    // Capacity-based recommendations
    if (impacts.capacityUtilizationChange > 15) {
      recommendations.push('Evaluate overtime or additional shift options');
      recommendations.push('Prioritize high-margin products in scheduling');
    }

    // Cost-based recommendations
    if (impacts.costChangePercent > 10) {
      recommendations.push('Negotiate volume discounts with key suppliers');
      recommendations.push('Identify cost reduction opportunities in production');
    }

    // Service level recommendations
    if (impacts.serviceLevelChange < -5) {
      recommendations.push('Increase safety stock for critical items');
      recommendations.push('Expedite delayed orders to maintain service levels');
    }

    // Bottleneck-specific recommendations
    bottlenecks.forEach((bn) => {
      bn.recommendations.forEach((rec) => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec);
        }
      });
    });

    // Add critical alert recommendations
    alerts
      .filter((a) => a.severity === 'critical')
      .forEach((a) => {
        if (!recommendations.includes(a.recommendedAction)) {
          recommendations.push(a.recommendedAction);
        }
      });

    return recommendations.slice(0, 10); // Limit to top 10
  }

  /**
   * Calculate impacts between baseline and simulated states
   */
  private calculateImpacts(
    baseline: SimulationState,
    simulated: SimulationState
  ): SimulationImpact {
    const calcChange = (base: number, sim: number) => sim - base;
    const calcPercent = (base: number, sim: number) =>
      base !== 0 ? ((sim - base) / base) * 100 : 0;

    return {
      demandChange: calcChange(baseline.totalDemand, simulated.totalDemand),
      demandChangePercent: Math.round(calcPercent(baseline.totalDemand, simulated.totalDemand) * 10) / 10,
      supplyChange: calcChange(baseline.totalSupply, simulated.totalSupply),
      supplyChangePercent: Math.round(calcPercent(baseline.totalSupply, simulated.totalSupply) * 10) / 10,
      inventoryChange: calcChange(baseline.netInventory, simulated.netInventory),
      inventoryChangePercent: Math.round(calcPercent(baseline.netInventory, simulated.netInventory) * 10) / 10,
      serviceLevelChange: Math.round((simulated.serviceLevel - baseline.serviceLevel) * 10) / 10,
      capacityUtilizationChange: Math.round((simulated.capacityUtilization - baseline.capacityUtilization) * 10) / 10,
      costChange: calcChange(baseline.totalCost, simulated.totalCost),
      costChangePercent: Math.round(calcPercent(baseline.totalCost, simulated.totalCost) * 10) / 10,
      leadTimeChange: calcChange(baseline.leadTimeAvg, simulated.leadTimeAvg),
      leadTimeChangePercent: Math.round(calcPercent(baseline.leadTimeAvg, simulated.leadTimeAvg) * 10) / 10,
      riskScoreChange: Math.round((simulated.stockoutRisk - baseline.stockoutRisk) * 10) / 10,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async calculateTotalCost(
    purchaseOrders: Array<{ totalAmount?: number | null }>,
    workOrders: Array<{ quantity: number }>,
    inventoryQty: number
  ): Promise<number> {
    const poCost = purchaseOrders.reduce(
      (sum, po) => sum + (po.totalAmount || 0),
      0
    );
    const productionCost = workOrders.length * 500; // Simplified estimate
    const holdingCost = inventoryQty * 0.5; // $0.5 per unit holding cost

    return Math.round(poCost + productionCost + holdingCost);
  }

  private async calculateAverageLeadTime(): Promise<number> {
    const suppliers = await prisma.partSupplier.findMany({
      select: { leadTimeDays: true },
    });

    if (suppliers.length === 0) return 14;

    return Math.round(
      suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / suppliers.length
    );
  }

  private calculateStockoutRisk(supply: number, demand: number): number {
    if (demand === 0) return 0;
    const ratio = supply / demand;
    if (ratio >= 1.2) return 5;
    if (ratio >= 1.0) return 20;
    if (ratio >= 0.9) return 40;
    if (ratio >= 0.8) return 60;
    return 80;
  }

  private calculateExcessRisk(supply: number, demand: number): number {
    if (demand === 0) return supply > 0 ? 100 : 0;
    const ratio = supply / demand;
    if (ratio <= 1.0) return 0;
    if (ratio <= 1.2) return 10;
    if (ratio <= 1.5) return 30;
    if (ratio <= 2.0) return 50;
    return 70;
  }

  private calculateServiceLevel(supply: number, demand: number): number {
    if (demand === 0) return 100;
    return Math.min(100, Math.round((supply / demand) * 100));
  }

  private async getWeeklyDemand(startDate: Date, weeks: number): Promise<number[]> {
    const result: number[] = [];
    const avgWeeklyDemand = await prisma.salesOrderLine.aggregate({
      _avg: { quantity: true },
    });
    const baseAvg = avgWeeklyDemand._avg.quantity || 100;

    for (let i = 0; i < weeks; i++) {
      // Add some variation
      const variation = 0.9 + Math.random() * 0.2;
      result.push(Math.round(baseAvg * variation * 10));
    }

    return result;
  }

  private async getWeeklySupply(startDate: Date, weeks: number): Promise<number[]> {
    const result: number[] = [];
    const avgWeeklySupply = await prisma.purchaseOrderLine.aggregate({
      _avg: { quantity: true },
    });
    const baseAvg = avgWeeklySupply._avg.quantity || 100;

    for (let i = 0; i < weeks; i++) {
      const variation = 0.9 + Math.random() * 0.2;
      result.push(Math.round(baseAvg * variation * 10));
    }

    return result;
  }

  private async getWeeklyCapacity(weeks: number): Promise<number[]> {
    const workCenters = await prisma.workCenter.findMany({
      where: { status: 'active' },
    });

    const totalDaily = workCenters.reduce(
      (sum, wc) => sum + wc.capacityPerDay * (wc.efficiency || 100) / 100,
      0
    );
    const weeklyCapacity = totalDaily * 5;

    return Array(weeks).fill(Math.round(weeklyCapacity));
  }

  private extractScenarioFactors(config: ScenarioConfig): {
    demandChange?: number;
    supplyReduction?: number;
    capacityChange?: number;
    priceChange?: number;
    leadTimeChange?: number;
    rampUpWeeks?: number;
  } {
    switch (config.type) {
      case 'demand':
        return {
          demandChange: config.parameters.demandChange,
          rampUpWeeks: config.parameters.rampUpWeeks,
        };
      case 'supply':
        const supplyReduction = config.parameters.supplierDisruption?.length
          ? config.parameters.supplierDisruption.reduce((sum, d) => sum + d.severity, 0) /
            config.parameters.supplierDisruption.length
          : 0;
        return {
          supplyReduction,
          priceChange: config.parameters.priceChange,
          leadTimeChange: config.parameters.leadTimeChange,
        };
      case 'capacity':
        return {
          capacityChange: config.parameters.capacityChange,
        };
      case 'custom':
        return {
          demandChange: config.parameters.demandFactors?.demandChange,
          supplyReduction: 0,
          capacityChange: config.parameters.capacityFactors?.capacityChange,
          priceChange: config.parameters.supplyFactors?.priceChange,
          leadTimeChange: config.parameters.supplyFactors?.leadTimeChange,
          rampUpWeeks: config.parameters.demandFactors?.rampUpWeeks,
        };
      default:
        return {};
    }
  }

  private calculateRampFactor(week: number, rampUpWeeks: number): number {
    if (rampUpWeeks <= 0) return 1;
    if (week >= rampUpWeeks) return 1;
    return week / rampUpWeeks;
  }

  private getEmptyState(): SimulationState {
    return {
      totalDemand: 0,
      totalSupply: 0,
      netInventory: 0,
      serviceLevel: 0,
      capacityUtilization: 0,
      totalCost: 0,
      leadTimeAvg: 0,
      stockoutRisk: 0,
      excessInventoryRisk: 0,
      orderCount: 0,
    };
  }

  private getEmptyImpacts(): SimulationImpact {
    return {
      demandChange: 0,
      demandChangePercent: 0,
      supplyChange: 0,
      supplyChangePercent: 0,
      inventoryChange: 0,
      inventoryChangePercent: 0,
      serviceLevelChange: 0,
      capacityUtilizationChange: 0,
      costChange: 0,
      costChangePercent: 0,
      leadTimeChange: 0,
      leadTimeChangePercent: 0,
      riskScoreChange: 0,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let engineInstance: SimulationEngine | null = null;

export function getSimulationEngine(): SimulationEngine {
  if (!engineInstance) {
    engineInstance = new SimulationEngine();
  }
  return engineInstance;
}
