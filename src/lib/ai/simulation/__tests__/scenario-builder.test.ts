import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScenarioBuilder,
  getScenarioBuilder,
  Scenario,
  DemandScenarioConfig,
  SupplyScenarioConfig,
  CapacityScenarioConfig,
  CustomScenarioConfig,
} from '../scenario-builder';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: { findMany: vi.fn().mockResolvedValue([]) },
    supplier: { findMany: vi.fn().mockResolvedValue([]) },
    workCenter: { findMany: vi.fn().mockResolvedValue([]) },
    inventory: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

describe('ScenarioBuilder', () => {
  let builder: ScenarioBuilder;

  beforeEach(() => {
    builder = new ScenarioBuilder();
  });

  describe('createScenario', () => {
    it('should create a demand scenario with valid config', () => {
      const config: DemandScenarioConfig = {
        type: 'demand',
        parameters: {
          demandChange: 25,
          affectedProducts: ['PROD-001', 'PROD-002'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      const scenario = builder.createScenario(
        'Test Demand Surge',
        'demand',
        config,
        {
          description: 'Testing demand increase scenario',
          simulationHorizonDays: 90,
        }
      );

      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Test Demand Surge');
      expect(scenario.type).toBe('demand');
      expect(scenario.status).toBe('draft');
      expect((scenario.config.parameters as DemandScenarioConfig['parameters']).demandChange).toBe(25);
      expect(scenario.simulationHorizonDays).toBe(90);
    });

    it('should create a supply scenario', () => {
      const config: SupplyScenarioConfig = {
        type: 'supply',
        parameters: {
          supplierDisruption: [{
            supplierId: 'SUP-001',
            disruptionType: 'partial',
            severity: 30,
            durationDays: 14,
          }],
          leadTimeChange: 14,
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        },
      };

      const scenario = builder.createScenario(
        'Supplier Disruption Test',
        'supply',
        config,
        {
          description: 'Testing supplier disruption scenario',
          simulationHorizonDays: 60,
        }
      );

      expect(scenario.type).toBe('supply');
      expect((scenario.config.parameters as SupplyScenarioConfig['parameters']).leadTimeChange).toBe(14);
    });

    it('should create a capacity scenario', () => {
      const config: CapacityScenarioConfig = {
        type: 'capacity',
        parameters: {
          capacityChange: -20,
          affectedWorkCenters: ['WC-001'],
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      };

      const scenario = builder.createScenario(
        'Machine Downtime',
        'capacity',
        config,
        {
          description: 'Testing capacity reduction scenario',
          simulationHorizonDays: 30,
        }
      );

      expect(scenario.type).toBe('capacity');
      expect((scenario.config.parameters as CapacityScenarioConfig['parameters']).capacityChange).toBe(-20);
    });

    it('should create a custom scenario', () => {
      const config: CustomScenarioConfig = {
        type: 'custom',
        parameters: {
          name: 'Custom',
          description: 'Custom scenario',
          demandFactors: { demandChange: 10 },
          supplyFactors: { priceChange: 5 },
          capacityFactors: { capacityChange: -10 },
        },
      };

      const scenario = builder.createScenario(
        'Custom What-If',
        'custom',
        config,
        {
          description: 'Testing custom scenario',
          simulationHorizonDays: 45,
        }
      );

      expect(scenario.type).toBe('custom');
    });

    it('should use default values when not provided', () => {
      const config: DemandScenarioConfig = {
        type: 'demand',
        parameters: {
          demandChange: 10,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      const scenario = builder.createScenario(
        'Minimal Scenario',
        'demand',
        config
      );

      expect(scenario.simulationHorizonDays).toBe(90); // default
    });
  });

  describe('getTemplates', () => {
    it('should return predefined templates', () => {
      const templates = builder.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include required template fields', () => {
      const templates = builder.getTemplates();

      if (templates.length > 0) {
        const template = templates[0];

        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.config).toBeDefined();
      }
    });
  });

  describe('getTemplateCategories', () => {
    it('should return categories', () => {
      const categories = builder.getTemplateCategories();

      expect(Array.isArray(categories)).toBe(true);
    });

    it('should have no duplicates', () => {
      const categories = builder.getTemplateCategories();
      const unique = [...new Set(categories)];

      expect(categories.length).toBe(unique.length);
    });
  });

  describe('createFromTemplate', () => {
    it('should create scenario from template with overrides', () => {
      const templates = builder.getTemplates();

      if (templates.length > 0) {
        const scenario = builder.createFromTemplate(templates[0].id, {
          name: 'My Custom Scenario',
        });

        expect(scenario).not.toBeNull();
        expect(scenario?.name).toBe('My Custom Scenario');
        expect(scenario?.type).toBeDefined();
      }
    });

    it('should use template defaults when no overrides', () => {
      const templates = builder.getTemplates();

      if (templates.length > 0) {
        const scenario = builder.createFromTemplate(templates[0].id);

        expect(scenario).not.toBeNull();
        expect(scenario?.name).toBeDefined();
        expect(scenario?.type).toBeDefined();
      }
    });

    it('should return null for invalid template', () => {
      const result = builder.createFromTemplate('invalid_template_id');
      expect(result).toBeNull();
    });
  });

  describe('scenario management', () => {
    it('should save and retrieve scenario', () => {
      const config: DemandScenarioConfig = {
        type: 'demand',
        parameters: {
          demandChange: 15,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      const scenario = builder.createScenario(
        'Test Scenario',
        'demand',
        config,
        { description: 'For testing save/retrieve' }
      );
      const retrieved = builder.getScenario(scenario.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(scenario.id);
      expect(retrieved?.name).toBe(scenario.name);
    });

    it('should list all scenarios', () => {
      const config1: DemandScenarioConfig = {
        type: 'demand',
        parameters: {
          demandChange: 10,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      const config2: SupplyScenarioConfig = {
        type: 'supply',
        parameters: {
          leadTimeChange: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      builder.createScenario('Scenario 1', 'demand', config1);
      builder.createScenario('Scenario 2', 'supply', config2);

      const scenarios = builder.getAllScenarios();

      expect(scenarios.length).toBeGreaterThanOrEqual(2);
    });

    it('should delete scenario', () => {
      const config: DemandScenarioConfig = {
        type: 'demand',
        parameters: {
          demandChange: 20,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      };

      const scenario = builder.createScenario('To Delete', 'demand', config);

      const deleted = builder.deleteScenario(scenario.id);
      const retrieved = builder.getScenario(scenario.id);

      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should validate demand scenario parameters', () => {
      const scenario: Scenario = {
        id: 'test-1',
        name: 'Valid Demand',
        description: 'Test',
        type: 'demand',
        status: 'draft',
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        baselineDate: new Date(),
        simulationHorizonDays: 90,
        config: {
          type: 'demand',
          parameters: {
            demandChange: 25,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      };

      const result = builder.validateScenario(scenario);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid change percent', () => {
      const scenario: Scenario = {
        id: 'test-2',
        name: 'Invalid Demand',
        description: 'Test',
        type: 'demand',
        status: 'draft',
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        baselineDate: new Date(),
        simulationHorizonDays: 90,
        config: {
          type: 'demand',
          parameters: {
            demandChange: 600, // exceeds max
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      };

      const result = builder.validateScenario(scenario);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should require name', () => {
      const scenario: Scenario = {
        id: 'test-3',
        name: '',
        description: 'Test',
        type: 'demand',
        status: 'draft',
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        baselineDate: new Date(),
        simulationHorizonDays: 90,
        config: {
          type: 'demand',
          parameters: {
            demandChange: 10,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      };

      const result = builder.validateScenario(scenario);

      expect(result.isValid).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getScenarioBuilder();
      const instance2 = getScenarioBuilder();

      expect(instance1).toBe(instance2);
    });
  });
});
