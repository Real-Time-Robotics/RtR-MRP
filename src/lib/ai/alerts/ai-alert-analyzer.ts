// =============================================================================
// INTELLIGENT ALERTS - AI Alert Analyzer
// Uses AI to summarize, correlate, and analyze alerts
// =============================================================================

import { getAIProvider, AIProviderService, createSystemMessage, createUserMessage } from '@/lib/ai/provider';
import { logger } from '@/lib/logger';
import {
  Alert,
  AlertType,
  AlertPriority,
  AlertSource,
  AlertGroup,
  AlertDigest,
  UrgencyPrediction,
  getPriorityLabel,
  getSourceLabel,
  getTypeLabel,
} from './alert-types';

// =============================================================================
// AI ALERT ANALYZER CLASS
// =============================================================================

export class AIAlertAnalyzer {
  private static instance: AIAlertAnalyzer;
  private aiProvider: AIProviderService;

  private constructor() {
    this.aiProvider = getAIProvider();
  }

  static getInstance(): AIAlertAnalyzer {
    if (!AIAlertAnalyzer.instance) {
      AIAlertAnalyzer.instance = new AIAlertAnalyzer();
    }
    return AIAlertAnalyzer.instance;
  }

  // ===========================================================================
  // SUMMARIZE ALERTS
  // ===========================================================================

  async summarizeAlerts(alerts: Alert[]): Promise<string> {
    if (alerts.length === 0) {
      return 'Không có cảnh báo nào cần xử lý. Hệ thống đang hoạt động bình thường.';
    }

    const critical = alerts.filter(a => a.priority === AlertPriority.CRITICAL);
    const high = alerts.filter(a => a.priority === AlertPriority.HIGH);
    const medium = alerts.filter(a => a.priority === AlertPriority.MEDIUM);

    // Build context for AI
    const alertContext = this.buildAlertContext(alerts);

    try {
      const messages = [
        createSystemMessage('Bạn là trợ lý AI cho hệ thống MRP. Trả lời bằng tiếng Việt.'),
        createUserMessage(`Hãy tóm tắt các cảnh báo sau bằng tiếng Việt, ngắn gọn và dễ hiểu:

${alertContext}

Yêu cầu:
1. Liệt kê các vấn đề cần xử lý NGAY (Critical)
2. Các vấn đề cần chú ý trong ngày (High)
3. Đề xuất thứ tự ưu tiên xử lý
4. Giữ tóm tắt dưới 200 từ`)
      ];

      const response = await this.aiProvider.chat({ messages, maxTokens: 500 });
      return response.content;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'ai-alert-analyzer', operation: 'generateSummary' });

