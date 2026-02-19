// =============================================================================
// INTELLIGENT ALERTS - Alert Processor
// Processes alerts: priority assignment, threshold evaluation, escalation
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertStatus,
  AlertActionType,
  AlertAction,
  AlertFilter,
  AlertSort,
  AlertCounts,
  EscalationRule,
  PRIORITY_RULES,
  AlertData,
} from './alert-types';

// =============================================================================
// ALERT PROCESSOR CLASS
// =============================================================================

export class AlertProcessor {
  private static instance: AlertProcessor;

  // In-memory storage for alerts (in production, use Redis or database)
  private alerts: Map<string, Alert> = new Map();
  private escalationRules: EscalationRule[] = [];

  private constructor() {
    this.initializeDefaultEscalationRules();
  }

  static getInstance(): AlertProcessor {
    if (!AlertProcessor.instance) {
      AlertProcessor.instance = new AlertProcessor();
    }
    return AlertProcessor.instance;
  }

  // ===========================================================================
  // ALERT STORAGE
  // ===========================================================================

  storeAlerts(alerts: Alert[]): void {
    for (const alert of alerts) {
      this.alerts.set(alert.id, alert);
    }
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  // ===========================================================================
  // THRESHOLD EVALUATION
  // ===========================================================================

  evaluateThreshold(
    value: number,
    threshold: number,
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
  ): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }

  evaluateMultipleThresholds(
    data: Record<string, number>,
    conditions: Array<{
      field: string;
      threshold: number;
      operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    }>,
    logic: 'AND' | 'OR' = 'AND'
  ): boolean {
    const results = conditions.map(condition => {
      const value = data[condition.field];
      if (value === undefined) return false;
      return this.evaluateThreshold(value, condition.threshold, condition.operator);
    });

    return logic === 'AND'
      ? results.every(r => r)
      : results.some(r => r);
  }

  // ===========================================================================
  // PRIORITY ASSIGNMENT
  // ===========================================================================

  assignPriority(type: AlertType, data: AlertData): AlertPriority {
    const rules = PRIORITY_RULES[type];
    if (!rules) return AlertPriority.MEDIUM;

    for (const condition of rules.conditions) {
      if (condition.condition(data)) {
        return condition.priority;
      }
    }

    return rules.default;
  }

  recalculatePriority(alert: Alert): AlertPriority {
    return this.assignPriority(alert.type, alert.data);
  }

  // ===========================================================================
  // ACTION DETERMINATION
  // ===========================================================================

  determineActions(alert: Alert): AlertAction[] {
    const actions: AlertAction[] = [];

    // Common actions for all alerts
    actions.push({
      id: 'view-details',
      label: 'Xem chi tiết',
      type: AlertActionType.VIEW_DETAILS,
      icon: 'eye',
    });

    // Type-specific actions
    switch (alert.type) {
      case AlertType.STOCKOUT:
      case AlertType.REORDER:
      case AlertType.SAFETY_STOCK_LOW:
        actions.unshift({
          id: 'view-po-suggestions',
          label: 'Xem PO Suggestions',
          type: AlertActionType.NAVIGATE,
          url: `/ai/auto-po?partId=${(alert.data as { partId?: string }).partId}`,
          isPrimary: true,
        });
        break;

      case AlertType.QUALITY_CRITICAL:
      case AlertType.QUALITY_RISK:
        actions.unshift({
          id: 'create-ncr',
          label: 'Tạo NCR',
          type: AlertActionType.CREATE,
          handler: 'createNCR',
          params: { partId: (alert.data as { partId?: string }).partId },
          isPrimary: true,
        });
        break;

      case AlertType.SUPPLIER_DELIVERY:
        actions.unshift({
          id: 'contact-supplier',
          label: 'Liên hệ Supplier',
          type: AlertActionType.CONTACT,
          handler: 'contactSupplier',
          params: { supplierId: (alert.data as { supplierId?: string }).supplierId },
          isPrimary: true,
        });
        break;

      case AlertType.PO_PENDING:
        actions.unshift({
          id: 'approve-po',
          label: 'Duyệt PO',
          type: AlertActionType.APPROVE,
          handler: 'approvePO',
          params: { suggestionId: (alert.data as { suggestionId?: string }).suggestionId },
          isPrimary: true,
        });
        actions.push({
          id: 'reject-po',
          label: 'Từ chối',
          type: AlertActionType.REJECT,
          handler: 'rejectPO',
          params: { suggestionId: (alert.data as { suggestionId?: string }).suggestionId },
        });
        break;

      case AlertType.SCHEDULE_CONFLICT:
        actions.unshift({
          id: 'resolve-conflict',
          label: 'Giải quyết',
          type: AlertActionType.APPLY,
          handler: 'resolveConflict',
          params: { workOrderId: (alert.data as { workOrderId?: string }).workOrderId },
          isPrimary: true,
        });
        break;
    }

    // Snooze and dismiss actions
    actions.push({
      id: 'snooze',
      label: 'Tạm ẩn',
      type: AlertActionType.SNOOZE,
      icon: 'clock',
    });

    actions.push({
      id: 'dismiss',
      label: 'Bỏ qua',
      type: AlertActionType.DISMISS,
      icon: 'x',
    });

    return actions;
  }

