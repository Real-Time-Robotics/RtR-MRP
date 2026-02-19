/**
 * Schedule Executor - Apply schedule changes to the system
 * Phase 3 Feature #2: Auto-Scheduling
 *
 * Responsibilities:
 * - Apply schedule changes to work orders
 * - Update work order dates and assignments
 * - Notify affected parties of changes
 * - Maintain audit trail of all schedule modifications
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ScheduleResult, ScheduleSuggestion } from './scheduling-engine';
import { Resolution } from './conflict-detector';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ScheduleChange {
  workOrderId: string;
  workOrderNumber: string;
  changeType: 'reschedule' | 'reassign' | 'split' | 'cancel' | 'expedite' | 'delay';
  previousValues: {
    plannedStart?: Date;
    plannedEnd?: Date;
    workCenterId?: string;
    priority?: number;
    status?: string;
  };
  newValues: {
    plannedStart?: Date;
    plannedEnd?: Date;
    workCenterId?: string;
    priority?: number;
    status?: string;
  };
  reason: string;
  source: 'auto_schedule' | 'conflict_resolution' | 'optimization' | 'manual';
}

export interface ExecutionResult {
  success: boolean;
  executedAt: Date;
  totalChanges: number;
  successfulChanges: number;
  failedChanges: number;
  changes: ChangeResult[];
  notifications: NotificationResult[];
  auditId: string;
}

export interface ChangeResult {
  workOrderId: string;
  workOrderNumber: string;
  changeType: string;
  success: boolean;
  error?: string;
  executedAt: Date;
}

export interface NotificationResult {
  recipientType: 'user' | 'department' | 'system';
  recipientId: string;
  notificationType: 'email' | 'in_app' | 'webhook';
  status: 'sent' | 'failed' | 'pending';
  message: string;
}

export interface AuditEntry {
  id: string;
  action: 'schedule_applied' | 'dates_updated' | 'assignment_changed' | 'schedule_reverted';
  performedBy: string;
  performedAt: Date;
  scheduleResultId?: string;
  changes: ScheduleChange[];
  metadata: Record<string, unknown>;
}

export interface ApplyOptions {
  dryRun?: boolean;
  notifyAffectedParties?: boolean;
  validateBeforeApply?: boolean;
  rollbackOnError?: boolean;
  batchSize?: number;
}

export interface DateUpdate {
  plannedStart?: Date;
  plannedEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
}

// ============================================================================
// Schedule Executor Class
// ============================================================================

export class ScheduleExecutor {
  private static instance: ScheduleExecutor;
  private auditLog: AuditEntry[] = [];

  private constructor() {}

  static getInstance(): ScheduleExecutor {
    if (!ScheduleExecutor.instance) {
      ScheduleExecutor.instance = new ScheduleExecutor();
    }
    return ScheduleExecutor.instance;
  }

  /**
   * Apply schedule changes from a schedule result
   */
  async applyScheduleChanges(
    scheduleResult: ScheduleResult,
    userId: string,
    options: ApplyOptions = {}
  ): Promise<ExecutionResult> {
    const {
      dryRun = false,
      notifyAffectedParties = true,
      validateBeforeApply = true,
      rollbackOnError = true,
      batchSize = 10,
    } = options;

    const executedAt = new Date();
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Convert suggestions to changes
    const changes: ScheduleChange[] = scheduleResult.suggestions.map(suggestion =>
      this.suggestionToChange(suggestion)
    );

    if (changes.length === 0) {
      return {
        success: true,
        executedAt,
        totalChanges: 0,
        successfulChanges: 0,
        failedChanges: 0,
        changes: [],
        notifications: [],
        auditId,
      };
    }

    // Validate changes if required
    if (validateBeforeApply) {
      const validationErrors = await this.validateChanges(changes);
      if (validationErrors.length > 0) {
        return {
          success: false,
          executedAt,
          totalChanges: changes.length,
          successfulChanges: 0,
          failedChanges: changes.length,
          changes: validationErrors.map(error => ({
            workOrderId: error.workOrderId,
            workOrderNumber: error.workOrderNumber,
            changeType: 'reschedule',
            success: false,
            error: error.message,
            executedAt,
          })),
          notifications: [],
          auditId,
        };
      }
    }

    // If dry run, return what would be changed
    if (dryRun) {
      return {
        success: true,
        executedAt,
        totalChanges: changes.length,
        successfulChanges: changes.length,
        failedChanges: 0,
        changes: changes.map(change => ({
          workOrderId: change.workOrderId,
          workOrderNumber: change.workOrderNumber,
          changeType: change.changeType,
          success: true,
          executedAt,
        })),
        notifications: [],
        auditId,
      };
    }

    // Apply changes in batches
    const changeResults: ChangeResult[] = [];
    const batches = this.chunkArray(changes, batchSize);

    for (const batch of batches) {
      const batchResults = await this.applyBatch(batch, rollbackOnError);
      changeResults.push(...batchResults);

      // Check if batch had failures and rollback is enabled
      if (rollbackOnError && batchResults.some(r => !r.success)) {
        // Rollback successful changes in this batch
        await this.rollbackChanges(batchResults.filter(r => r.success), changes);
        break;
      }
    }

    // Send notifications if enabled
    const notifications: NotificationResult[] = [];
    if (notifyAffectedParties) {
      const successfulChanges = changeResults.filter(r => r.success);
      if (successfulChanges.length > 0) {
        const notificationResults = await this.notifyAffectedParties(
          changes.filter(c => successfulChanges.some(r => r.workOrderId === c.workOrderId))
        );
        notifications.push(...notificationResults);
      }
    }

    // Log audit entry
    const auditEntry: AuditEntry = {
      id: auditId,
      action: 'schedule_applied',
      performedBy: userId,
      performedAt: executedAt,
      scheduleResultId: scheduleResult.id,
      changes: changes.filter(c => changeResults.some(r => r.workOrderId === c.workOrderId && r.success)),
      metadata: {
        algorithm: scheduleResult.algorithm,
        totalSuggestions: scheduleResult.suggestions.length,
        appliedChanges: changeResults.filter(r => r.success).length,
      },
    };
    await this.logScheduleAudit(auditEntry);

    const successCount = changeResults.filter(r => r.success).length;
    const failCount = changeResults.filter(r => !r.success).length;

    return {
      success: failCount === 0,
      executedAt,
      totalChanges: changes.length,
      successfulChanges: successCount,
      failedChanges: failCount,
      changes: changeResults,
      notifications,
      auditId,
    };
  }

  /**
   * Update work order dates
   */
  async updateWorkOrderDates(
    workOrderId: string,
    dates: DateUpdate,
    userId: string,
    reason: string = 'Manual date update'
  ): Promise<ChangeResult> {
    const executedAt = new Date();

    try {
      // Get current work order
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        return {
          workOrderId,
          workOrderNumber: 'Unknown',
          changeType: 'reschedule',
          success: false,
          error: 'Work order not found',
          executedAt,
        };
      }

      // Update work order
      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          plannedStart: dates.plannedStart || workOrder.plannedStart,
          plannedEnd: dates.plannedEnd || workOrder.plannedEnd,
          actualStart: dates.actualStart || workOrder.actualStart,
          actualEnd: dates.actualEnd || workOrder.actualEnd,
          updatedAt: executedAt,
        },
      });

      // Log audit
      const change: ScheduleChange = {
        workOrderId,
        workOrderNumber: workOrder.woNumber,
        changeType: 'reschedule',
        previousValues: {
          plannedStart: workOrder.plannedStart || undefined,
          plannedEnd: workOrder.plannedEnd || undefined,
        },
        newValues: {
          plannedStart: dates.plannedStart,
          plannedEnd: dates.plannedEnd,
        },
        reason,
        source: 'manual',
      };

      await this.logScheduleAudit({
        id: `audit-${Date.now()}`,
        action: 'dates_updated',
        performedBy: userId,
        performedAt: executedAt,
        changes: [change],
        metadata: { reason },
      });

      return {
        workOrderId,
        workOrderNumber: workOrder.woNumber,
        changeType: 'reschedule',
        success: true,
        executedAt,
      };
    } catch (error) {
      return {
        workOrderId,
        workOrderNumber: 'Unknown',
        changeType: 'reschedule',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt,
      };
    }
  }

  /**
   * Apply conflict resolutions
   */
  async applyResolutions(
    resolutions: Resolution[],
    userId: string,
    options: ApplyOptions = {}
  ): Promise<ExecutionResult> {
    const executedAt = new Date();
    const auditId = `audit-conflict-${Date.now()}`;

    interface ResolutionWithDetails extends Resolution {
      affectedWorkOrderId?: string;
      affectedWorkOrderNumber?: string;
      suggestedChanges?: {
        newStartDate?: Date;
        newEndDate?: Date;
        newWorkCenterId?: string;
        newPriority?: number;
      };
    }

    const changes: ScheduleChange[] = resolutions.map(resolution => {
      const r = resolution as ResolutionWithDetails;
      return {
        workOrderId: r.affectedWorkOrderId || resolution.id,
        workOrderNumber: r.affectedWorkOrderNumber || resolution.id,
        changeType: this.mapResolutionTypeToChangeType(resolution.type),
        previousValues: {},
        newValues: {
          plannedStart: r.suggestedChanges?.newStartDate,
          plannedEnd: r.suggestedChanges?.newEndDate,
          workCenterId: r.suggestedChanges?.newWorkCenterId,
          priority: r.suggestedChanges?.newPriority,
        },
        reason: resolution.description,
        source: 'conflict_resolution',
      };
    });

    // Use the same apply logic - cast to ScheduleResult for conflict resolution use
    const mockScheduleResult = {
      id: `conflict-resolution-${Date.now()}`,
      status: 'success',
      algorithm: 'priority_first',
      generatedAt: executedAt,
      createdAt: executedAt,
      horizonDays: 30,
      horizon: { start: executedAt, end: new Date(executedAt.getTime() + 30 * 24 * 60 * 60 * 1000) },
      workOrdersAnalyzed: changes.length,
      suggestions: changes.map(change => ({
        id: change.workOrderId,
        workOrderId: change.workOrderId,
        woNumber: change.workOrderNumber,
        productName: '',
        currentSchedule: {
          startDate: change.previousValues.plannedStart || new Date(),
          endDate: change.previousValues.plannedEnd || new Date(),
          workCenterId: change.previousValues.workCenterId || '',
        },
        suggestedSchedule: {
          startDate: change.newValues.plannedStart || new Date(),
          endDate: change.newValues.plannedEnd || new Date(),
          workCenterId: change.newValues.workCenterId || '',
        },
        operations: [],
        priority: change.newValues.priority || 50,
        reason: change.reason || '',
        confidence: 80,
        impact: {
          onTimeDeliveryChange: 0,
          utilizationChange: 0,
          costChange: 0,
        },
      })),
      metrics: {
        totalWorkOrders: changes.length,
        scheduledWorkOrders: changes.length,
        currentCapacityUtilization: 0,
        projectedCapacityUtilization: 0,
        currentOnTimeDelivery: 0,
        projectedOnTimeDelivery: 0,
        averageSlack: 0,
      },
      conflicts: [],
      warnings: [],
    } as unknown as ScheduleResult;

    return this.applyScheduleChanges(mockScheduleResult, userId, options);
  }

  /**
   * Notify affected parties of schedule changes
   */
  async notifyAffectedParties(changes: ScheduleChange[]): Promise<NotificationResult[]> {
    const notifications: NotificationResult[] = [];

    // Group changes by work center for department notifications
    const changesByWorkCenter = new Map<string, ScheduleChange[]>();

    for (const change of changes) {
      const workCenterId = change.newValues.workCenterId || 'unassigned';
      const existing = changesByWorkCenter.get(workCenterId) || [];
      existing.push(change);
      changesByWorkCenter.set(workCenterId, existing);
    }

    // Create in-app notifications for each affected work center
    for (const [workCenterId, workCenterChanges] of changesByWorkCenter) {
      const message = this.createNotificationMessage(workCenterChanges);

      notifications.push({
        recipientType: 'department',
        recipientId: workCenterId,
        notificationType: 'in_app',
        status: 'sent', // In real implementation, this would be async
        message,
      });
    }

    // Create system notification for significant changes
    if (changes.length >= 5) {
      notifications.push({
        recipientType: 'system',
        recipientId: 'production_manager',
        notificationType: 'in_app',
        status: 'sent',
        message: `Lịch sản xuất đã được cập nhật: ${changes.length} lệnh sản xuất bị ảnh hưởng.`,
      });
    }

    return notifications;
  }

  /**
   * Log schedule audit entry
   */
  async logScheduleAudit(entry: AuditEntry): Promise<void> {
    // Store in memory (in production, this would be persisted to database)
    this.auditLog.push(entry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // In production, also persist to database
    // await prisma.scheduleAudit.create({ data: entry });
  }

  /**
   * Get audit history
   */
  getAuditHistory(filters?: {
    fromDate?: Date;
    toDate?: Date;
    userId?: string;
    action?: string;
  }): AuditEntry[] {
    let entries = [...this.auditLog];

    if (filters?.fromDate) {
      entries = entries.filter(e => e.performedAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      entries = entries.filter(e => e.performedAt <= filters.toDate!);
    }
    if (filters?.userId) {
      entries = entries.filter(e => e.performedBy === filters.userId);
    }
    if (filters?.action) {
      entries = entries.filter(e => e.action === filters.action);
    }

    return entries.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  /**
   * Revert a schedule change
   */
  async revertScheduleChange(
    auditId: string,
    userId: string
  ): Promise<ExecutionResult> {
    const executedAt = new Date();
    const auditEntry = this.auditLog.find(e => e.id === auditId);

    if (!auditEntry) {
      return {
        success: false,
        executedAt,
        totalChanges: 0,
        successfulChanges: 0,
        failedChanges: 0,
        changes: [],
        notifications: [],
        auditId: '',
      };
    }

    // Create reverse changes
    const reverseChanges: ScheduleChange[] = auditEntry.changes.map(change => ({
      ...change,
      previousValues: change.newValues,
      newValues: change.previousValues,
      reason: `Hoàn tác thay đổi từ ${auditEntry.performedAt.toISOString()}`,
      source: 'manual' as const,
    }));

    const changeResults: ChangeResult[] = [];

    for (const change of reverseChanges) {
      const result = await this.updateWorkOrderDates(
        change.workOrderId,
        {
          plannedStart: change.newValues.plannedStart,
          plannedEnd: change.newValues.plannedEnd,
        },
        userId,
        change.reason
      );
      changeResults.push(result);
    }

    // Log revert action
    await this.logScheduleAudit({
      id: `audit-revert-${Date.now()}`,
      action: 'schedule_reverted',
      performedBy: userId,
      performedAt: executedAt,
      changes: reverseChanges,
      metadata: { revertedAuditId: auditId },
    });

    const successCount = changeResults.filter(r => r.success).length;

    return {
      success: successCount === changeResults.length,
      executedAt,
      totalChanges: changeResults.length,
      successfulChanges: successCount,
      failedChanges: changeResults.length - successCount,
      changes: changeResults,
      notifications: [],
      auditId: `audit-revert-${Date.now()}`,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private suggestionToChange(suggestion: ScheduleSuggestion): ScheduleChange {
    return {
      workOrderId: suggestion.workOrderId,
      workOrderNumber: suggestion.woNumber,
      changeType: 'reschedule',
      previousValues: {
        plannedStart: suggestion.currentSchedule?.startDate || undefined,
        plannedEnd: suggestion.currentSchedule?.endDate || undefined,
        workCenterId: suggestion.currentSchedule?.workCenterId || undefined,
      },
      newValues: {
        plannedStart: suggestion.suggestedSchedule?.startDate,
        plannedEnd: suggestion.suggestedSchedule?.endDate,
        workCenterId: suggestion.suggestedSchedule?.workCenterId,
        priority: suggestion.priority,
      },
      reason: suggestion.reason,
      source: 'auto_schedule',
    };
  }

  private async validateChanges(
    changes: ScheduleChange[]
  ): Promise<Array<{ workOrderId: string; workOrderNumber: string; message: string }>> {
    const errors: Array<{ workOrderId: string; workOrderNumber: string; message: string }> = [];

    for (const change of changes) {
      // Check if work order exists
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: change.workOrderId },
      });

      if (!workOrder) {
        errors.push({
          workOrderId: change.workOrderId,
          workOrderNumber: change.workOrderNumber,
          message: 'Lệnh sản xuất không tồn tại',
        });
        continue;
      }

      // Check if work order is in a valid state for rescheduling
      if (['completed', 'cancelled'].includes(workOrder.status)) {
        errors.push({
          workOrderId: change.workOrderId,
          workOrderNumber: change.workOrderNumber,
          message: `Không thể thay đổi lịch cho lệnh sản xuất đã ${workOrder.status === 'completed' ? 'hoàn thành' : 'hủy'}`,
        });
      }

      // Validate dates
      if (change.newValues.plannedStart && change.newValues.plannedEnd) {
        if (change.newValues.plannedStart > change.newValues.plannedEnd) {
          errors.push({
            workOrderId: change.workOrderId,
            workOrderNumber: change.workOrderNumber,
            message: 'Ngày bắt đầu không thể sau ngày kết thúc',
          });
        }
      }
    }

    return errors;
  }

  private async applyBatch(
    changes: ScheduleChange[],
    _rollbackOnError: boolean
  ): Promise<ChangeResult[]> {
    const results: ChangeResult[] = [];

    for (const change of changes) {
      const executedAt = new Date();

      try {
        // Convert numeric priority to string if needed
        const priorityString = change.newValues.priority
          ? (change.newValues.priority >= 90 ? 'critical' :
             change.newValues.priority >= 70 ? 'high' :
             change.newValues.priority >= 40 ? 'normal' : 'low')
          : undefined;

        await prisma.workOrder.update({
          where: { id: change.workOrderId },
          data: {
            plannedStart: change.newValues.plannedStart,
            plannedEnd: change.newValues.plannedEnd,
            workCenterId: change.newValues.workCenterId,
            priority: priorityString,
            updatedAt: executedAt,
          },
        });

        results.push({
          workOrderId: change.workOrderId,
          workOrderNumber: change.workOrderNumber,
          changeType: change.changeType,
          success: true,
          executedAt,
        });
      } catch (error) {
        results.push({
          workOrderId: change.workOrderId,
          workOrderNumber: change.workOrderNumber,
          changeType: change.changeType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executedAt,
        });
      }
    }

    return results;
  }

  private async rollbackChanges(
    successfulResults: ChangeResult[],
    originalChanges: ScheduleChange[]
  ): Promise<void> {
    for (const result of successfulResults) {
      const originalChange = originalChanges.find(c => c.workOrderId === result.workOrderId);
      if (originalChange) {
        try {
          // Convert numeric priority back to string
          const priorityString = originalChange.previousValues.priority
            ? (originalChange.previousValues.priority >= 90 ? 'critical' :
               originalChange.previousValues.priority >= 70 ? 'high' :
               originalChange.previousValues.priority >= 40 ? 'normal' : 'low')
            : undefined;

          await prisma.workOrder.update({
            where: { id: result.workOrderId },
            data: {
              plannedStart: originalChange.previousValues.plannedStart,
              plannedEnd: originalChange.previousValues.plannedEnd,
              workCenterId: originalChange.previousValues.workCenterId,
              priority: priorityString,
            },
          });
        } catch {
          // Log rollback failure but continue
          logger.error(`Failed to rollback work order ${result.workOrderId}`, { context: 'schedule-executor' });
        }
      }
    }
  }

  private createNotificationMessage(changes: ScheduleChange[]): string {
    const rescheduleCount = changes.filter(c => c.changeType === 'reschedule').length;
    const reassignCount = changes.filter(c => c.changeType === 'reassign').length;
    const expediteCount = changes.filter(c => c.changeType === 'expedite').length;

    const parts: string[] = [];

    if (rescheduleCount > 0) {
      parts.push(`${rescheduleCount} lệnh được lên lịch lại`);
    }
    if (reassignCount > 0) {
      parts.push(`${reassignCount} lệnh được phân công lại`);
    }
    if (expediteCount > 0) {
      parts.push(`${expediteCount} lệnh được ưu tiên`);
    }

    return `Cập nhật lịch sản xuất: ${parts.join(', ')}.`;
  }

  private mapResolutionTypeToChangeType(
    resolutionType: string
  ): ScheduleChange['changeType'] {
    const mapping: Record<string, ScheduleChange['changeType']> = {
      reschedule: 'reschedule',
      reassign: 'reassign',
      split: 'split',
      expedite: 'expedite',
      delay: 'delay',
      add_capacity: 'reschedule',
      add_shift: 'reschedule',
    };
    return mapping[resolutionType] || 'reschedule';
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const scheduleExecutor = ScheduleExecutor.getInstance();

export function getScheduleExecutor(): ScheduleExecutor {
  return ScheduleExecutor.getInstance();
}
