/**
 * Approval Queue Service for Auto-PO Generation
 *
 * Human-in-the-loop design: AI suggests → Human approves → System executes
 * This service manages the approval workflow for PO suggestions
 */

// PO suggestion queue persistence uses AiRecommendation model + AuditLog for audit trail
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { POSuggestion } from './po-suggestion-engine';
import { EnhancedPOSuggestion } from './ai-po-analyzer';

// ==================== Interfaces ====================

export interface QueueItem {
  id: string;
  suggestion: EnhancedPOSuggestion;
  status: QueueItemStatus;
  priority: QueuePriority;
  addedAt: Date;
  addedBy: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  decision?: ApprovalDecision;
  decisionReason?: string;
  modifications?: POModification[];
  resultingPOId?: string;
  expiresAt: Date;
  tags: string[];
  notes: string[];
}

export type QueueItemStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'modified_approved'
  | 'expired'
  | 'cancelled';

export type QueuePriority = 'critical' | 'high' | 'medium' | 'low';

export type ApprovalDecision = 'approved' | 'rejected' | 'modified';

export interface POModification {
  field: string;
  originalValue: string | number | Date | null;
  newValue: string | number | Date | null;
  modifiedBy: string;
  modifiedAt: Date;
  reason?: string;
}

export interface QueueFilter {
  status?: QueueItemStatus[];
  priority?: QueuePriority[];
  partIds?: string[];
  supplierIds?: string[];
  minConfidence?: number;
  maxConfidence?: number;
  addedAfter?: Date;
  addedBefore?: Date;
  tags?: string[];
  search?: string;
}

export interface QueueSortOptions {
  field: 'addedAt' | 'priority' | 'confidence' | 'totalAmount' | 'expiresAt';
  direction: 'asc' | 'desc';
}

export interface QueueStats {
  totalPending: number;
  byPriority: Record<QueuePriority, number>;
  byStatus: Record<QueueItemStatus, number>;
  avgConfidence: number;
  totalValue: number;
  expiringIn24h: number;
  oldestPendingDays: number;
}

export interface ApprovalResult {
  success: boolean;
  queueItemId: string;
  decision: ApprovalDecision;
  purchaseOrderId?: string;
  error?: string;
  timestamp: Date;
}

export interface BulkApprovalResult {
  totalProcessed: number;
  successful: ApprovalResult[];
  failed: ApprovalResult[];
  summary: {
    approved: number;
    rejected: number;
    errors: number;
  };
}

/** Shape of a serialized queue record loaded from the database */
interface QueueDbRecord {
  id: string;
  partId: string;
  supplierId?: string;
  suggestedQuantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  expectedDeliveryDate?: Date;
  confidence?: number;
  status: string;
  priority?: string;
  createdAt: Date;
  createdBy?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  decisionReason?: string;
  modifications?: string;
  resultingPOId?: string;
  expiresAt?: Date;
  metadata?: string;
}

// ==================== Queue Service ====================

class ApprovalQueueService {
  private static instance: ApprovalQueueService;

  // In-memory queue for quick access (persisted to DB)
  private queue: Map<string, QueueItem> = new Map();
  private initialized: boolean = false;

  // Configuration
  private readonly DEFAULT_EXPIRY_DAYS = 7;
  private readonly MAX_QUEUE_SIZE = 1000;

  private constructor() {}

  static getInstance(): ApprovalQueueService {
    if (!ApprovalQueueService.instance) {
      ApprovalQueueService.instance = new ApprovalQueueService();
    }
    return ApprovalQueueService.instance;
  }

