// =============================================================================
// MONTE CARLO SIMULATION
// Probabilistic simulation with statistical analysis
// =============================================================================

import { Scenario } from './scenario-builder';
import { SimulationResult, SimulationState, getSimulationEngine } from './simulation-engine';

// =============================================================================
// TYPES
// =============================================================================

export type DistributionType = 'normal' | 'uniform' | 'triangular' | 'lognormal';

export interface DistributionConfig {
  type: DistributionType;
  mean?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  mode?: number; // for triangular
}

export interface MonteCarloConfig {
  iterations: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  demandDistribution?: DistributionConfig;
  supplyDistribution?: DistributionConfig;
  leadTimeDistribution?: DistributionConfig;
  costDistribution?: DistributionConfig;
  seed?: number; // for reproducibility
}

export interface MonteCarloResult {
  scenarioId: string;
  scenarioName: string;
  config: MonteCarloConfig;
  executedAt: Date;
  executionTimeMs: number;
  iterations: number;
  statistics: MonteCarloStatistics;
  distributions: DistributionResults;
  riskMetrics: RiskMetrics;
  sensitivityAnalysis: SensitivityResult[];
  percentiles: PercentileResults;
  convergenceData: ConvergencePoint[];
}

export interface MonteCarloStatistics {
  demand: StatisticsSummary;
  supply: StatisticsSummary;
  inventory: StatisticsSummary;
  serviceLevel: StatisticsSummary;
  cost: StatisticsSummary;
  capacityUtilization: StatisticsSummary;
}

export interface StatisticsSummary {
  mean: number;
  median: number;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  confidenceInterval: { lower: number; upper: number };
}

export interface DistributionResults {
  demand: HistogramBin[];
  supply: HistogramBin[];
  inventory: HistogramBin[];
  serviceLevel: HistogramBin[];
  cost: HistogramBin[];
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
  frequency: number;
  cumulativeFrequency: number;
}

export interface RiskMetrics {
  stockoutProbability: number;
  excessInventoryProbability: number;
  capacityOverloadProbability: number;
  costOverrunProbability: number;
  serviceLevelBelowTargetProbability: number;
  valueAtRisk: { p95: number; p99: number };
  conditionalValueAtRisk: number;
}

export interface SensitivityResult {
  parameter: string;
  baseValue: number;
  correlationWithOutput: number;
  elasticity: number;
  importance: number; // 0-100
  interpretation: string;
}

export interface PercentileResults {
  p5: PercentileValues;
  p10: PercentileValues;
  p25: PercentileValues;
  p50: PercentileValues;
  p75: PercentileValues;
  p90: PercentileValues;
  p95: PercentileValues;
  p99: PercentileValues;
}

export interface PercentileValues {
  demand: number;
  supply: number;
  inventory: number;
  serviceLevel: number;
  cost: number;
}

export interface ConvergencePoint {
  iteration: number;
  runningMean: number;
  runningStdDev: number;
  isConverged: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  iterations: 1000,
  confidenceLevel: 0.95,
  demandDistribution: {
    type: 'normal',
    mean: 1.0,
    stdDev: 0.15,
  },
  supplyDistribution: {
    type: 'normal',
    mean: 1.0,
    stdDev: 0.10,
  },
  leadTimeDistribution: {
    type: 'triangular',
    min: 0.8,
    max: 1.5,
    mode: 1.0,
  },
  costDistribution: {
    type: 'uniform',
    min: 0.95,
    max: 1.15,
  },
};

// =============================================================================
// MONTE CARLO ENGINE CLASS
// =============================================================================

export class MonteCarloEngine {
  private simulationEngine = getSimulationEngine();
  private randomSeed: number;

  constructor(seed?: number) {
    this.randomSeed = seed || Date.now();
  }

