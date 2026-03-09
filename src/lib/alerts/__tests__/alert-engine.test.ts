import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAlertId,
  createAlert,
  formatAlertTime,
  getAlertPriority,
  sortAlertsByPriority,
  generateMockAlerts,
  DEFAULT_ALERT_RULES,
  ALERT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  type Alert,
  type AlertType,
  type AlertSeverity,
  type AlertStatus,
} from '../alert-engine';

describe('alert-engine', () => {
  describe('generateAlertId', () => {
    it('should return a string starting with ALT-', () => {
      const id = generateAlertId();
      expect(id).toMatch(/^ALT-\d+-[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateAlertId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('createAlert', () => {
    it('should create an alert with required fields', () => {
      const alert = createAlert({
        type: 'LOW_STOCK',
        title: 'Low stock warning',
        message: 'Part XYZ is low',
      });

      expect(alert.id).toMatch(/^ALT-/);
      expect(alert.type).toBe('LOW_STOCK');
      expect(alert.title).toBe('Low stock warning');
      expect(alert.message).toBe('Part XYZ is low');
      expect(alert.status).toBe('ACTIVE');
      expect(alert.createdAt).toBeInstanceOf(Date);
    });

    it('should use default severity from ALERT_TYPE_CONFIG if not provided', () => {
      const alert = createAlert({
        type: 'STOCKOUT',
        title: 'Stockout',
        message: 'No stock',
      });
      expect(alert.severity).toBe('CRITICAL');
    });

    it('should override severity when provided', () => {
      const alert = createAlert({
        type: 'STOCKOUT',
        title: 'Stockout',
        message: 'No stock',
        severity: 'WARNING',
      });
      expect(alert.severity).toBe('WARNING');
    });

    it('should set optional fields when provided', () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const alert = createAlert({
        type: 'EQUIPMENT_DOWN',
        title: 'Machine down',
        message: 'CNC is down',
        entityType: 'Equipment',
        entityId: 'eq-1',
        entityCode: 'CNC-001',
        metadata: { location: 'Bay A' },
        expiresAt,
      });

      expect(alert.entityType).toBe('Equipment');
      expect(alert.entityId).toBe('eq-1');
      expect(alert.entityCode).toBe('CNC-001');
      expect(alert.metadata).toEqual({ location: 'Bay A' });
      expect(alert.expiresAt).toBe(expiresAt);
    });

    it('should leave optional fields undefined when not provided', () => {
      const alert = createAlert({
        type: 'LOW_STOCK',
        title: 'Low stock',
        message: 'Low',
      });
      expect(alert.entityType).toBeUndefined();
      expect(alert.entityId).toBeUndefined();
      expect(alert.acknowledgedAt).toBeUndefined();
      expect(alert.resolvedAt).toBeUndefined();
    });
  });

  describe('formatAlertTime', () => {
    it('should return "Vừa xong" for times less than 1 minute ago', () => {
      const now = new Date();
      expect(formatAlertTime(now)).toBe('Vừa xong');
    });

    it('should return minutes for times under 60 minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60000);
      expect(formatAlertTime(date)).toBe('5 phút');
    });

    it('should return hours for times under 24 hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60000);
      expect(formatAlertTime(date)).toBe('3 giờ');
    });

    it('should return days for times under 7 days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60000);
      expect(formatAlertTime(date)).toBe('2 ngày');
    });

    it('should return formatted date for times over 7 days ago', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60000);
      const result = formatAlertTime(date);
      // Should be a locale date string, not a relative time
      expect(result).not.toContain('ngày');
      expect(result).not.toContain('giờ');
      expect(result).not.toContain('phút');
    });
  });

  describe('getAlertPriority', () => {
    it('should return highest priority for CRITICAL + ACTIVE', () => {
      const alert = createAlert({
        type: 'STOCKOUT',
        title: 'Stockout',
        message: 'Out of stock',
      });
      // CRITICAL=100, ACTIVE=1000 => 1100
      expect(getAlertPriority(alert)).toBe(1100);
    });

    it('should return lower priority for INFO + DISMISSED', () => {
      const alert = createAlert({
        type: 'MAINTENANCE_DUE',
        title: 'PM due',
        message: 'Maintenance needed',
      });
      alert.status = 'DISMISSED';
      // INFO=10, DISMISSED=1 => 11
      expect(getAlertPriority(alert)).toBe(11);
    });

    it('should differentiate between severity levels', () => {
      const critical = createAlert({ type: 'STOCKOUT', title: 'A', message: 'B' });
      const warning = createAlert({ type: 'LOW_STOCK', title: 'A', message: 'B' });
      const info = createAlert({ type: 'MAINTENANCE_DUE', title: 'A', message: 'B' });

      expect(getAlertPriority(critical)).toBeGreaterThan(getAlertPriority(warning));
      expect(getAlertPriority(warning)).toBeGreaterThan(getAlertPriority(info));
    });
  });

  describe('sortAlertsByPriority', () => {
    it('should sort alerts by priority descending', () => {
      const info = createAlert({ type: 'MAINTENANCE_DUE', title: 'Info', message: 'B' });
      const critical = createAlert({ type: 'STOCKOUT', title: 'Critical', message: 'B' });
      const warning = createAlert({ type: 'LOW_STOCK', title: 'Warning', message: 'B' });

      const sorted = sortAlertsByPriority([info, critical, warning]);
      expect(sorted[0].title).toBe('Critical');
      expect(sorted[1].title).toBe('Warning');
      expect(sorted[2].title).toBe('Info');
    });

    it('should sort by createdAt when priorities are equal', () => {
      const older = createAlert({ type: 'STOCKOUT', title: 'Older', message: 'B' });
      older.createdAt = new Date(Date.now() - 10000);
      const newer = createAlert({ type: 'STOCKOUT', title: 'Newer', message: 'B' });
      newer.createdAt = new Date(Date.now());

      const sorted = sortAlertsByPriority([older, newer]);
      expect(sorted[0].title).toBe('Newer');
      expect(sorted[1].title).toBe('Older');
    });

    it('should not mutate the original array', () => {
      const alerts = [
        createAlert({ type: 'MAINTENANCE_DUE', title: 'Info', message: 'B' }),
        createAlert({ type: 'STOCKOUT', title: 'Critical', message: 'B' }),
      ];
      const original = [...alerts];
      sortAlertsByPriority(alerts);
      expect(alerts[0].title).toBe(original[0].title);
    });

    it('should handle empty array', () => {
      expect(sortAlertsByPriority([])).toEqual([]);
    });
  });

  describe('generateMockAlerts', () => {
    it('should return an array of alerts', () => {
      const alerts = generateMockAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should return alerts with valid structure', () => {
      const alerts = generateMockAlerts();
      for (const alert of alerts) {
        expect(alert.id).toMatch(/^ALT-/);
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.status).toBe('ACTIVE');
        expect(alert.title).toBeTruthy();
        expect(alert.message).toBeTruthy();
        expect(alert.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should include different alert types', () => {
      const alerts = generateMockAlerts();
      const types = new Set(alerts.map(a => a.type));
      expect(types.size).toBeGreaterThan(1);
    });
  });

  describe('DEFAULT_ALERT_RULES', () => {
    it('should have rules for all alert types', () => {
      const ruleTypes = DEFAULT_ALERT_RULES.map(r => r.type);
      expect(ruleTypes).toContain('STOCKOUT');
      expect(ruleTypes).toContain('LOW_STOCK');
      expect(ruleTypes).toContain('EQUIPMENT_DOWN');
      expect(ruleTypes).toContain('SYSTEM_ERROR');
    });

    it('should have all rules enabled', () => {
      for (const rule of DEFAULT_ALERT_RULES) {
        expect(rule.enabled).toBe(true);
      }
    });

    it('should have cooldownMinutes for every rule', () => {
      for (const rule of DEFAULT_ALERT_RULES) {
        expect(rule.cooldownMinutes).toBeGreaterThan(0);
      }
    });
  });

  describe('ALERT_TYPE_CONFIG', () => {
    it('should have config for all alert types', () => {
      const expectedTypes: AlertType[] = [
        'LOW_STOCK', 'STOCKOUT', 'LOW_OEE', 'EQUIPMENT_DOWN',
        'MAINTENANCE_DUE', 'MAINTENANCE_OVERDUE', 'QUALITY_ISSUE',
        'HIGH_DEFECT_RATE', 'ORDER_DELAYED', 'ORDER_AT_RISK',
        'CAPACITY_OVERLOAD', 'MRP_SHORTAGE', 'SUPPLIER_LATE',
        'INSPECTION_FAILED', 'NCR_OPEN', 'SYSTEM_ERROR',
      ];
      for (const type of expectedTypes) {
        expect(ALERT_TYPE_CONFIG[type]).toBeDefined();
        expect(ALERT_TYPE_CONFIG[type].label).toBeTruthy();
        expect(ALERT_TYPE_CONFIG[type].labelVi).toBeTruthy();
        expect(ALERT_TYPE_CONFIG[type].icon).toBeTruthy();
        expect(ALERT_TYPE_CONFIG[type].category).toBeTruthy();
      }
    });
  });

  describe('SEVERITY_CONFIG', () => {
    it('should have config for all severity levels', () => {
      expect(SEVERITY_CONFIG.CRITICAL).toBeDefined();
      expect(SEVERITY_CONFIG.WARNING).toBeDefined();
      expect(SEVERITY_CONFIG.INFO).toBeDefined();
    });

    it('should have color properties', () => {
      for (const config of Object.values(SEVERITY_CONFIG)) {
        expect(config.color).toBeTruthy();
        expect(config.bgColor).toBeTruthy();
        expect(config.borderColor).toBeTruthy();
      }
    });
  });

  describe('STATUS_CONFIG', () => {
    it('should have config for all status values', () => {
      const statuses: AlertStatus[] = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'];
      for (const status of statuses) {
        expect(STATUS_CONFIG[status]).toBeDefined();
        expect(STATUS_CONFIG[status].label).toBeTruthy();
        expect(STATUS_CONFIG[status].labelVi).toBeTruthy();
      }
    });
  });
});
