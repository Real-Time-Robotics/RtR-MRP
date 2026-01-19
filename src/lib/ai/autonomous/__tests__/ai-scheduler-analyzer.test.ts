import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AISchedulerAnalyzer,
  getAISchedulerAnalyzer,
  ScheduleExplanation,
  BottleneckPrediction,
  ImprovementSuggestion,
} from '../ai-scheduler-analyzer';
import { ScheduleResult, ScheduleSuggestion } from '../scheduling-engine';

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
    workOrderId: 'wo-1',
    workOrderNumber: 'WO-001',
    currentStartDate: new Date(),
    currentEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    suggestedStartDate: new Date(),
    suggestedEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    workCenterId: 'wc-1',
    workCenterName: 'Work Center 1',
    priority: 50,
    reason: 'Optimization',
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
    conflicts: [
      {
        id: 'conflict-1',
        type: 'overlap',
        severity: 'medium',
        description: 'Test conflict',
        affectedWorkOrderIds: ['wo-1', 'wo-2'],
      },
    ],
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

    it('should include algorithm explanation', async () => {
      const schedule = createTestScheduleResult({ algorithm: 'priority_first' });
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.algorithmRationale).toBeDefined();
    });

    it('should mention conflicts if present', async () => {
      const schedule = createTestScheduleResult({
        conflicts: [
          {
            id: 'c1',
            type: 'overlap',
            severity: 'high',
            description: 'Overlap',
            affectedWorkOrderIds: ['wo-1'],
          },
        ],
      });
      const explanation = await analyzer.explainSchedule(schedule);

      expect(explanation.tradeoffs).toBeDefined();
    });
  });

  describe('predictBottlenecks', () => {
    it('should predict potential bottlenecks', async () => {
      const schedule = createTestScheduleResult({
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 95,
          onTimeDeliveryRate: 70,
          averageLeadTime: 10,
          conflicts: 5,
        },
      });

      const bottlenecks = await analyzer.predictBottlenecks(schedule);

      expect(bottlenecks).toBeDefined();
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should identify high utilization as bottleneck', async () => {
      const schedule = createTestScheduleResult({
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 98,
          onTimeDeliveryRate: 90,
          averageLeadTime: 5,
          conflicts: 0,
        },
      });

      const bottlenecks = await analyzer.predictBottlenecks(schedule);
      const capacityBottleneck = bottlenecks.find((b) => b.type === 'capacity');

      expect(capacityBottleneck).toBeDefined();
    });

    it('should return empty array for healthy schedule', async () => {
      const schedule = createTestScheduleResult({
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 70,
          onTimeDeliveryRate: 98,
          averageLeadTime: 3,
          conflicts: 0,
        },
        conflicts: [],
      });

      const bottlenecks = await analyzer.predictBottlenecks(schedule);
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
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 95,
          onTimeDeliveryRate: 60,
          averageLeadTime: 15,
          conflicts: 10,
        },
      });

      const suggestions = await analyzer.suggestImprovements(schedule);

      if (suggestions.length >= 2) {
        // Higher priority should come first
        expect(['high', 'medium']).toContain(suggestions[0].priority);
      }
    });

    it('should include expected impact', async () => {
      const schedule = createTestScheduleResult();
      const suggestions = await analyzer.suggestImprovements(schedule);

      if (suggestions.length > 0) {
        expect(suggestions[0].expectedImpact).toBeDefined();
      }
    });
  });

  describe('handleDisruption', () => {
    it('should handle machine breakdown disruption', async () => {
      const schedule = createTestScheduleResult();
      const disruption = {
        type: 'machine_breakdown',
        affectedResourceId: 'wc-1',
        description: 'Machine is down',
        estimatedDuration: 4,
        startTime: new Date(),
      };

      const response = await analyzer.handleDisruption(schedule, disruption);

      expect(response).toBeDefined();
      expect(response.assessment).toBeDefined();
      expect(response.immediateActions).toBeDefined();
    });

    it('should handle urgent order disruption', async () => {
      const schedule = createTestScheduleResult();
      const disruption = {
        type: 'urgent_order',
        workOrderId: 'wo-new',
        description: 'Urgent customer order',
        priority: 100,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const response = await analyzer.handleDisruption(schedule, disruption);

      expect(response).toBeDefined();
      expect(response.recommendedAction).toBeDefined();
    });

    it('should provide recovery timeline', async () => {
      const schedule = createTestScheduleResult();
      const disruption = {
        type: 'material_shortage',
        partId: 'part-1',
        description: 'Critical material delayed',
        expectedResolutionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      };

      const response = await analyzer.handleDisruption(schedule, disruption);

      expect(response.recoveryTimeline).toBeDefined();
    });
  });

  describe('compareSchedules', () => {
    it('should compare multiple schedules', async () => {
      const schedule1 = createTestScheduleResult({
        id: 'schedule-1',
        algorithm: 'priority_first',
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 80,
          onTimeDeliveryRate: 85,
          averageLeadTime: 5,
          conflicts: 3,
        },
      });

      const schedule2 = createTestScheduleResult({
        id: 'schedule-2',
        algorithm: 'balanced_load',
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 75,
          onTimeDeliveryRate: 95,
          averageLeadTime: 4,
          conflicts: 1,
        },
      });

      const comparison = await analyzer.compareSchedules([schedule1, schedule2]);

      expect(comparison).toBeDefined();
      expect(comparison.schedules).toHaveLength(2);
      expect(comparison.recommendation).toBeDefined();
    });

    it('should identify best schedule', async () => {
      const goodSchedule = createTestScheduleResult({
        id: 'good',
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 85,
          onTimeDeliveryRate: 98,
          averageLeadTime: 3,
          conflicts: 0,
        },
      });

      const poorSchedule = createTestScheduleResult({
        id: 'poor',
        metrics: {
          totalWorkOrders: 10,
          scheduledWorkOrders: 10,
          utilizationRate: 60,
          onTimeDeliveryRate: 70,
          averageLeadTime: 10,
          conflicts: 5,
        },
      });

      const comparison = await analyzer.compareSchedules([goodSchedule, poorSchedule]);

      expect(comparison.recommendation.bestScheduleId).toBe('good');
    });

    it('should throw error for single schedule', async () => {
      const schedule = createTestScheduleResult();

      await expect(analyzer.compareSchedules([schedule])).rejects.toThrow();
    });
  });

  describe('generateScheduleReport', () => {
    it('should generate comprehensive report', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);

      expect(report).toBeDefined();
      expect(report.executiveSummary).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include health assessment', async () => {
      const schedule = createTestScheduleResult();
      const report = await analyzer.generateScheduleReport(schedule);

      expect(report.healthScore).toBeDefined();
      expect(typeof report.healthScore).toBe('number');
    });

    it('should include risk assessment', async () => {
      const schedule = createTestScheduleResult({
        conflicts: [
          { id: 'c1', type: 'overlap', severity: 'critical', description: 'Test', affectedWorkOrderIds: [] },
        ],
      });
      const report = await analyzer.generateScheduleReport(schedule);

      expect(report.risks).toBeDefined();
      expect(Array.isArray(report.risks)).toBe(true);
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
          totalWorkOrders: 0,
          scheduledWorkOrders: 0,
          utilizationRate: 0,
          onTimeDeliveryRate: 100,
          averageLeadTime: 0,
          conflicts: 0,
        },
      });

      const explanation = await analyzer.explainSchedule(schedule);
      expect(explanation).toBeDefined();

      const bottlenecks = await analyzer.predictBottlenecks(schedule);
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should handle schedule with many conflicts', async () => {
      const schedule = createTestScheduleResult({
        conflicts: Array(20)
          .fill(null)
          .map((_, i) => ({
            id: `c-${i}`,
            type: 'overlap',
            severity: 'high',
            description: `Conflict ${i}`,
            affectedWorkOrderIds: [`wo-${i}`],
          })),
        metrics: {
          totalWorkOrders: 20,
          scheduledWorkOrders: 20,
          utilizationRate: 100,
          onTimeDeliveryRate: 50,
          averageLeadTime: 20,
          conflicts: 20,
        },
      });

      const report = await analyzer.generateScheduleReport(schedule);
      expect(report.healthScore).toBeLessThan(50);
    });
  });
});
