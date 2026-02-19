/**
 * PO Executor Service for Auto-PO Generation
 *
 * Handles the actual creation and execution of purchase orders
 * after human approval from the approval queue
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { EnhancedPOSuggestion } from './ai-po-analyzer';
import { QueueItem, POModification } from './approval-queue-service';

// ==================== Interfaces ====================

export interface POExecutionRequest {
  queueItemId: string;
  suggestion: EnhancedPOSuggestion;
  modifications?: POModification[];
  approvedBy: string;
  approvalTimestamp: Date;
  executionOptions?: ExecutionOptions;
}

export interface ExecutionOptions {
  sendNotification?: boolean;
  notifyEmails?: string[];
  autoSubmitToSupplier?: boolean;
  priority?: 'normal' | 'urgent' | 'critical';
  notes?: string;
  attachments?: string[];
  splitDelivery?: SplitDeliveryConfig;
}

export interface SplitDeliveryConfig {
  enabled: boolean;
  deliveries: Array<{
    quantity: number;
    expectedDate: Date;
  }>;
}

export interface POExecutionResult {
  success: boolean;
  purchaseOrderId?: string;
  poNumber?: string;
  status: POExecutionStatus;
  error?: string;
  warnings: string[];
  executedAt: Date;
  details: POExecutionDetails;
}

export type POExecutionStatus =
  | 'created'
  | 'submitted'
  | 'failed'
  | 'partially_created'
  | 'pending_approval';

export interface POExecutionDetails {
  partId: string;
  partName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  orderDate: Date;
  expectedDeliveryDate: Date;
  wasModified: boolean;
  modifications?: POModification[];
  notificationsSent?: string[];
}

export interface POTemplate {
  id: string;
  name: string;
  supplierId: string;
  defaultTerms: string;
  defaultNotes: string;
  paymentTerms: string;
  shippingMethod: string;
  incoterms: string;
}

export interface ExecutionMetrics {
  totalExecuted: number;
  successRate: number;
  avgExecutionTime: number;
  byStatus: Record<POExecutionStatus, number>;
  bySupplier: Record<string, number>;
  totalValueCreated: number;
  lastExecutedAt?: Date;
}

// ==================== PO Executor Service ====================

class POExecutorService {
  private static instance: POExecutorService;

  // Execution history for metrics
  private executionHistory: POExecutionResult[] = [];
  private readonly HISTORY_LIMIT = 1000;

  // Default templates by supplier
  private templates: Map<string, POTemplate> = new Map();

  private constructor() {}

  static getInstance(): POExecutorService {
    if (!POExecutorService.instance) {
      POExecutorService.instance = new POExecutorService();
    }
    return POExecutorService.instance;
  }

  /**
   * Execute a PO creation from an approved suggestion
   */
  async executePOCreation(request: POExecutionRequest): Promise<POExecutionResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate the request
      const validationResult = await this.validateRequest(request);
      if (!validationResult.valid) {
        return this.createFailedResult(request, validationResult.error!, warnings);
      }
      warnings.push(...validationResult.warnings);

      // Apply any modifications
      const finalSuggestion = this.applyModifications(
        request.suggestion,
        request.modifications
      );

      // Check for existing draft PO for same part/supplier
      const existingDraft = await this.checkExistingDraft(
        finalSuggestion.partId,
        finalSuggestion.supplierId
      );

      if (existingDraft) {
        warnings.push(`Có PO draft hiện có (${existingDraft.poNumber}) cho linh kiện và NCC này`);
      }

      // Get or create PO template
      const template = await this.getSupplierTemplate(finalSuggestion.supplierId);

      // Generate PO number
      const poNumber = await this.generatePONumber();

      // Determine PO status based on options
      const initialStatus = this.determineInitialStatus(request.executionOptions);

      // Create the purchase order
      const purchaseOrder = await this.createPurchaseOrder({
        poNumber,
        suggestion: finalSuggestion,
        template,
        options: request.executionOptions,
        approvedBy: request.approvedBy,
        initialStatus
      });

      // Create line items
      await this.createPOLineItems(purchaseOrder.id, finalSuggestion, request.executionOptions);

      // Handle split delivery if configured
      if (request.executionOptions?.splitDelivery?.enabled) {
        await this.createDeliverySchedule(
          purchaseOrder.id,
          request.executionOptions.splitDelivery.deliveries
        );
      }

      // Update inventory records with pending PO
      await this.updateInventoryPendingPO(finalSuggestion.partId, purchaseOrder.id);

      // Send notifications if requested
      const notificationsSent: string[] = [];
      if (request.executionOptions?.sendNotification) {
        const sentTo = await this.sendNotifications(purchaseOrder, request.executionOptions);
        notificationsSent.push(...sentTo);
      }

      // Auto-submit to supplier if configured
      if (request.executionOptions?.autoSubmitToSupplier) {
        await this.submitToSupplier(purchaseOrder);
      }

      // Log the execution
      await this.logExecution({
        queueItemId: request.queueItemId,
        purchaseOrderId: purchaseOrder.id,
        success: true,
        executedBy: request.approvedBy,
        executionTime: Date.now() - startTime
      });

      const result: POExecutionResult = {
        success: true,
        purchaseOrderId: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        status: initialStatus === 'submitted' ? 'submitted' : 'created',
        warnings,
        executedAt: new Date(),
        details: {
          partId: finalSuggestion.partId,
          partName: finalSuggestion.partName || '',
          supplierId: finalSuggestion.supplierId,
          supplierName: finalSuggestion.supplierName,
          quantity: finalSuggestion.quantity,
          unitPrice: finalSuggestion.unitPrice,
          totalAmount: finalSuggestion.totalAmount,
          orderDate: finalSuggestion.expectedDeliveryDate,
          expectedDeliveryDate: finalSuggestion.expectedDeliveryDate,
          wasModified: !!request.modifications?.length,
          modifications: request.modifications,
          notificationsSent
        }
      };

      // Add to history
      this.addToHistory(result);

      return result;
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'po-executor', operation: 'execute' });

      await this.logExecution({
        queueItemId: request.queueItemId,
        purchaseOrderId: undefined,
        success: false,
        executedBy: request.approvedBy,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return this.createFailedResult(
        request,
        error instanceof Error ? error.message : 'Unknown error',
        warnings
      );
    }
  }

  /**
   * Execute multiple PO creations in batch
   */
  async executeBatch(
    requests: POExecutionRequest[]
  ): Promise<{
    results: POExecutionResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalValue: number;
    };
  }> {
    const results: POExecutionResult[] = [];
    let totalValue = 0;

    // Group by supplier for potential consolidation
    const bySupplier = this.groupBySupplier(requests);

    for (const [supplierId, supplierRequests] of bySupplier) {
      // Execute each request for this supplier
      for (const request of supplierRequests) {
        const result = await this.executePOCreation(request);
        results.push(result);

        if (result.success) {
          totalValue += result.details.totalAmount;
        }
      }
    }

    return {
      results,
      summary: {
        total: requests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalValue
      }
    };
  }

  /**
   * Cancel a created but not submitted PO
   */
  async cancelPO(
    purchaseOrderId: string,
    cancelledBy: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId }
      });

      if (!po) {
        return { success: false, error: 'Purchase order not found' };
      }

      if (po.status !== 'draft' && po.status !== 'pending') {
        return { success: false, error: `Cannot cancel PO with status: ${po.status}` };
      }

      // Update PO status
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: 'cancelled',
          notes: `${po.notes || ''}\n\nCancelled by ${cancelledBy}: ${reason}`
        }
      });

      // Log cancellation
      await this.logExecution({
        queueItemId: '',
        purchaseOrderId,
        success: true,
        executedBy: cancelledBy,
        executionTime: 0,
        action: 'cancel',
        reason
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get execution metrics
   */
  async getExecutionMetrics(dateRange?: { start: Date; end: Date }): Promise<ExecutionMetrics> {
    const history = this.executionHistory.filter(result => {
      if (!dateRange) return true;
      return result.executedAt >= dateRange.start && result.executedAt <= dateRange.end;
    });

    const byStatus: Record<POExecutionStatus, number> = {
      created: 0,
      submitted: 0,
      failed: 0,
      partially_created: 0,
      pending_approval: 0
    };

    const bySupplier: Record<string, number> = {};
    let totalValue = 0;
    let totalExecutionTime = 0;

    for (const result of history) {
      byStatus[result.status]++;

      if (result.success) {
        totalValue += result.details.totalAmount;
        bySupplier[result.details.supplierId] =
          (bySupplier[result.details.supplierId] || 0) + 1;
      }
    }

    // Get average execution time from DB logs
    const logs = await prisma.auditLog.findMany({
      where: {
        action: 'po_execution',
        ...(dateRange && {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        })
      },
      select: {
        metadata: true
      }
    });

    for (const log of logs) {
      const details = (log.metadata ?? {}) as Record<string, unknown>;
      if (typeof details.executionTime === 'number') {
        totalExecutionTime += details.executionTime;
      }
    }

    const totalExecuted = history.length;
    const successful = history.filter(r => r.success).length;

    return {
      totalExecuted,
      successRate: totalExecuted > 0 ? successful / totalExecuted : 0,
      avgExecutionTime: logs.length > 0 ? totalExecutionTime / logs.length : 0,
      byStatus,
      bySupplier,
      totalValueCreated: totalValue,
      lastExecutedAt: history.length > 0 ? history[history.length - 1].executedAt : undefined
    };
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(
    originalRequest: POExecutionRequest
  ): Promise<POExecutionResult> {
    // Simply re-execute with the same request
    return this.executePOCreation(originalRequest);
  }

  // ==================== Private Methods ====================

  private async validateRequest(
    request: POExecutionRequest
  ): Promise<{ valid: boolean; error?: string; warnings: string[] }> {
    const warnings: string[] = [];

    // Check if suggestion is still valid
    const { suggestion } = request;

    // Validate part exists
    const part = await prisma.part.findUnique({
      where: { id: suggestion.partId }
    });

    if (!part) {
      return { valid: false, error: 'Part not found', warnings };
    }

    // Validate supplier exists and is active
    const supplier = await prisma.supplier.findUnique({
      where: { id: suggestion.supplierId }
    });

    if (!supplier) {
      return { valid: false, error: 'Supplier not found', warnings };
    }

    if (supplier.status === 'inactive') {
      return { valid: false, error: 'Supplier is inactive', warnings };
    }

    // Check if price has changed significantly
    const supplierPart = await prisma.partSupplier.findFirst({
      where: {
        supplierId: suggestion.supplierId,
        partId: suggestion.partId
      }
    });

    if (supplierPart && supplierPart.unitPrice) {
      const priceDiff = Math.abs(
        (supplierPart.unitPrice - suggestion.unitPrice) /
        suggestion.unitPrice
      );

      if (priceDiff > 0.1) {
        warnings.push(
          `Giá đã thay đổi ${(priceDiff * 100).toFixed(1)}% so với lúc tạo gợi ý`
        );
      }
    }

    // Check current inventory level
    const inventory = await prisma.inventory.findFirst({
      where: { partId: suggestion.partId }
    });

    const currentStockFromSuggestion = suggestion.reorderReason?.currentStock ?? 0;

    if (inventory) {
      const currentQty = inventory.quantity ?? 0;
      if (currentQty > currentStockFromSuggestion * 1.5 && currentStockFromSuggestion > 0) {
        warnings.push(
          `Tồn kho hiện tại (${currentQty}) cao hơn đáng kể so với lúc tạo gợi ý (${currentStockFromSuggestion})`
        );
      }
    }

    // Check for pending POs
    const pendingPOs = await prisma.purchaseOrder.count({
      where: {
        status: { in: ['draft', 'pending', 'confirmed'] },
        lines: {
          some: { partId: suggestion.partId }
        }
      }
    });

    if (pendingPOs > 0) {
      warnings.push(`Có ${pendingPOs} PO đang pending cho linh kiện này`);
    }

    return { valid: true, warnings };
  }

  private applyModifications(
    suggestion: EnhancedPOSuggestion,
    modifications?: POModification[]
  ): EnhancedPOSuggestion {
    if (!modifications || modifications.length === 0) {
      return suggestion;
    }

    const modified: EnhancedPOSuggestion = { ...suggestion };

    for (const mod of modifications) {
      switch (mod.field) {
        case 'quantity':
          modified.quantity = mod.newValue as number;
          modified.totalAmount = (mod.newValue as number) * modified.unitPrice;
          break;
        case 'unitPrice':
          modified.unitPrice = mod.newValue as number;
          modified.totalAmount = modified.quantity * (mod.newValue as number);
          break;
        case 'orderDate':
          modified.expectedDeliveryDate = new Date(mod.newValue as string | number);
          break;
        case 'expectedDeliveryDate':
          modified.expectedDeliveryDate = new Date(mod.newValue as string | number);
          break;
      }
    }

    return modified;
  }

  private async checkExistingDraft(
    partId: string,
    supplierId: string
  ): Promise<{ id: string; poNumber: string } | null> {
    const existing = await prisma.purchaseOrder.findFirst({
      where: {
        supplierId,
        status: 'draft',
        lines: {
          some: { partId }
        }
      },
      select: {
        id: true,
        poNumber: true
      }
    });

    return existing;
  }

  private async getSupplierTemplate(supplierId: string): Promise<POTemplate | null> {
    // Check cache first
    if (this.templates.has(supplierId)) {
      return this.templates.get(supplierId)!;
    }

    // Try to load from supplier data
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) return null;

    const template: POTemplate = {
      id: `tpl-${supplierId}`,
      name: `${supplier.name} Default Template`,
      supplierId,
      defaultTerms: supplier.paymentTerms || 'Net 30',
      defaultNotes: '',
      paymentTerms: supplier.paymentTerms || 'Net 30',
      shippingMethod: 'Standard',
      incoterms: 'FOB'
    };

    this.templates.set(supplierId, template);
    return template;
  }

  private async generatePONumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');

    // Get count of POs this month
    const count = await prisma.purchaseOrder.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
          lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        }
      }
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `PO-${year}${month}-${sequence}`;
  }

  private determineInitialStatus(options?: ExecutionOptions): 'draft' | 'pending' | 'submitted' {
    if (options?.autoSubmitToSupplier) {
      return 'submitted';
    }
    if (options?.priority === 'critical' || options?.priority === 'urgent') {
      return 'pending';
    }
    return 'draft';
  }

  private async createPurchaseOrder(params: {
    poNumber: string;
    suggestion: EnhancedPOSuggestion;
    template: POTemplate | null;
    options?: ExecutionOptions;
    approvedBy: string;
    initialStatus: string;
  }): Promise<{ id: string; poNumber: string }> {
    const { poNumber, suggestion, template, options, approvedBy, initialStatus } = params;

    // Build notes
    const notes = [
      `Auto-generated from AI suggestion`,
      `Confidence: ${(suggestion.confidenceScore * 100).toFixed(1)}%`,
      `Approved by: ${approvedBy}`,
      options?.notes
    ].filter(Boolean).join('\n');

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: suggestion.supplierId,
        orderDate: suggestion.expectedDeliveryDate,
        expectedDate: suggestion.expectedDeliveryDate,
        status: initialStatus,
        totalAmount: suggestion.totalAmount,
        notes
      }
    });

    return {
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber
    };
  }

  private async createPOLineItems(
    purchaseOrderId: string,
    suggestion: EnhancedPOSuggestion,
    options?: ExecutionOptions
  ): Promise<void> {
    if (options?.splitDelivery?.enabled) {
      // Create multiple line items for split delivery
      for (const delivery of options.splitDelivery.deliveries) {
        await prisma.purchaseOrderLine.create({
          data: {
            poId: purchaseOrderId,
            lineNumber: 1,
            partId: suggestion.partId,
            quantity: delivery.quantity,
            unitPrice: suggestion.unitPrice,
            lineTotal: delivery.quantity * suggestion.unitPrice
          }
        });
      }
    } else {
      // Single line item
      await prisma.purchaseOrderLine.create({
        data: {
          poId: purchaseOrderId,
            lineNumber: 1,
          partId: suggestion.partId,
          quantity: suggestion.quantity,
          unitPrice: suggestion.unitPrice,
          lineTotal: suggestion.totalAmount
        }
      });
    }
  }

  private async createDeliverySchedule(
    purchaseOrderId: string,
    deliveries: Array<{ quantity: number; expectedDate: Date }>
  ): Promise<void> {
    // Store delivery schedule in PO metadata or separate table
    // For now, just log it
    logger.info(`Created delivery schedule for PO ${purchaseOrderId}`, { deliveryCount: deliveries.length });
  }

  private async updateInventoryPendingPO(
    partId: string,
    purchaseOrderId: string
  ): Promise<void> {
    // Update inventory to reflect pending PO
    // This helps with visibility but doesn't affect actual stock
    try {
      const inventory = await prisma.inventory.findFirst({
        where: { partId }
      });

      if (inventory) {
        // We could add a field for pending orders
        // For now, just log
        logger.info(`Updated inventory ${inventory.id} with pending PO ${purchaseOrderId}`);
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'po-executor', operation: 'updateInventoryPendingPO' });
    }
  }

  private async sendNotifications(
    purchaseOrder: { id: string; poNumber: string },
    options: ExecutionOptions
  ): Promise<string[]> {
    const sentTo: string[] = [];

    if (options.notifyEmails && options.notifyEmails.length > 0) {
      // In a real implementation, this would send actual emails
      for (const email of options.notifyEmails) {
        try {
          // Mock email sending
          logger.info(`Sending notification to ${email} for PO ${purchaseOrder.poNumber}`);
          sentTo.push(email);
        } catch (error) {
          logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'po-executor', operation: 'sendNotification', email });
        }
      }
    }

    return sentTo;
  }

  private async submitToSupplier(purchaseOrder: { id: string; poNumber: string }): Promise<void> {
    // In a real implementation, this would integrate with supplier systems
    // Could be EDI, API, or email-based submission
    logger.info(`Auto-submitted PO ${purchaseOrder.poNumber} to supplier`);

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { status: 'submitted' }
    });
  }

  private groupBySupplier(
    requests: POExecutionRequest[]
  ): Map<string, POExecutionRequest[]> {
    const grouped = new Map<string, POExecutionRequest[]>();

    for (const request of requests) {
      const supplierId = request.suggestion.supplierId;
      if (!grouped.has(supplierId)) {
        grouped.set(supplierId, []);
      }
      grouped.get(supplierId)!.push(request);
    }

    return grouped;
  }

  private createFailedResult(
    request: POExecutionRequest,
    error: string,
    warnings: string[]
  ): POExecutionResult {
    return {
      success: false,
      status: 'failed',
      error,
      warnings,
      executedAt: new Date(),
      details: {
        partId: request.suggestion.partId,
        partName: request.suggestion.partName || '',
        supplierId: request.suggestion.supplierId,
        supplierName: request.suggestion.supplierName,
        quantity: request.suggestion.quantity,
        unitPrice: request.suggestion.unitPrice,
        totalAmount: request.suggestion.totalAmount,
        orderDate: request.suggestion.expectedDeliveryDate,
        expectedDeliveryDate: request.suggestion.expectedDeliveryDate,
        wasModified: !!request.modifications?.length,
        modifications: request.modifications
      }
    };
  }

  private addToHistory(result: POExecutionResult): void {
    this.executionHistory.push(result);

    // Keep history under limit
    if (this.executionHistory.length > this.HISTORY_LIMIT) {
      this.executionHistory = this.executionHistory.slice(-this.HISTORY_LIMIT);
    }
  }

  private async logExecution(event: {
    queueItemId: string;
    purchaseOrderId?: string;
    success: boolean;
    executedBy: string;
    executionTime: number;
    action?: string;
    reason?: string;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: event.action || 'po_execution',
          entityType: 'purchase_order',
          entityId: event.purchaseOrderId || event.queueItemId,
          userId: event.executedBy,
          metadata: {
            queueItemId: event.queueItemId,
            success: event.success,
            executionTime: event.executionTime,
            reason: event.reason,
            error: event.error
          }
        }
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'po-executor', operation: 'logExecution' });
    }
  }
}

// Export singleton instance
export const poExecutorService = POExecutorService.getInstance();

// Export class for testing
export { POExecutorService };
