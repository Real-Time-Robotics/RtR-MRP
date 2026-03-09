import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mocks ----
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    mrpSuggestion: { update: vi.fn() },
    part: { findUnique: vi.fn() },
    nCR: { create: vi.fn() },
    supplier: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

const { mockAlertProcessor } = vi.hoisted(() => ({
  mockAlertProcessor: {
    getAlert: vi.fn(),
    getAllAlerts: vi.fn().mockReturnValue([]),
    markAsRead: vi.fn().mockReturnValue(true),
    markAsDismissed: vi.fn().mockReturnValue(true),
    markAsResolved: vi.fn().mockReturnValue(true),
    snoozeAlert: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));
vi.mock('../alert-processor', () => ({
  alertProcessor: mockAlertProcessor,
}));

import { AlertActionExecutor, getAlertActionExecutor } from '../alert-action-executor';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertSource,
  AlertStatus,
  AlertActionType,
} from '../alert-types';

function resetSingleton() {
  (AlertActionExecutor as unknown as { instance: undefined }).instance = undefined;
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    type: AlertType.STOCKOUT,
    priority: AlertPriority.MEDIUM,
    source: AlertSource.FORECAST,
    status: AlertStatus.ACTIVE,
    title: 'Test Alert',
    message: 'Test message',
    entities: [{ type: 'part', id: 'p1', name: 'Part 1' }],
    data: {},
    actions: [
      { id: 'approve-po', label: 'Approve', type: AlertActionType.APPROVE, params: { suggestionId: 'sug1' }, isPrimary: true },
      { id: 'reject-po', label: 'Reject', type: AlertActionType.REJECT, params: { suggestionId: 'sug1' } },
      { id: 'nav', label: 'View', type: AlertActionType.NAVIGATE, url: '/test' },
      { id: 'view', label: 'Details', type: AlertActionType.VIEW_DETAILS },
      { id: 'apply', label: 'Apply', type: AlertActionType.APPLY, params: { workOrderId: 'wo1' } },
      { id: 'create', label: 'Create', type: AlertActionType.CREATE, handler: 'createNCR', params: { partId: 'p1' } },
      { id: 'contact', label: 'Contact', type: AlertActionType.CONTACT, params: { supplierId: 's1' } },
      { id: 'snooze', label: 'Snooze', type: AlertActionType.SNOOZE },
      { id: 'dismiss', label: 'Dismiss', type: AlertActionType.DISMISS },
    ],
    createdAt: new Date(),
    isEscalated: false,
    ...overrides,
  };
}