  /**
   * Run Monte Carlo simulation
   */
  async runMonteCarloSimulation(
    scenario: Scenario,
    config: MonteCarloConfig = DEFAULT_MONTE_CARLO_CONFIG
  ): Promise<MonteCarloResult> {
    const startTime = Date.now();
    const iterations = config.iterations || 1000;

    // Run base simulation first
    const baseResult = await this.simulationEngine.runSimulation(scenario);

    // Collect iteration results
    const iterationResults: SimulationState[] = [];
    const convergenceData: ConvergencePoint[] = [];

    for (let i = 0; i < iterations; i++) {
      // Generate random factors
      const factors = this.generateRandomFactors(config);

      // Apply factors to base result
      const iterationState = this.applyRandomFactors(
        baseResult.simulated,
        factors
      );

      iterationResults.push(iterationState);

      // Track convergence every 100 iterations
      if ((i + 1) % 100 === 0 || i === iterations - 1) {
        const runningMean = this.calculateMean(
          iterationResults.map((r) => r.netInventory)
        );
        const runningStdDev = this.calculateStdDev(
          iterationResults.map((r) => r.netInventory)
        );
        convergenceData.push({
          iteration: i + 1,
          runningMean,
          runningStdDev,
          isConverged: this.checkConvergence(convergenceData, runningMean),
        });
      }
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(iterationResults, config.confidenceLevel);

    // Calculate distributions
    const distributions = this.calculateDistributions(iterationResults);

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(iterationResults);

    // Run sensitivity analysis
    const sensitivityAnalysis = await this.runSensitivityAnalysis(
      scenario,
      baseResult,
      config
    );

    // Calculate percentiles
    const percentiles = this.calculatePercentiles(iterationResults);

    const executionTimeMs = Date.now() - startTime;

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      config,
      executedAt: new Date(),
      executionTimeMs,
      iterations,
      statistics,
      distributions,
      riskMetrics,
      sensitivityAnalysis,
      percentiles,
      convergenceData,
    };
  }

  /**
   * Generate random factors based on distributions
   */
  private generateRandomFactors(config: MonteCarloConfig): {
    demandFactor: number;
    supplyFactor: number;
    leadTimeFactor: number;
    costFactor: number;
  } {
    return {
      demandFactor: this.sampleDistribution(
        config.demandDistribution || { type: 'normal', mean: 1, stdDev: 0.15 }
      ),
      supplyFactor: this.sampleDistribution(
        config.supplyDistribution || { type: 'normal', mean: 1, stdDev: 0.10 }
      ),
      leadTimeFactor: this.sampleDistribution(
        config.leadTimeDistribution || { type: 'triangular', min: 0.8, max: 1.5, mode: 1.0 }
      ),
      costFactor: this.sampleDistribution(
        config.costDistribution || { type: 'uniform', min: 0.95, max: 1.15 }
      ),
    };
  }

  /**
   * Sample from a probability distribution
   */
  private sampleDistribution(config: DistributionConfig): number {
    switch (config.type) {
      case 'normal':
        return this.sampleNormal(config.mean || 1, config.stdDev || 0.1);
      case 'uniform':
        return this.sampleUniform(config.min || 0.9, config.max || 1.1);
      case 'triangular':
        return this.sampleTriangular(
          config.min || 0.8,
          config.max || 1.2,
          config.mode || 1.0
        );
      case 'lognormal':
        return this.sampleLognormal(config.mean || 0, config.stdDev || 0.1);
      default:
        return 1;
    }
  }

  /**
   * Sample from normal distribution using Box-Muller transform
   */
  private sampleNormal(mean: number, stdDev: number): number {
    const u1 = this.random();
    const u2 = this.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z;
  }

