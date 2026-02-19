// =============================================================================
// SCENARIO BUILDER
// Build and manage what-if simulation scenarios
// =============================================================================

import { prisma } from '@/lib/prisma';

// =============================================================================
// TYPES
// =============================================================================

export type ScenarioType = 'demand' | 'supply' | 'capacity' | 'custom';

export type ScenarioStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed';

export interface ScenarioParameter {
  name: string;
  type: 'number' | 'percentage' | 'date' | 'select';
  value: number | string | Date;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
}

export interface DemandScenarioConfig {
  type: 'demand';
  parameters: {
    demandChange: number; // percentage change (-100 to +500)
    affectedProducts?: string[]; // specific products or all
    affectedCustomers?: string[]; // specific customers or all
    startDate: Date;
    endDate: Date;
    seasonalAdjustment?: boolean;
    rampUpWeeks?: number; // gradual change over weeks
  };
}

export interface SupplyScenarioConfig {
  type: 'supply';
  parameters: {
    supplierDisruption?: {
      supplierId: string;
      disruptionType: 'complete' | 'partial' | 'delay';
      severity: number; // 0-100%
      durationDays: number;
    }[];
    leadTimeChange?: number; // percentage change
    priceChange?: number; // percentage change
    qualityImpact?: number; // defect rate change
    affectedParts?: string[];
    startDate: Date;
    endDate: Date;
  };
}

export interface CapacityScenarioConfig {
  type: 'capacity';
  parameters: {
    capacityChange?: number; // percentage change
    affectedWorkCenters?: string[];
    addShift?: boolean;
    removeShift?: boolean;
    maintenanceDowntime?: {
      workCenterId: string;
      startDate: Date;
      endDate: Date;
    }[];
    efficiencyChange?: number; // percentage change
    startDate: Date;
    endDate: Date;
  };
}

export interface CustomScenarioConfig {
  type: 'custom';
  parameters: {
    demandFactors?: Partial<DemandScenarioConfig['parameters']>;
    supplyFactors?: Partial<SupplyScenarioConfig['parameters']>;
    capacityFactors?: Partial<CapacityScenarioConfig['parameters']>;
    name: string;
    description: string;
  };
}

export type ScenarioConfig =
  | DemandScenarioConfig
  | SupplyScenarioConfig
  | CapacityScenarioConfig
  | CustomScenarioConfig;

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  config: ScenarioConfig;
  status: ScenarioStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  baselineDate: Date;
  simulationHorizonDays: number;
  tags?: string[];
  isTemplate?: boolean;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  config: ScenarioConfig;
  category: string;
  usageCount: number;
}

