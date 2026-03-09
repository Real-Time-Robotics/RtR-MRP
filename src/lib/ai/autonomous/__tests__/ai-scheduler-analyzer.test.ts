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
    it('should return same instance via getInstance', () => {
      const a = AISchedulerAnalyzer.getInstance();
      const b = AISchedulerAnalyzer.getInstance();
      expect(a).toBe(b);
    });

    it('should return same instance via getAISchedulerAnalyzer', () => {
      const a = getAISchedulerAnalyzer();
      const b = getAISchedulerAnalyzer();
      expect(a).toBe(b);
    });
  });

  describe('explainSchedule', () => {
    it('should return explanation with all fields', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.summary).toBeDefined();
      expect(explanation.keyDecisions).toBeDefined();
      expect(explanation.tradeoffs).toBeDefined();
      expect(explanation.assumptions).toBeDefined();
      expect(explanation.limitations).toBeDefined();
      expect(typeof explanation.confidence).toBe('number');
    });

    it('should include algorithm decision', async () => {
      const schedule = createTestScheduleResult({ algorithm: 'priority_first' });
      const explanation = await analyzer.explainSchedule(schedule);
      expect(explanation.keyDecisions.length).toBeGreaterThan(0);
      const algorithmDecision = explanation.keyDecisions[0];
      expect(algorithmDecision.decision).toBeDefined();
      expect(algorithmDecision.reason).toBeDefined();
    });

    it('should identify critical work orders decision', async () => {
      const schedule = createTestScheduleResult();
      const workOrders = [
        createTestWorkOrder({ priority: 'critical' }),
      ];
      const explanation = await analyzer.explainSchedule(schedule, workOrders);
      const criticalDecision = explanation.keyDecisions.find(
        d => d.decision.includes('khẩn cấp')
      );
      expect(criticalDecision).toBeDefined();
    });

    it('should identify material waiting decisions', async () => {
      const schedule = createTestScheduleResult();
      const workOrders = [
        createTestWorkOrder({
          materialStatus: {
            allAvailable: false,
            availablePercentage: 50,
            shortages: [{ partId: 'p1', partNumber: 'P1', partName: 'Part', requiredQty: 100, availableQty: 50, shortageQty: 50, expectedArrival: null, pendingPOQty: 0 }],
            expectedReadyDate: null,
          },
        }),
      ];
      const explanation = await analyzer.explainSchedule(schedule, workOrders);
      const materialDecision = explanation.keyDecisions.find(
        d => d.decision.includes('chờ nguyên vật liệu')
      );
      expect(materialDecision).toBeDefined();
    });

    it('should identify on-time vs utilization tradeoff', async () => {
      const schedule = createTestScheduleResult({
        metrics: {
          currentOnTimeDelivery: 98,
          projectedOnTimeDelivery: 98,
          currentCapacityUtilization: 60,
          projectedCapacityUtilization: 60,
          currentSetupTime: 10,
          projectedSetupTime: 8,
          makespan: 14,
          conflictCount: 0,
          unscheduledCount: 0,
        },
      });
      const explanation = await analyzer.explainSchedule(schedule);
      const tradeoff = explanation.tradeoffs.find(
        t => t.factor1.includes('Giao hàng')
      );
      expect(tradeoff).toBeDefined();
    });

    it('should add setup_minimize tradeoff', async () => {
      const schedule = createTestScheduleResult({ algorithm: 'setup_minimize' });
      const explanation = await analyzer.explainSchedule(schedule);
      const setupTradeoff = explanation.tradeoffs.find(t => t.factor1.includes('setup'));
      expect(setupTradeoff).toBeDefined();
    });

    it('should add balanced_load tradeoff', async () => {
      const schedule = createTestScheduleResult({ algorithm: 'balanced_load' });
      const explanation = await analyzer.explainSchedule(schedule);
      const balanceTradeoff = explanation.tradeoffs.find(t => t.factor1.includes('Cân bằng'));
      expect(balanceTradeoff).toBeDefined();
    });

    it('should include standard assumptions', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);
      expect(explanation.assumptions.length).toBeGreaterThanOrEqual(3);
    });

    it('should identify limitations from warnings', async () => {
      const schedule = createTestScheduleResult({
        warnings: [{ type: 'capacity_low', message: 'Low', affectedEntities: ['wc-1'], recommendation: 'Fix it' }],
      });
      const explanation = await analyzer.explainSchedule(schedule);
      expect(explanation.limitations.some(l => l.includes('cảnh báo'))).toBe(true);
    });

    it('should identify unscheduled work orders as limitation', async () => {
      const schedule = createTestScheduleResult();
      const workOrders = [
        createTestWorkOrder({ plannedStart: null }),
      ];
      const explanation = await analyzer.explainSchedule(schedule, workOrders);
      expect(explanation.limitations.some(l => l.includes('chưa được xếp lịch'))).toBe(true);
    });

    it('should reduce confidence for unscheduled work orders', async () => {
      const schedule = createTestScheduleResult();
      const manyUnscheduled = Array.from({ length: 10 }, (_, i) =>
        createTestWorkOrder({ id: `wo-${i}`, plannedStart: null, woNumber: `WO-${i}` })
      );
      const explanation = await analyzer.explainSchedule(schedule, manyUnscheduled);
      expect(explanation.confidence).toBeLessThan(80);
    });

    it('should reduce confidence for material issues', async () => {
      const schedule = createTestScheduleResult();
      const materialIssues = Array.from({ length: 5 }, (_, i) =>
        createTestWorkOrder({
          id: `wo-${i}`,
          woNumber: `WO-${i}`,
          materialStatus: { allAvailable: false, availablePercentage: 50, shortages: [{ partId: 'p1', partNumber: 'P1', partName: 'Part', requiredQty: 100, availableQty: 50, shortageQty: 50, expectedArrival: null, pendingPOQty: 0 }], expectedReadyDate: null },
        })
      );
      const explanation = await analyzer.explainSchedule(schedule, materialIssues);
      expect(explanation.confidence).toBeLessThan(80);
    });

    it('should include summary with algorithm name and WO count', async () => {
      const schedule = createTestScheduleResult();
      const workOrders = [createTestWorkOrder()];
      const explanation = await analyzer.explainSchedule(schedule, workOrders);
      expect(explanation.summary).toContain('1');
    });
  });

  describe('predictBottlenecks', () => {
    it('should predict capacity bottlenecks for high utilization', async () => {
      const capacities = [
        createTestCapacity({
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
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
      const bottlenecks = await analyzer.predictBottlenecks([], capacities, 14);
      expect(bottlenecks.some(b => b.type === 'capacity')).toBe(true);
    });

    it('should mark critical severity when utilization > 100', async () => {
      const capacities = [
        createTestCapacity({
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
            availableHours: 8,
            scheduledHours: 10,
            remainingHours: 0,
            utilization: 125,
            scheduledWorkOrders: [],
            isHoliday: false,
            maintenanceHours: 0,
          })),
        }),
      ];
      const bottlenecks = await analyzer.predictBottlenecks([], capacities, 14);
      const critical = bottlenecks.find(b => b.severity === 'critical');
      expect(critical).toBeDefined();
    });

    it('should not predict bottlenecks for healthy utilization', async () => {
      const capacities = [
        createTestCapacity({
          dailyCapacity: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
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
      const bottlenecks = await analyzer.predictBottlenecks([], capacities, 14);
      expect(bottlenecks.filter(b => b.type === 'capacity')).toHaveLength(0);
    });

    it('should predict queue bottlenecks for many work orders at one center', async () => {
      const workOrders = Array.from({ length: 10 }, (_, i) =>
        createTestWorkOrder({ id: `wo-${i}`, woNumber: `WO-${i}`, workCenterId: 'wc-1' })
      );
      const capacities = [createTestCapacity()];
      const bottlenecks = await analyzer.predictBottlenecks(workOrders, capacities, 14);
      expect(bottlenecks.some(b => b.type === 'queue')).toBe(true);
    });

    it('should not predict queue bottlenecks for small queues', async () => {
      const workOrders = [
        createTestWorkOrder({ workCenterId: 'wc-1' }),
      ];
      const capacities = [createTestCapacity()];
      const bottlenecks = await analyzer.predictBottlenecks(workOrders, capacities, 14);
      expect(bottlenecks.filter(b => b.type === 'queue')).toHaveLength(0);
    });

    it('should sort by severity and probability', async () => {
      const capacities = [
        createTestCapacity({
          id: 'wc-critical',
          name: 'Critical WC',
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
            availableHours: 8, scheduledHours: 10, remainingHours: 0,
            utilization: 125, scheduledWorkOrders: [], isHoliday: false, maintenanceHours: 0,
          })),
        }),
        createTestCapacity({
          id: 'wc-high',
          name: 'High WC',
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
            availableHours: 8, scheduledHours: 7.5, remainingHours: 0.5,
            utilization: 95, scheduledWorkOrders: [], isHoliday: false, maintenanceHours: 0,
          })),
        }),
      ];
      const bottlenecks = await analyzer.predictBottlenecks([], capacities, 14);
      if (bottlenecks.length >= 2) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        expect(severityOrder[bottlenecks[0].severity]).toBeLessThanOrEqual(
          severityOrder[bottlenecks[1].severity]
        );
      }
    });

    it('should handle ScheduleResult as input', async () => {
      const result = createTestScheduleResult();
      const capacities = [createTestCapacity()];
      const bottlenecks = await analyzer.predictBottlenecks(result as any, capacities, 14);
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should handle empty inputs', async () => {
      const bottlenecks = await analyzer.predictBottlenecks([], [], 14);
      expect(Array.isArray(bottlenecks)).toBe(true);
    });
  });

  describe('suggestImprovements', () => {
    it('should always include setup reduction suggestion', async () => {
      const schedule = createTestScheduleResult();
      const suggestions = await analyzer.suggestImprovements(schedule);
      expect(suggestions.some(s => s.category === 'setup_reduction')).toBe(true);
    });

    it('should suggest utilization improvement when low', async () => {
      const schedule = createTestScheduleResult({
        metrics: {
          currentOnTimeDelivery: 90,
          projectedOnTimeDelivery: 90,
          currentCapacityUtilization: 50,
          projectedCapacityUtilization: 50,
          currentSetupTime: 10,
          projectedSetupTime: 10,
          makespan: 14,
          conflictCount: 0,
          unscheduledCount: 0,
        },
      });
      const suggestions = await analyzer.suggestImprovements(schedule);
      expect(suggestions.some(s => s.category === 'capacity_optimization')).toBe(true);
    });

    it('should suggest workload balance when variance is high', async () => {
      const schedule = createTestScheduleResult();
      const capacities = [
        createTestCapacity({
          id: 'wc-1',
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
            availableHours: 8, scheduledHours: 8, remainingHours: 0,
            utilization: 100, scheduledWorkOrders: [], isHoliday: false, maintenanceHours: 0,
          })),
        }),
        createTestCapacity({
          id: 'wc-2',
          name: 'WC 2',
          dailyCapacity: Array.from({ length: 5 }, (_, i) => ({
            date: new Date(Date.now() + i * 86400000),
            availableHours: 8, scheduledHours: 1, remainingHours: 7,
            utilization: 12.5, scheduledWorkOrders: [], isHoliday: false, maintenanceHours: 0,
          })),
        }),
      ];
      const suggestions = await analyzer.suggestImprovements(schedule, [], capacities);
      expect(suggestions.some(s => s.category === 'workload_balance')).toBe(true);
    });

    it('should sort suggestions by priority', async () => {
      const schedule = createTestScheduleResult();
      const suggestions = await analyzer.suggestImprovements(schedule);
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i].priority).toBeGreaterThanOrEqual(suggestions[i - 1].priority);
      }
    });

    it('should include expected benefit for each suggestion', async () => {
      const schedule = createTestScheduleResult();
      const suggestions = await analyzer.suggestImprovements(schedule);
      for (const s of suggestions) {
        expect(s.expectedBenefit).toBeDefined();
        expect(s.expectedBenefit.metric).toBeDefined();
      }
    });
  });

  describe('handleDisruption', () => {
    it('should handle machine breakdown', async () => {
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'Work Center 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 4,
        description: 'Machine is down',
      };
      const workOrders = [
        createTestWorkOrder({ workCenterId: 'wc-1' }),
      ];
      const capacities = [createTestCapacity()];

      const response = await analyzer.handleDisruption(disruption, workOrders, capacities);
      expect(response.disruption).toBeDefined();
      expect(response.impact).toBeDefined();
      expect(response.rescheduleOptions.length).toBeGreaterThan(0);
      expect(response.explanation).toBeDefined();
    });

    it('should calculate impact on affected work orders', async () => {
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'WC 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 8,
        description: 'Down',
      };
      const workOrders = [
        createTestWorkOrder({ workCenterId: 'wc-1', plannedEnd: new Date() }),
        createTestWorkOrder({ id: 'wo-2', woNumber: 'WO-002', workCenterId: 'wc-1', plannedEnd: new Date() }),
      ];
      const capacities = [createTestCapacity()];

      const response = await analyzer.handleDisruption(disruption, workOrders, capacities);
      expect(response.impact.affectedWorkOrders.length).toBe(2);
      expect(response.impact.totalDelayHours).toBeGreaterThan(0);
    });

    it('should provide reassign option when alternative machines exist', async () => {
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'WC 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 4,
        description: 'Down',
      };
      const capacities = [
        createTestCapacity({ id: 'wc-1' }),
        createTestCapacity({ id: 'wc-2', name: 'WC 2' }),
      ];

      const response = await analyzer.handleDisruption(disruption, [], capacities);
      expect(response.rescheduleOptions.some(o => o.id === 'option-reassign')).toBe(true);
    });

    it('should provide outsource option for critical orders at risk', async () => {
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'WC 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 16,
        description: 'Major breakdown',
      };
      const workOrders = [
        createTestWorkOrder({ workCenterId: 'wc-1', priority: 'critical', plannedEnd: new Date() }),
      ];

      const response = await analyzer.handleDisruption(disruption, workOrders, []);
      expect(response.impact.criticalOrdersAtRisk).toBeGreaterThan(0);
      expect(response.rescheduleOptions.some(o => o.id === 'option-outsource')).toBe(true);
    });

    it('should sort options by score descending', async () => {
      const disruption: DisruptionEvent = {
        type: 'machine_breakdown',
        affectedEntity: 'WC 1',
        affectedEntityId: 'wc-1',
        startTime: new Date(),
        estimatedDuration: 4,
        description: 'Down',
      };
      const capacities = [
        createTestCapacity({ id: 'wc-1' }),
        createTestCapacity({ id: 'wc-2', name: 'WC 2' }),
      ];
      const response = await analyzer.handleDisruption(disruption, [], capacities);
      for (let i = 1; i < response.rescheduleOptions.length; i++) {
        expect(response.rescheduleOptions[i].score).toBeLessThanOrEqual(
          response.rescheduleOptions[i - 1].score
        );
      }
    });

    it('should handle ScheduleResult as first argument', async () => {
      const schedule = createTestScheduleResult();
      const disruption: DisruptionEvent = {
        type: 'material_delay',
        affectedEntity: 'Part A',
        affectedEntityId: 'part-1',
        startTime: new Date(),
        estimatedDuration: 24,
        description: 'Delayed',
      };
      const response = await analyzer.handleDisruption(schedule, disruption as unknown as Record<string, unknown>);
      expect(response).toBeDefined();
    });
  });

  describe('compareSchedules', () => {
    it('should compare two schedules', async () => {
      const s1 = createTestScheduleResult({ id: 's1', algorithm: 'priority_first' });
      const s2 = createTestScheduleResult({ id: 's2', algorithm: 'balanced_load' });
      const comparison = await analyzer.compareSchedules([s1, s2]);
      expect(comparison.scheduleA).toBeDefined();
      expect(comparison.scheduleB).toBeDefined();
      expect(comparison.differences).toBeDefined();
      expect(comparison.recommendation).toBeDefined();
    });

    it('should identify preferred schedule', async () => {
      const good = createTestScheduleResult({
        id: 'good',
        metrics: {
          currentOnTimeDelivery: 95, projectedOnTimeDelivery: 98,
          currentCapacityUtilization: 85, projectedCapacityUtilization: 85,
          currentSetupTime: 5, projectedSetupTime: 5,
          makespan: 10, conflictCount: 0, unscheduledCount: 0,
        },
      });
      const poor = createTestScheduleResult({
        id: 'poor',
        metrics: {
          currentOnTimeDelivery: 60, projectedOnTimeDelivery: 70,
          currentCapacityUtilization: 60, projectedCapacityUtilization: 60,
          currentSetupTime: 15, projectedSetupTime: 15,
          makespan: 25, conflictCount: 5, unscheduledCount: 3,
        },
      });
      const comparison = await analyzer.compareSchedules([good, poor]);
      expect(['A', 'B']).toContain(comparison.recommendation.preferredSchedule);
    });

    it('should throw error for single schedule in array', async () => {
      const s = createTestScheduleResult();
      await expect(analyzer.compareSchedules([s])).rejects.toThrow('At least 2 schedules required');
    });

    it('should support two-argument form', async () => {
      const s1 = createTestScheduleResult({ id: 's1' });
      const s2 = createTestScheduleResult({ id: 's2' });
      const comparison = await analyzer.compareSchedules(s1, s2);
      expect(comparison).toBeDefined();
    });

    it('should assign significance based on percent change', async () => {
      const s1 = createTestScheduleResult({
        id: 's1',
        metrics: {
          currentOnTimeDelivery: 90, projectedOnTimeDelivery: 90,
          currentCapacityUtilization: 90, projectedCapacityUtilization: 90,
          currentSetupTime: 10, projectedSetupTime: 10,
          makespan: 10, conflictCount: 0, unscheduledCount: 0,
        },
      });
      const s2 = createTestScheduleResult({
        id: 's2',
        metrics: {
          currentOnTimeDelivery: 50, projectedOnTimeDelivery: 50,
          currentCapacityUtilization: 50, projectedCapacityUtilization: 50,
          currentSetupTime: 10, projectedSetupTime: 10,
          makespan: 20, conflictCount: 10, unscheduledCount: 5,
        },
      });
      const comparison = await analyzer.compareSchedules([s1, s2]);
      expect(comparison.differences.some(d => d.significance === 'high')).toBe(true);
    });

    it('should handle tie when values are equal', async () => {
      const s1 = createTestScheduleResult({ id: 's1' });
      const s2 = createTestScheduleResult({ id: 's2' });
      const comparison = await analyzer.compareSchedules([s1, s2]);
      expect(comparison.differences.some(d => d.winner === 'tie')).toBe(true);
    });
  });

  describe('generateScheduleReport', () => {
    it('should generate report with all sections', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);
      expect(report.title).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.sections).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.appendix).toBeDefined();
    });

    it('should include work order list in appendix', async () => {
      const schedule = createTestScheduleResult();
      const workOrders = [createTestWorkOrder()];
      const report = await analyzer.generateScheduleReport(schedule, workOrders);
      expect(report.appendix.workOrderList.length).toBe(1);
    });

    it('should include conflict details in appendix', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);
      expect(report.appendix.conflictDetails.length).toBe(1);
    });

    it('should include capacity details in appendix', async () => {
      const schedule = createTestScheduleResult();
      const capacities = [createTestCapacity()];
      const report = await analyzer.generateScheduleReport(schedule, [], capacities);
      expect(report.appendix.capacityDetails.length).toBe(1);
    });

    it('should calculate summary stats correctly', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);
      expect(report.summary.onTimePercentage).toBe(90);
      expect(report.summary.utilizationPercentage).toBe(75);
      expect(report.summary.conflictCount).toBe(1);
    });
  });

  describe('Vietnamese language output', () => {
    it('should use Vietnamese in explanations', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule);
      const vietnamesePattern = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
      const hasVietnamese =
        vietnamesePattern.test(explanation.summary) ||
        explanation.summary.includes('lệnh') ||
        explanation.summary.includes('sản xuất');
      expect(hasVietnamese).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schedule', async () => {
      const schedule = createTestScheduleResult({
        suggestions: [],
        conflicts: [],
        metrics: {
          currentOnTimeDelivery: 100, projectedOnTimeDelivery: 100,
          currentCapacityUtilization: 0, projectedCapacityUtilization: 0,
          currentSetupTime: 0, projectedSetupTime: 0,
          makespan: 0, conflictCount: 0, unscheduledCount: 0,
        },
      });

      const explanation = await analyzer.explainSchedule(schedule);
      expect(explanation).toBeDefined();

      const bottlenecks = await analyzer.predictBottlenecks([], [], 14);
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should handle null/undefined work orders gracefully', async () => {
      const schedule = createTestScheduleResult();
      const explanation = await analyzer.explainSchedule(schedule, undefined, undefined);
      expect(explanation).toBeDefined();
    });
  });
});
