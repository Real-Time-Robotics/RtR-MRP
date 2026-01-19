import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScheduleOptimizer,
  getScheduleOptimizer,
  OptimizationConfig,
} from '../schedule-optimizer';
import { ScheduleResult, ScheduleSuggestion } from '../scheduling-engine';

// Mock prisma with proper default export
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {};
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('ScheduleOptimizer', () => {
  let optimizer: ScheduleOptimizer;

  const createTestSuggestion = (
    overrides: Partial<ScheduleSuggestion> = {}
  ): ScheduleSuggestion => ({
    workOrderId: 'wo-1',
    workOrderNumber: 'WO-001',
    currentStartDate: new Date(),
    currentEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    suggestedStartDate: new Date(),
    suggestedEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    priority: 50,
    reason: 'Test reason',
    confidence: 85,
    impact: {
      onTimeDeliveryChange: 5,
      utilizationChange: 3,
      costChange: -100,
    },
    ...overrides,
  });

  const createTestScheduleResult = (
    overrides: Partial<ScheduleResult> = {}
  ): ScheduleResult => ({
    id: 'schedule-1',
    status: 'success',
    algorithm: 'balanced_load',
    generatedAt: new Date(),
    horizonDays: 30,
    suggestions: [createTestSuggestion()],
    metrics: {
      totalWorkOrders: 10,
      scheduledWorkOrders: 10,
      utilizationRate: 75,
      onTimeDeliveryRate: 90,
      averageLeadTime: 5,
      conflicts: 2,
    },
    conflicts: [],
    ...overrides,
  });

  beforeEach(() => {
    optimizer = ScheduleOptimizer.getInstance();
    vi.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getScheduleOptimizer();
      const instance2 = getScheduleOptimizer();
      expect(instance1).toBe(instance2);
    });
  });

  describe('optimizeSchedule', () => {
    it('should optimize schedule with default config', async () => {
      const schedule = createTestScheduleResult();
      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'balanced_load',
        maxIterations: 10,
        populationSize: 10,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should preserve suggestion structure', async () => {
      const schedule = createTestScheduleResult({
        suggestions: [
          createTestSuggestion({ workOrderId: 'wo-1' }),
          createTestSuggestion({ workOrderId: 'wo-2' }),
        ],
      });

      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'priority_first',
        maxIterations: 5,
        populationSize: 5,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle empty suggestions', async () => {
      const schedule = createTestScheduleResult({ suggestions: [] });
      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'balanced_load',
        maxIterations: 10,
        populationSize: 10,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result).toBeDefined();
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('optimization algorithms', () => {
    const algorithms = [
      'priority_first',
      'due_date_first',
      'shortest_first',
      'setup_minimize',
      'balanced_load',
    ] as const;

    algorithms.forEach((algorithm) => {
      it(`should support ${algorithm} algorithm`, async () => {
        const schedule = createTestScheduleResult();
        const result = await optimizer.optimizeSchedule(schedule, {
          algorithm,
          maxIterations: 5,
          populationSize: 5,
          targetMetrics: {
            onTimeDelivery: 0.95,
            utilizationRate: 0.85,
            setupTimeReduction: 0.1,
          },
        });

        expect(result.algorithm).toBe(algorithm);
      });
    });
  });

  describe('genetic algorithm', () => {
    it('should run genetic algorithm optimization', async () => {
      const schedule = createTestScheduleResult({
        suggestions: [
          createTestSuggestion({ workOrderId: 'wo-1', priority: 80 }),
          createTestSuggestion({ workOrderId: 'wo-2', priority: 60 }),
          createTestSuggestion({ workOrderId: 'wo-3', priority: 40 }),
        ],
      });

      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'genetic',
        maxIterations: 10,
        populationSize: 10,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result).toBeDefined();
      expect(result.algorithm).toBe('genetic');
    });
  });

  describe('metrics calculation', () => {
    it('should calculate optimization metrics', async () => {
      const schedule = createTestScheduleResult();
      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'balanced_load',
        maxIterations: 10,
        populationSize: 10,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result.metrics).toBeDefined();
      expect(result.metrics.utilizationRate).toBeDefined();
      expect(result.metrics.onTimeDeliveryRate).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle single suggestion', async () => {
      const schedule = createTestScheduleResult({
        suggestions: [createTestSuggestion()],
      });

      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'balanced_load',
        maxIterations: 5,
        populationSize: 5,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result).toBeDefined();
    });

    it('should handle very low iterations', async () => {
      const schedule = createTestScheduleResult();
      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'genetic',
        maxIterations: 1,
        populationSize: 2,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result).toBeDefined();
    });

    it('should handle suggestions with same priority', async () => {
      const schedule = createTestScheduleResult({
        suggestions: [
          createTestSuggestion({ workOrderId: 'wo-1', priority: 50 }),
          createTestSuggestion({ workOrderId: 'wo-2', priority: 50 }),
          createTestSuggestion({ workOrderId: 'wo-3', priority: 50 }),
        ],
      });

      const result = await optimizer.optimizeSchedule(schedule, {
        algorithm: 'priority_first',
        maxIterations: 5,
        populationSize: 5,
        targetMetrics: {
          onTimeDelivery: 0.95,
          utilizationRate: 0.85,
          setupTimeReduction: 0.1,
        },
      });

      expect(result).toBeDefined();
    });
  });
});
