import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MonteCarloEngine,
  getMonteCarloEngine,
  MonteCarloConfig,
  DEFAULT_MONTE_CARLO_CONFIG,
} from '../monte-carlo';
import { Scenario } from '../scenario-builder';

// Mock the simulation engine
vi.mock('../simulation-engine', () => ({
  getSimulationEngine: vi.fn().mockReturnValue({
    runSimulation: vi.fn().mockResolvedValue({
      scenarioId: 'test-scenario',
      scenarioName: 'Test',
      status: 'success',
      horizonDays: 90,
      baseline: {
        totalDemand: 10000,
        totalSupply: 9500,
        netInventory: 2000,
        serviceLevel: 95,
        capacityUtilization: 75,
        totalCost: 100000,
        leadTimeAvg: 14,
        stockoutRisk: 10,
        excessInventoryRisk: 5,
        orderCount: 50,
      },
      simulated: {
        totalDemand: 12000,
        totalSupply: 9500,
        netInventory: 1500,
        serviceLevel: 93,
        capacityUtilization: 90,
        totalCost: 105000,
        leadTimeAvg: 16,
        stockoutRisk: 15,
        excessInventoryRisk: 3,
        orderCount: 55,
      },
      impacts: {
        demandChange: 2000,
        demandChangePercent: 20,
        supplyChange: 0,
        supplyChangePercent: 0,
        inventoryChange: -500,
        inventoryChangePercent: -25,
        serviceLevelChange: -2,
        capacityUtilizationChange: 15,
        costChange: 5000,
        costChangePercent: 5,
        leadTimeChange: 2,
        leadTimeChangePercent: 14,
        riskScoreChange: 5,
      },
      timeline: [],
      bottlenecks: [],
      alerts: [],
      recommendations: [],
    }),
  }),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('MonteCarloEngine', () => {
  let engine: MonteCarloEngine;

  const createTestScenario = (): Scenario => ({
    id: 'mc-test-scenario',
    name: 'Monte Carlo Test',
    description: 'Testing Monte Carlo simulation',
    type: 'demand',
    status: 'ready',
    createdBy: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
    baselineDate: new Date(),
    simulationHorizonDays: 90,
    config: {
      type: 'demand',
      parameters: {
        demandChange: 20,
        affectedProducts: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    },
  } as Scenario);

  beforeEach(() => {
    engine = new MonteCarloEngine();
  });

  describe('runMonteCarloSimulation', () => {
    it('should run Monte Carlo simulation with default config', async () => {
      const scenario = createTestScenario();

      const result = await engine.runMonteCarloSimulation(scenario);

      expect(result.scenarioId).toBe(scenario.id);
      expect(result.scenarioName).toBe(scenario.name);
      expect(result.iterations).toBe(DEFAULT_MONTE_CARLO_CONFIG.iterations);
      expect(result.statistics).toBeDefined();
      expect(result.riskMetrics).toBeDefined();
      expect(result.sensitivityAnalysis).toBeDefined();
      expect(result.distributions).toBeDefined();
      expect(result.percentiles).toBeDefined();
    });

    it('should use custom iteration count', async () => {
      const scenario = createTestScenario();
      const config: MonteCarloConfig = {
        iterations: 50,
        confidenceLevel: 0.95,
      };

      const result = await engine.runMonteCarloSimulation(scenario, config);

      expect(result.iterations).toBe(50);
    });

    it('should calculate statistics', async () => {
      const scenario = createTestScenario();
      const config: MonteCarloConfig = {
        iterations: 100,
        confidenceLevel: 0.95,
      };

      const result = await engine.runMonteCarloSimulation(scenario, config);
      const { statistics } = result;

      // Check demand statistics
      expect(statistics.demand).toBeDefined();
      expect(statistics.demand.mean).toBeDefined();
      expect(statistics.demand.stdDev).toBeDefined();
      expect(statistics.demand.min).toBeDefined();
      expect(statistics.demand.max).toBeDefined();

      // Check supply statistics
      expect(statistics.supply).toBeDefined();

      // Check inventory statistics
      expect(statistics.inventory).toBeDefined();
    });

    it('should calculate percentiles', async () => {
      const scenario = createTestScenario();

      const result = await engine.runMonteCarloSimulation(scenario);
      const { percentiles } = result;

      expect(percentiles.p5).toBeDefined();
      expect(percentiles.p25).toBeDefined();
      expect(percentiles.p50).toBeDefined();
      expect(percentiles.p75).toBeDefined();
      expect(percentiles.p95).toBeDefined();
    });
  });

  describe('risk metrics', () => {
    it('should calculate risk metrics', async () => {
      const scenario = createTestScenario();

      const result = await engine.runMonteCarloSimulation(scenario);
      const { riskMetrics } = result;

      expect(riskMetrics.stockoutProbability).toBeDefined();
      expect(riskMetrics.stockoutProbability).toBeGreaterThanOrEqual(0);
      // stockoutProbability may be percentage (0-100) or fraction (0-1)
      expect(riskMetrics.stockoutProbability).toBeLessThanOrEqual(100);

      expect(riskMetrics.capacityOverloadProbability).toBeDefined();
      expect(riskMetrics.capacityOverloadProbability).toBeGreaterThanOrEqual(0);
      // capacityOverloadProbability may be percentage (0-100) or fraction (0-1)
      expect(riskMetrics.capacityOverloadProbability).toBeLessThanOrEqual(100);

      expect(riskMetrics.valueAtRisk).toBeDefined();
      expect(riskMetrics.conditionalValueAtRisk).toBeDefined();
    });
  });

  describe('sensitivity analysis', () => {
    it('should run sensitivity analysis', async () => {
      const scenario = createTestScenario();

      const result = await engine.runMonteCarloSimulation(scenario);

      expect(result.sensitivityAnalysis.length).toBeGreaterThan(0);
    });

    it('should include analysis details', async () => {
      const scenario = createTestScenario();

      const result = await engine.runMonteCarloSimulation(scenario);

      if (result.sensitivityAnalysis.length > 0) {
        const analysis = result.sensitivityAnalysis[0];
        expect(analysis.parameter).toBeDefined();
        expect(analysis.baseValue).toBeDefined();
        expect(analysis.elasticity).toBeDefined();
        expect(analysis.correlationWithOutput).toBeDefined();
      }
    });
  });

  describe('convergence', () => {
    it('should track convergence data', async () => {
      const scenario = createTestScenario();
      const config: MonteCarloConfig = {
        iterations: 200,
        confidenceLevel: 0.95,
      };

      const result = await engine.runMonteCarloSimulation(scenario, config);

      expect(result.convergenceData.length).toBeGreaterThan(0);

      if (result.convergenceData.length > 0) {
        const point = result.convergenceData[0];
        expect(point.iteration).toBeDefined();
        expect(point.runningMean).toBeDefined();
        expect(point.runningStdDev).toBeDefined();
        expect(typeof point.isConverged).toBe('boolean');
      }
    });
  });

  describe('distributions', () => {
    it('should calculate distribution histograms', async () => {
      const scenario = createTestScenario();

      const result = await engine.runMonteCarloSimulation(scenario);
      const { distributions } = result;

      expect(distributions.demand).toBeDefined();
      expect(distributions.supply).toBeDefined();
      expect(distributions.inventory).toBeDefined();

      if (distributions.demand.length > 0) {
        const bin = distributions.demand[0];
        expect(bin.binStart).toBeDefined();
        expect(bin.binEnd).toBeDefined();
        expect(bin.count).toBeDefined();
        expect(bin.frequency).toBeDefined();
      }
    });
  });

  describe('singleton instance', () => {
    it('should return same instance with same seed', () => {
      const instance1 = getMonteCarloEngine(123);
      const instance2 = getMonteCarloEngine(123);

      expect(instance1).toBe(instance2);
    });
  });

  describe('performance', () => {
    it('should complete simulation in reasonable time', async () => {
      const scenario = createTestScenario();
      const config: MonteCarloConfig = {
        iterations: 500,
        confidenceLevel: 0.95,
      };

      const startTime = Date.now();
      await engine.runMonteCarloSimulation(scenario, config);
      const duration = Date.now() - startTime;

      // Should complete in under 10 seconds even with mocks
      expect(duration).toBeLessThan(10000);
    });
  });
});
