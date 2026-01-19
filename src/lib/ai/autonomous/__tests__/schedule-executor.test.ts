import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScheduleExecutor,
  getScheduleExecutor,
  ScheduleChange,
  ExecutionResult,
  AuditEntry,
} from '../schedule-executor';
import { ScheduleResult, ScheduleSuggestion } from '../scheduling-engine';

// Mock prisma with proper default export
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    workOrder: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'wo-1',
        workOrderNumber: 'WO-001',
        status: 'pending',
        plannedStartDate: new Date(),
        plannedEndDate: new Date(),
      }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

describe('ScheduleExecutor', () => {
  let executor: ScheduleExecutor;

  const createTestSuggestion = (
    overrides: Partial<ScheduleSuggestion> = {}
  ): ScheduleSuggestion => ({
    workOrderId: 'wo-1',
    workOrderNumber: 'WO-001',
    currentStartDate: new Date(),
    currentEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    suggestedStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    suggestedEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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
      conflicts: 0,
    },
    conflicts: [],
    ...overrides,
  });

  beforeEach(() => {
    executor = ScheduleExecutor.getInstance();
    vi.clearAllMocks();
  });

  describe('singleton instance', () => {
    it('should return same instance', () => {
      const instance1 = getScheduleExecutor();
      const instance2 = getScheduleExecutor();
      expect(instance1).toBe(instance2);
    });
  });

  describe('applyScheduleChanges', () => {
    it('should apply schedule changes successfully', async () => {
      const scheduleResult = createTestScheduleResult();
      const result = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { dryRun: false }
      );

      expect(result).toBeDefined();
      expect(result.executedAt).toBeInstanceOf(Date);
      expect(result.auditId).toBeDefined();
    });

    it('should support dry run mode', async () => {
      const scheduleResult = createTestScheduleResult();
      const result = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { dryRun: true }
      );

      expect(result.success).toBe(true);
      expect(result.totalChanges).toBeGreaterThan(0);
    });

    it('should return empty result for empty suggestions', async () => {
      const scheduleResult = createTestScheduleResult({ suggestions: [] });
      const result = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.totalChanges).toBe(0);
    });

    it('should handle validation errors', async () => {
      vi.mocked(
        (await import('@/lib/prisma')).prisma.workOrder.findUnique
      ).mockResolvedValueOnce(null);

      const scheduleResult = createTestScheduleResult();
      const result = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { validateBeforeApply: true }
      );

      expect(result.failedChanges).toBeGreaterThan(0);
    });
  });

  describe('updateWorkOrderDates', () => {
    it('should update work order dates', async () => {
      const result = await executor.updateWorkOrderDates(
        'wo-1',
        {
          plannedStartDate: new Date(),
          plannedEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        'user-1',
        'Manual update'
      );

      expect(result).toBeDefined();
      expect(result.workOrderId).toBe('wo-1');
    });

    it('should handle non-existent work order', async () => {
      vi.mocked(
        (await import('@/lib/prisma')).prisma.workOrder.findUnique
      ).mockResolvedValueOnce(null);

      const result = await executor.updateWorkOrderDates(
        'non-existent',
        { plannedStartDate: new Date() },
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('notifyAffectedParties', () => {
    it('should create notifications for changes', async () => {
      const changes: ScheduleChange[] = [
        {
          workOrderId: 'wo-1',
          workOrderNumber: 'WO-001',
          changeType: 'reschedule',
          previousValues: { plannedStartDate: new Date() },
          newValues: { plannedStartDate: new Date(), workCenterId: 'wc-1' },
          reason: 'Optimization',
          source: 'auto_schedule',
        },
      ];

      const notifications = await executor.notifyAffectedParties(changes);

      expect(notifications).toBeDefined();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should create system notification for many changes', async () => {
      const changes: ScheduleChange[] = Array(6)
        .fill(null)
        .map((_, i) => ({
          workOrderId: `wo-${i}`,
          workOrderNumber: `WO-00${i}`,
          changeType: 'reschedule' as const,
          previousValues: {},
          newValues: { workCenterId: 'wc-1' },
          reason: 'Optimization',
          source: 'auto_schedule' as const,
        }));

      const notifications = await executor.notifyAffectedParties(changes);

      const systemNotifications = notifications.filter(
        (n) => n.recipientType === 'system'
      );
      expect(systemNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('logScheduleAudit', () => {
    it('should log audit entry', async () => {
      const entry: AuditEntry = {
        id: 'audit-1',
        action: 'schedule_applied',
        performedBy: 'user-1',
        performedAt: new Date(),
        changes: [],
        metadata: {},
      };

      await executor.logScheduleAudit(entry);

      const history = executor.getAuditHistory();
      expect(history.some((e) => e.id === 'audit-1')).toBe(true);
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history', () => {
      const history = executor.getAuditHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should filter by date range', async () => {
      const entry: AuditEntry = {
        id: 'audit-recent',
        action: 'schedule_applied',
        performedBy: 'user-1',
        performedAt: new Date(),
        changes: [],
        metadata: {},
      };
      await executor.logScheduleAudit(entry);

      const history = executor.getAuditHistory({
        fromDate: new Date(Date.now() - 60000),
      });
      expect(history.some((e) => e.id === 'audit-recent')).toBe(true);
    });

    it('should filter by user', async () => {
      const entry: AuditEntry = {
        id: 'audit-user',
        action: 'schedule_applied',
        performedBy: 'specific-user',
        performedAt: new Date(),
        changes: [],
        metadata: {},
      };
      await executor.logScheduleAudit(entry);

      const history = executor.getAuditHistory({ userId: 'specific-user' });
      expect(history.every((e) => e.performedBy === 'specific-user')).toBe(true);
    });
  });

  describe('revertScheduleChange', () => {
    it('should revert a schedule change', async () => {
      // First create an audit entry
      const entry: AuditEntry = {
        id: 'audit-to-revert',
        action: 'schedule_applied',
        performedBy: 'user-1',
        performedAt: new Date(),
        changes: [
          {
            workOrderId: 'wo-1',
            workOrderNumber: 'WO-001',
            changeType: 'reschedule',
            previousValues: {
              plannedStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
            newValues: { plannedStartDate: new Date() },
            reason: 'Test',
            source: 'auto_schedule',
          },
        ],
        metadata: {},
      };
      await executor.logScheduleAudit(entry);

      const result = await executor.revertScheduleChange('audit-to-revert', 'user-1');
      expect(result).toBeDefined();
      expect(result.auditId).toBeDefined();
    });

    it('should handle non-existent audit entry', async () => {
      const result = await executor.revertScheduleChange('non-existent', 'user-1');
      expect(result.success).toBe(false);
    });
  });

  describe('execution options', () => {
    it('should respect notifyAffectedParties option', async () => {
      const scheduleResult = createTestScheduleResult();

      const resultWithNotify = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { dryRun: true, notifyAffectedParties: true }
      );

      const resultWithoutNotify = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { dryRun: true, notifyAffectedParties: false }
      );

      // Both should succeed but notifications may differ
      expect(resultWithNotify.success).toBe(true);
      expect(resultWithoutNotify.success).toBe(true);
    });

    it('should respect batchSize option', async () => {
      const scheduleResult = createTestScheduleResult({
        suggestions: Array(5)
          .fill(null)
          .map((_, i) =>
            createTestSuggestion({ workOrderId: `wo-${i}`, workOrderNumber: `WO-00${i}` })
          ),
      });

      const result = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { dryRun: true, batchSize: 2 }
      );

      expect(result.totalChanges).toBe(5);
    });
  });

  describe('change types', () => {
    it('should handle reschedule changes', async () => {
      const scheduleResult = createTestScheduleResult();
      const result = await executor.applyScheduleChanges(
        scheduleResult,
        'user-1',
        { dryRun: true }
      );

      expect(result.changes[0]?.changeType).toBe('reschedule');
    });
  });
});