  /**
   * Initialize queue from database.
   * Loads pending PO recommendations from AiRecommendation and hydrates the in-memory queue.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load active PO-related recommendations that have not expired
      const pendingRecs = await prisma.aiRecommendation.findMany({
        where: {
          status: { in: ['active', 'pending', 'in_review'] },
          category: 'purchasing',
          type: { in: ['REORDER', 'EXPEDITE'] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: this.MAX_QUEUE_SIZE,
      });

      for (const rec of pendingRecs) {
        const factors = (rec.factors as Record<string, unknown>) || {};
        const suggestion = (factors.suggestion as EnhancedPOSuggestion) || null;

        // Skip records that don't carry an embedded suggestion payload
        if (!suggestion) continue;

        const item: QueueItem = {
          id: rec.id,
          suggestion,
          status: (rec.status === 'in_review' ? 'in_review' : 'pending') as QueueItemStatus,
          priority: (rec.priority === 'HIGH' ? 'high' : rec.priority === 'MEDIUM' ? 'medium' : 'low') as QueuePriority,
          addedAt: rec.createdAt,
          addedBy: (factors.createdBy as string) || 'system',
          expiresAt: rec.expiresAt || new Date(rec.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          tags: (factors.tags as string[]) || [],
          notes: (factors.notes as string[]) || [],
        };

        this.queue.set(item.id, item);
      }

      this.initialized = true;
      logger.info(`Approval queue initialized with ${this.queue.size} items from database`);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'approval-queue-service', operation: 'initialize' });
      this.initialized = true;
    }
  }

  /**
   * Add a PO suggestion to the approval queue
   */
  async addToQueue(
    suggestion: EnhancedPOSuggestion,
    addedBy: string,
    options?: {
      priority?: QueuePriority;
      expiryDays?: number;
      tags?: string[];
      notes?: string[];
    }
  ): Promise<QueueItem> {
    await this.ensureInitialized();

    // Check queue size limit
    if (this.queue.size >= this.MAX_QUEUE_SIZE) {
      // Remove oldest expired items
      await this.cleanupExpiredItems();

      if (this.queue.size >= this.MAX_QUEUE_SIZE) {
        throw new Error('Queue is full. Please process existing items first.');
      }
    }

    // Determine priority based on urgency and confidence
    const priority = options?.priority ?? this.calculatePriority(suggestion);

    // Calculate expiry date
    const expiryDays = options?.expiryDays ?? this.DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create queue item
    const queueItem: QueueItem = {
      id: this.generateQueueId(),
      suggestion,
      status: 'pending',
      priority,
      addedAt: new Date(),
      addedBy,
      expiresAt,
      tags: options?.tags ?? [],
      notes: options?.notes ?? []
    };

    // Persist to database via AiRecommendation model
    await prisma.aiRecommendation.create({
      data: {
        id: queueItem.id,
        type: 'REORDER',
        priority,
        category: 'purchasing',
        title: `PO Suggestion: ${suggestion.partName || suggestion.partId}`,
        description: typeof suggestion.explanation === 'string'
          ? suggestion.explanation
          : JSON.stringify(suggestion.explanation),
        impact: `Order ${suggestion.quantity} units at $${suggestion.unitPrice}/unit`,
        savingsEstimate: suggestion.totalAmount,
        confidence: suggestion.confidenceScore,
        partId: suggestion.partId,
        supplierId: suggestion.supplierId,
        status: 'pending',
        expiresAt,
        factors: JSON.parse(JSON.stringify({
          queueType: 'po_suggestion',
          aiEnhancement: suggestion.aiEnhancement,
          reorderLevel: suggestion.reorderReason?.reorderPoint || 0,
          currentStock: suggestion.reorderReason?.currentStock || 0,
          tags: queueItem.tags,
          notes: queueItem.notes,
          unitPrice: suggestion.unitPrice,
          quantity: suggestion.quantity,
          totalAmount: suggestion.totalAmount,
          expectedDeliveryDate: suggestion.expectedDeliveryDate?.toISOString(),
          createdBy: addedBy,
        })),
      }
    });

    // Add to in-memory queue
    this.queue.set(queueItem.id, queueItem);

    // Log for audit
    await this.logAuditEvent({
      action: 'queue_add',
      queueItemId: queueItem.id,
      userId: addedBy,
      details: {
        partId: suggestion.partId,
        supplierId: suggestion.supplierId,
        quantity: suggestion.quantity,
        confidence: suggestion.confidenceScore,
        priority
      }
    });

    return queueItem;
  }

