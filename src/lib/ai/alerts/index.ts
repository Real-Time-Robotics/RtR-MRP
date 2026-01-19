// =============================================================================
// INTELLIGENT ALERTS MODULE - Exports
// =============================================================================

// Types
export * from './alert-types';

// Alert Aggregator
export {
  AlertAggregator,
  alertAggregator,
  getAlertAggregator,
} from './alert-aggregator';

// Alert Processor
export {
  AlertProcessor,
  alertProcessor,
  getAlertProcessor,
} from './alert-processor';

// AI Alert Analyzer
export {
  AIAlertAnalyzer,
  aiAlertAnalyzer,
  getAIAlertAnalyzer,
} from './ai-alert-analyzer';

// Notification Engine
export {
  NotificationEngine,
  notificationEngine,
  getNotificationEngine,
} from './notification-engine';

export type {
  NotificationResult,
  InAppNotification,
  DigestSchedule,
} from './notification-engine';

// Action Executor
export {
  AlertActionExecutor,
  alertActionExecutor,
  getAlertActionExecutor,
} from './alert-action-executor';

// =============================================================================
// UNIFIED ALERT SERVICE
// =============================================================================

import { alertAggregator } from './alert-aggregator';
import { alertProcessor } from './alert-processor';
import { aiAlertAnalyzer } from './ai-alert-analyzer';
import { notificationEngine } from './notification-engine';
import { alertActionExecutor } from './alert-action-executor';
import {
  Alert,
  AlertFilter,
  AlertSort,
  AlertCounts,
  AlertDigest,
  AlertGroup,
  NotificationPreferences,
  AlertActionResult,
} from './alert-types';

export class UnifiedAlertService {
  private static instance: UnifiedAlertService;

  private constructor() {}

  static getInstance(): UnifiedAlertService {
    if (!UnifiedAlertService.instance) {
      UnifiedAlertService.instance = new UnifiedAlertService();
    }
    return UnifiedAlertService.instance;
  }

  // ===========================================================================
  // REFRESH ALERTS
  // ===========================================================================

  async refreshAlerts(): Promise<Alert[]> {
    // Collect alerts from all sources
    const rawAlerts = await alertAggregator.collectAllAlerts();

    // Process alerts (priority, actions, escalation)
    const processedAlerts = await alertProcessor.processAlerts(rawAlerts);

    return processedAlerts;
  }

  // ===========================================================================
  // GET ALERTS
  // ===========================================================================

  getAlerts(filter?: AlertFilter, sort?: AlertSort): Alert[] {
    let alerts = filter
      ? alertProcessor.filterAlerts(filter)
      : alertProcessor.getAllAlerts();

    if (sort) {
      alerts = alertProcessor.sortAlerts(alerts, sort);
    }

    return alerts;
  }

  getAlert(alertId: string): Alert | undefined {
    return alertProcessor.getAlert(alertId);
  }

  getAlertCounts(filter?: AlertFilter): AlertCounts {
    return alertProcessor.getAlertCounts(filter);
  }

  // ===========================================================================
  // AI ANALYSIS
  // ===========================================================================

  async getAISummary(alerts?: Alert[]): Promise<string> {
    const alertList = alerts || alertProcessor.getAllAlerts();
    return aiAlertAnalyzer.summarizeAlerts(alertList);
  }

  async getAlertGroups(alerts?: Alert[]): Promise<AlertGroup[]> {
    const alertList = alerts || alertProcessor.getAllAlerts();
    return aiAlertAnalyzer.correlateAlerts(alertList);
  }

  async getPrioritizedAlerts(alerts?: Alert[]): Promise<Alert[]> {
    const alertList = alerts || alertProcessor.getAllAlerts();
    return aiAlertAnalyzer.recommendPrioritization(alertList);
  }

  // ===========================================================================
  // DIGESTS
  // ===========================================================================

  async getDailyDigest(): Promise<AlertDigest> {
    const alerts = alertProcessor.getAllAlerts();
    return aiAlertAnalyzer.generateDailyDigest(alerts);
  }

  async getWeeklyReport(): Promise<AlertDigest> {
    const alerts = alertProcessor.getAllAlerts();
    return aiAlertAnalyzer.generateWeeklyReport(alerts);
  }

  // ===========================================================================
  // ACTIONS
  // ===========================================================================

  async executeAction(
    alertId: string,
    actionId: string,
    userId: string
  ): Promise<AlertActionResult> {
    return alertActionExecutor.executeAction(alertId, actionId, userId);
  }

  markAsRead(alertId: string): boolean {
    return alertProcessor.markAsRead(alertId);
  }

  markAsDismissed(alertId: string, reason?: string): boolean {
    return alertProcessor.markAsDismissed(alertId, reason);
  }

  bulkMarkAsRead(alertIds: string[]): number {
    return alertProcessor.bulkMarkAsRead(alertIds);
  }

  bulkDismiss(alertIds: string[], userId: string): Promise<{ success: number; failed: number }> {
    return alertActionExecutor.bulkDismiss(alertIds, userId);
  }

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================

  async sendNotification(alert: Alert, userId: string) {
    return notificationEngine.sendNotification(alert, userId);
  }

  getInAppNotifications(userId: string, limit?: number) {
    return notificationEngine.getInAppNotifications(userId, limit);
  }

  getUnreadNotificationCount(userId: string): number {
    return notificationEngine.getUnreadCount(userId);
  }

  markNotificationAsRead(userId: string, notificationId: string): boolean {
    return notificationEngine.markAsRead(userId, notificationId);
  }

  // ===========================================================================
  // PREFERENCES
  // ===========================================================================

  getUserPreferences(userId: string): NotificationPreferences {
    return notificationEngine.getUserPreferences(userId);
  }

  updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    return notificationEngine.updateUserPreferences(userId, updates);
  }

  // ===========================================================================
  // MAINTENANCE
  // ===========================================================================

  cleanupExpiredAlerts(): number {
    return alertProcessor.cleanupExpiredAlerts();
  }

  removeOldAlerts(daysOld: number): number {
    return alertProcessor.removeOldAlerts(daysOld);
  }
}

// Singleton export
export const unifiedAlertService = UnifiedAlertService.getInstance();
export const getUnifiedAlertService = () => UnifiedAlertService.getInstance();
