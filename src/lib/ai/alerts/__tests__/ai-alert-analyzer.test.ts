import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mocks ----
const { mockAIProvider } = vi.hoisted(() => ({
  mockAIProvider: {
    chat: vi.fn().mockResolvedValue({ content: 'AI summary response' }),
  },
}));

vi.mock('@/lib/ai/provider', () => ({
  getAIProvider: () => mockAIProvider,
  AIProviderService: class {},
  createSystemMessage: (content: string) => ({ role: 'system', content }),
  createUserMessage: (content: string) => ({ role: 'user', content }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { AIAlertAnalyzer, getAIAlertAnalyzer } from '../ai-alert-analyzer';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertSource,
  AlertStatus,
} from '../alert-types';

function resetSingleton() {
  (AIAlertAnalyzer as unknown as { instance: undefined }).instance = undefined;
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
    data: { daysOfSupply: 5 },
    actions: [],
    createdAt: new Date(),
    isEscalated: false,
    ...overrides,
  };
}

describe('AIAlertAnalyzer', () => {
  let analyzer: AIAlertAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    resetSingleton();
    analyzer = AIAlertAnalyzer.getInstance();
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    it('returns same instance', () => {
      expect(AIAlertAnalyzer.getInstance()).toBe(analyzer);
    });

    it('getAIAlertAnalyzer returns singleton', () => {
      expect(getAIAlertAnalyzer()).toBe(analyzer);
    });
  });

  // =========================================================================
  // summarizeAlerts
  // =========================================================================

  describe('summarizeAlerts', () => {
    it('returns default message for empty alerts', async () => {
      const result = await analyzer.summarizeAlerts([]);
      expect(result).toContain('Không có cảnh báo');
    });

    it('calls AI provider for non-empty alerts', async () => {
      const alerts = [makeAlert()];
      const result = await analyzer.summarizeAlerts(alerts);
      expect(mockAIProvider.chat).toHaveBeenCalled();
      expect(result).toBe('AI summary response');
    });

    it('falls back to rule-based summary on AI error', async () => {
      mockAIProvider.chat.mockRejectedValueOnce(new Error('AI fail'));

      const alerts = [
        makeAlert({ priority: AlertPriority.CRITICAL, title: 'Critical issue' }),
        makeAlert({ id: 'a2', priority: AlertPriority.HIGH, title: 'High issue' }),
        makeAlert({ id: 'a3', priority: AlertPriority.MEDIUM, title: 'Medium issue' }),
      ];

      const result = await analyzer.summarizeAlerts(alerts);
      expect(result).toContain('CẦN XỬ LÝ NGAY');
      expect(result).toContain('Critical issue');
      expect(result).toContain('High issue');
    });

    it('fallback with only critical alerts', async () => {
      mockAIProvider.chat.mockRejectedValueOnce(new Error('AI fail'));

      const alerts = [
        makeAlert({ priority: AlertPriority.CRITICAL, title: 'Crit 1' }),
      ];

      const result = await analyzer.summarizeAlerts(alerts);
      expect(result).toContain('CẦN XỬ LÝ NGAY');
    });

    it('fallback with only medium alerts', async () => {
      mockAIProvider.chat.mockRejectedValueOnce(new Error('AI fail'));

      const alerts = [
        makeAlert({ priority: AlertPriority.MEDIUM }),
      ];

      const result = await analyzer.summarizeAlerts(alerts);
      expect(result).toContain('theo dõi trong tuần');
    });

    it('fallback with no critical/high/medium alerts', async () => {
      mockAIProvider.chat.mockRejectedValueOnce(new Error('AI fail'));

      const alerts = [
        makeAlert({ priority: AlertPriority.LOW }),
      ];

      const result = await analyzer.summarizeAlerts(alerts);
      expect(result).toContain('bình thường');
    });

    it('fallback truncates to 3 items per priority level', async () => {
      mockAIProvider.chat.mockRejectedValueOnce(new Error('AI fail'));

      const alerts = Array.from({ length: 5 }, (_, i) =>
        makeAlert({ id: `c${i}`, priority: AlertPriority.CRITICAL, title: `Crit ${i}` })
      );

      const result = await analyzer.summarizeAlerts(alerts);
      // Should show first 3
      expect(result).toContain('Crit 0');
      expect(result).toContain('Crit 2');
    });
  });

  // =========================================================================
  // correlateAlerts
  // =========================================================================

  describe('correlateAlerts', () => {
    it('returns empty for empty input', async () => {
      const groups = await analyzer.correlateAlerts([]);
      expect(groups).toEqual([]);
    });

    it('groups alerts sharing the same entity', async () => {
      const a1 = makeAlert({ id: 'a1', entities: [{ type: 'part', id: 'p1', name: 'Part 1' }] });
      const a2 = makeAlert({ id: 'a2', type: AlertType.REORDER, entities: [{ type: 'part', id: 'p1', name: 'Part 1' }] });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      expect(groups.length).toBe(1);
      expect(groups[0].primaryAlert.id).toBe('a1');
      expect(groups[0].relatedAlerts.length).toBe(1);
    });

    it('groups alerts with same correlationId', async () => {
      const a1 = makeAlert({
        id: 'a1',
        correlationId: 'corr-1',
        entities: [{ type: 'part', id: 'p1' }],
      });
      const a2 = makeAlert({
        id: 'a2',
        correlationId: 'corr-1',
        entities: [{ type: 'supplier', id: 's1' }],
      });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      expect(groups.length).toBe(1);
    });

    it('groups alerts of same type+source within 1 hour', async () => {
      const now = new Date();
      const a1 = makeAlert({
        id: 'a1',
        type: AlertType.STOCKOUT,
        source: AlertSource.FORECAST,
        createdAt: now,
        entities: [{ type: 'part', id: 'p1' }],
      });
      const a2 = makeAlert({
        id: 'a2',
        type: AlertType.STOCKOUT,
        source: AlertSource.FORECAST,
        createdAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 min later
        entities: [{ type: 'part', id: 'p2' }],
      });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      expect(groups.length).toBe(1);
    });

    it('does not group alerts of same type beyond 1 hour', async () => {
      const now = new Date();
      const a1 = makeAlert({
        id: 'a1',
        type: AlertType.STOCKOUT,
        source: AlertSource.FORECAST,
        createdAt: now,
        entities: [{ type: 'part', id: 'p1' }],
      });
      const a2 = makeAlert({
        id: 'a2',
        type: AlertType.STOCKOUT,
        source: AlertSource.FORECAST,
        createdAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        entities: [{ type: 'part', id: 'p2' }],
      });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      expect(groups.length).toBe(0); // No groups because neither has related
    });

    it('determines group reason for common entity', async () => {
      const a1 = makeAlert({ id: 'a1', entities: [{ type: 'part', id: 'p1', name: 'Part One' }] });
      const a2 = makeAlert({ id: 'a2', type: AlertType.QUALITY_RISK, entities: [{ type: 'part', id: 'p1', name: 'Part One' }] });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      expect(groups[0].groupReason).toContain('Part One');
    });

    it('determines group reason for same type', async () => {
      const now = new Date();
      const a1 = makeAlert({ id: 'a1', type: AlertType.STOCKOUT, source: AlertSource.FORECAST, createdAt: now, entities: [{ type: 'part', id: 'p1' }] });
      const a2 = makeAlert({ id: 'a2', type: AlertType.STOCKOUT, source: AlertSource.FORECAST, createdAt: now, entities: [{ type: 'part', id: 'p2' }] });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      // Common entity won't be found since different part ids
      // But they are same type and source
      expect(groups[0].groupReason).toBeDefined();
    });

    it('determines group reason for same source', async () => {
      const now = new Date();
      const a1 = makeAlert({ id: 'a1', type: AlertType.STOCKOUT, source: AlertSource.FORECAST, createdAt: now, entities: [{ type: 'part', id: 'p1' }] });
      const a2 = makeAlert({ id: 'a2', type: AlertType.REORDER, source: AlertSource.FORECAST, createdAt: now, entities: [{ type: 'part', id: 'p1', name: 'Part 1' }] });

      const groups = await analyzer.correlateAlerts([a1, a2]);
      expect(groups[0].groupReason).toBeDefined();
    });
  });

  // =========================================================================
  // predictUrgency
  // =========================================================================

  describe('predictUrgency', () => {
    it('predicts urgency for STOCKOUT', async () => {
      const alert = makeAlert({ type: AlertType.STOCKOUT, data: { daysOfSupply: 2 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.hoursUntilCritical).toBe(48);
      expect(result.impactScore).toBe(95);
      expect(result.recommendedAction).toContain('Auto-PO');
    });

    it('predicts urgency for STOCKOUT with daysOfSupply<=5', async () => {
      const alert = makeAlert({ type: AlertType.STOCKOUT, data: { daysOfSupply: 4 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(75);
    });

    it('predicts urgency for QUALITY_CRITICAL', async () => {
      const alert = makeAlert({ type: AlertType.QUALITY_CRITICAL });
      const result = await analyzer.predictUrgency(alert);
      expect(result.hoursUntilCritical).toBeLessThanOrEqual(4); // adjusted by CRITICAL priority
      expect(result.impactScore).toBe(90);
    });

    it('predicts urgency for SUPPLIER_DELIVERY', async () => {
      const alert = makeAlert({ type: AlertType.SUPPLIER_DELIVERY, data: { delayDays: 6 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(85);
    });

    it('predicts urgency for SUPPLIER_DELIVERY with small delay', async () => {
      const alert = makeAlert({ type: AlertType.SUPPLIER_DELIVERY, data: { delayDays: 2 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(55);
    });

    it('predicts urgency for SCHEDULE_CONFLICT', async () => {
      const alert = makeAlert({ type: AlertType.SCHEDULE_CONFLICT });
      const result = await analyzer.predictUrgency(alert);
      expect(result.hoursUntilCritical).toBe(8);
      expect(result.impactScore).toBe(80);
    });

    it('predicts urgency for DEADLINE_RISK', async () => {
      const alert = makeAlert({ type: AlertType.DEADLINE_RISK, data: { daysUntilDue: 1 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(90);
    });

    it('predicts urgency for DEADLINE_RISK with daysUntilDue<=5', async () => {
      const alert = makeAlert({ type: AlertType.DEADLINE_RISK, data: { daysUntilDue: 4 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(70);
    });

    it('predicts urgency for PO_PENDING', async () => {
      const alert = makeAlert({ type: AlertType.PO_PENDING, data: { pendingHours: 30 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(70);
    });

    it('predicts urgency for PO_PENDING with low hours', async () => {
      const alert = makeAlert({ type: AlertType.PO_PENDING, data: { pendingHours: 10 } as any });
      const result = await analyzer.predictUrgency(alert);
      expect(result.impactScore).toBe(50);
    });

    it('uses default for unknown type', async () => {
      const alert = makeAlert({ type: AlertType.SYSTEM_INFO, data: {} });
      const result = await analyzer.predictUrgency(alert);
      expect(result.hoursUntilCritical).toBe(168);
      expect(result.impactScore).toBe(50);
    });

    it('adjusts for CRITICAL priority', async () => {
      const alert = makeAlert({
        type: AlertType.SYSTEM_INFO,
        priority: AlertPriority.CRITICAL,
        data: {},
      });
      const result = await analyzer.predictUrgency(alert);
      expect(result.hoursUntilCritical).toBeLessThanOrEqual(4);
      expect(result.impactScore).toBeGreaterThanOrEqual(85);
    });

    it('adjusts for HIGH priority', async () => {
      const alert = makeAlert({
        type: AlertType.SYSTEM_INFO,
        priority: AlertPriority.HIGH,
        data: {},
      });
      const result = await analyzer.predictUrgency(alert);
      expect(result.hoursUntilCritical).toBeLessThanOrEqual(24);
      expect(result.impactScore).toBeGreaterThanOrEqual(65);
    });
  });

  // =========================================================================
  // recommendPrioritization
  // =========================================================================

  describe('recommendPrioritization', () => {
    it('returns empty for empty input', async () => {
      const result = await analyzer.recommendPrioritization([]);
      expect(result).toEqual([]);
    });

    it('sorts by impact score desc then hoursUntilCritical asc', async () => {
      const critical = makeAlert({
        id: 'crit',
        type: AlertType.QUALITY_CRITICAL,
        priority: AlertPriority.CRITICAL,
      });
      const low = makeAlert({
        id: 'low',
        type: AlertType.SYSTEM_INFO,
        priority: AlertPriority.LOW,
        data: {},
      });

      const result = await analyzer.recommendPrioritization([low, critical]);
      expect(result[0].id).toBe('crit');
    });
  });

  // =========================================================================
  // generateDailyDigest
  // =========================================================================

  describe('generateDailyDigest', () => {
    it('generates digest for recent alerts', async () => {
      const alerts = [
        makeAlert({ id: 'a1', priority: AlertPriority.CRITICAL, createdAt: new Date() }),
        makeAlert({ id: 'a2', priority: AlertPriority.HIGH, createdAt: new Date() }),
        makeAlert({ id: 'a3', priority: AlertPriority.MEDIUM, createdAt: new Date() }),
        makeAlert({ id: 'a4', priority: AlertPriority.LOW, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateDailyDigest(alerts);
      expect(digest.period).toBe('daily');
      expect(digest.criticalCount).toBe(1);
      expect(digest.highCount).toBe(1);
      expect(digest.mediumCount).toBe(1);
      expect(digest.lowCount).toBe(1);
      expect(digest.recommendations.length).toBeGreaterThan(0);
    });

    it('excludes old alerts', async () => {
      const oldAlert = makeAlert({
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        priority: AlertPriority.CRITICAL,
      });

      const digest = await analyzer.generateDailyDigest([oldAlert]);
      expect(digest.criticalCount).toBe(0);
    });
  });

  // =========================================================================
  // generateWeeklyReport
  // =========================================================================

  describe('generateWeeklyReport', () => {
    it('generates weekly report', async () => {
      const alerts = [
        makeAlert({ id: 'a1', priority: AlertPriority.CRITICAL, createdAt: new Date() }),
        makeAlert({ id: 'a2', priority: AlertPriority.HIGH, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateWeeklyReport(alerts);
      expect(digest.period).toBe('weekly');
      expect(digest.criticalCount).toBe(1);
    });

    it('excludes alerts older than 7 days', async () => {
      const oldAlert = makeAlert({
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        priority: AlertPriority.CRITICAL,
      });

      const digest = await analyzer.generateWeeklyReport([oldAlert]);
      expect(digest.criticalCount).toBe(0);
    });
  });

  // =========================================================================
  // generateRecommendations
  // =========================================================================

  describe('generateRecommendations (via digest)', () => {
    it('recommends Auto-PO review for stockout alerts', async () => {
      const alerts = [
        makeAlert({ type: AlertType.STOCKOUT, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateDailyDigest(alerts);
      expect(digest.recommendations.some(r => r.includes('Auto-PO'))).toBe(true);
    });

    it('recommends QC review for quality alerts', async () => {
      const alerts = [
        makeAlert({ type: AlertType.QUALITY_CRITICAL, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateDailyDigest(alerts);
      expect(digest.recommendations.some(r => r.includes('QC'))).toBe(true);
    });

    it('recommends supplier review for supplier alerts', async () => {
      const alerts = [
        makeAlert({ type: AlertType.SUPPLIER_DELIVERY, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateDailyDigest(alerts);
      expect(digest.recommendations.some(r => r.includes('supplier'))).toBe(true);
    });

    it('recommends schedule optimization for schedule alerts', async () => {
      const alerts = [
        makeAlert({ type: AlertType.SCHEDULE_CONFLICT, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateDailyDigest(alerts);
      expect(digest.recommendations.some(r => r.includes('schedule'))).toBe(true);
    });

    it('returns default recommendation when no specific alerts', async () => {
      const alerts = [
        makeAlert({ type: AlertType.SYSTEM_INFO, priority: AlertPriority.LOW, createdAt: new Date() }),
      ];

      const digest = await analyzer.generateDailyDigest(alerts);
      expect(digest.recommendations.some(r => r.includes('Tiếp tục'))).toBe(true);
    });
  });

  // =========================================================================
  // generateWeeklyRecommendations (via weekly report)
  // =========================================================================

  describe('generateWeeklyRecommendations', () => {
    it('adds low resolve rate recommendation', async () => {
      const alerts = Array.from({ length: 10 }, (_, i) =>
        makeAlert({
          id: `a${i}`,
          status: AlertStatus.ACTIVE,
          type: AlertType.SYSTEM_INFO,
          priority: AlertPriority.LOW,
          createdAt: new Date(),
        })
      );

      const digest = await analyzer.generateWeeklyReport(alerts);
      expect(digest.recommendations.some(r => r.includes('Tỉ lệ'))).toBe(true);
    });
  });

  // =========================================================================
  // calculateTrends
  // =========================================================================

  describe('calculateTrends (via digest)', () => {
    it('calculates trends comparing this week to last week', async () => {
      const now = new Date();
      const thisWeek = makeAlert({
        id: 'tw',
        source: AlertSource.FORECAST,
        createdAt: now,
      });
      const lastWeek = makeAlert({
        id: 'lw',
        source: AlertSource.FORECAST,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      });

      const digest = await analyzer.generateDailyDigest([thisWeek, lastWeek]);
      expect(digest.trends).toBeDefined();
      expect(digest.trends.length).toBeGreaterThan(0);
    });

    it('reports stable when no change', async () => {
      const digest = await analyzer.generateDailyDigest([]);
      const stableTrends = digest.trends.filter(t => t.trend === 'stable');
      expect(stableTrends.length).toBeGreaterThan(0);
    });
  });
});