  /**
   * Sample from uniform distribution
   */
  private sampleUniform(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  /**
   * Sample from triangular distribution
   */
  private sampleTriangular(min: number, max: number, mode: number): number {
    const u = this.random();
    const fc = (mode - min) / (max - min);

    if (u < fc) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }

  /**
   * Sample from lognormal distribution
   */
  private sampleLognormal(mean: number, stdDev: number): number {
    const normal = this.sampleNormal(mean, stdDev);
    return Math.exp(normal);
  }

  /**
   * Seeded random number generator
   */
  private random(): number {
    // Simple LCG for reproducibility
    this.randomSeed = (this.randomSeed * 1103515245 + 12345) % 2147483648;
    return this.randomSeed / 2147483648;
  }

  /**
   * Apply random factors to simulation state
   */
  private applyRandomFactors(
    baseState: SimulationState,
    factors: {
      demandFactor: number;
      supplyFactor: number;
      leadTimeFactor: number;
      costFactor: number;
    }
  ): SimulationState {
    const demand = Math.round(baseState.totalDemand * factors.demandFactor);
    const supply = Math.round(baseState.totalSupply * factors.supplyFactor);

    return {
      totalDemand: demand,
      totalSupply: supply,
      netInventory: supply - demand,
      serviceLevel: Math.min(100, (supply / Math.max(1, demand)) * 100),
      capacityUtilization: baseState.capacityUtilization * factors.demandFactor,
      totalCost: baseState.totalCost * factors.costFactor,
      leadTimeAvg: baseState.leadTimeAvg * factors.leadTimeFactor,
      stockoutRisk: supply < demand ? Math.min(100, ((demand - supply) / demand) * 100) : 0,
      excessInventoryRisk: supply > demand * 1.2 ? Math.min(100, ((supply - demand) / supply) * 100) : 0,
      orderCount: baseState.orderCount,
    };
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateStatistics(
    results: SimulationState[],
    confidenceLevel: number
  ): MonteCarloStatistics {
    return {
      demand: this.calculateSummary(results.map((r) => r.totalDemand), confidenceLevel),
      supply: this.calculateSummary(results.map((r) => r.totalSupply), confidenceLevel),
      inventory: this.calculateSummary(results.map((r) => r.netInventory), confidenceLevel),
      serviceLevel: this.calculateSummary(results.map((r) => r.serviceLevel), confidenceLevel),
      cost: this.calculateSummary(results.map((r) => r.totalCost), confidenceLevel),
      capacityUtilization: this.calculateSummary(results.map((r) => r.capacityUtilization), confidenceLevel),
    };
  }

  /**
   * Calculate summary statistics for a data series
   */
  private calculateSummary(data: number[], confidenceLevel: number): StatisticsSummary {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);

    const mean = this.calculateMean(data);
    const median = sorted[Math.floor(n / 2)];
    const stdDev = this.calculateStdDev(data);
    const variance = stdDev * stdDev;

    // Calculate skewness
    const skewness = this.calculateSkewness(data, mean, stdDev);

    // Calculate kurtosis
    const kurtosis = this.calculateKurtosis(data, mean, stdDev);

    // Calculate confidence interval
    const zScore = this.getZScore(confidenceLevel);
    const marginOfError = zScore * (stdDev / Math.sqrt(n));

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      min: sorted[0],
      max: sorted[n - 1],
      skewness: Math.round(skewness * 1000) / 1000,
      kurtosis: Math.round(kurtosis * 1000) / 1000,
      confidenceInterval: {
        lower: Math.round((mean - marginOfError) * 100) / 100,
        upper: Math.round((mean + marginOfError) * 100) / 100,
      },
    };
  }

