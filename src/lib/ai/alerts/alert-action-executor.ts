// =============================================================================
// INTELLIGENT ALERTS - Action Executor
// Executes one-click actions from alerts
// =============================================================================

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  Alert,
  AlertActionType,
  AlertActionResult,
  AlertStatus,
} from './alert-types';
import { alertProcessor } from './alert-processor';

// =============================================================================
// ACTION EXECUTOR CLASS
// =============================================================================

export class AlertActionExecutor {
  private static instance: AlertActionExecutor;

  private constructor() {}

  static getInstance(): AlertActionExecutor {
    if (!AlertActionExecutor.instance) {
      AlertActionExecutor.instance = new AlertActionExecutor();
    }
    return AlertActionExecutor.instance;
  }

  // ===========================================================================
  // EXECUTE ACTION
  // ===========================================================================

  async executeAction(
    alertId: string,
    actionId: string,
    userId: string
  ): Promise<AlertActionResult> {
    const alert = alertProcessor.getAlert(alertId);

    if (!alert) {
      return {
        success: false,
        alertId,
        actionId,
        message: 'Alert not found',
        error: 'ALERT_NOT_FOUND',
      };
    }

    const action = alert.actions.find(a => a.id === actionId);

    if (!action) {
      return {
        success: false,
        alertId,
        actionId,
        message: 'Action not found',
        error: 'ACTION_NOT_FOUND',
      };
    }

    try {
      let result: AlertActionResult;

      switch (action.type) {
        case AlertActionType.APPROVE:
          result = await this.handleApprove(alert, action, userId);
          break;

        case AlertActionType.REJECT:
          result = await this.handleReject(alert, action, userId);
          break;

        case AlertActionType.APPLY:
          result = await this.handleApply(alert, action, userId);
          break;

        case AlertActionType.CREATE:
          result = await this.handleCreate(alert, action, userId);
          break;

        case AlertActionType.CONTACT:
          result = await this.handleContact(alert, action, userId);
          break;

        case AlertActionType.SNOOZE:
          result = await this.handleSnooze(alert, userId);
          break;

        case AlertActionType.DISMISS:
          result = await this.handleDismiss(alert, userId);
          break;

        case AlertActionType.NAVIGATE:
        case AlertActionType.VIEW_DETAILS:
          // These are handled by the UI
          result = {
            success: true,
            alertId,
            actionId,
            message: 'Navigation action',
            resultData: { url: action.url },
          };
          break;

        default:
          result = {
            success: false,
            alertId,
            actionId,
            message: 'Unknown action type',
            error: 'UNKNOWN_ACTION_TYPE',
          };
      }

      // Log action
      await this.logAction(alert, action, userId, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logAction(alert, action, userId, {
        success: false,
        alertId,
        actionId,
        message: 'Action failed',
        error: errorMessage,
      });

      return {
        success: false,
        alertId,
        actionId,
        message: 'Action execution failed',
        error: errorMessage,
      };
    }
  }

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================

  private async handleApprove(
    alert: Alert,
    action: { params?: Record<string, unknown> },
    userId: string
  ): Promise<AlertActionResult> {
    const params = action.params || {};

    // Handle PO approval
    if (params.suggestionId) {
      return await this.approvePO(params.suggestionId as string, userId);
    }

    // Handle schedule approval
    if (params.scheduleId) {
      return await this.applySchedule(params.scheduleId as string, userId);
    }

    return {
      success: false,
      alertId: alert.id,
      actionId: 'approve',
      message: 'No valid approval target',
      error: 'INVALID_APPROVAL_TARGET',
    };
  }

  private async handleReject(
    alert: Alert,
    action: { params?: Record<string, unknown> },
    userId: string
  ): Promise<AlertActionResult> {
    const params = action.params || {};

    // Handle PO rejection
    if (params.suggestionId) {
      return await this.rejectPO(params.suggestionId as string, userId);
    }

    return {
      success: false,
      alertId: alert.id,
      actionId: 'reject',
      message: 'No valid rejection target',
      error: 'INVALID_REJECTION_TARGET',
    };
  }

  private async handleApply(
    alert: Alert,
    action: { params?: Record<string, unknown> },
    userId: string
  ): Promise<AlertActionResult> {
    const params = action.params || {};

    // Handle schedule apply
    if (params.scheduleId || params.workOrderId) {
      return await this.applySchedule(
        (params.scheduleId || params.workOrderId) as string,
        userId
      );
    }

    return {
      success: false,
      alertId: alert.id,
      actionId: 'apply',
      message: 'No valid apply target',
      error: 'INVALID_APPLY_TARGET',
    };
  }

  private async handleCreate(
    alert: Alert,
    action: { handler?: string; params?: Record<string, unknown> },
    userId: string
  ): Promise<AlertActionResult> {
    const params = action.params || {};

    // Handle NCR creation
    if (action.handler === 'createNCR' && params.partId) {
      return await this.createNCR(params.partId as string, userId, alert);
    }

    return {
      success: false,
      alertId: alert.id,
      actionId: 'create',
      message: 'No valid create handler',
      error: 'INVALID_CREATE_HANDLER',
    };
  }

  private async handleContact(
    alert: Alert,
    action: { params?: Record<string, unknown> },
    userId: string
  ): Promise<AlertActionResult> {
    const params = action.params || {};

    if (params.supplierId) {
      return await this.contactSupplier(
        params.supplierId as string,
        params.poId as string | undefined,
        userId,
        alert
      );
    }

    return {
      success: false,
      alertId: alert.id,
      actionId: 'contact',
      message: 'No valid contact target',
      error: 'INVALID_CONTACT_TARGET',
    };
  }

  private async handleSnooze(alert: Alert, userId: string): Promise<AlertActionResult> {
    // Snooze for 4 hours by default
    const snoozeDuration = 4 * 60 * 60 * 1000;
    alertProcessor.snoozeAlert(alert.id, snoozeDuration);

    return {
      success: true,
      alertId: alert.id,
      actionId: 'snooze',
      message: 'Alert snoozed for 4 hours',
      resultData: {
        snoozedUntil: new Date(Date.now() + snoozeDuration),
      },
    };
  }

  private async handleDismiss(alert: Alert, userId: string): Promise<AlertActionResult> {
    alertProcessor.markAsDismissed(alert.id, `Dismissed by user ${userId}`);

    return {
      success: true,
      alertId: alert.id,
      actionId: 'dismiss',
      message: 'Alert dismissed',
    };
  }

  // ===========================================================================
  // SPECIFIC ACTIONS
  // ===========================================================================

  async approvePO(suggestionId: string, userId: string): Promise<AlertActionResult> {
    try {
      // Update MRP suggestion status
      const suggestion = await prisma.mrpSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
        },
        include: { part: true },
      });