  // ===========================================================================
  // ALERT STATE MANAGEMENT
  // ===========================================================================

  markAsRead(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = AlertStatus.READ;
    alert.readAt = new Date();
    this.alerts.set(alertId, alert);
    return true;
  }

  markAsDismissed(alertId: string, reason?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = AlertStatus.DISMISSED;
    alert.dismissedAt = new Date();
    if (reason) {
      alert.metadata = { ...alert.metadata, dismissReason: reason };
    }
    this.alerts.set(alertId, alert);
    return true;
  }

  markAsResolved(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    this.alerts.set(alertId, alert);
    return true;
  }

  snoozeAlert(alertId: string, duration: number): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.metadata = {
      ...alert.metadata,
      snoozedUntil: new Date(Date.now() + duration),
    };
    this.alerts.set(alertId, alert);
    return true;
  }

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  bulkMarkAsRead(alertIds: string[]): number {
    let count = 0;
    for (const id of alertIds) {
      if (this.markAsRead(id)) count++;
    }
    return count;
  }

  bulkDismiss(alertIds: string[], reason?: string): number {
    let count = 0;
    for (const id of alertIds) {
      if (this.markAsDismissed(id, reason)) count++;
    }
    return count;
  }

  // ===========================================================================
  // FILTERING & SORTING
  // ===========================================================================

  filterAlerts(filter: AlertFilter): Alert[] {
    let alerts = this.getAllAlerts();

    // Filter by snoozed status first
    alerts = alerts.filter(alert => {
      const snoozedUntil = alert.metadata?.snoozedUntil as Date | undefined;
      if (snoozedUntil && new Date(snoozedUntil) > new Date()) {
        return false; // Still snoozed
      }
      return true;
    });

    if (filter.types?.length) {
      alerts = alerts.filter(a => filter.types!.includes(a.type));
    }

    if (filter.priorities?.length) {
      alerts = alerts.filter(a => filter.priorities!.includes(a.priority));
    }

    if (filter.sources?.length) {
      alerts = alerts.filter(a => filter.sources!.includes(a.source));
    }

    if (filter.statuses?.length) {
      alerts = alerts.filter(a => filter.statuses!.includes(a.status));
    }

    if (filter.entityType) {
      alerts = alerts.filter(a =>
        a.entities.some(e => e.type === filter.entityType)
      );
    }

    if (filter.entityId) {
      alerts = alerts.filter(a =>
        a.entities.some(e => e.id === filter.entityId)
      );
    }

    if (filter.fromDate) {
      alerts = alerts.filter(a => a.createdAt >= filter.fromDate!);
    }

    if (filter.toDate) {
      alerts = alerts.filter(a => a.createdAt <= filter.toDate!);
    }

    if (filter.isRead !== undefined) {
      alerts = alerts.filter(a =>
        filter.isRead
          ? a.status === AlertStatus.READ
          : a.status === AlertStatus.ACTIVE
      );
    }

    if (filter.isEscalated !== undefined) {
      alerts = alerts.filter(a => a.isEscalated === filter.isEscalated);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      alerts = alerts.filter(a =>
        a.title.toLowerCase().includes(search) ||
        a.message.toLowerCase().includes(search)
      );
    }

    return alerts;
  }

  sortAlerts(alerts: Alert[], sort: AlertSort): Alert[] {
    const priorityOrder = {
      [AlertPriority.CRITICAL]: 4,
      [AlertPriority.HIGH]: 3,
      [AlertPriority.MEDIUM]: 2,
      [AlertPriority.LOW]: 1,
    };

    return alerts.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'priority':
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  getAlertCounts(filter?: AlertFilter): AlertCounts {
    const alerts = filter ? this.filterAlerts(filter) : this.getAllAlerts();

    return {
      total: alerts.length,
      critical: alerts.filter(a => a.priority === AlertPriority.CRITICAL).length,
      high: alerts.filter(a => a.priority === AlertPriority.HIGH).length,
      medium: alerts.filter(a => a.priority === AlertPriority.MEDIUM).length,
      low: alerts.filter(a => a.priority === AlertPriority.LOW).length,
      unread: alerts.filter(a => a.status === AlertStatus.ACTIVE).length,
      pendingAction: alerts.filter(a =>
        a.status === AlertStatus.ACTIVE &&
        a.actions.some(action => action.isPrimary)
      ).length,
      escalated: alerts.filter(a => a.isEscalated).length,
    };
  }

  // ===========================================================================
  // ESCALATION
  // ===========================================================================

  private initializeDefaultEscalationRules(): void {
    this.escalationRules = [
      {
        id: 'critical-unread-2h',
        name: 'Critical alerts unread for 2 hours',
        alertTypes: [
          AlertType.STOCKOUT,
          AlertType.QUALITY_CRITICAL,
          AlertType.SUPPLIER_DELIVERY,
          AlertType.SCHEDULE_CONFLICT,
        ],
        priority: AlertPriority.CRITICAL,
        condition: { unreadForHours: 2 },
        escalateTo: ['manager', 'operations_lead'],
        notifyVia: ['inApp', 'email'],
        isActive: true,
      },
      {
        id: 'high-unread-8h',
        name: 'High priority alerts unread for 8 hours',
        alertTypes: [],
        priority: AlertPriority.HIGH,
        condition: { unreadForHours: 8 },
        escalateTo: ['manager'],
        notifyVia: ['inApp'],
        isActive: true,
      },
      {
        id: 'po-pending-24h',
        name: 'PO pending approval for 24 hours',
        alertTypes: [AlertType.PO_PENDING],
        priority: AlertPriority.MEDIUM,
        condition: { unreadForHours: 24 },
        escalateTo: ['purchasing_manager'],
        notifyVia: ['email'],
        isActive: true,
      },
    ];
  }

  checkEscalation(alert: Alert): boolean {
    if (alert.isEscalated) return false;
    if (alert.status !== AlertStatus.ACTIVE) return false;

    const now = new Date();
    const hoursUnread = (now.getTime() - alert.createdAt.getTime()) / (1000 * 60 * 60);

    for (const rule of this.escalationRules) {
      if (!rule.isActive) continue;

      // Check priority match
      if (rule.priority !== alert.priority) continue;

      // Check type match (empty array means all types)
      if (rule.alertTypes.length > 0 && !rule.alertTypes.includes(alert.type)) {
        continue;
      }

      // Check conditions
      if (rule.condition.unreadForHours && hoursUnread >= rule.condition.unreadForHours) {
        return true;
      }
    }

    return false;
  }

  async escalateAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    // Find matching rule
    let matchingRule: EscalationRule | undefined;
    for (const rule of this.escalationRules) {
      if (rule.priority === alert.priority) {
        if (rule.alertTypes.length === 0 || rule.alertTypes.includes(alert.type)) {
          matchingRule = rule;
          break;
        }
      }
    }

    if (!matchingRule) return false;

    alert.isEscalated = true;
    alert.escalatedAt = new Date();
    alert.escalatedTo = matchingRule.escalateTo.join(', ');
    alert.escalationReason = matchingRule.name;
    alert.status = AlertStatus.ESCALATED;

    this.alerts.set(alertId, alert);

    // Log escalation
    try {
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'ALERT_ESCALATED',
          entityType: 'Alert',
          entityId: alertId,
          metadata: JSON.stringify({
            alertType: alert.type,
            priority: alert.priority,
            escalatedTo: matchingRule.escalateTo,
            reason: matchingRule.name,
          }),
        },
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-processor', operation: 'logEscalation' });
    }

    return true;
  }

  getEscalationRules(): EscalationRule[] {
    return this.escalationRules;
  }

  updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): boolean {
    const index = this.escalationRules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;

    this.escalationRules[index] = { ...this.escalationRules[index], ...updates };
    return true;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  cleanupExpiredAlerts(): number {
    const now = new Date();
    let count = 0;

    for (const [id, alert] of this.alerts) {
      if (alert.expiresAt && alert.expiresAt < now) {
        alert.status = AlertStatus.EXPIRED;
        this.alerts.set(id, alert);
        count++;
      }
    }

    return count;
  }

  removeOldAlerts(daysOld: number): number {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const [id, alert] of this.alerts) {
      if (alert.createdAt < cutoff &&
          (alert.status === AlertStatus.DISMISSED ||
           alert.status === AlertStatus.RESOLVED ||
           alert.status === AlertStatus.EXPIRED)) {
        this.alerts.delete(id);
        count++;
      }
    }

    return count;
  }

  // ===========================================================================
  // BATCH PROCESSING
  // ===========================================================================

  async processAlerts(alerts: Alert[]): Promise<Alert[]> {
    const processed: Alert[] = [];

    for (const alert of alerts) {
      // Recalculate priority
      alert.priority = this.recalculatePriority(alert);

      // Determine actions
      alert.actions = this.determineActions(alert);

      // Check escalation
      if (this.checkEscalation(alert)) {
        await this.escalateAlert(alert.id);
      }

      processed.push(alert);
    }

    // Store processed alerts
    this.storeAlerts(processed);

    return processed;
  }
}

// Singleton export
export const alertProcessor = AlertProcessor.getInstance();
export const getAlertProcessor = () => AlertProcessor.getInstance();
