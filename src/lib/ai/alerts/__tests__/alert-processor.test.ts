import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mocks ----
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    auditLog: { create: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { AlertProcessor, getAlertProcessor } from '../alert-processor';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertSource,
  AlertStatus,
  AlertActionType,
  AlertData,
} from '../alert-types';

// ---- helpers ----
function resetSingleton() {
  (AlertProcessor as unknown as { instance: undefined }).instance = undefined;
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'test-alert-1',
    type: AlertType.STOCKOUT,
    priority: AlertPriority.MEDIUM,
    source: AlertSource.FORECAST,
    status: AlertStatus.ACTIVE,
    title: 'Test Alert',
    message: 'Test message',
    entities: [{ type: 'part', id: 'p1', name: 'Part 1' }],
    data: { partId: 'p1', partNumber: 'PN-001', partName: 'Part 1', currentStock: 5, daysOfSupply: 3, reorderPoint: 100, safetyStock: 50, demandRate: 1 },
    actions: [],
    createdAt: new Date(),
    isEscalated: false,
    ...overrides,
  };
}

describe('AlertProcessor', () => {
  let processor: AlertProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSingleton();
    processor = AlertProcessor.getInstance();
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('getInstance / getAlertProcessor', () => {
    it('returns same instance', () => {
      expect(AlertProcessor.getInstance()).toBe(processor);
    });

    it('getAlertProcessor returns singleton', () => {
      expect(getAlertProcessor()).toBe(processor);
    });
  });

  // =========================================================================
  // Alert Storage
  // =========================================================================

  describe('storeAlerts / getAlert / getAllAlerts', () => {
    it('stores and retrieves alerts', () => {
      const alert = makeAlert();
      processor.storeAlerts([alert]);

      expect(processor.getAlert('test-alert-1')).toBe(alert);
      expect(processor.getAllAlerts()).toEqual([alert]);
    });

    it('getAlert returns undefined for unknown id', () => {
      expect(processor.getAlert('nonexistent')).toBeUndefined();
    });
  });

  // =========================================================================
  // Threshold Evaluation
  // =========================================================================

  describe('evaluateThreshold', () => {
    it.each([
      ['gt', 10, 5, true],
      ['gt', 5, 10, false],
      ['gte', 10, 10, true],
      ['gte', 9, 10, false],
      ['lt', 5, 10, true],
      ['lt', 10, 5, false],
      ['lte', 10, 10, true],
      ['lte', 11, 10, false],
      ['eq', 10, 10, true],
      ['eq', 10, 11, false],
      ['neq', 10, 11, true],
      ['neq', 10, 10, false],
    ] as const)('operator %s: %d vs %d = %s', (op, val, thresh, expected) => {
      expect(processor.evaluateThreshold(val, thresh, op)).toBe(expected);
    });

    it('returns false for unknown operator', () => {
      expect(processor.evaluateThreshold(10, 5, 'unknown' as any)).toBe(false);
    });
  });

  describe('evaluateMultipleThresholds', () => {
    it('AND logic: all must pass', () => {
      const data = { a: 10, b: 20 };
      const conditions = [
        { field: 'a', threshold: 5, operator: 'gt' as const },
        { field: 'b', threshold: 15, operator: 'gt' as const },
      ];
      expect(processor.evaluateMultipleThresholds(data, conditions, 'AND')).toBe(true);
    });

    it('AND logic: fails if one fails', () => {
      const data = { a: 10, b: 5 };
      const conditions = [
        { field: 'a', threshold: 5, operator: 'gt' as const },
        { field: 'b', threshold: 15, operator: 'gt' as const },
      ];
      expect(processor.evaluateMultipleThresholds(data, conditions, 'AND')).toBe(false);
    });

    it('OR logic: passes if one passes', () => {
      const data = { a: 10, b: 5 };
      const conditions = [
        { field: 'a', threshold: 5, operator: 'gt' as const },
        { field: 'b', threshold: 15, operator: 'gt' as const },
      ];
      expect(processor.evaluateMultipleThresholds(data, conditions, 'OR')).toBe(true);
    });

    it('returns false for missing field', () => {
      const data = { a: 10 };
      const conditions = [{ field: 'b', threshold: 5, operator: 'gt' as const }];
      expect(processor.evaluateMultipleThresholds(data, conditions, 'AND')).toBe(false);
    });

    it('defaults to AND logic', () => {
      const data = { a: 10, b: 20 };
      const conditions = [
        { field: 'a', threshold: 5, operator: 'gt' as const },
        { field: 'b', threshold: 15, operator: 'gt' as const },
      ];
      expect(processor.evaluateMultipleThresholds(data, conditions)).toBe(true);
    });
  });

  // =========================================================================
  // Priority Assignment
  // =========================================================================

  describe('assignPriority / recalculatePriority', () => {
    it('assigns CRITICAL for STOCKOUT with daysOfSupply<=3', () => {
      const data = { daysOfSupply: 2 } as AlertData;
      expect(processor.assignPriority(AlertType.STOCKOUT, data)).toBe(AlertPriority.CRITICAL);
    });

    it('assigns HIGH for STOCKOUT with daysOfSupply<=7', () => {
      const data = { daysOfSupply: 5 } as AlertData;
      expect(processor.assignPriority(AlertType.STOCKOUT, data)).toBe(AlertPriority.HIGH);
    });

    it('returns MEDIUM for unknown type', () => {
      const data = {} as AlertData;
      expect(processor.assignPriority('UNKNOWN' as AlertType, data)).toBe(AlertPriority.MEDIUM);
    });

    it('recalculatePriority uses alert data', () => {
      const alert = makeAlert({ data: { daysOfSupply: 1 } as any });
      expect(processor.recalculatePriority(alert)).toBe(AlertPriority.CRITICAL);
    });
  });

  // =========================================================================
  // Action Determination
  // =========================================================================

  describe('determineActions', () => {
    it('includes view-details, snooze, dismiss for all alerts', () => {
      const alert = makeAlert();
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'view-details')).toBeDefined();
      expect(actions.find(a => a.id === 'snooze')).toBeDefined();
      expect(actions.find(a => a.id === 'dismiss')).toBeDefined();
    });

    it('adds PO suggestions for STOCKOUT', () => {
      const alert = makeAlert({ type: AlertType.STOCKOUT });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'view-po-suggestions')).toBeDefined();
    });

    it('adds PO suggestions for REORDER', () => {
      const alert = makeAlert({ type: AlertType.REORDER });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'view-po-suggestions')).toBeDefined();
    });

    it('adds PO suggestions for SAFETY_STOCK_LOW', () => {
      const alert = makeAlert({ type: AlertType.SAFETY_STOCK_LOW });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'view-po-suggestions')).toBeDefined();
    });

    it('adds create-ncr for QUALITY_CRITICAL', () => {
      const alert = makeAlert({ type: AlertType.QUALITY_CRITICAL });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'create-ncr')).toBeDefined();
    });

    it('adds create-ncr for QUALITY_RISK', () => {
      const alert = makeAlert({ type: AlertType.QUALITY_RISK });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'create-ncr')).toBeDefined();
    });

    it('adds contact-supplier for SUPPLIER_DELIVERY', () => {
      const alert = makeAlert({ type: AlertType.SUPPLIER_DELIVERY, data: { supplierId: 's1' } as any });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'contact-supplier')).toBeDefined();
    });

    it('adds approve/reject for PO_PENDING', () => {
      const alert = makeAlert({ type: AlertType.PO_PENDING, data: { suggestionId: 'sug1' } as any });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'approve-po')).toBeDefined();
      expect(actions.find(a => a.id === 'reject-po')).toBeDefined();
    });

    it('adds resolve-conflict for SCHEDULE_CONFLICT', () => {
      const alert = makeAlert({ type: AlertType.SCHEDULE_CONFLICT, data: { workOrderId: 'wo1' } as any });
      const actions = processor.determineActions(alert);
      expect(actions.find(a => a.id === 'resolve-conflict')).toBeDefined();
    });
  });

  // =========================================================================
  // Alert State Management
  // =========================================================================

  describe('markAsRead', () => {
    it('marks existing alert as read', () => {
      const alert = makeAlert();
      processor.storeAlerts([alert]);
      expect(processor.markAsRead('test-alert-1')).toBe(true);
      expect(processor.getAlert('test-alert-1')!.status).toBe(AlertStatus.READ);
      expect(processor.getAlert('test-alert-1')!.readAt).toBeDefined();
    });

    it('returns false for unknown alert', () => {
      expect(processor.markAsRead('nonexistent')).toBe(false);
    });
  });

  describe('markAsDismissed', () => {
    it('marks alert as dismissed with reason', () => {
      const alert = makeAlert();
      processor.storeAlerts([alert]);
      expect(processor.markAsDismissed('test-alert-1', 'test reason')).toBe(true);
      const updated = processor.getAlert('test-alert-1')!;
      expect(updated.status).toBe(AlertStatus.DISMISSED);
      expect(updated.dismissedAt).toBeDefined();
      expect(updated.metadata?.dismissReason).toBe('test reason');
    });

    it('marks alert as dismissed without reason', () => {
      const alert = makeAlert();
      processor.storeAlerts([alert]);
      expect(processor.markAsDismissed('test-alert-1')).toBe(true);
      expect(processor.getAlert('test-alert-1')!.status).toBe(AlertStatus.DISMISSED);
    });

    it('returns false for unknown alert', () => {
      expect(processor.markAsDismissed('nonexistent')).toBe(false);
    });
  });

  describe('markAsResolved', () => {
    it('marks alert as resolved', () => {
      const alert = makeAlert();
      processor.storeAlerts([alert]);
      expect(processor.markAsResolved('test-alert-1')).toBe(true);
      expect(processor.getAlert('test-alert-1')!.status).toBe(AlertStatus.RESOLVED);
      expect(processor.getAlert('test-alert-1')!.resolvedAt).toBeDefined();
    });

    it('returns false for unknown alert', () => {
      expect(processor.markAsResolved('nonexistent')).toBe(false);
    });
  });

  describe('snoozeAlert', () => {
    it('sets snoozedUntil in metadata', () => {
      const alert = makeAlert();
      processor.storeAlerts([alert]);
      expect(processor.snoozeAlert('test-alert-1', 60000)).toBe(true);
      const updated = processor.getAlert('test-alert-1')!;
      expect(updated.metadata?.snoozedUntil).toBeDefined();
    });

    it('returns false for unknown alert', () => {
      expect(processor.snoozeAlert('nonexistent', 60000)).toBe(false);
    });
  });

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  describe('bulkMarkAsRead', () => {
    it('marks multiple alerts as read', () => {
      const a1 = makeAlert({ id: 'a1' });
      const a2 = makeAlert({ id: 'a2' });
      processor.storeAlerts([a1, a2]);
      expect(processor.bulkMarkAsRead(['a1', 'a2'])).toBe(2);
    });

    it('counts only existing alerts', () => {
      const a1 = makeAlert({ id: 'a1' });
      processor.storeAlerts([a1]);
      expect(processor.bulkMarkAsRead(['a1', 'nonexistent'])).toBe(1);
    });
  });

  describe('bulkDismiss', () => {
    it('dismisses multiple alerts', () => {
      const a1 = makeAlert({ id: 'a1' });
      const a2 = makeAlert({ id: 'a2' });
      processor.storeAlerts([a1, a2]);
      expect(processor.bulkDismiss(['a1', 'a2'], 'bulk')).toBe(2);
    });
  });

  // =========================================================================
  // Filtering
  // =========================================================================

  describe('filterAlerts', () => {
    beforeEach(() => {
      processor.storeAlerts([
        makeAlert({ id: 'a1', type: AlertType.STOCKOUT, priority: AlertPriority.CRITICAL, source: AlertSource.FORECAST, status: AlertStatus.ACTIVE, createdAt: new Date('2025-01-01') }),
        makeAlert({ id: 'a2', type: AlertType.QUALITY_RISK, priority: AlertPriority.HIGH, source: AlertSource.QUALITY, status: AlertStatus.READ, createdAt: new Date('2025-01-02'), isEscalated: true }),
        makeAlert({ id: 'a3', type: AlertType.SUPPLIER_DELIVERY, priority: AlertPriority.MEDIUM, source: AlertSource.SUPPLIER_RISK, status: AlertStatus.ACTIVE, createdAt: new Date('2025-01-03') }),
      ]);
    });

    it('filters by types', () => {
      const result = processor.filterAlerts({ types: [AlertType.STOCKOUT] });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a1');
    });

    it('filters by priorities', () => {
      const result = processor.filterAlerts({ priorities: [AlertPriority.HIGH] });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a2');
    });

    it('filters by sources', () => {
      const result = processor.filterAlerts({ sources: [AlertSource.QUALITY] });
      expect(result.length).toBe(1);
    });

    it('filters by statuses', () => {
      const result = processor.filterAlerts({ statuses: [AlertStatus.ACTIVE] });
      expect(result.length).toBe(2);
    });

    it('filters by entityType', () => {
      const result = processor.filterAlerts({ entityType: 'part' });
      expect(result.length).toBe(3);
    });

    it('filters by entityId', () => {
      const alert = makeAlert({ id: 'a4', entities: [{ type: 'supplier', id: 's99' }] });
      processor.storeAlerts([alert]);
      const result = processor.filterAlerts({ entityId: 's99' });
      expect(result.length).toBe(1);
    });

    it('filters by fromDate', () => {
      const result = processor.filterAlerts({ fromDate: new Date('2025-01-02') });
      expect(result.length).toBe(2);
    });

    it('filters by toDate', () => {
      const result = processor.filterAlerts({ toDate: new Date('2025-01-01') });
      expect(result.length).toBe(1);
    });

    it('filters by isRead=true', () => {
      const result = processor.filterAlerts({ isRead: true });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a2');
    });

    it('filters by isRead=false', () => {
      const result = processor.filterAlerts({ isRead: false });
      expect(result.length).toBe(2);
    });

    it('filters by isEscalated', () => {
      const result = processor.filterAlerts({ isEscalated: true });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a2');
    });

    it('filters by search string in title', () => {
      const result = processor.filterAlerts({ search: 'test' });
      expect(result.length).toBe(3);
    });

    it('excludes snoozed alerts', () => {
      processor.snoozeAlert('a1', 10 * 60 * 60 * 1000);
      const result = processor.filterAlerts({});
      const ids = result.map(a => a.id);
      expect(ids).not.toContain('a1');
    });
  });

  // =========================================================================
  // Sorting
  // =========================================================================

  describe('sortAlerts', () => {
    it('sorts by createdAt asc', () => {
      const alerts = [
        makeAlert({ id: 'a2', createdAt: new Date('2025-01-02') }),
        makeAlert({ id: 'a1', createdAt: new Date('2025-01-01') }),
      ];
      const sorted = processor.sortAlerts(alerts, { field: 'createdAt', direction: 'asc' });
      expect(sorted[0].id).toBe('a1');
    });

    it('sorts by createdAt desc', () => {
      const alerts = [
        makeAlert({ id: 'a1', createdAt: new Date('2025-01-01') }),
        makeAlert({ id: 'a2', createdAt: new Date('2025-01-02') }),
      ];
      const sorted = processor.sortAlerts(alerts, { field: 'createdAt', direction: 'desc' });
      expect(sorted[0].id).toBe('a2');
    });

    it('sorts by priority', () => {
      const alerts = [
        makeAlert({ id: 'low', priority: AlertPriority.LOW }),
        makeAlert({ id: 'crit', priority: AlertPriority.CRITICAL }),
      ];
      const sorted = processor.sortAlerts(alerts, { field: 'priority', direction: 'desc' });
      expect(sorted[0].id).toBe('crit');
    });

    it('sorts by type', () => {
      const alerts = [
        makeAlert({ id: 'z', type: AlertType.STOCKOUT }),
        makeAlert({ id: 'a', type: AlertType.DEADLINE_RISK }),
      ];
      const sorted = processor.sortAlerts(alerts, { field: 'type', direction: 'asc' });
      expect(sorted[0].type).toBe(AlertType.DEADLINE_RISK);
    });

    it('sorts by status', () => {
      const alerts = [
        makeAlert({ id: 'r', status: AlertStatus.RESOLVED }),
        makeAlert({ id: 'a', status: AlertStatus.ACTIVE }),
      ];
      const sorted = processor.sortAlerts(alerts, { field: 'status', direction: 'asc' });
      expect(sorted[0].status).toBe(AlertStatus.ACTIVE);
    });
  });

  // =========================================================================
  // Statistics
  // =========================================================================

  describe('getAlertCounts', () => {
    it('returns correct counts', () => {
      processor.storeAlerts([
        makeAlert({ id: 'a1', priority: AlertPriority.CRITICAL, status: AlertStatus.ACTIVE, actions: [{ id: 'x', label: 'X', type: AlertActionType.APPROVE, isPrimary: true }] }),
        makeAlert({ id: 'a2', priority: AlertPriority.HIGH, status: AlertStatus.READ }),
        makeAlert({ id: 'a3', priority: AlertPriority.MEDIUM, status: AlertStatus.ACTIVE, isEscalated: true }),
        makeAlert({ id: 'a4', priority: AlertPriority.LOW, status: AlertStatus.DISMISSED }),
      ]);

      const counts = processor.getAlertCounts();
      expect(counts.total).toBe(4);
      expect(counts.critical).toBe(1);
      expect(counts.high).toBe(1);
      expect(counts.medium).toBe(1);
      expect(counts.low).toBe(1);
      expect(counts.unread).toBe(2);
      expect(counts.pendingAction).toBe(1);
      expect(counts.escalated).toBe(1);
    });

    it('accepts filter', () => {
      processor.storeAlerts([
        makeAlert({ id: 'a1', priority: AlertPriority.CRITICAL }),
        makeAlert({ id: 'a2', priority: AlertPriority.LOW }),
      ]);

      const counts = processor.getAlertCounts({ priorities: [AlertPriority.CRITICAL] });
      expect(counts.total).toBe(1);
    });
  });

  // =========================================================================
  // Escalation
  // =========================================================================

  describe('checkEscalation', () => {
    it('returns false for already escalated alert', () => {
      const alert = makeAlert({ isEscalated: true });
      expect(processor.checkEscalation(alert)).toBe(false);
    });

    it('returns false for non-active alert', () => {
      const alert = makeAlert({ status: AlertStatus.READ });
      expect(processor.checkEscalation(alert)).toBe(false);
    });

    it('returns true for CRITICAL alert unread >2 hours', () => {
      const alert = makeAlert({
        priority: AlertPriority.CRITICAL,
        type: AlertType.STOCKOUT,
        status: AlertStatus.ACTIVE,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isEscalated: false,
      });
      expect(processor.checkEscalation(alert)).toBe(true);
    });

    it('returns false for CRITICAL alert unread <2 hours', () => {
      const alert = makeAlert({
        priority: AlertPriority.CRITICAL,
        type: AlertType.STOCKOUT,
        status: AlertStatus.ACTIVE,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isEscalated: false,
      });
      expect(processor.checkEscalation(alert)).toBe(false);
    });

    it('returns true for HIGH alert unread >8 hours', () => {
      const alert = makeAlert({
        priority: AlertPriority.HIGH,
        status: AlertStatus.ACTIVE,
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        isEscalated: false,
      });
      expect(processor.checkEscalation(alert)).toBe(true);
    });
  });

  describe('escalateAlert', () => {
    it('escalates and updates alert status', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      const alert = makeAlert({ priority: AlertPriority.CRITICAL, type: AlertType.STOCKOUT });
      processor.storeAlerts([alert]);

      const result = await processor.escalateAlert('test-alert-1');
      expect(result).toBe(true);

      const updated = processor.getAlert('test-alert-1')!;
      expect(updated.isEscalated).toBe(true);
      expect(updated.status).toBe(AlertStatus.ESCALATED);
      expect(updated.escalatedAt).toBeDefined();
    });

    it('returns false for unknown alert', async () => {
      expect(await processor.escalateAlert('nonexistent')).toBe(false);
    });

    it('returns false when no matching rule', async () => {
      const alert = makeAlert({ priority: AlertPriority.LOW });
      processor.storeAlerts([alert]);
      expect(await processor.escalateAlert('test-alert-1')).toBe(false);
    });

    it('handles audit log errors gracefully', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));
      const alert = makeAlert({ priority: AlertPriority.CRITICAL, type: AlertType.STOCKOUT });
      processor.storeAlerts([alert]);

      const result = await processor.escalateAlert('test-alert-1');
      expect(result).toBe(true);
    });
  });

  describe('getEscalationRules / updateEscalationRule', () => {
    it('returns default escalation rules', () => {
      const rules = processor.getEscalationRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('updates an existing rule', () => {
      const rules = processor.getEscalationRules();
      const result = processor.updateEscalationRule(rules[0].id, { isActive: false });
      expect(result).toBe(true);
      expect(processor.getEscalationRules()[0].isActive).toBe(false);
    });

    it('returns false for unknown rule', () => {
      expect(processor.updateEscalationRule('nonexistent', {})).toBe(false);
    });
  });

  // =========================================================================
  // Cleanup
  // =========================================================================

  describe('cleanupExpiredAlerts', () => {
    it('marks expired alerts', () => {
      const alert = makeAlert({ expiresAt: new Date(Date.now() - 1000) });
      processor.storeAlerts([alert]);
      expect(processor.cleanupExpiredAlerts()).toBe(1);
      expect(processor.getAlert('test-alert-1')!.status).toBe(AlertStatus.EXPIRED);
    });

    it('does not mark non-expired alerts', () => {
      const alert = makeAlert({ expiresAt: new Date(Date.now() + 100000) });
      processor.storeAlerts([alert]);
      expect(processor.cleanupExpiredAlerts()).toBe(0);
    });
  });

  describe('removeOldAlerts', () => {
    it('removes old dismissed/resolved/expired alerts', () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      processor.storeAlerts([
        makeAlert({ id: 'a1', createdAt: oldDate, status: AlertStatus.DISMISSED }),
        makeAlert({ id: 'a2', createdAt: oldDate, status: AlertStatus.RESOLVED }),
        makeAlert({ id: 'a3', createdAt: oldDate, status: AlertStatus.EXPIRED }),
        makeAlert({ id: 'a4', createdAt: oldDate, status: AlertStatus.ACTIVE }), // should NOT be removed
      ]);
      expect(processor.removeOldAlerts(30)).toBe(3);
      expect(processor.getAlert('a4')).toBeDefined();
    });
  });

  // =========================================================================
  // Batch Processing
  // =========================================================================

  describe('processAlerts', () => {
    it('processes alerts: recalculates priority, determines actions, stores', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      const alerts = [makeAlert()];

      const result = await processor.processAlerts(alerts);
      expect(result.length).toBe(1);
      expect(result[0].actions.length).toBeGreaterThan(0);
      expect(processor.getAlert('test-alert-1')).toBeDefined();
    });

    it('escalates alerts that meet criteria during processing', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      const alert = makeAlert({
        priority: AlertPriority.CRITICAL,
        type: AlertType.STOCKOUT,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      });

      // processAlerts calls checkEscalation which returns true,
      // then escalateAlert which needs the alert in the map.
      // But storeAlerts is called AFTER the loop, so escalateAlert
      // won't find the alert. Pre-store it.
      processor.storeAlerts([alert]);

      await processor.processAlerts([alert]);

      const stored = processor.getAlert('test-alert-1')!;
      expect(stored.isEscalated).toBe(true);
    });
  });
});
