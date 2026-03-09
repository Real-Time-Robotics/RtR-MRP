import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mocks ----
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    notification: { create: vi.fn().mockReturnValue({ catch: vi.fn() }) },
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { NotificationEngine, getNotificationEngine } from '../notification-engine';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertSource,
  AlertStatus,
  AlertDigest,
} from '../alert-types';

function resetSingleton() {
  (NotificationEngine as unknown as { instance: undefined }).instance = undefined;
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
    actions: [],
    createdAt: new Date(),
    isEscalated: false,
    ...overrides,
  };
}

describe('NotificationEngine', () => {
  let engine: NotificationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSingleton();
    engine = NotificationEngine.getInstance();
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    it('returns same instance', () => {
      expect(NotificationEngine.getInstance()).toBe(engine);
    });

    it('getNotificationEngine returns singleton', () => {
      expect(getNotificationEngine()).toBe(engine);
    });
  });

  // =========================================================================
  // User Preferences
  // =========================================================================

  describe('getDefaultPreferences', () => {
    it('returns defaults with userId', () => {
      const prefs = engine.getDefaultPreferences('user1');
      expect(prefs.userId).toBe('user1');
      expect(prefs.inApp.enabled).toBe(true);
      expect(prefs.email.enabled).toBe(true);
      expect(prefs.quietHours?.enabled).toBe(false);
    });
  });

  describe('getUserPreferences', () => {
    it('returns defaults for unknown user', () => {
      const prefs = engine.getUserPreferences('user1');
      expect(prefs.userId).toBe('user1');
    });

    it('returns same prefs on second call', () => {
      const prefs1 = engine.getUserPreferences('user1');
      const prefs2 = engine.getUserPreferences('user1');
      expect(prefs1).toBe(prefs2);
    });
  });

  describe('updateUserPreferences', () => {
    it('merges inApp preferences', () => {
      const updated = engine.updateUserPreferences('user1', {
        inApp: { enabled: false, criticalOnly: true, soundEnabled: false },
      });
      expect(updated.inApp.enabled).toBe(false);
      expect(updated.inApp.criticalOnly).toBe(true);
    });

    it('merges email preferences', () => {
      const updated = engine.updateUserPreferences('user1', {
        email: { enabled: false, frequency: 'never', criticalImmediate: false },
      });
      expect(updated.email.enabled).toBe(false);
      expect(updated.email.frequency).toBe('never');
    });

    it('merges quiet hours', () => {
      const updated = engine.updateUserPreferences('user1', {
        quietHours: { enabled: true, start: '23:00', end: '06:00', exceptCritical: true },
      });
      expect(updated.quietHours?.enabled).toBe(true);
      expect(updated.quietHours?.start).toBe('23:00');
    });
  });

  // =========================================================================
  // Send Notification
  // =========================================================================

  describe('sendNotification', () => {
    it('sends in-app notification by default', async () => {
      const alert = makeAlert();
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });

      const results = await engine.sendNotification(alert, 'user1');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].channel).toBe('inApp');
      expect(results[0].success).toBe(true);
    });

    it('skips duplicate notifications', async () => {
      const alert = makeAlert();
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });

      await engine.sendNotification(alert, 'user1');
      const results2 = await engine.sendNotification(alert, 'user1');
      expect(results2).toEqual([]);
    });

    it('sends immediate email for CRITICAL when criticalImmediate=true', async () => {
      const alert = makeAlert({ priority: AlertPriority.CRITICAL });
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const results = await engine.sendNotification(alert, 'user1');
      const emailResult = results.find(r => r.channel === 'email');
      expect(emailResult).toBeDefined();
      expect(emailResult!.success).toBe(true);
    });

    it('skips notifications when source is disabled', async () => {
      engine.updateUserPreferences('user1', {
        sources: {
          [AlertSource.FORECAST]: { enabled: false, minPriority: AlertPriority.LOW },
        },
      });
      const alert = makeAlert({ source: AlertSource.FORECAST });

      const results = await engine.sendNotification(alert, 'user1');
      expect(results).toEqual([]);
    });

    it('skips notifications below min priority', async () => {
      engine.updateUserPreferences('user1', {
        sources: {
          [AlertSource.FORECAST]: { enabled: true, minPriority: AlertPriority.HIGH },
        },
      });
      const alert = makeAlert({ priority: AlertPriority.LOW, source: AlertSource.FORECAST });

      const results = await engine.sendNotification(alert, 'user1');
      expect(results).toEqual([]);
    });

    it('skips in-app when criticalOnly=true and alert is not critical', async () => {
      engine.updateUserPreferences('user1', {
        inApp: { enabled: true, criticalOnly: true, soundEnabled: false },
      });
      const alert = makeAlert({ priority: AlertPriority.MEDIUM });

      const results = await engine.sendNotification(alert, 'user1');
      // in-app should not be sent
      const inApp = results.find(r => r.channel === 'inApp');
      expect(inApp).toBeUndefined();
    });

    it('allows critical alerts during quiet hours', async () => {
      // Set quiet hours to cover all day
      engine.updateUserPreferences('user1', {
        quietHours: { enabled: true, start: '00:00', end: '23:59', exceptCritical: true },
      });
      const alert = makeAlert({ priority: AlertPriority.CRITICAL });
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const results = await engine.sendNotification(alert, 'user1');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // sendInAppNotification
  // =========================================================================

  describe('sendInAppNotification', () => {
    it('stores notification in memory', async () => {
      const alert = makeAlert();
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });

      const result = await engine.sendInAppNotification(alert, 'user1');
      expect(result.success).toBe(true);
      expect(result.channel).toBe('inApp');

      const notifications = engine.getInAppNotifications('user1');
      expect(notifications.length).toBe(1);
    });

    it('limits to 100 notifications', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });

      for (let i = 0; i < 105; i++) {
        const alert = makeAlert({ id: `alert-${i}` });
        await engine.sendInAppNotification(alert, 'user1');
      }

      const notifications = engine.getInAppNotifications('user1', 200);
      expect(notifications.length).toBe(100);
    });

    it('handles error gracefully', async () => {
      mockPrisma.notification.create.mockImplementation(() => { throw new Error('fail'); });
      const alert = makeAlert();

      const result = await engine.sendInAppNotification(alert, 'user1');
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // sendEmailNotification
  // =========================================================================

  describe('sendEmailNotification', () => {
    it('sends email when user has email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      mockPrisma.auditLog.create.mockResolvedValue({});
      const alert = makeAlert();

      const result = await engine.sendEmailNotification(alert, 'user1');
      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
    });

    it('fails when user has no email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: null, name: 'Test' });
      const alert = makeAlert();

      const result = await engine.sendEmailNotification(alert, 'user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('User email not found');
    });

    it('fails when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const alert = makeAlert();

      const result = await engine.sendEmailNotification(alert, 'user1');
      expect(result.success).toBe(false);
    });

    it('handles error gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB fail'));
      const alert = makeAlert();

      const result = await engine.sendEmailNotification(alert, 'user1');
      expect(result.success).toBe(false);
    });

    it('includes aiSuggestion in email body for alerts with suggestion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      mockPrisma.auditLog.create.mockResolvedValue({});
      const alert = makeAlert({ aiSuggestion: 'Do this thing' });

      const result = await engine.sendEmailNotification(alert, 'user1');
      expect(result.success).toBe(true);
    });

    it('handles each priority emoji', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      for (const priority of [AlertPriority.CRITICAL, AlertPriority.HIGH, AlertPriority.MEDIUM, AlertPriority.LOW]) {
        const alert = makeAlert({ id: `alert-${priority}`, priority });
        const result = await engine.sendEmailNotification(alert, 'user1');
        expect(result.success).toBe(true);
      }
    });
  });

  // =========================================================================
  // In-App Notification Management
  // =========================================================================

  describe('getInAppNotifications', () => {
    it('returns empty for unknown user', () => {
      expect(engine.getInAppNotifications('unknown')).toEqual([]);
    });

    it('respects limit', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      for (let i = 0; i < 5; i++) {
        await engine.sendInAppNotification(makeAlert({ id: `a${i}` }), 'user1');
      }
      expect(engine.getInAppNotifications('user1', 3).length).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('returns 0 for unknown user', () => {
      expect(engine.getUnreadCount('unknown')).toBe(0);
    });

    it('counts unread notifications', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      await engine.sendInAppNotification(makeAlert({ id: 'a1' }), 'user1');
      await engine.sendInAppNotification(makeAlert({ id: 'a2' }), 'user1');
      expect(engine.getUnreadCount('user1')).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      await engine.sendInAppNotification(makeAlert(), 'user1');
      const notifications = engine.getInAppNotifications('user1');
      expect(engine.markAsRead('user1', notifications[0].id)).toBe(true);
      expect(engine.getUnreadCount('user1')).toBe(0);
    });

    it('returns false for unknown user', () => {
      expect(engine.markAsRead('unknown', 'x')).toBe(false);
    });

    it('returns false for unknown notification', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      await engine.sendInAppNotification(makeAlert(), 'user1');
      expect(engine.markAsRead('user1', 'nonexistent')).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all as read and returns count', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      await engine.sendInAppNotification(makeAlert({ id: 'a1' }), 'user1');
      await engine.sendInAppNotification(makeAlert({ id: 'a2' }), 'user1');

      const count = engine.markAllAsRead('user1');
      expect(count).toBe(2);
      expect(engine.getUnreadCount('user1')).toBe(0);
    });

    it('returns 0 for unknown user', () => {
      expect(engine.markAllAsRead('unknown')).toBe(0);
    });

    it('does not double-count already read', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      await engine.sendInAppNotification(makeAlert({ id: 'a1' }), 'user1');
      engine.markAllAsRead('user1');
      expect(engine.markAllAsRead('user1')).toBe(0);
    });
  });

  describe('clearNotifications', () => {
    it('clears all notifications for user', async () => {
      mockPrisma.notification.create.mockReturnValue({ catch: vi.fn() });
      await engine.sendInAppNotification(makeAlert(), 'user1');
      engine.clearNotifications('user1');
      expect(engine.getInAppNotifications('user1')).toEqual([]);
    });
  });

  // =========================================================================
  // Digest
  // =========================================================================

  describe('scheduleDigest / getDigestSchedule', () => {
    it('schedules a digest', () => {
      engine.scheduleDigest('user1', 'daily', '08:00');
      const schedule = engine.getDigestSchedule('user1');
      expect(schedule).toBeDefined();
      expect(schedule!.frequency).toBe('daily');
      expect(schedule!.time).toBe('08:00');
      expect(schedule!.enabled).toBe(true);
    });

    it('returns undefined for unknown user', () => {
      expect(engine.getDigestSchedule('unknown')).toBeUndefined();
    });
  });

  describe('sendDigest', () => {
    it('sends digest email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      engine.scheduleDigest('user1', 'daily');

      const digest: AlertDigest = {
        period: 'daily',
        generatedAt: new Date(),
        summary: 'Test summary',
        criticalCount: 1,
        highCount: 2,
        mediumCount: 3,
        lowCount: 4,
        topAlerts: [],
        recommendations: ['Do this', 'Do that'],
        trends: [],
      };

      const result = await engine.sendDigest('user1', digest);
      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
    });

    it('sends weekly digest', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });

      const digest: AlertDigest = {
        period: 'weekly',
        generatedAt: new Date(),
        summary: 'Weekly summary',
        criticalCount: 0,
        highCount: 1,
        mediumCount: 2,
        lowCount: 3,
        topAlerts: [],
        recommendations: [],
        trends: [],
      };

      const result = await engine.sendDigest('user1', digest);
      expect(result.success).toBe(true);
    });

    it('fails when user has no email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const digest: AlertDigest = {
        period: 'daily',
        generatedAt: new Date(),
        summary: '',
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topAlerts: [],
        recommendations: [],
        trends: [],
      };

      const result = await engine.sendDigest('user1', digest);
      expect(result.success).toBe(false);
    });

    it('handles error gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('fail'));

      const digest: AlertDigest = {
        period: 'daily',
        generatedAt: new Date(),
        summary: '',
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topAlerts: [],
        recommendations: [],
        trends: [],
      };

      const result = await engine.sendDigest('user1', digest);
      expect(result.success).toBe(false);
    });

    it('updates lastSentAt on schedule', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', name: 'Test' });
      engine.scheduleDigest('user1', 'daily');

      const digest: AlertDigest = {
        period: 'daily',
        generatedAt: new Date(),
        summary: '',
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        topAlerts: [],
        recommendations: [],
        trends: [],
      };

      await engine.sendDigest('user1', digest);
      const schedule = engine.getDigestSchedule('user1');
      expect(schedule!.lastSentAt).toBeDefined();
    });
  });
});