      // Fallback to rule-based summary
      return this.generateFallbackSummary(critical, high, medium);
    }
  }

  private generateFallbackSummary(
    critical: Alert[],
    high: Alert[],
    medium: Alert[]
  ): string {
    const parts: string[] = [];

    if (critical.length > 0) {
      parts.push(`🔴 Có ${critical.length} vấn đề CẦN XỬ LÝ NGAY:`);
      critical.slice(0, 3).forEach((alert, i) => {
        parts.push(`  ${i + 1}. ${alert.title}`);
      });
    }

    if (high.length > 0) {
      parts.push(`\n🟠 Có ${high.length} vấn đề cần chú ý trong 24h:`);
      high.slice(0, 3).forEach((alert, i) => {
        parts.push(`  ${i + 1}. ${alert.title}`);
      });
    }

    if (medium.length > 0) {
      parts.push(`\n🟡 Có ${medium.length} vấn đề cần theo dõi trong tuần.`);
    }

    if (parts.length === 0) {
      parts.push('✅ Không có vấn đề nghiêm trọng. Hệ thống hoạt động bình thường.');
    } else {
      parts.push('\n💡 Đề xuất: Xử lý theo thứ tự ưu tiên từ Critical → High → Medium.');
    }

    return parts.join('\n');
  }

  private buildAlertContext(alerts: Alert[]): string {
    const grouped = this.groupByPriority(alerts);
    const lines: string[] = [];

    for (const [priority, alertList] of Object.entries(grouped)) {
      if (alertList.length > 0) {
        lines.push(`\n## ${getPriorityLabel(priority as AlertPriority)} (${alertList.length} alerts)`);
        alertList.slice(0, 5).forEach(alert => {
          lines.push(`- [${getTypeLabel(alert.type)}] ${alert.title}: ${alert.message}`);
        });
        if (alertList.length > 5) {
          lines.push(`  ... và ${alertList.length - 5} alerts khác`);
        }
      }
    }

    return lines.join('\n');
  }

  private groupByPriority(alerts: Alert[]): Record<string, Alert[]> {
    return {
      [AlertPriority.CRITICAL]: alerts.filter(a => a.priority === AlertPriority.CRITICAL),
      [AlertPriority.HIGH]: alerts.filter(a => a.priority === AlertPriority.HIGH),
      [AlertPriority.MEDIUM]: alerts.filter(a => a.priority === AlertPriority.MEDIUM),
      [AlertPriority.LOW]: alerts.filter(a => a.priority === AlertPriority.LOW),
    };
  }

  // ===========================================================================
  // CORRELATE ALERTS
  // ===========================================================================

  async correlateAlerts(alerts: Alert[]): Promise<AlertGroup[]> {
    const groups: AlertGroup[] = [];
    const processed = new Set<string>();

    for (const alert of alerts) {
      if (processed.has(alert.id)) continue;

      // Find related alerts
      const related = this.findRelatedAlerts(alert, alerts);

      if (related.length > 0) {
        const group: AlertGroup = {
          correlationId: alert.correlationId || alert.id,
          primaryAlert: alert,
          relatedAlerts: related,
          commonEntity: this.findCommonEntity(alert, related),
          groupReason: this.determineGroupReason(alert, related),
        };

        groups.push(group);

        // Mark as processed
        processed.add(alert.id);
        related.forEach(r => processed.add(r.id));
      }
    }

    return groups;
  }

  private findRelatedAlerts(alert: Alert, allAlerts: Alert[]): Alert[] {
    const related: Alert[] = [];

    for (const other of allAlerts) {
      if (other.id === alert.id) continue;

      // Same entity
      const hasCommonEntity = alert.entities.some(e1 =>
        other.entities.some(e2 => e1.type === e2.type && e1.id === e2.id)
      );

      if (hasCommonEntity) {
        related.push(other);
        continue;
      }

      // Same correlation ID
      if (alert.correlationId && alert.correlationId === other.correlationId) {
        related.push(other);
        continue;
      }

      // Same type and source within time window (1 hour)
      if (alert.type === other.type &&
          alert.source === other.source &&
          Math.abs(alert.createdAt.getTime() - other.createdAt.getTime()) < 3600000) {
        related.push(other);
      }
    }

    return related;
  }

  private findCommonEntity(alert: Alert, related: Alert[]): Alert['entities'][0] | undefined {
    for (const entity of alert.entities) {
      const isCommon = related.every(r =>
        r.entities.some(e => e.type === entity.type && e.id === entity.id)
      );
      if (isCommon) return entity;
    }
    return alert.entities[0];
  }

  private determineGroupReason(alert: Alert, related: Alert[]): string {
    const commonEntity = this.findCommonEntity(alert, related);

    if (commonEntity) {
      return `Liên quan đến ${commonEntity.type}: ${commonEntity.name || commonEntity.code || commonEntity.id}`;
    }

    if (related.every(r => r.type === alert.type)) {
      return `Cùng loại: ${getTypeLabel(alert.type)}`;
    }

    if (related.every(r => r.source === alert.source)) {
      return `Cùng nguồn: ${getSourceLabel(alert.source)}`;
    }

    return 'Các cảnh báo liên quan';
  }

  // ===========================================================================
  // PREDICT URGENCY
  // ===========================================================================

  async predictUrgency(alert: Alert): Promise<UrgencyPrediction> {
    // Calculate hours until critical based on alert data
    let hoursUntilCritical = 168; // Default: 1 week
    let impactScore = 50;
    let impactDescription = '';
    let recommendedAction = '';

    const data = alert.data as Record<string, unknown>;

    switch (alert.type) {
      case AlertType.STOCKOUT:
        const daysOfSupply = (data.daysOfSupply as number) || 7;
        hoursUntilCritical = daysOfSupply * 24;
        impactScore = daysOfSupply <= 2 ? 95 : daysOfSupply <= 5 ? 75 : 50;
        impactDescription = `Hết hàng sau ${daysOfSupply} ngày sẽ ảnh hưởng đến sản xuất`;
        recommendedAction = 'Đặt hàng ngay từ Auto-PO suggestions';
        break;

      case AlertType.QUALITY_CRITICAL:
        hoursUntilCritical = 2;
        impactScore = 90;
        impactDescription = 'Lỗi chất lượng có thể gây reject hàng loạt';
        recommendedAction = 'Dừng sản xuất và kiểm tra ngay';
        break;

      case AlertType.SUPPLIER_DELIVERY:
        const delayDays = (data.delayDays as number) || 0;
        hoursUntilCritical = 24;
        impactScore = delayDays > 5 ? 85 : delayDays > 3 ? 70 : 55;
        impactDescription = `Delay ${delayDays} ngày có thể ảnh hưởng đến ${(data.affectedWorkOrders as string[])?.length || 0} WOs`;
        recommendedAction = 'Liên hệ supplier hoặc tìm nguồn thay thế';
        break;

      case AlertType.SCHEDULE_CONFLICT:
        hoursUntilCritical = 8;
        impactScore = 80;
        impactDescription = 'Conflict sẽ gây delay sản xuất';
        recommendedAction = 'Apply schedule fix từ Auto-Schedule';
        break;

      case AlertType.DEADLINE_RISK:
        const daysUntilDue = (data.daysUntilDue as number) || 7;
        hoursUntilCritical = daysUntilDue * 24;
        impactScore = daysUntilDue <= 2 ? 90 : daysUntilDue <= 5 ? 70 : 50;
        impactDescription = `Còn ${daysUntilDue} ngày đến deadline`;
        recommendedAction = 'Ưu tiên và tối ưu schedule';
        break;

      case AlertType.PO_PENDING:
        const pendingHours = (data.pendingHours as number) || 0;
        hoursUntilCritical = Math.max(24 - pendingHours, 1);
        impactScore = pendingHours > 24 ? 70 : 50;
        impactDescription = `Đã chờ ${pendingHours} giờ, có thể ảnh hưởng đến supply`;
        recommendedAction = 'Review và approve/reject PO suggestion';
        break;

      default:
        impactDescription = alert.message;
        recommendedAction = 'Xem chi tiết và xử lý theo hướng dẫn';
    }

    // Adjust based on priority
    if (alert.priority === AlertPriority.CRITICAL) {
      hoursUntilCritical = Math.min(hoursUntilCritical, 4);
      impactScore = Math.max(impactScore, 85);
    } else if (alert.priority === AlertPriority.HIGH) {
      hoursUntilCritical = Math.min(hoursUntilCritical, 24);
      impactScore = Math.max(impactScore, 65);
    }

    return {
      alertId: alert.id,
      hoursUntilCritical,
      impactScore,
      impactDescription,
      recommendedAction,
      confidenceScore: 75, // Default confidence
    };
  }

  // ===========================================================================
  // RECOMMEND PRIORITIZATION
  // ===========================================================================

  async recommendPrioritization(alerts: Alert[]): Promise<Alert[]> {
    if (alerts.length === 0) return [];

    // Calculate urgency for all alerts
    const alertsWithUrgency: Array<{ alert: Alert; urgency: UrgencyPrediction }> = [];

    for (const alert of alerts) {
      const urgency = await this.predictUrgency(alert);
      alertsWithUrgency.push({ alert, urgency });
    }

    // Sort by urgency score (composite of impact and time)
    alertsWithUrgency.sort((a, b) => {
      // Higher impact first
      const impactDiff = b.urgency.impactScore - a.urgency.impactScore;
      if (Math.abs(impactDiff) > 10) return impactDiff;

      // Then by time until critical
      return a.urgency.hoursUntilCritical - b.urgency.hoursUntilCritical;
    });

    return alertsWithUrgency.map(item => item.alert);
  }

  // ===========================================================================
  // GENERATE DAILY DIGEST
  // ===========================================================================

  async generateDailyDigest(alerts: Alert[]): Promise<AlertDigest> {
    const now = new Date();
    const todayAlerts = alerts.filter(a => {
      const diff = now.getTime() - a.createdAt.getTime();
      return diff < 24 * 60 * 60 * 1000;
    });

    const critical = todayAlerts.filter(a => a.priority === AlertPriority.CRITICAL);
    const high = todayAlerts.filter(a => a.priority === AlertPriority.HIGH);
    const medium = todayAlerts.filter(a => a.priority === AlertPriority.MEDIUM);
    const low = todayAlerts.filter(a => a.priority === AlertPriority.LOW);

    // Generate AI summary
    const summary = await this.summarizeAlerts(todayAlerts);

    // Get top alerts
    const topAlerts = await this.recommendPrioritization(
      todayAlerts.filter(a =>
        a.priority === AlertPriority.CRITICAL ||
        a.priority === AlertPriority.HIGH
      )
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(todayAlerts);

    // Calculate trends
    const trends = this.calculateTrends(alerts);

    return {
      period: 'daily',
      generatedAt: now,
      summary,
      criticalCount: critical.length,
      highCount: high.length,
      mediumCount: medium.length,
      lowCount: low.length,
      topAlerts: topAlerts.slice(0, 5),
      recommendations,
      trends,
    };
  }

  async generateWeeklyReport(alerts: Alert[]): Promise<AlertDigest> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekAlerts = alerts.filter(a => a.createdAt >= weekAgo);

    const critical = weekAlerts.filter(a => a.priority === AlertPriority.CRITICAL);
    const high = weekAlerts.filter(a => a.priority === AlertPriority.HIGH);
    const medium = weekAlerts.filter(a => a.priority === AlertPriority.MEDIUM);
    const low = weekAlerts.filter(a => a.priority === AlertPriority.LOW);

    // Generate weekly summary
    const summary = await this.generateWeeklySummary(weekAlerts);

    // Get top alerts
    const topAlerts = await this.recommendPrioritization(
      weekAlerts.filter(a =>
        a.priority === AlertPriority.CRITICAL ||
        a.priority === AlertPriority.HIGH
      )
    );

    // Generate recommendations
    const recommendations = this.generateWeeklyRecommendations(weekAlerts);

    // Calculate trends
    const trends = this.calculateTrends(alerts);

    return {
      period: 'weekly',
      generatedAt: now,
      summary,
      criticalCount: critical.length,
      highCount: high.length,
      mediumCount: medium.length,
      lowCount: low.length,
      topAlerts: topAlerts.slice(0, 10),
      recommendations,
      trends,
    };
  }

  private async generateWeeklySummary(alerts: Alert[]): Promise<string> {
    const bySource: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const alert of alerts) {
      bySource[alert.source] = (bySource[alert.source] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    }

    const parts: string[] = [
      `📊 Báo cáo tuần - ${alerts.length} cảnh báo tổng cộng`,
      '',
    ];

    // Top sources
    const sortedSources = Object.entries(bySource)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    parts.push('🔍 Nguồn phát sinh nhiều nhất:');
    sortedSources.forEach(([source, count]) => {
      parts.push(`  - ${getSourceLabel(source as AlertSource)}: ${count} alerts`);
    });

    // Top types
    const sortedTypes = Object.entries(byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    parts.push('\n📋 Loại cảnh báo phổ biến:');
    sortedTypes.forEach(([type, count]) => {
      parts.push(`  - ${getTypeLabel(type as AlertType)}: ${count}`);
    });

    return parts.join('\n');
  }

  private generateRecommendations(alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    // Stockout recommendations
    const stockouts = alerts.filter(a => a.type === AlertType.STOCKOUT);
    if (stockouts.length > 0) {
      recommendations.push(
        `Review Auto-PO queue - có ${stockouts.length} parts cần đặt hàng gấp`
      );
    }

    // Quality recommendations
    const qualityAlerts = alerts.filter(a =>
      a.type === AlertType.QUALITY_CRITICAL ||
      a.type === AlertType.QUALITY_RISK
    );
    if (qualityAlerts.length > 0) {
      recommendations.push(
        `Kiểm tra QC process - ${qualityAlerts.length} vấn đề chất lượng cần giải quyết`
      );
    }

    // Supplier recommendations
    const supplierAlerts = alerts.filter(a =>
      a.type === AlertType.SUPPLIER_DELIVERY ||
      a.type === AlertType.SUPPLIER_RISK
    );
    if (supplierAlerts.length > 0) {
      recommendations.push(
        `Review supplier performance - ${supplierAlerts.length} vấn đề NCC`
      );
    }

    // Schedule recommendations
    const scheduleAlerts = alerts.filter(a =>
      a.type === AlertType.SCHEDULE_CONFLICT ||
      a.type === AlertType.DEADLINE_RISK
    );
    if (scheduleAlerts.length > 0) {
      recommendations.push(
        `Tối ưu schedule - ${scheduleAlerts.length} conflicts/deadline risks`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Tiếp tục theo dõi hệ thống. Không có vấn đề lớn.');
    }

    return recommendations;
  }

  private generateWeeklyRecommendations(alerts: Alert[]): string[] {
    const recommendations = this.generateRecommendations(alerts);

    // Add weekly-specific recommendations
    const resolvedRate = alerts.filter(a =>
      a.status === 'RESOLVED' || a.status === 'DISMISSED'
    ).length / Math.max(alerts.length, 1);

    if (resolvedRate < 0.5) {
      recommendations.push(
        `Tỉ lệ xử lý alert thấp (${Math.round(resolvedRate * 100)}%). Cần tăng cường monitoring.`
      );
    }

    return recommendations;
  }

  private calculateTrends(alerts: Alert[]): AlertDigest['trends'] {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = alerts.filter(a => a.createdAt >= weekAgo);
    const lastWeek = alerts.filter(a =>
      a.createdAt >= twoWeeksAgo && a.createdAt < weekAgo
    );

    const categories = [
      AlertSource.FORECAST,
      AlertSource.QUALITY,
      AlertSource.SUPPLIER_RISK,
      AlertSource.AUTO_PO,
      AlertSource.AUTO_SCHEDULE,
    ];

    return categories.map(category => {
      const thisWeekCount = thisWeek.filter(a => a.source === category).length;
      const lastWeekCount = lastWeek.filter(a => a.source === category).length;

      const change = lastWeekCount > 0
        ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
        : thisWeekCount > 0 ? 100 : 0;

      return {
        category: getSourceLabel(category),
        trend: change > 10 ? 'increasing' as const :
               change < -10 ? 'decreasing' as const : 'stable' as const,
        change: Math.round(change),
      };
    });
  }
}

// Singleton export
export const aiAlertAnalyzer = AIAlertAnalyzer.getInstance();
export const getAIAlertAnalyzer = () => AIAlertAnalyzer.getInstance();