  private calculateMean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  private calculateStdDev(data: number[]): number {
    const mean = this.calculateMean(data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  private calculateSkewness(data: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    const n = data.length;
    const m3 = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
    return m3;
  }

  private calculateKurtosis(data: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    const n = data.length;
    const m4 = data.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n;
    return m4 - 3; // Excess kurtosis
  }

  private getZScore(confidenceLevel: number): number {
    // Common z-scores
    if (confidenceLevel >= 0.99) return 2.576;
    if (confidenceLevel >= 0.95) return 1.96;
    if (confidenceLevel >= 0.90) return 1.645;
    return 1.645;
  }

  /**
   * Calculate distribution histograms
   */
  private calculateDistributions(results: SimulationState[]): DistributionResults {
    return {
      demand: this.createHistogram(results.map((r) => r.totalDemand)),
      supply: this.createHistogram(results.map((r) => r.totalSupply)),
      inventory: this.createHistogram(results.map((r) => r.netInventory)),
      serviceLevel: this.createHistogram(results.map((r) => r.serviceLevel)),
      cost: this.createHistogram(results.map((r) => r.totalCost)),
    };
  }

  private createHistogram(data: number[], bins: number = 20): HistogramBin[] {
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const binWidth = (max - min) / bins || 1;

    const histogram: HistogramBin[] = [];
    let cumulative = 0;

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      const count = data.filter(
        (val) => val >= binStart && (i === bins - 1 ? val <= binEnd : val < binEnd)
      ).length;
      const frequency = count / data.length;
      cumulative += frequency;

      histogram.push({
        binStart: Math.round(binStart * 100) / 100,
        binEnd: Math.round(binEnd * 100) / 100,
        count,
        frequency: Math.round(frequency * 1000) / 1000,
        cumulativeFrequency: Math.round(cumulative * 1000) / 1000,
      });
    }

    return histogram;
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(results: SimulationState[]): RiskMetrics {
    const n = results.length;

    // Stockout probability (negative inventory)
    const stockouts = results.filter((r) => r.netInventory < 0).length;
    const stockoutProbability = (stockouts / n) * 100;

    // Excess inventory probability (>150% of demand)
    const excess = results.filter((r) => r.netInventory > r.totalDemand * 0.5).length;
    const excessInventoryProbability = (excess / n) * 100;

    // Capacity overload probability (>100% utilization)
    const overload = results.filter((r) => r.capacityUtilization > 100).length;
    const capacityOverloadProbability = (overload / n) * 100;

    // Cost overrun probability (>10% above mean)
    const meanCost = this.calculateMean(results.map((r) => r.totalCost));
    const overrun = results.filter((r) => r.totalCost > meanCost * 1.1).length;
    const costOverrunProbability = (overrun / n) * 100;

    // Service level below target (95%)
    const belowTarget = results.filter((r) => r.serviceLevel < 95).length;
    const serviceLevelBelowTargetProbability = (belowTarget / n) * 100;

    // Value at Risk (worst case costs)
    const sortedCosts = [...results.map((r) => r.totalCost)].sort((a, b) => b - a);
    const varP95 = sortedCosts[Math.floor(n * 0.05)];
    const varP99 = sortedCosts[Math.floor(n * 0.01)];

    // Conditional VaR (average of worst 5%)
    const worstCases = sortedCosts.slice(0, Math.floor(n * 0.05));
    const cvar = worstCases.length > 0
      ? worstCases.reduce((sum, c) => sum + c, 0) / worstCases.length
      : varP95;

    return {
      stockoutProbability: Math.round(stockoutProbability * 10) / 10,
      excessInventoryProbability: Math.round(excessInventoryProbability * 10) / 10,
      capacityOverloadProbability: Math.round(capacityOverloadProbability * 10) / 10,
      costOverrunProbability: Math.round(costOverrunProbability * 10) / 10,
      serviceLevelBelowTargetProbability: Math.round(serviceLevelBelowTargetProbability * 10) / 10,
      valueAtRisk: {
        p95: Math.round(varP95),
        p99: Math.round(varP99),
      },
      conditionalValueAtRisk: Math.round(cvar),
    };
  }

  /**
   * Run sensitivity analysis
   */
  private async runSensitivityAnalysis(
    scenario: Scenario,
    baseResult: SimulationResult,
    config: MonteCarloConfig
  ): Promise<SensitivityResult[]> {
    const parameters = [
      { name: 'Demand', baseValue: baseResult.simulated.totalDemand },
      { name: 'Supply', baseValue: baseResult.simulated.totalSupply },
      { name: 'Lead Time', baseValue: baseResult.simulated.leadTimeAvg },
      { name: 'Cost', baseValue: baseResult.simulated.totalCost },
      { name: 'Capacity', baseValue: baseResult.simulated.capacityUtilization },
    ];

    const results: SensitivityResult[] = [];
    const baseInventory = baseResult.simulated.netInventory;

    for (const param of parameters) {
      // Calculate elasticity by varying parameter by 10%
      const changeFactor = 0.1;
      const changedValue = param.baseValue * (1 + changeFactor);

      // Estimate impact (simplified)
      let inventoryChange = 0;
      switch (param.name) {
        case 'Demand':
          inventoryChange = -param.baseValue * changeFactor;
          break;
        case 'Supply':
          inventoryChange = param.baseValue * changeFactor;
          break;
        case 'Lead Time':
          inventoryChange = -param.baseValue * changeFactor * 0.2;
          break;
        case 'Cost':
          inventoryChange = 0;
          break;
        case 'Capacity':
          inventoryChange = param.baseValue * changeFactor * 0.1;
          break;
      }

      const elasticity = baseInventory !== 0
        ? (inventoryChange / baseInventory) / changeFactor
        : 0;

      const importance = Math.min(100, Math.abs(elasticity) * 50);

      results.push({
        parameter: param.name,
        baseValue: Math.round(param.baseValue * 100) / 100,
        correlationWithOutput: Math.round(elasticity * 100) / 100,
        elasticity: Math.round(elasticity * 100) / 100,
        importance: Math.round(importance),
        interpretation: this.getElasticityInterpretation(param.name, elasticity),
      });
    }

    // Sort by importance
    return results.sort((a, b) => b.importance - a.importance);
  }

  private getElasticityInterpretation(parameter: string, elasticity: number): string {
    const absElasticity = Math.abs(elasticity);
    const direction = elasticity > 0 ? 'increases' : 'decreases';

    if (absElasticity < 0.5) {
      return `${parameter} has low impact on inventory`;
    } else if (absElasticity < 1.0) {
      return `${parameter} has moderate impact - a 10% change ${direction} inventory by ${Math.round(absElasticity * 10)}%`;
    } else {
      return `${parameter} has HIGH impact - a 10% change ${direction} inventory by ${Math.round(absElasticity * 10)}%`;
    }
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentiles(results: SimulationState[]): PercentileResults {
    const getPercentile = (data: number[], p: number): number => {
      const sorted = [...data].sort((a, b) => a - b);
      const index = Math.floor(data.length * p);
      return sorted[index];
    };

    const demandValues = results.map((r) => r.totalDemand);
    const supplyValues = results.map((r) => r.totalSupply);
    const inventoryValues = results.map((r) => r.netInventory);
    const serviceLevelValues = results.map((r) => r.serviceLevel);
    const costValues = results.map((r) => r.totalCost);

    const calcPercentileValues = (p: number): PercentileValues => ({
      demand: Math.round(getPercentile(demandValues, p)),
      supply: Math.round(getPercentile(supplyValues, p)),
      inventory: Math.round(getPercentile(inventoryValues, p)),
      serviceLevel: Math.round(getPercentile(serviceLevelValues, p) * 10) / 10,
      cost: Math.round(getPercentile(costValues, p)),
    });

    return {
      p5: calcPercentileValues(0.05),
      p10: calcPercentileValues(0.10),
      p25: calcPercentileValues(0.25),
      p50: calcPercentileValues(0.50),
      p75: calcPercentileValues(0.75),
      p90: calcPercentileValues(0.90),
      p95: calcPercentileValues(0.95),
      p99: calcPercentileValues(0.99),
    };
  }

  /**
   * Check if simulation has converged
   */
  private checkConvergence(
    history: ConvergencePoint[],
    currentMean: number
  ): boolean {
    if (history.length < 3) return false;

    const recentMeans = history.slice(-3).map((h) => h.runningMean);
    const maxDiff = Math.max(
      ...recentMeans.map((m) => Math.abs(m - currentMean))
    );

    // Converged if mean is stable within 1%
    return maxDiff / Math.abs(currentMean) < 0.01;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let monteCarloInstance: MonteCarloEngine | null = null;

export function getMonteCarloEngine(seed?: number): MonteCarloEngine {
  if (!monteCarloInstance) {
    monteCarloInstance = new MonteCarloEngine(seed);
  }
  return monteCarloInstance;
}

export function resetMonteCarloEngine(): void {
  monteCarloInstance = null;
}