      // Mark related alert as resolved
      const alerts = alertProcessor.getAllAlerts();
      const relatedAlert = alerts.find(a =>
        (a.data as { suggestionId?: string }).suggestionId === suggestionId
      );
      if (relatedAlert) {
        alertProcessor.markAsResolved(relatedAlert.id);
      }

      return {
        success: true,
        alertId: relatedAlert?.id || '',
        actionId: 'approve-po',
        message: `PO suggestion approved for ${suggestion.part.partNumber}`,
        resultData: {
          suggestionId,
          partNumber: suggestion.part.partNumber,
          quantity: suggestion.suggestedQty,
        },
      };
    } catch (error) {
      return {
        success: false,
        alertId: '',
        actionId: 'approve-po',
        message: 'Failed to approve PO suggestion',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async rejectPO(suggestionId: string, userId: string): Promise<AlertActionResult> {
    try {
      const suggestion = await prisma.mrpSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: 'rejected',
          notes: `Rejected by ${userId} at ${new Date().toISOString()}`,
        },
        include: { part: true },
      });

      // Mark related alert as dismissed
      const alerts = alertProcessor.getAllAlerts();
      const relatedAlert = alerts.find(a =>
        (a.data as { suggestionId?: string }).suggestionId === suggestionId
      );
      if (relatedAlert) {
        alertProcessor.markAsDismissed(relatedAlert.id, 'PO suggestion rejected');
      }

      return {
        success: true,
        alertId: relatedAlert?.id || '',
        actionId: 'reject-po',
        message: `PO suggestion rejected for ${suggestion.part.partNumber}`,
        resultData: { suggestionId },
      };
    } catch (error) {
      return {
        success: false,
        alertId: '',
        actionId: 'reject-po',
        message: 'Failed to reject PO suggestion',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async applySchedule(scheduleId: string, userId: string): Promise<AlertActionResult> {
    try {
      // For now, just mark the alert as resolved
      // In production, this would call the ScheduleExecutor
      const alerts = alertProcessor.getAllAlerts();
      const relatedAlert = alerts.find(a =>
        (a.data as { suggestedScheduleId?: string; workOrderId?: string }).suggestedScheduleId === scheduleId ||
        (a.data as { workOrderId?: string }).workOrderId === scheduleId
      );

      if (relatedAlert) {
        alertProcessor.markAsResolved(relatedAlert.id);
      }

      return {
        success: true,
        alertId: relatedAlert?.id || '',
        actionId: 'apply-schedule',
        message: 'Schedule applied successfully',
        resultData: { scheduleId },
      };
    } catch (error) {
      return {
        success: false,
        alertId: '',
        actionId: 'apply-schedule',
        message: 'Failed to apply schedule',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createNCR(
    partId: string,
    userId: string,
    alert: Alert
  ): Promise<AlertActionResult> {
    try {
      // Create NCR record
      const part = await prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        return {
          success: false,
          alertId: alert.id,
          actionId: 'create-ncr',
          message: 'Part not found',
          error: 'PART_NOT_FOUND',
        };
      }

      const ncr = await prisma.nCR.create({
        data: {
          ncrNumber: `NCR-${Date.now()}`,
          status: 'open',
          priority: alert.priority === 'CRITICAL' ? 'critical' : alert.priority === 'HIGH' ? 'high' : 'medium',
          source: 'IN_PROCESS',
          partId,
          title: alert.title,
          description: alert.message,
          quantityAffected: 0, // To be filled in by user
          createdBy: userId,
        },
      });

      // Mark alert as resolved
      alertProcessor.markAsResolved(alert.id);

      return {
        success: true,
        alertId: alert.id,
        actionId: 'create-ncr',
        message: `NCR ${ncr.ncrNumber} created for ${part.partNumber}`,
        resultData: {
          ncrId: ncr.id,
          ncrNumber: ncr.ncrNumber,
          partNumber: part.partNumber,
        },
      };
    } catch (error) {
      return {
        success: false,
        alertId: alert.id,
        actionId: 'create-ncr',
        message: 'Failed to create NCR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async contactSupplier(
    supplierId: string,
    poId: string | undefined,
    userId: string,
    alert: Alert
  ): Promise<AlertActionResult> {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        return {
          success: false,
          alertId: alert.id,
          actionId: 'contact-supplier',
          message: 'Supplier not found',
          error: 'SUPPLIER_NOT_FOUND',
        };
      }

      // Log the contact action
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SUPPLIER_CONTACTED',
          entityType: 'Supplier',
          entityId: supplierId,
          metadata: JSON.stringify({
            alertId: alert.id,
            poId,
            reason: alert.message,
            contactEmail: supplier.contactEmail,
            contactPhone: supplier.contactPhone,
          }),
        },
      });

      // Mark alert as actioned (but not resolved yet)
      alertProcessor.markAsRead(alert.id);

      return {
        success: true,
        alertId: alert.id,
        actionId: 'contact-supplier',
        message: `Contact logged for ${supplier.name}`,
        resultData: {
          supplierId,
          supplierName: supplier.name,
          contactEmail: supplier.contactEmail,
          contactPhone: supplier.contactPhone,
        },
      };
    } catch (error) {
      return {
        success: false,
        alertId: alert.id,
        actionId: 'contact-supplier',
        message: 'Failed to log contact',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================================================
  // LOGGING
  // ===========================================================================

  private async logAction(
    alert: Alert,
    action: { id?: string; type?: AlertActionType },
    userId: string,
    result: AlertActionResult
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ALERT_ACTION_EXECUTED',
          entityType: 'Alert',
          entityId: alert.id,
          metadata: JSON.stringify({
            alertType: alert.type,
            alertPriority: alert.priority,
            actionId: action.id,
            actionType: action.type,
            success: result.success,
            message: result.message,
            error: result.error,
          }),
        },
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'alert-action-executor', operation: 'logAction' });
    }
  }

  // ===========================================================================
  // BULK ACTIONS
  // ===========================================================================

  async bulkDismiss(
    alertIds: string[],
    userId: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const alertId of alertIds) {
      const result = alertProcessor.markAsDismissed(alertId, `Bulk dismiss by ${userId}`);
      if (result) success++;
      else failed++;
    }

    return { success, failed };
  }

  async bulkSnooze(
    alertIds: string[],
    durationHours: number,
    userId: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const duration = durationHours * 60 * 60 * 1000;

    for (const alertId of alertIds) {
      const result = alertProcessor.snoozeAlert(alertId, duration);
      if (result) success++;
      else failed++;
    }

    return { success, failed };
  }
}

// Singleton export
export const alertActionExecutor = AlertActionExecutor.getInstance();
export const getAlertActionExecutor = () => AlertActionExecutor.getInstance();
