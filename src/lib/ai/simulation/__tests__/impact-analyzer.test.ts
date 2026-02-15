import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpactAnalyzer, getImpactAnalyzer } from '../impact-analyzer';
import { SimulationResult, SimulationState, TimelinePoint } from '../simulation-engine';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('ImpactAnalyzer', () => {
  let analyzer: ImpactAnalyzer;

  const createTestState = (): SimulationState => ({
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
  });

  const createTestTimeline = (): TimelinePoint[] => [
    { week: 1, date: new Date(), demand: 1500, supply: 1200, inventory: 1700, capacityUsed: 1100, capacityAvailable: 1200, stockouts: 0, backorders: 0 },
    { week: 2, date: new Date(), demand: 1600, supply: 1100, inventory: 1200, capacityUsed: 1150, capacityAvailable: 1200, stockouts: 50, backorders: 50 },
    { week: 3, date: new Date(), demand: 1700, supply: 1050, inventory: 550, capacityUsed: 1180, capacityAvailable: 1200, stockouts: 100, backorders: 100 },
    { week: 4, date: new Date(), demand: 1800, supply: 1000, inventory: 0, capacityUsed: 1200, capacityAvailable: 1200, stockouts: 250, backorders: 250 },
  ];

  const createTestResult = (overrides: Partial<SimulationResult> = {}): SimulationResult => ({
    scenarioId: 'test-result-1',
    scenarioName: 'Test Scenario',
    status: 'success',
    horizonDays: 90,
    executedAt: new Date(),
    executionTimeMs: 150,
    baseline: createTestState(),
    simulated: {
      ...createTestState(),
      totalDemand: 12000,
      totalSupply: 9000,
      netInventory: 1200,
      capacityUtilization: 92,
    },
    impacts: {
      demandChange: 2000,
      demandChangePercent: 20,
      supplyChange: -500,
      supplyChangePercent: -5.3,
      inventoryChange: -800,
      inventoryChangePercent: -40,
      serviceLevelChange: -3,
      capacityUtilizationChange: 17,
      costChange: 10000,
      costChangePercent: 10,
      leadTimeChange: 2,
      leadTimeChangePercent: 14,
      riskScoreChange: 5,
    },
    timeline: createTestTimeline(),
    bottlenecks: [
      {
        resourceId: 'bn-1',
        resource: 'Production Line A',
        type: 'capacity' as const,
        severity: 85,
        week: 4,
        impactedParts: ['PART-001'],
        utilizationRate: 100,
        shortfall: 15,
        recommendations: [
          'Consider adding overtime or second shift',
        ],
      },
    ],
    alerts: [
      {
        type: 'stockout' as const,
        severity: 'warning' as const,
        message: 'Inventory dropping below safety stock',
        affectedItems: ['PART-001'],
        occurDate: new Date(),
        recommendedAction: 'Increase safety stock buffer',
      },
      {
        type: 'stockout' as const,
        severity: 'critical' as const,
        message: 'Stockout occurred',
        affectedItems: ['PART-002'],
        occurDate: new Date(),
        recommendedAction: 'Expedite orders or increase production',
      },
    ],
    recommendations: [],
    ...overrides,
  });

  beforeEach(() => {
    analyzer = new ImpactAnalyzer();
  });

  describe('analyzeSimulationImpact', () => {
    it('should analyze financial impact', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.financial).toBeDefined();
      expect(analysis.financial.costImpact).toBeDefined();
    });

    it('should analyze operational impact', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.operational).toBeDefined();
    });

    it('should analyze risk impact', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.risk).toBeDefined();
    });

    it('should generate impact summary', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.overallImpactScore).toBeDefined();
    });

    it('should identify affected areas', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.affectedAreas).toBeDefined();
      expect(Array.isArray(analysis.affectedAreas)).toBe(true);
    });

    it('should generate recommendations', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should analyze timeline impact', () => {
      const result = createTestResult();
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis.timelineImpact).toBeDefined();
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple scenarios', () => {
      const result1 = createTestResult({ scenarioId: 'scenario-1', scenarioName: 'Scenario A' });
      const result2 = createTestResult({
        scenarioId: 'scenario-2',
        scenarioName: 'Scenario B',
        simulated: {
          ...createTestState(),
          totalDemand: 11000,
          netInventory: 1800,
          capacityUtilization: 80,
        },
      });

      const comparison = analyzer.compareScenarios([result1, result2]);

      expect(comparison.scenarios.length).toBe(2);
      expect(comparison.recommendation).toBeDefined();
      expect(comparison.recommendation.bestScenario).toBeDefined();
    });

    it('should rank scenarios', () => {
      const result1 = createTestResult({ scenarioId: 'scenario-1', scenarioName: 'Scenario A' });
      const result2 = createTestResult({ scenarioId: 'scenario-2', scenarioName: 'Scenario B' });

      const comparison = analyzer.compareScenarios([result1, result2]);

      expect(comparison.scenarios[0].rank).toBe(1);
      expect(comparison.scenarios[1].rank).toBe(2);
    });

    it('should identify tradeoffs', () => {
      const result1 = createTestResult({ scenarioId: 'scenario-1', scenarioName: 'Scenario A' });
      const result2 = createTestResult({ scenarioId: 'scenario-2', scenarioName: 'Scenario B' });

      const comparison = analyzer.compareScenarios([result1, result2]);

      expect(comparison.tradeoffs).toBeDefined();
      expect(Array.isArray(comparison.tradeoffs)).toBe(true);
    });

    it('should throw error for less than 2 scenarios', () => {
      const result = createTestResult();

      expect(() => analyzer.compareScenarios([result])).toThrow('At least 2 scenarios required');
    });

    it('should calculate scenario scores', () => {
      const result1 = createTestResult({ scenarioId: 'scenario-1', scenarioName: 'Scenario A' });
      const result2 = createTestResult({ scenarioId: 'scenario-2', scenarioName: 'Scenario B' });

      const comparison = analyzer.compareScenarios([result1, result2]);

      expect(comparison.scenarios[0].overallScore).toBeDefined();
      expect(comparison.scenarios[0].scores).toBeDefined();
    });

    it('should identify strengths and weaknesses', () => {
      const result1 = createTestResult({ scenarioId: 'scenario-1', scenarioName: 'Scenario A' });
      const result2 = createTestResult({ scenarioId: 'scenario-2', scenarioName: 'Scenario B' });

      const comparison = analyzer.compareScenarios([result1, result2]);

      expect(comparison.scenarios[0].strengths).toBeDefined();
      expect(comparison.scenarios[0].weaknesses).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getImpactAnalyzer();
      const instance2 = getImpactAnalyzer();

      expect(instance1).toBe(instance2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty timeline', () => {
      const result = createTestResult({ timeline: [] });
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis).toBeDefined();
    });

    it('should handle no bottlenecks', () => {
      const result = createTestResult({ bottlenecks: [] });
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis).toBeDefined();
    });

    it('should handle no alerts', () => {
      const result = createTestResult({ alerts: [] });
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis).toBeDefined();
      expect(analysis.risk).toBeDefined();
    });

    it('should handle zero impacts', () => {
      const result = createTestResult({
        impacts: {
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
        },
      });

      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis).toBeDefined();
      expect(analysis.summary).toBeDefined();
    });

    it('should handle failed simulation status', () => {
      const result = createTestResult({ status: 'failed' });
      const analysis = analyzer.analyzeSimulationImpact(result);

      expect(analysis).toBeDefined();
    });
  });
});