  /**
   * Get queue items with filters and pagination
   */
  async getQueueItems(
    filter?: QueueFilter,
    sort?: QueueSortOptions,
    pagination?: { page: number; pageSize: number }
  ): Promise<{ items: QueueItem[]; total: number; page: number; totalPages: number }> {
    await this.ensureInitialized();

    let items = Array.from(this.queue.values());

    // Apply filters
    if (filter) {
      items = this.applyFilters(items, filter);
    }

    // Apply sorting
    if (sort) {
      items = this.applySorting(items, sort);
    } else {
      // Default sort: priority desc, then addedAt asc
      items.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.addedAt.getTime() - b.addedAt.getTime();
      });
    }

    // Apply pagination
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      totalPages
    };
  }

  /**
   * Get a single queue item by ID
   */
  async getQueueItem(id: string): Promise<QueueItem | null> {
    await this.ensureInitialized();
    return this.queue.get(id) ?? null;
  }

  /**
   * Approve a queue item and trigger PO creation
   */
  async approveItem(
    id: string,
    approvedBy: string,
    reason?: string
  ): Promise<ApprovalResult> {
    await this.ensureInitialized();

    const queueItem = this.queue.get(id);
    if (!queueItem) {
      return {
        success: false,
        queueItemId: id,
        decision: 'approved',
        error: 'Queue item not found',
        timestamp: new Date()
      };
    }

    if (queueItem.status !== 'pending' && queueItem.status !== 'in_review') {
      return {
        success: false,
        queueItemId: id,
        decision: 'approved',
        error: `Cannot approve item with status: ${queueItem.status}`,
        timestamp: new Date()
      };
    }

    try {
      // Create the purchase order
      const purchaseOrder = await this.createPurchaseOrder(queueItem, approvedBy);

      // Update queue item
      queueItem.status = 'approved';
      queueItem.decision = 'approved';
      queueItem.decisionReason = reason;
      queueItem.reviewedAt = new Date();
      queueItem.reviewedBy = approvedBy;
      queueItem.resultingPOId = purchaseOrder.id;

      // Update database
      await prisma.aiRecommendation.update({
        where: { id },
        data: {
          status: 'approved',
          implementedAt: new Date(),
          factors: {
            reviewedBy: approvedBy,
            resultingPOId: purchaseOrder.id,
            decisionReason: reason,
          },
        }
      });

      // Log audit event
      await this.logAuditEvent({
        action: 'approve',
        queueItemId: id,
        userId: approvedBy,
        details: {
          purchaseOrderId: purchaseOrder.id,
          reason
        }
      });

      // Remove from in-memory queue (keep in DB for history)
      this.queue.delete(id);

      return {
        success: true,
        queueItemId: id,
        decision: 'approved',
        purchaseOrderId: purchaseOrder.id,
        timestamp: new Date()
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'approval-queue-service', operation: 'approve' });
      return {
        success: false,
        queueItemId: id,
        decision: 'approved',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Reject a queue item with reason
   */
  async rejectItem(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<ApprovalResult> {
    await this.ensureInitialized();

    const queueItem = this.queue.get(id);
    if (!queueItem) {
      return {
        success: false,
        queueItemId: id,
        decision: 'rejected',
        error: 'Queue item not found',
        timestamp: new Date()
      };
    }

    if (queueItem.status !== 'pending' && queueItem.status !== 'in_review') {
      return {
        success: false,
        queueItemId: id,
        decision: 'rejected',
        error: `Cannot reject item with status: ${queueItem.status}`,
        timestamp: new Date()
      };
    }

    try {
      // Update queue item
      queueItem.status = 'rejected';
      queueItem.decision = 'rejected';
      queueItem.decisionReason = reason;
      queueItem.reviewedAt = new Date();
      queueItem.reviewedBy = rejectedBy;

      // Update database
      await prisma.aiRecommendation.update({
        where: { id },
        data: {
          status: 'rejected',
          dismissedAt: new Date(),
          factors: {
            reviewedBy: rejectedBy,
            decisionReason: reason,
          },
        }
      });

      // Log audit event (for learning)
      await this.logAuditEvent({
        action: 'reject',
        queueItemId: id,
        userId: rejectedBy,
        details: {
          reason,
          suggestion: {
            partId: queueItem.suggestion.partId,
            quantity: queueItem.suggestion.quantity,
            confidence: queueItem.suggestion.confidenceScore
          }
        }
      });

      // Remove from in-memory queue
      this.queue.delete(id);

      return {
        success: true,
        queueItemId: id,
        decision: 'rejected',
        timestamp: new Date()
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'approval-queue-service', operation: 'reject' });
      return {
        success: false,
        queueItemId: id,
        decision: 'rejected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Modify a suggestion before approving
   */
  async modifyAndApprove(
    id: string,
    modifications: Array<{
      field: 'quantity' | 'supplier' | 'orderDate' | 'unitPrice';
      newValue: string | number;
      reason?: string;
    }>,
    approvedBy: string
  ): Promise<ApprovalResult> {
    await this.ensureInitialized();

    const queueItem = this.queue.get(id);
    if (!queueItem) {
      return {
        success: false,
        queueItemId: id,
        decision: 'modified',
        error: 'Queue item not found',
        timestamp: new Date()
      };
    }

    try {
      // Apply modifications
      const appliedMods: POModification[] = [];

      for (const mod of modifications) {
        const modification: POModification = {
          field: mod.field,
          originalValue: this.getFieldValue(queueItem.suggestion, mod.field),
          newValue: mod.newValue,
          modifiedBy: approvedBy,
          modifiedAt: new Date(),
          reason: mod.reason
        };

        // Apply modification to suggestion
        this.applyModification(queueItem.suggestion, mod.field, mod.newValue);
        appliedMods.push(modification);
      }

      queueItem.modifications = appliedMods;

      // Create PO with modified values
      const purchaseOrder = await this.createPurchaseOrder(queueItem, approvedBy);

      // Update queue item
      queueItem.status = 'modified_approved';
      queueItem.decision = 'modified';
      queueItem.reviewedAt = new Date();
      queueItem.reviewedBy = approvedBy;
      queueItem.resultingPOId = purchaseOrder.id;

      // Update database
      await prisma.aiRecommendation.update({
        where: { id },
        data: {
          status: 'modified_approved',
          implementedAt: new Date(),
          factors: JSON.parse(JSON.stringify({
            reviewedBy: approvedBy,
            resultingPOId: purchaseOrder.id,
            modifications: appliedMods,
          })),
        }
      });

      // Log audit event (for learning from modifications)
      await this.logAuditEvent({
        action: 'modify_approve',
        queueItemId: id,
        userId: approvedBy,
        details: {
          purchaseOrderId: purchaseOrder.id,
          modifications: appliedMods
        }
      });

      // Remove from in-memory queue
      this.queue.delete(id);

      return {
        success: true,
        queueItemId: id,
        decision: 'modified',
        purchaseOrderId: purchaseOrder.id,
        timestamp: new Date()
      };
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'approval-queue-service', operation: 'modifyAndApprove' });
      return {
        success: false,
        queueItemId: id,
        decision: 'modified',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Bulk approve multiple queue items
   */
  async bulkApprove(
    ids: string[],
    approvedBy: string,
    reason?: string
  ): Promise<BulkApprovalResult> {
    const results: ApprovalResult[] = [];

    for (const id of ids) {
      const result = await this.approveItem(id, approvedBy, reason);
      results.push(result);
    }

    return {
      totalProcessed: ids.length,
      successful: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      summary: {
        approved: results.filter(r => r.success).length,
        rejected: 0,
        errors: results.filter(r => !r.success).length
      }
    };
  }

  /**
   * Bulk reject multiple queue items
   */
  async bulkReject(
    ids: string[],
    rejectedBy: string,
    reason: string
  ): Promise<BulkApprovalResult> {
    const results: ApprovalResult[] = [];

    for (const id of ids) {
      const result = await this.rejectItem(id, rejectedBy, reason);
      results.push(result);
    }

    return {
      totalProcessed: ids.length,
      successful: results.filter(r => r.success),
      failed: results.filter(r => !r.success),
      summary: {
        approved: 0,
        rejected: results.filter(r => r.success).length,
        errors: results.filter(r => !r.success).length
      }
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    await this.ensureInitialized();

    const items = Array.from(this.queue.values()).filter(
      item => item.status === 'pending' || item.status === 'in_review'
    );

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const byPriority: Record<QueuePriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const byStatus: Record<QueueItemStatus, number> = {
      pending: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      modified_approved: 0,
      expired: 0,
      cancelled: 0
    };

    let totalConfidence = 0;
    let totalValue = 0;
    let expiringIn24h = 0;
    let oldestPendingDate: Date | null = null;

    for (const item of items) {
      byPriority[item.priority]++;
      byStatus[item.status]++;
      totalConfidence += item.suggestion.confidenceScore;
      totalValue += item.suggestion.totalAmount;

      if (item.expiresAt <= in24h) {
        expiringIn24h++;
      }

      if (!oldestPendingDate || item.addedAt < oldestPendingDate) {
        oldestPendingDate = item.addedAt;
      }
    }

    const oldestPendingDays = oldestPendingDate
      ? Math.floor((now.getTime() - oldestPendingDate.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      totalPending: items.length,
      byPriority,
      byStatus,
      avgConfidence: items.length > 0 ? totalConfidence / items.length : 0,
      totalValue,
      expiringIn24h,
      oldestPendingDays
    };
  }

  /**
   * Mark item as being reviewed
   */
  async startReview(id: string, reviewerId: string): Promise<boolean> {
    await this.ensureInitialized();

    const queueItem = this.queue.get(id);
    if (!queueItem || queueItem.status !== 'pending') {
      return false;
    }

    queueItem.status = 'in_review';

    await prisma.aiRecommendation.update({
      where: { id },
      data: { status: 'in_review' }
    });

    await this.logAuditEvent({
      action: 'start_review',
      queueItemId: id,
      userId: reviewerId,
      details: {}
    });

    return true;
  }

  /**
   * Cancel review (return to pending)
   */
  async cancelReview(id: string, reviewerId: string): Promise<boolean> {
    await this.ensureInitialized();

    const queueItem = this.queue.get(id);
    if (!queueItem || queueItem.status !== 'in_review') {
      return false;
    }

    queueItem.status = 'pending';

    await prisma.aiRecommendation.update({
      where: { id },
      data: { status: 'pending' }
    });

    return true;
  }

  /**
   * Add note to queue item
   */
  async addNote(id: string, note: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const queueItem = this.queue.get(id);
    if (!queueItem) return false;

    const timestampedNote = `[${new Date().toISOString()}] ${userId}: ${note}`;
    queueItem.notes.push(timestampedNote);

    // Update in database
    const existing = await prisma.aiRecommendation.findUnique({ where: { id } });
    const existingFactors = (existing?.factors as Record<string, unknown>) || {};
    await prisma.aiRecommendation.update({
      where: { id },
      data: {
        factors: {
          ...existingFactors,
          notes: queueItem.notes,
        },
      }
    });

    return true;
  }

  // ==================== Private Methods ====================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateQueueId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `POQ-${timestamp}-${random}`.toUpperCase();
  }

  private calculatePriority(suggestion: EnhancedPOSuggestion): QueuePriority {
    const { confidenceScore, reorderReason, urgencyLevel, aiEnhancement } = suggestion;
    const currentStock = reorderReason?.currentStock || 0;
    const reorderLevel = reorderReason?.reorderPoint || 0;

    // Critical: Stock is zero or AI marked as urgent
    if (currentStock === 0 || urgencyLevel === 'critical') {
      return 'critical';
    }

    // High: Stock below reorder level or high confidence urgent
    if (currentStock < reorderLevel * 0.5 ||
        (confidenceScore > 0.85 && urgencyLevel === 'high')) {
      return 'high';
    }

    // Medium: Normal reorder situation
    if (currentStock <= reorderLevel) {
      return 'medium';
    }

    // Low: Proactive suggestion
    return 'low';
  }

  private applyFilters(items: QueueItem[], filter: QueueFilter): QueueItem[] {
    return items.filter(item => {
      if (filter.status && !filter.status.includes(item.status)) {
        return false;
      }

      if (filter.priority && !filter.priority.includes(item.priority)) {
        return false;
      }

      if (filter.partIds && !filter.partIds.includes(item.suggestion.partId)) {
        return false;
      }

      if (filter.supplierIds && !filter.supplierIds.includes(item.suggestion.supplierId)) {
        return false;
      }

      if (filter.minConfidence && item.suggestion.confidenceScore < filter.minConfidence) {
        return false;
      }

      if (filter.maxConfidence && item.suggestion.confidenceScore > filter.maxConfidence) {
        return false;
      }

      if (filter.addedAfter && item.addedAt < filter.addedAfter) {
        return false;
      }

      if (filter.addedBefore && item.addedAt > filter.addedBefore) {
        return false;
      }

      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some(tag => item.tags.includes(tag));
        if (!hasTag) return false;
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const partName = item.suggestion.partName?.toLowerCase() || '';
        const supplierName = item.suggestion.supplierName?.toLowerCase() || '';
        if (!partName.includes(searchLower) && !supplierName.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }

  private applySorting(items: QueueItem[], sort: QueueSortOptions): QueueItem[] {
    const multiplier = sort.direction === 'asc' ? 1 : -1;

    return items.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'addedAt':
          comparison = a.addedAt.getTime() - b.addedAt.getTime();
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'confidence':
          comparison = a.suggestion.confidenceScore - b.suggestion.confidenceScore;
          break;
        case 'totalAmount':
          comparison = a.suggestion.totalAmount - b.suggestion.totalAmount;
          break;
        case 'expiresAt':
          comparison = a.expiresAt.getTime() - b.expiresAt.getTime();
          break;
      }

      return comparison * multiplier;
    });
  }

  private async createPurchaseOrder(queueItem: QueueItem, createdBy: string): Promise<{ id: string }> {
    const { suggestion } = queueItem;

    // Generate PO number
    const poNumber = await this.generatePONumber();

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: suggestion.supplierId,
        orderDate: new Date(),
        expectedDate: suggestion.expectedDeliveryDate,
        status: 'draft',
        totalAmount: suggestion.totalAmount,
        notes: `Auto-generated from AI suggestion. Confidence: ${(suggestion.confidenceScore * 100).toFixed(1)}%`,
        lines: {
          create: [{
            lineNumber: 1,
            partId: suggestion.partId,
            quantity: suggestion.quantity,
            unitPrice: suggestion.unitPrice,
            lineTotal: suggestion.totalAmount
          }]
        }
      }
    });

    // Log the creation
    await this.logAuditEvent({
      action: 'po_created',
      queueItemId: queueItem.id,
      userId: createdBy,
      details: {
        purchaseOrderId: purchaseOrder.id,
        poNumber,
        amount: suggestion.totalAmount
      }
    });

    return { id: purchaseOrder.id };
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

  private getFieldValue(suggestion: EnhancedPOSuggestion, field: string): string | number | Date | null {
    switch (field) {
      case 'quantity':
        return suggestion.quantity;
      case 'supplier':
        return suggestion.supplierId;
      case 'orderDate':
        return suggestion.expectedDeliveryDate;
      case 'unitPrice':
        return suggestion.unitPrice;
      default:
        return null;
    }
  }

  private applyModification(suggestion: EnhancedPOSuggestion, field: string, value: string | number): void {
    switch (field) {
      case 'quantity':
        suggestion.quantity = value as number;
        suggestion.totalAmount = (value as number) * (suggestion.unitPrice || 0);
        break;
      case 'orderDate':
        suggestion.expectedDeliveryDate = new Date(value);
        break;
      case 'unitPrice':
        suggestion.unitPrice = value as number;
        suggestion.totalAmount = (suggestion.quantity || 0) * (value as number);
        break;
      // Supplier change would require more complex handling
    }
  }

  private async cleanupExpiredItems(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, item] of this.queue.entries()) {
      if (item.expiresAt < now && item.status === 'pending') {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      const item = this.queue.get(id)!;
      item.status = 'expired';

      await prisma.aiRecommendation.update({
        where: { id },
        data: { status: 'expired' }
      });

      this.queue.delete(id);
    }

    if (expiredIds.length > 0) {
      logger.info(`Cleaned up ${expiredIds.length} expired queue items`);
    }
  }

  private dbToQueueItem(dbItem: QueueDbRecord): QueueItem {
    const metadata = JSON.parse(dbItem.metadata || '{}');

    return {
      id: dbItem.id,
      suggestion: {
        id: dbItem.id,
        partId: dbItem.partId,
        partNumber: metadata.partNumber || '',
        partName: metadata.partName || '',
        partCategory: metadata.partCategory || '',
        supplierId: dbItem.supplierId || '',
        supplierName: metadata.supplierName || '',
        supplierCode: metadata.supplierCode || '',
        quantity: dbItem.suggestedQuantity || 0,
        unitPrice: dbItem.unitPrice || 0,
        totalAmount: dbItem.totalAmount || 0,
        currency: metadata.currency || 'VND',
        expectedDeliveryDate: dbItem.expectedDeliveryDate || new Date(),
        reorderReason: metadata.reorderReason || { type: 'below_reorder_point', currentStock: 0, reorderPoint: 0, safetyStock: 0, forecastDemand: 0, forecastPeriodDays: 0, daysOfSupply: 0, leadTimeDays: 0, description: '' },
        urgencyLevel: metadata.urgencyLevel || 'medium',
        confidenceScore: dbItem.confidence || 0.8,
        explanation: metadata.explanation || '',
        alternatives: metadata.alternatives || [],
        risks: metadata.risks || [],
        metadata: metadata.suggestionMetadata || {},
        status: dbItem.status || 'pending',
        createdAt: dbItem.createdAt || new Date(),
        expiresAt: dbItem.expiresAt || new Date(),
        aiEnhancement: metadata.aiEnhancement || { enhancedExplanation: '', decisionFactors: [], marketInsights: [], optimizationSuggestions: [], whatIfScenarios: [], learningInsights: [] }
      } as EnhancedPOSuggestion,
      status: (dbItem.status || 'pending') as QueueItemStatus,
      priority: (dbItem.priority || 'medium') as QueuePriority,
      addedAt: dbItem.createdAt,
      addedBy: dbItem.createdBy || 'system',
      reviewedAt: dbItem.reviewedAt,
      reviewedBy: dbItem.reviewedBy,
      decision: dbItem.status === 'approved' ? 'approved' :
                dbItem.status === 'rejected' ? 'rejected' :
                dbItem.status === 'modified_approved' ? 'modified' : undefined,
      decisionReason: dbItem.decisionReason,
      modifications: dbItem.modifications ? JSON.parse(dbItem.modifications) : undefined,
      resultingPOId: dbItem.resultingPOId,
      expiresAt: dbItem.expiresAt || new Date(),
      tags: metadata.tags || [],
      notes: metadata.notes || []
    };
  }

  private async logAuditEvent(event: {
    action: string;
    queueItemId: string;
    userId: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: event.action,
          entityType: 'po_suggestion',
          entityId: event.queueItemId,
          userId: event.userId,
          metadata: event.details as Record<string, string | number | boolean | null>,
        }
      });
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error(String(error)), { context: 'approval-queue-service', operation: 'logAuditEvent' });
    }
  }
}

// Export singleton instance
export const approvalQueueService = ApprovalQueueService.getInstance();

// Export class for testing
export { ApprovalQueueService };