export interface ScenarioValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// PREDEFINED TEMPLATES
// =============================================================================

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'demand-surge-20',
    name: 'Demand Surge +20%',
    description: 'Simulate 20% increase in demand across all products',
    type: 'demand',
    category: 'Demand Planning',
    usageCount: 0,
    config: {
      type: 'demand',
      parameters: {
        demandChange: 20,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        seasonalAdjustment: true,
        rampUpWeeks: 2,
      },
    },
  },
  {
    id: 'demand-drop-30',
    name: 'Demand Drop -30%',
    description: 'Simulate 30% decrease in demand (economic downturn)',
    type: 'demand',
    category: 'Demand Planning',
    usageCount: 0,
    config: {
      type: 'demand',
      parameters: {
        demandChange: -30,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        seasonalAdjustment: false,
        rampUpWeeks: 4,
      },
    },
  },
  {
    id: 'supplier-disruption',
    name: 'Key Supplier Disruption',
    description: 'Top supplier becomes unavailable for 30 days',
    type: 'supply',
    category: 'Supply Chain Risk',
    usageCount: 0,
    config: {
      type: 'supply',
      parameters: {
        supplierDisruption: [],
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    },
  },
  {
    id: 'lead-time-increase',
    name: 'Lead Time +50%',
    description: 'All supplier lead times increase by 50%',
    type: 'supply',
    category: 'Supply Chain Risk',
    usageCount: 0,
    config: {
      type: 'supply',
      parameters: {
        leadTimeChange: 50,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    },
  },
  {
    id: 'capacity-reduction',
    name: 'Capacity -25%',
    description: 'Production capacity reduced by 25%',
    type: 'capacity',
    category: 'Capacity Planning',
    usageCount: 0,
    config: {
      type: 'capacity',
      parameters: {
        capacityChange: -25,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    },
  },
  {
    id: 'add-shift',
    name: 'Add Third Shift',
    description: 'Add overnight shift to increase capacity',
    type: 'capacity',
    category: 'Capacity Planning',
    usageCount: 0,
    config: {
      type: 'capacity',
      parameters: {
        addShift: true,
        capacityChange: 33,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    },
  },
  {
    id: 'tet-holiday',
    name: 'Tet Holiday Impact',
    description: 'Vietnamese Tet holiday impact on supply and demand',
    type: 'custom',
    category: 'Seasonal',
    usageCount: 0,
    config: {
      type: 'custom',
      parameters: {
        name: 'Tet Holiday',
        description: 'Combined impact of Tet holiday',
        demandFactors: {
          demandChange: 40,
          rampUpWeeks: 4,
        },
        supplyFactors: {
          leadTimeChange: 100,
        },
        capacityFactors: {
          capacityChange: -50,
        },
      },
    },
  },
  {
    id: 'stress-test',
    name: 'Stress Test',
    description: 'Combined worst-case scenario',
    type: 'custom',
    category: 'Risk Analysis',
    usageCount: 0,
    config: {
      type: 'custom',
      parameters: {
        name: 'Stress Test',
        description: 'Worst-case combined scenario',
        demandFactors: {
          demandChange: 50,
        },
        supplyFactors: {
          leadTimeChange: 75,
          priceChange: 25,
        },
        capacityFactors: {
          capacityChange: -30,
          efficiencyChange: -15,
        },
      },
    },
  },
];

// =============================================================================
// SCENARIO BUILDER CLASS
// =============================================================================

export class ScenarioBuilder {
  private scenarios: Map<string, Scenario> = new Map();

  /**
   * Create a new scenario from scratch
   */
  createScenario(
    name: string,
    type: ScenarioType,
    config: ScenarioConfig,
    options: {
      description?: string;
      createdBy?: string;
      simulationHorizonDays?: number;
      baselineDate?: Date;
      tags?: string[];
    } = {}
  ): Scenario {
    const id = this.generateId();
    const now = new Date();

    const scenario: Scenario = {
      id,
      name,
      description: options.description || '',
      type,
      config,
      status: 'draft',
      createdBy: options.createdBy || 'system',
      createdAt: now,
      updatedAt: now,
      baselineDate: options.baselineDate || now,
      simulationHorizonDays: options.simulationHorizonDays || 90,
      tags: options.tags,
      isTemplate: false,
    };

    this.scenarios.set(id, scenario);
    return scenario;
  }

  /**
   * Create a scenario from a template
   */
  createFromTemplate(
    templateId: string,
    overrides: {
      name?: string;
      createdBy?: string;
      parameterOverrides?: Record<string, unknown>;
    } = {}
  ): Scenario | null {
    const template = SCENARIO_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return null;

    const config = this.applyParameterOverrides(
      template.config,
      overrides.parameterOverrides || {}
    );

    return this.createScenario(
      overrides.name || template.name,
      template.type,
      config,
      {
        description: template.description,
        createdBy: overrides.createdBy,
      }
    );
  }

  /**
   * Build a demand scenario
   */
  buildDemandScenario(
    name: string,
    params: DemandScenarioConfig['parameters'],
    options: { description?: string; createdBy?: string } = {}
  ): Scenario {
    const config: DemandScenarioConfig = {
      type: 'demand',
      parameters: {
        ...params,
        startDate: params.startDate || new Date(),
        endDate: params.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    };

    return this.createScenario(name, 'demand', config, options);
  }

  /**
   * Build a supply scenario
   */
  buildSupplyScenario(
    name: string,
    params: SupplyScenarioConfig['parameters'],
    options: { description?: string; createdBy?: string } = {}
  ): Scenario {
    const config: SupplyScenarioConfig = {
      type: 'supply',
      parameters: {
        ...params,
        startDate: params.startDate || new Date(),
        endDate: params.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    };

    return this.createScenario(name, 'supply', config, options);
  }

  /**
   * Build a capacity scenario
   */
  buildCapacityScenario(
    name: string,
    params: CapacityScenarioConfig['parameters'],
    options: { description?: string; createdBy?: string } = {}
  ): Scenario {
    const config: CapacityScenarioConfig = {
      type: 'capacity',
      parameters: {
        ...params,
        startDate: params.startDate || new Date(),
        endDate: params.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    };

    return this.createScenario(name, 'capacity', config, options);
  }

  /**
   * Build a custom combined scenario
   */
  buildCustomScenario(
    name: string,
    params: CustomScenarioConfig['parameters'],
    options: { description?: string; createdBy?: string } = {}
  ): Scenario {
    const config: CustomScenarioConfig = {
      type: 'custom',
      parameters: params,
    };

    return this.createScenario(name, 'custom', config, options);
  }

  /**
   * Validate a scenario configuration
   */
  validateScenario(scenario: Scenario): ScenarioValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!scenario.name || scenario.name.trim().length === 0) {
      errors.push('Scenario name is required');
    }

    if (scenario.simulationHorizonDays < 1 || scenario.simulationHorizonDays > 365) {
      errors.push('Simulation horizon must be between 1 and 365 days');
    }

    // Type-specific validation
    switch (scenario.config.type) {
      case 'demand':
        this.validateDemandScenario(scenario.config, errors, warnings);
        break;
      case 'supply':
        this.validateSupplyScenario(scenario.config, errors, warnings);
        break;
      case 'capacity':
        this.validateCapacityScenario(scenario.config, errors, warnings);
        break;
      case 'custom':
        this.validateCustomScenario(scenario.config, errors, warnings);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateDemandScenario(
    config: DemandScenarioConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const { parameters } = config;

    if (parameters.demandChange < -100 || parameters.demandChange > 500) {
      errors.push('Demand change must be between -100% and +500%');
    }

    if (parameters.demandChange > 100) {
      warnings.push('Demand increase over 100% may produce unrealistic results');
    }

    if (parameters.startDate >= parameters.endDate) {
      errors.push('Start date must be before end date');
    }

    if (parameters.rampUpWeeks && parameters.rampUpWeeks < 0) {
      errors.push('Ramp-up weeks cannot be negative');
    }
  }

  private validateSupplyScenario(
    config: SupplyScenarioConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const { parameters } = config;

    if (parameters.leadTimeChange !== undefined) {
      if (parameters.leadTimeChange < -90 || parameters.leadTimeChange > 500) {
        errors.push('Lead time change must be between -90% and +500%');
      }
    }

    if (parameters.priceChange !== undefined) {
      if (parameters.priceChange < -90 || parameters.priceChange > 200) {
        errors.push('Price change must be between -90% and +200%');
      }
    }

    if (parameters.supplierDisruption) {
      for (const disruption of parameters.supplierDisruption) {
        if (disruption.severity < 0 || disruption.severity > 100) {
          errors.push('Disruption severity must be between 0% and 100%');
        }
        if (disruption.durationDays < 1) {
          errors.push('Disruption duration must be at least 1 day');
        }
      }
    }

    if (parameters.startDate >= parameters.endDate) {
      errors.push('Start date must be before end date');
    }
  }

  private validateCapacityScenario(
    config: CapacityScenarioConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const { parameters } = config;

    if (parameters.capacityChange !== undefined) {
      if (parameters.capacityChange < -100 || parameters.capacityChange > 200) {
        errors.push('Capacity change must be between -100% and +200%');
      }
    }

    if (parameters.efficiencyChange !== undefined) {
      if (parameters.efficiencyChange < -50 || parameters.efficiencyChange > 50) {
        errors.push('Efficiency change must be between -50% and +50%');
      }
    }

    if (parameters.addShift && parameters.removeShift) {
      warnings.push('Both add and remove shift are selected - they will cancel out');
    }

    if (parameters.startDate >= parameters.endDate) {
      errors.push('Start date must be before end date');
    }
  }

  private validateCustomScenario(
    config: CustomScenarioConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const { parameters } = config;

    if (!parameters.name || parameters.name.trim().length === 0) {
      errors.push('Custom scenario name is required');
    }

    // Validate sub-factors if present
    if (parameters.demandFactors?.demandChange !== undefined) {
      if (parameters.demandFactors.demandChange < -100 || parameters.demandFactors.demandChange > 500) {
        errors.push('Demand change must be between -100% and +500%');
      }
    }

    if (parameters.supplyFactors?.leadTimeChange !== undefined) {
      if (parameters.supplyFactors.leadTimeChange < -90 || parameters.supplyFactors.leadTimeChange > 500) {
        errors.push('Lead time change must be between -90% and +500%');
      }
    }

    if (parameters.capacityFactors?.capacityChange !== undefined) {
      if (parameters.capacityFactors.capacityChange < -100 || parameters.capacityFactors.capacityChange > 200) {
        errors.push('Capacity change must be between -100% and +200%');
      }
    }

    // Check for extreme combinations
    const hasExtremeDemand = (parameters.demandFactors?.demandChange || 0) > 50;
    const hasExtremeSupply = (parameters.supplyFactors?.leadTimeChange || 0) > 50;
    const hasExtremeCapacity = (parameters.capacityFactors?.capacityChange || 0) < -25;

    if (hasExtremeDemand && hasExtremeSupply && hasExtremeCapacity) {
      warnings.push('Extreme combined factors may produce unrealistic results');
    }
  }

  /**
   * Get a scenario by ID
   */
  getScenario(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  /**
   * Get all scenarios
   */
  getAllScenarios(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Update a scenario
   */
  updateScenario(id: string, updates: Partial<Scenario>): Scenario | null {
    const scenario = this.scenarios.get(id);
    if (!scenario) return null;

    const updated: Scenario = {
      ...scenario,
      ...updates,
      id: scenario.id, // Prevent ID change
      createdAt: scenario.createdAt, // Prevent creation date change
      updatedAt: new Date(),
    };

    this.scenarios.set(id, updated);
    return updated;
  }

  /**
   * Delete a scenario
   */
  deleteScenario(id: string): boolean {
    return this.scenarios.delete(id);
  }

  /**
   * Clone a scenario
   */
  cloneScenario(id: string, newName?: string): Scenario | null {
    const original = this.scenarios.get(id);
    if (!original) return null;

    return this.createScenario(
      newName || `${original.name} (Copy)`,
      original.type,
      JSON.parse(JSON.stringify(original.config)),
      {
        description: original.description,
        createdBy: original.createdBy,
        simulationHorizonDays: original.simulationHorizonDays,
        tags: original.tags,
      }
    );
  }

  /**
   * Get available templates
   */
  getTemplates(category?: string): ScenarioTemplate[] {
    if (category) {
      return SCENARIO_TEMPLATES.filter((t) => t.category === category);
    }
    return SCENARIO_TEMPLATES;
  }

  /**
   * Get template categories
   */
  getTemplateCategories(): string[] {
    const categories = new Set<string>();
    SCENARIO_TEMPLATES.forEach((t) => categories.add(t.category));
    return Array.from(categories);
  }

  /**
   * Load historical scenario data from database
   */
  async loadBaselineData(scenarioId: string): Promise<{
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
  }> {
    const [inventory, salesOrders, purchaseOrders, workOrders, workCenters] = await Promise.all([
      prisma.inventory.groupBy({
        by: ['partId'],
        _sum: { quantity: true },
      }),
      prisma.salesOrder.findMany({
        where: { status: { in: ['confirmed', 'in_production'] } },
        include: { lines: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { status: { in: ['submitted', 'confirmed', 'partial'] } },
        include: { lines: true },
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ['planned', 'released', 'in_progress'] } },
      }),
      prisma.workCenter.findMany({
        where: { status: 'active' },
      }),
    ]);

    return {
      inventory: inventory.map((i) => ({
        partId: i.partId,
        quantity: i._sum.quantity || 0,
      })),
      openOrders: salesOrders,
      plannedOrders: purchaseOrders,
      workOrders,
      capacity: workCenters.map((wc) => ({
        workCenterId: wc.id,
        name: wc.name,
        dailyCapacityHours: wc.capacityPerDay,
        efficiency: wc.efficiency,
      })),
    };
  }

  // =============================================================================
  // PRIVATE HELPERS
  // =============================================================================

  private generateId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private applyParameterOverrides(
    config: ScenarioConfig,
    overrides: Record<string, unknown>
  ): ScenarioConfig {
    const cloned = JSON.parse(JSON.stringify(config));

    for (const [key, value] of Object.entries(overrides)) {
      if (cloned.parameters && key in cloned.parameters) {
        cloned.parameters[key] = value;
      }
    }

    return cloned;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let builderInstance: ScenarioBuilder | null = null;

export function getScenarioBuilder(): ScenarioBuilder {
  if (!builderInstance) {
    builderInstance = new ScenarioBuilder();
  }
  return builderInstance;
}