describe('AlertActionExecutor', () => {
  let executor: AlertActionExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSingleton();
    executor = AlertActionExecutor.getInstance();
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    it('returns same instance', () => {
      expect(AlertActionExecutor.getInstance()).toBe(executor);
    });

    it('getAlertActionExecutor returns singleton', () => {
      expect(getAlertActionExecutor()).toBe(executor);
    });
  });

  // =========================================================================
  // executeAction - alert/action not found
  // =========================================================================

  describe('executeAction - not found cases', () => {
    it('returns error if alert not found', async () => {
      mockAlertProcessor.getAlert.mockReturnValue(undefined);
      const result = await executor.executeAction('x', 'y', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ALERT_NOT_FOUND');
    });

    it('returns error if action not found', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      const result = await executor.executeAction('alert-1', 'nonexistent', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ACTION_NOT_FOUND');
    });
  });

  // =========================================================================
  // APPROVE action
  // =========================================================================

  describe('executeAction - APPROVE', () => {
    it('approves PO suggestion', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockAlertProcessor.getAllAlerts.mockReturnValue([alert]);
      mockPrisma.mrpSuggestion.update.mockResolvedValue({
        id: 'sug1',
        part: { partNumber: 'PN-001' },
        suggestedQty: 100,
      });

      const result = await executor.executeAction('alert-1', 'approve-po', 'user1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('PN-001');
    });

    it('handles approve with no valid target', async () => {
      const alert = makeAlert({
        actions: [{ id: 'approve', label: 'Approve', type: AlertActionType.APPROVE, params: {} }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'approve', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_APPROVAL_TARGET');
    });

    it('handles approve with scheduleId', async () => {
      const alert = makeAlert({
        actions: [{ id: 'approve', label: 'Approve', type: AlertActionType.APPROVE, params: { scheduleId: 'sch1' } }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockAlertProcessor.getAllAlerts.mockReturnValue([]);

      const result = await executor.executeAction('alert-1', 'approve', 'user1');
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // REJECT action
  // =========================================================================

  describe('executeAction - REJECT', () => {
    it('rejects PO suggestion', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockAlertProcessor.getAllAlerts.mockReturnValue([alert]);
      mockPrisma.mrpSuggestion.update.mockResolvedValue({
        id: 'sug1',
        part: { partNumber: 'PN-001' },
      });

      const result = await executor.executeAction('alert-1', 'reject-po', 'user1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('rejected');
    });

    it('handles reject with no valid target', async () => {
      const alert = makeAlert({
        actions: [{ id: 'reject', label: 'Reject', type: AlertActionType.REJECT, params: {} }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'reject', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_REJECTION_TARGET');
    });
  });

  // =========================================================================
  // APPLY action
  // =========================================================================

  describe('executeAction - APPLY', () => {
    it('applies schedule with workOrderId', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockAlertProcessor.getAllAlerts.mockReturnValue([]);

      const result = await executor.executeAction('alert-1', 'apply', 'user1');
      expect(result.success).toBe(true);
    });

    it('handles apply with no valid target', async () => {
      const alert = makeAlert({
        actions: [{ id: 'apply', label: 'Apply', type: AlertActionType.APPLY, params: {} }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'apply', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_APPLY_TARGET');
    });
  });

  // =========================================================================
  // CREATE action
  // =========================================================================

  describe('executeAction - CREATE', () => {
    it('creates NCR successfully', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'PN-001' });
      mockPrisma.nCR.create.mockResolvedValue({ id: 'ncr1', ncrNumber: 'NCR-123' });

      const result = await executor.executeAction('alert-1', 'create', 'user1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('NCR');
    });

    it('returns error if part not found', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await executor.executeAction('alert-1', 'create', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('PART_NOT_FOUND');
    });

    it('handles create with no handler', async () => {
      const alert = makeAlert({
        actions: [{ id: 'create', label: 'Create', type: AlertActionType.CREATE, params: {} }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'create', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CREATE_HANDLER');
    });
  });

  // =========================================================================
  // CONTACT action
  // =========================================================================

  describe('executeAction - CONTACT', () => {
    it('logs contact with supplier', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockPrisma.supplier.findUnique.mockResolvedValue({
        id: 's1',
        name: 'Supplier 1',
        contactEmail: 'test@test.com',
        contactPhone: '123',
      });

      const result = await executor.executeAction('alert-1', 'contact', 'user1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Supplier 1');
    });

    it('returns error if supplier not found', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockPrisma.supplier.findUnique.mockResolvedValue(null);

      const result = await executor.executeAction('alert-1', 'contact', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('SUPPLIER_NOT_FOUND');
    });

    it('handles contact with no supplierId', async () => {
      const alert = makeAlert({
        actions: [{ id: 'contact', label: 'Contact', type: AlertActionType.CONTACT, params: {} }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'contact', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_CONTACT_TARGET');
    });
  });

  // =========================================================================
  // SNOOZE action
  // =========================================================================

  describe('executeAction - SNOOZE', () => {
    it('snoozes alert for 4 hours', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'snooze', 'user1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('4 hours');
      expect(mockAlertProcessor.snoozeAlert).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // DISMISS action
  // =========================================================================

  describe('executeAction - DISMISS', () => {
    it('dismisses alert', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'dismiss', 'user1');
      expect(result.success).toBe(true);
      expect(mockAlertProcessor.markAsDismissed).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // NAVIGATE / VIEW_DETAILS
  // =========================================================================

  describe('executeAction - NAVIGATE / VIEW_DETAILS', () => {
    it('returns navigation result for NAVIGATE', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'nav', 'user1');
      expect(result.success).toBe(true);
      expect(result.resultData?.url).toBe('/test');
    });

    it('returns navigation result for VIEW_DETAILS', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'view', 'user1');
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Unknown action type
  // =========================================================================

  describe('executeAction - unknown type', () => {
    it('returns error for unknown action type', async () => {
      const alert = makeAlert({
        actions: [{ id: 'weird', label: 'Weird', type: 'WEIRD' as AlertActionType }],
      });
      mockAlertProcessor.getAlert.mockReturnValue(alert);

      const result = await executor.executeAction('alert-1', 'weird', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNKNOWN_ACTION_TYPE');
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('catches and returns errors from action handler', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockPrisma.mrpSuggestion.update.mockRejectedValue(new Error('DB fail'));

      const result = await executor.executeAction('alert-1', 'approve-po', 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('DB fail');
    });

    it('handles audit log errors gracefully', async () => {
      const alert = makeAlert();
      mockAlertProcessor.getAlert.mockReturnValue(alert);
      mockAlertProcessor.getAllAlerts.mockReturnValue([alert]);
      mockPrisma.mrpSuggestion.update.mockResolvedValue({
        id: 'sug1',
        part: { partNumber: 'PN-001' },
        suggestedQty: 100,
      });
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Log fail'));

      // Should not throw
      const result = await executor.executeAction('alert-1', 'approve-po', 'user1');
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Specific action methods
  // =========================================================================

  describe('approvePO', () => {
    it('handles DB error', async () => {
      mockPrisma.mrpSuggestion.update.mockRejectedValue(new Error('fail'));
      const result = await executor.approvePO('sug1', 'user1');
      expect(result.success).toBe(false);
    });
  });

  describe('rejectPO', () => {
    it('handles DB error', async () => {
      mockPrisma.mrpSuggestion.update.mockRejectedValue(new Error('fail'));
      const result = await executor.rejectPO('sug1', 'user1');
      expect(result.success).toBe(false);
    });
  });

  describe('applySchedule', () => {
    it('resolves related alert', async () => {
      const alert = makeAlert({ data: { workOrderId: 'wo1' } as any });
      mockAlertProcessor.getAllAlerts.mockReturnValue([alert]);

      const result = await executor.applySchedule('wo1', 'user1');
      expect(result.success).toBe(true);
      expect(mockAlertProcessor.markAsResolved).toHaveBeenCalledWith('alert-1');
    });

    it('handles error', async () => {
      mockAlertProcessor.getAllAlerts.mockImplementation(() => { throw new Error('fail'); });
      const result = await executor.applySchedule('wo1', 'user1');
      expect(result.success).toBe(false);
    });
  });

  describe('createNCR', () => {
    it('handles DB error on NCR creation', async () => {
      const alert = makeAlert();
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'PN-001' });
      mockPrisma.nCR.create.mockRejectedValue(new Error('NCR fail'));

      const result = await executor.createNCR('p1', 'user1', alert);
      expect(result.success).toBe(false);
    });
  });

  describe('contactSupplier', () => {
    it('handles DB error on audit log', async () => {
      const alert = makeAlert();
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's1', name: 'S1', contactEmail: 'e', contactPhone: 'p' });
      mockPrisma.auditLog.create.mockRejectedValue(new Error('fail'));

      const result = await executor.contactSupplier('s1', undefined, 'user1', alert);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Bulk actions
  // =========================================================================

  describe('bulkDismiss', () => {
    it('dismisses multiple alerts', async () => {
      mockAlertProcessor.markAsDismissed.mockReturnValue(true);
      const result = await executor.bulkDismiss(['a1', 'a2'], 'user1');
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('counts failures', async () => {
      mockAlertProcessor.markAsDismissed.mockReturnValueOnce(true).mockReturnValueOnce(false);
      const result = await executor.bulkDismiss(['a1', 'a2'], 'user1');
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('bulkSnooze', () => {
    it('snoozes multiple alerts', async () => {
      mockAlertProcessor.snoozeAlert.mockReturnValue(true);
      const result = await executor.bulkSnooze(['a1', 'a2'], 4, 'user1');
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockAlertProcessor.snoozeAlert).toHaveBeenCalledWith('a1', 4 * 60 * 60 * 1000);
    });

    it('counts failures', async () => {
      mockAlertProcessor.snoozeAlert.mockReturnValueOnce(true).mockReturnValueOnce(false);
      const result = await executor.bulkSnooze(['a1', 'a2'], 4, 'user1');
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
