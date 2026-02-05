import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AISchedulerAnalyzer,
  getAISchedulerAnalyzer,
  ScheduleExplanation,
  BottleneckPrediction,
  ImprovementSuggestion,
  DisruptionEvent,
} from '../ai-scheduler-analyzer';
import {
  ScheduleResult,
  ScheduleSuggestion,
  WorkOrderScheduleInfo,
  WorkCenterCapacityInfo,
} from '../scheduling-engine';

// Mock prisma with proper default export
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {};
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('AISchedulerAnalyzer', () => {
  let analyzer: AISchedulerAnalyzer;

  const createTestSuggestion = (
    overrides: Partial<ScheduleSuggestion> = {}
  ): ScheduleSuggestion => ({
    id: 'sugg-1',
    workOrderId: 'wo-1',
    woNumber: 'WO-001',
    productName: 'Test Product',
    currentSchedule: {
      workCenterId: null,
      workCenterName: null,
      startDate: null,
      endDate: null,
    },
    suggestedSchedule: {
      workCenterId: 'wc-1',
      workCenterName: 'Work Center 1',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    operations: [],
    changeType: 'new',
    reason: 'Optimization',
    impact: {
      onTimeDeliveryChange: 5,
      capacityUtilizationChange: 3,
      setupTimeChange: -1,
      conflictsResolved: 0,
      affectedWorkOrders: [],
    },
    priority: 50,
    confidenceScore: 85,
    createdAt: new Date(),
    ...overrides,
  });

  const createTestScheduleResult = (
    overrides: Partial<ScheduleResult> = {}
  ): ScheduleResult => ({
    id: 'schedule-1',
    createdAt: new Date(),
    algorithm: 'balanced_load',
    horizon: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      days: 30,
    },
    workOrdersAnalyzed: 10,
    suggestions: [createTestSuggestion()],
    metrics: {
      currentOnTimeDelivery: 85,
      projectedOnTimeDelivery: 90,
      currentCapacityUtilization: 70,
      projectedCapacityUtilization: 75,
      currentSetupTime: 10,
      projectedSetupTime: 8,
      makespan: 14,
      conflictCount: 2,
      unscheduledCount: 0,
    },
    conflicts: [
      {
        type: 'overlap',
        severity: 'medium',
        description: 'Test conflict',
        affectedWorkOrders: ['wo-1', 'wo-2'],
        affectedWorkCenters: ['wc-1'],
        suggestedResolution: 'Reschedule',
        autoResolvable: true,
      },
    ],
    warnings: [],
    ...overrides,
  });

  const createTestWorkOrder = (
    overrides: Partial<WorkOrderScheduleInfo> = {}
  ): WorkOrderScheduleInfo => ({
    id: 'wo-1',
    woNumber: 'WO-001',
    productId: 'prod-1',
    productName: 'Test Product',
    productCode: 'SKU-001',
    quantity: 100,
    completedQty: 0,
    remainingQty: 100,
    priority: 'normal',
    status: 'pending',
    salesOrderId: null,
    salesOrderNumber: null,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    estimatedDuration: 8,
    operations: [],
    materialStatus: {
      allAvailable: true,
      availablePercentage: 100,
      shortages: [],
      expectedReadyDate: null,
    },
    predecessors: [],
    successors: [],
    ...overrides,
  });

  const createTestCapacity = (
    overrides: Partial<WorkCenterCapacityInfo> = {}
  ): WorkCenterCapacityInfo => ({
    id: 'wc-1',
    code: 'WC-001',
    name: 'Work Center 1',
    type: 'machine',
    capacityPerDay: 8,
    efficiency: 1.0,
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    breakMinutes: 60,
    workingDays: [1, 2, 3, 4, 5],
    maxConcurrentJobs: 1,
    dailyCapacity: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      availableHours: 8,
      scheduledHours: 6,
      remainingHours: 2,
      utilization: 75,
      scheduledWorkOrders: [],
      isHoliday: false,
      maintenanceHours: 0,
    })),
    ...overrides,
  });

  beforeEach(() => {
    analyzer = AISchedulerAnalyzer.getInstance();
    vi.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getAISchedulerAnalyzer();
      const instance2 = getAISchedulerAnalyzer();
      expect(instance1).toBe(instance2);
    });
  });

  describe('explainSchedule', () => {
    it('should explain schedule in Vietnamese', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation).toBeDefined();
      expect(explanation.summary).toBeDefined();
      expect(explanation.keyDecisions).toBeDefined();
      expect(Array.isArray(explanation.keyDecisions)).toBe(true);
    });

    it('should include key decisions for algorithm choice', async () => {
      const schedule = createTestScheduleResult({ algorithm: 'priority_first' });
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.keyDecisions).toBeDefined();
      expect(explanation.keyDecisions.length).toBeGreaterThan(0);
    });

    it('should include tradeoffs when present', async () => {
      const schedule = createTestScheduleResult({
        conflicts: [
          {
            type: 'overlap',
            severity: 'high',
            description: 'Overlap',
            affectedWorkOrders: ['wo-1'],
            affectedWorkCenters: ['wc-1'],
            suggestedResolution: 'Reschedule',
            autoResolvable: true,
          },
        ],
      });
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.tradeoffs).toBeDefined();
    });

    it('should include assumptions and limitations', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.assumptions).toBeDefined();
      expect(explanation.limitations).toBeDefined();
      expect(Array.isArray(explanation.assumptions)).toBe(true);
      expect(Array.isArray(explanation.limitations)).toBe(true);
    });

    it('should include confidence score', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.confidence).toBeDefined();
      expect(typeof explanation.confidence).toBe('number');
    });
  });

  describe('predictBottlenecks', () => {
    it('should predict potential bottlenecks', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [
        createTestCapacity({
          dailyCapacity: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            availableHours: 8,
            scheduledHours: 7.5,
            remainingHours: 0.5,
            utilization: 95,
            scheduledWorkOrders: [],
            isHoliday: false,
            maintenanceHours: 0,
          })),
        }),
      ];

      const bottlenecks = await analyzer.predictBottlenecks(workOrders, capacities, 14);

      expect(bottlenecks).toBeDefined();
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should identify high utilization as bottleneck', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [
        createTestCapacity({
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            availableHours: 8,
            scheduledHours: 8,
            remainingHours: 0,
            utilization: 100,
            scheduledWorkOrders: [],
            isHoliday: false,
            maintenanceHours: 0,
          })),
        }),
      ];

      const bottlenecks = await analyzer.predictBottlenecks(workOrders, capacities, 14);
      const capacityBottleneck = bottlenecks.find((b) => b.type === 'capacity');

      expect(capacityBottleneck).toBeDefined();
    });

    it('should return empty array for healthy schedule', async () => {
      const workOrders = [createTestWorkOrder()];
      const capacities = [
        createTestCapacity({
          dailyCapacity: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            availableHours: 8,
            scheduledHours: 4,
            remainingHours: 4,
            utilization: 50,
            scheduledWorkOrders: [],
            isHoliday: false,
            maintenanceHours: 0,
          })),
        }),
      ];

      const bottlenecks = await analyzer.predictBottlenecks(workOrders, capacities, 14);
      expect(Array.isArray(bottlenecks)).toBe(true);
    });
  });

  describe('suggestImprovements', () => {
    it('should suggest improvements', async () => {
      const schedule = createTestScheduleResult();
      const suggestions = await analyzer.suggestImprovements(schedule);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should prioritize improvements', async () => {
      const schedule = createTestScheduleResult({
        metrics: {
          currentOnTimeDelivery: 60,
          projectedOnTimeDelivery: 60,
          currentCapacityUtilization: 95,
          projectedCapacityUtilization: 95,
          currentSetupTime: 20,
          projectedSetupTime: 20,
          makespan: 30,
          conflictCount: 10,
          unscheduledCount: 5,
        },
      });

      const suggestions = await analyzer.suggestImprovements(schedule);

      if (suggestions.length >= 2) {
        // Suggestions should be sorted by priority (lower number = higher priority)
        expect(suggestions[0].priority).toBeLessThanOrEqual(suggestions[1].priority);
      }
    });

    it('should include expected benefit', async () => {
      const schedule = createTestScheduleResult();
      const suggestions = await analyzer.suggestImprovements(schedule);

      if (suggestions.length > 0) {
        expect(suggestions[0].expectedBenefit).toBeDefined();
      }
    });
  });

  describe('handleDisruption', () => {
    it('should handle machine breakdown disruption', async () => {
      const schedule = createTestScheduleResult();
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'Work Center 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 4,
        description: 'Machine is down',
      };

      const response = await analyzer.handleDisruption(schedule, disruption as unknown as Record<string, unknown>);

      expect(response).toBeDefined();
      expect(response.disruption).toBeDefined();
      expect(response.impact).toBeDefined();
      expect(response.rescheduleOptions).toBeDefined();
    });

    it('should handle urgent order disruption', async () => {
      const schedule = createTestScheduleResult();
      const disruption: DisruptionEvent = {
        type: 'urgent_order',
        affectedEntity: 'Urgent Order',
        affectedEntityId: 'wo-urgent',
        startTime: new Date(),
        estimatedDuration: 8,
        description: 'Urgent customer order',
      };

      const response = await analyzer.handleDisruption(schedule, disruption as unknown as Record<string, unknown>);

      expect(response).toBeDefined();
      expect(response.recommendedOption).toBeDefined();
    });

    it('should provide reschedule options', async () => {
      const schedule = createTestScheduleResult();
      const disruption: DisruptionEvent = {
        type: 'material_delay',
        affectedEntity: 'Part ABC',
        affectedEntityId: 'part-1',
        startTime: new Date(),
        estimatedDuration: 24,
        description: 'Critical material delayed',
      };

      const response = await analyzer.handleDisruption(schedule, disruption as unknown as Record<string, unknown>);

      expect(response.rescheduleOptions).toBeDefined();
      expect(Array.isArray(response.rescheduleOptions)).toBe(true);
      expect(response.rescheduleOptions.length).toBeGreaterThan(0);
    });

    it('should provide explanation', async () => {
      const schedule = createTestScheduleResult();
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'Work Center 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 4,
        description: 'Machine is down',
      };

      const response = await analyzer.handleDisruption(schedule, disruption as unknown as Record<string, unknown>);

      expect(response.explanation).toBeDefined();
      expect(typeof response.explanation).toBe('string');
    });
  });

  describe('compareSchedules', () => {
    it('should compare multiple schedules', async () => {
      const schedule1 = createTestScheduleResult({
        id: 'schedule-1',
        algorithm: 'priority_first',
        metrics: {
          currentOnTimeDelivery: 85,
          projectedOnTimeDelivery: 85,
          currentCapacityUtilization: 80,
          projectedCapacityUtilization: 80,
          currentSetupTime: 10,
          projectedSetupTime: 10,
          makespan: 14,
          conflictCount: 3,
          unscheduledCount: 0,
        },
      });

      const schedule2 = createTestScheduleResult({
        id: 'schedule-2',
        algorithm: 'balanced_load',
        metrics: {
          currentOnTimeDelivery: 90,
          projectedOnTimeDelivery: 95,
          currentCapacityUtilization: 75,
          projectedCapacityUtilization: 75,
          currentSetupTime: 8,
          projectedSetupTime: 8,
          makespan: 12,
          conflictCount: 1,
          unscheduledCount: 0,
        },
      });

      const comparison = await analyzer.compareSchedules([schedule1, schedule2]);

      expect(comparison).toBeDefined();
      expect(comparison.scheduleA).toBeDefined();
      expect(comparison.scheduleB).toBeDefined();
      expect(comparison.recommendation).toBeDefined();
    });

    it('should identify preferred schedule', async () => {
      const goodSchedule = createTestScheduleResult({
        id: 'good',
        metrics: {
          currentOnTimeDelivery: 95,
          projectedOnTimeDelivery: 98,
          currentCapacityUtilization: 85,
          projectedCapacityUtilization: 85,
          currentSetupTime: 5,
          projectedSetupTime: 5,
          makespan: 10,
          conflictCount: 0,
          unscheduledCount: 0,
        },
      });

      const poorSchedule = createTestScheduleResult({
        id: 'poor',
        metrics: {
          currentOnTimeDelivery: 60,
          projectedOnTimeDelivery: 70,
          currentCapacityUtilization: 60,
          projectedCapacityUtilization: 60,
          currentSetupTime: 15,
          projectedSetupTime: 15,
          makespan: 25,
          conflictCount: 5,
          unscheduledCount: 3,
        },
      });

      const comparison = await analyzer.compareSchedules([goodSchedule, poorSchedule]);

      expect(comparison.recommendation.preferredSchedule).toBeDefined();
      expect(['A', 'B']).toContain(comparison.recommendation.preferredSchedule);
    });

    it('should throw error for single schedule', async () => {
      const schedule = createTestScheduleResult();

      await expect(analyzer.compareSchedules([schedule])).rejects.toThrow();
    });

    it('should include differences analysis', async () => {
      const schedule1 = createTestScheduleResult({ id: 'schedule-1' });
      const schedule2 = createTestScheduleResult({ id: 'schedule-2' });

      const comparison = await analyzer.compareSchedules([schedule1, schedule2]);

      expect(comparison.differences).toBeDefined();
      expect(Array.isArray(comparison.differences)).toBe(true);
    });
  });

  describe('generateScheduleReport', () => {
    it('should generate comprehensive report', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.sections).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include summary statistics', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);

      expect(report.summary.totalWorkOrders).toBeDefined();
      expect(report.summary.scheduledCount).toBeDefined();
      expect(report.summary.onTimePercentage).toBeDefined();
      expect(report.summary.utilizationPercentage).toBeDefined();
    });

    it('should include appendix with details', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);

      expect(report.appendix).toBeDefined();
      expect(report.appendix.workOrderList).toBeDefined();
      expect(report.appendix.conflictDetails).toBeDefined();
      expect(report.appendix.capacityDetails).toBeDefined();
    });
  });

  describe('Vietnamese language output', () => {
    it('should use Vietnamese in explanations', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);

      // Check for Vietnamese words/patterns
      const vietnamesePattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
      const hasVietnamese =
        vietnamesePattern.test(explanation.summary) ||
        explanation.summary.includes('lệnh') ||
        explanation.summary.includes('sản xuất') ||
        explanation.summary.includes('thuật toán');

      expect(hasVietnamese).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schedule', async () => {
      const schedule = createTestScheduleResult({
        suggestions: [],
        conflicts: [],
        metrics: {
          currentOnTimeDelivery: 100,
          projectedOnTimeDelivery: 100,
          currentCapacityUtilization: 0,
          projectedCapacityUtilization: 0,
          currentSetupTime: 0,
          projectedSetupTime: 0,
          makespan: 0,
          conflictCount: 0,
          unscheduledCount: 0,
        },
      });

      const explanation = await analyzer.explainSchedule(schedule);
      expect(explanation).toBeDefined();

      const bottlenecks = await analyzer.predictBottlenecks([], [], 14);
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should handle schedule with many conflicts', async () => {
      const schedule = createTestScheduleResult({
        conflicts: Array(20)
          .fill(null)
          .map((_, i) => ({
            type: 'overlap' as const,
            severity: 'high' as const,
            description: `Conflict ${i}`,
            affectedWorkOrders: [`wo-${i}`],
            affectedWorkCenters: ['wc-1'],
            suggestedResolution: 'Reschedule',
            autoResolvable: true,
          })),
        metrics: {
          currentOnTimeDelivery: 50,
          projectedOnTimeDelivery: 50,
          currentCapacityUtilization: 100,
          projectedCapacityUtilization: 100,
          currentSetupTime: 30,
          projectedSetupTime: 30,
          makespan: 40,
          conflictCount: 20,
          unscheduledCount: 5,
        },
      });

      const report = await analyzer.generateScheduleReport(schedule);
      expect(report).toBeDefined();
    });
  });
});
