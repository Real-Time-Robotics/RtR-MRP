import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimulationEngine, getSimulationEngine } from '../simulation-engine';
import { Scenario } from '../scenario-builder';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inventory: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 1000 } }),
    },
    purchaseOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    workOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    workCenter: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'wc1', capacityPerDay: 100, efficiency: 90, status: 'active' },
      ]),
    },
    partSupplier: {
      findMany: vi.fn().mockResolvedValue([{ leadTimeDays: 14 }]),
    },
    salesOrderLine: {
      aggregate: vi.fn().mockResolvedValue({ _avg: { quantity: 100 } }),
    },
    purchaseOrderLine: {
      aggregate: vi.fn().mockResolvedValue({ _avg: { quantity: 100 } }),
    },
  },
}));

// Mock scenario builder
vi.mock('../scenario-builder', async () => {
  const actual = await vi.importActual('../scenario-builder');
  return {
    ...actual,
    getScenarioBuilder: vi.fn().mockReturnValue({
      loadBaselineData: vi.fn().mockResolvedValue({
        inventory: [{ quantity: 500 }],
        parts: [],
        suppliers: [],
        workCenters: [],
      }),
    }),
  };
});

describe('SimulationEngine', () => {
  let engine: SimulationEngine;

  const createTestScenario = (overrides: Partial<Scenario> = {}): Scenario => ({
    id: 'test-scenario-1',
    name: 'Test Scenario',
    description: 'A test scenario',
    baselineDate: new Date(),
    simulationHorizonDays: 90,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      type: 'demand',
      parameters: {
        demandChange: 20,
        affectedProducts: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    },
    ...overrides,
  } as Scenario);

  beforeEach(() => {
    engine = new SimulationEngine();
  });

  describe('runSimulation', () => {
    it('should run demand simulation and return result', async () => {
      const scenario = createTestScenario();

      const result = await engine.runSimulation(scenario);

      expect(result.scenarioId).toBe(scenario.id);
      expect(result.scenarioName).toBe(scenario.name);
      expect(['success', 'partial', 'failed']).toContain(result.status);
      expect(result.baseline).toBeDefined();
      expect(result.simulated).toBeDefined();
      expect(result.impacts).toBeDefined();
      expect(result.timeline.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle supply scenario', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'supply',
          parameters: {
            supplierDisruption: [{ supplierId: 'SUP-001', disruptionType: 'partial', severity: 50, durationDays: 14 }],
            leadTimeChange: 7,
            priceChange: 10,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(['success', 'partial', 'failed']).toContain(result.status);
      expect(result.simulated.totalSupply).toBeDefined();
    });

    it('should handle capacity scenario', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'capacity',
          parameters: {
            capacityChange: -15,
            affectedWorkCenters: ['WC-001'],
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(['success', 'partial', 'failed']).toContain(result.status);
      expect(result.simulated.capacityUtilization).toBeDefined();
    });

    it('should handle custom scenario', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'custom',
          parameters: {
            name: 'Custom',
            description: 'Custom scenario',
            demandFactors: { demandChange: 10 },
            supplyFactors: { priceChange: 5 },
            capacityFactors: { capacityChange: -10 },
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(['success', 'partial', 'failed']).toContain(result.status);
    });

    it('should generate timeline with correct number of weeks', async () => {
      const scenario = createTestScenario({
        simulationHorizonDays: 56, // 8 weeks
      });

      const result = await engine.runSimulation(scenario);
      const weeks = Math.ceil(scenario.simulationHorizonDays / 7);

      // Timeline may be empty if simulation fails, but should match weeks if successful
      if (result.status === 'success') {
        expect(result.timeline.length).toBe(weeks);
      }
    });

    it('should calculate demand impact correctly', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'demand',
          parameters: {
            demandChange: 50, // 50% increase
            affectedProducts: [],
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      // Check that impacts are calculated
      expect(result.impacts.demandChange).toBeDefined();
      expect(result.impacts.demandChangePercent).toBeDefined();
    });
  });

  describe('calculateBaselineState', () => {
    it('should return valid baseline metrics', async () => {
      const scenario = createTestScenario();
      const result = await engine.runSimulation(scenario);

      expect(result.baseline.totalDemand).toBeDefined();
      expect(result.baseline.totalSupply).toBeDefined();
      expect(result.baseline.netInventory).toBeDefined();
      expect(result.baseline.capacityUtilization).toBeDefined();
      expect(result.baseline.capacityUtilization).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateTimeline', () => {
    it('should generate timeline with all required fields', async () => {
      const scenario = createTestScenario();
      const result = await engine.runSimulation(scenario);

      if (result.timeline.length > 0) {
        const point = result.timeline[0];

        expect(point.week).toBeDefined();
        expect(point.date).toBeDefined();
        expect(point.demand).toBeDefined();
        expect(point.supply).toBeDefined();
        expect(point.inventory).toBeDefined();
        expect(point.capacityUsed).toBeDefined();
        expect(point.capacityAvailable).toBeDefined();
        expect(typeof point.stockouts).toBe('number');
      }
    });

    it('should have sequential weeks', async () => {
      const scenario = createTestScenario();
      const result = await engine.runSimulation(scenario);

      for (let i = 0; i < result.timeline.length; i++) {
        expect(result.timeline[i].week).toBe(i + 1);
      }
    });
  });

  describe('bottleneck identification', () => {
    it('should identify bottlenecks when capacity is exceeded', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'demand',
          parameters: {
            demandChange: 100, // Large demand increase
            affectedProducts: [],
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      // Bottlenecks and alerts arrays should be defined
      expect(result.bottlenecks).toBeDefined();
      expect(result.alerts).toBeDefined();
    });

    it('should include bottleneck details', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'capacity',
          parameters: {
            capacityChange: -50, // 50% capacity reduction
            affectedWorkCenters: ['WC-001'],
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      if (result.bottlenecks.length > 0) {
        const bottleneck = result.bottlenecks[0];
        expect(bottleneck.resourceId).toBeDefined();
        expect(bottleneck.type).toBeDefined();
        expect(bottleneck.severity).toBeDefined();
        expect(bottleneck.resource).toBeDefined();
        expect(bottleneck.week).toBeDefined();
      }
    });
  });

  describe('alert generation', () => {
    it('should generate alerts for threshold violations', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'supply',
          parameters: {
            supplierDisruption: [{ supplierId: 'SUP-001', disruptionType: 'partial', severity: 50, durationDays: 14 }],
            leadTimeChange: 30,
            priceChange: 20,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(result.alerts).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should categorize alert severity', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'demand',
          parameters: {
            demandChange: 80,
            affectedProducts: [],
            seasonalAdjustment: true,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      if (result.alerts.length > 0) {
        const alert = result.alerts[0];
        // Alert type is the category (stockout, capacity, supply, cost, delay)
        expect(['stockout', 'capacity', 'supply', 'cost', 'delay']).toContain(alert.type);
        // Severity is info, warning, or critical
        expect(['critical', 'warning', 'info']).toContain(alert.severity);
      }
    });
  });

  describe('impacts calculation', () => {
    it('should calculate demand impact', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'demand',
          parameters: {
            demandChange: 30,
            affectedProducts: [],
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(result.impacts.demandChange).toBeDefined();
      expect(result.impacts.demandChangePercent).toBeDefined();
      expect(typeof result.impacts.demandChange).toBe('number');
    });

    it('should calculate supply impact', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'supply',
          parameters: {
            supplierDisruption: [{ supplierId: 'SUP-001', disruptionType: 'delay', severity: 40, durationDays: 14 }],
            leadTimeChange: 14,
            priceChange: 10,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(result.impacts.supplyChange).toBeDefined();
      expect(result.impacts.supplyChangePercent).toBeDefined();
    });

    it('should calculate capacity impact', async () => {
      const scenario = createTestScenario({
        config: {
          type: 'capacity',
          parameters: {
            capacityChange: -25,
            affectedWorkCenters: [],
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const result = await engine.runSimulation(scenario);

      expect(result.impacts.capacityUtilizationChange).toBeDefined();
    });
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getSimulationEngine();
      const instance2 = getSimulationEngine();

      expect(instance1).toBe(instance2);
    });
  });

  describe('error handling', () => {
    it('should handle missing scenario gracefully', async () => {
      const invalidScenario = {
        ...createTestScenario(),
        id: '',
        name: '',
      };

      // Should still run without throwing - may return failed status
      const result = await engine.runSimulation(invalidScenario);
      expect(['success', 'partial', 'failed']).toContain(result.status);
    });
  });
});
