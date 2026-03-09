import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApprovalQueueService } from '../approval-queue-service';
import type { EnhancedPOSuggestion } from '../ai-po-analyzer';

// Mock prisma
const { mockAiRecommendation, mockPurchaseOrder, mockAuditLog } = vi.hoisted(() => ({
  mockAiRecommendation: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
    update: vi.fn().mockResolvedValue({}),
  },
  mockPurchaseOrder: {
    create: vi.fn().mockResolvedValue({ id: 'po-1' }),
    count: vi.fn().mockResolvedValue(0),
  },
  mockAuditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiRecommendation: mockAiRecommendation,
    purchaseOrder: mockPurchaseOrder,
    auditLog: mockAuditLog,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

// Helper to create a fresh instance for testing (bypass singleton)
function createFreshService(): ApprovalQueueService {
  // Reset the singleton by accessing the private static field
  (ApprovalQueueService as any).instance = undefined;
  return ApprovalQueueService.getInstance();
}

function createTestSuggestion(
  overrides: Partial<EnhancedPOSuggestion> = {}
): EnhancedPOSuggestion {
  return {
    id: 'sugg-1',
    partId: 'part-1',
    partNumber: 'PART-001',
    partName: 'Test Part',
    partCategory: 'raw_material',
    supplierId: 'sup-1',
    supplierName: 'Test Supplier',
    supplierCode: 'SUP-001',
    quantity: 100,
    unitPrice: 50000,
    totalAmount: 5000000,
    currency: 'VND',
    expectedDeliveryDate: new Date(Date.now() + 7 * 86400000),
    reorderReason: {
      type: 'below_reorder_point',
      currentStock: 20,
      reorderPoint: 50,
      safetyStock: 10,
      forecastDemand: 100,
      forecastPeriodDays: 30,
      daysOfSupply: 5,
      leadTimeDays: 7,
      description: 'Stock below reorder point',
    },
    urgencyLevel: 'medium',
    confidenceScore: 0.85,
    explanation: 'Reorder needed',
    alternatives: [],
    risks: [],
    metadata: {} as any,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 86400000),
    aiEnhancement: {
      enhancedExplanation: 'AI analysis',
      decisionFactors: [],
      marketInsights: [],
      optimizationSuggestions: [],
      whatIfScenarios: [],
      learningInsights: [],
    },
    ...overrides,
  } as EnhancedPOSuggestion;
}

describe('ApprovalQueueService', () => {
  let service: ApprovalQueueService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createFreshService();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = ApprovalQueueService.getInstance();
      const b = ApprovalQueueService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('initialize', () => {
    it('should load pending recommendations from database', async () => {
      mockAiRecommendation.findMany.mockResolvedValueOnce([]);
      await service.initialize();
      expect(mockAiRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['active', 'pending', 'in_review'] },
            category: 'purchasing',
          }),
        })
      );
    });

    it('should not re-initialize if already initialized', async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
      await service.initialize();
      await service.initialize();
      expect(mockAiRecommendation.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors gracefully', async () => {
      mockAiRecommendation.findMany.mockRejectedValueOnce(new Error('DB error'));
      await service.initialize();
      // Should still mark as initialized to avoid infinite retry
    });

    it('should hydrate queue from database records with suggestion', async () => {
      const now = new Date();
      mockAiRecommendation.findMany.mockResolvedValueOnce([
        {
          id: 'rec-1',
          status: 'pending',
          priority: 'HIGH',
          createdAt: now,
          expiresAt: new Date(now.getTime() + 7 * 86400000),
          factors: {
            suggestion: createTestSuggestion(),
            createdBy: 'admin',
            tags: ['urgent'],
            notes: [],
          },
        },
      ]);
      await service.initialize();
      const item = await service.getQueueItem('rec-1');
      expect(item).not.toBeNull();
      expect(item!.priority).toBe('high');
    });

    it('should skip records without suggestion payload', async () => {
      mockAiRecommendation.findMany.mockResolvedValueOnce([
        {
          id: 'rec-1',
          status: 'pending',
          priority: 'MEDIUM',
          createdAt: new Date(),
          expiresAt: null,
          factors: {},
        },
      ]);
      await service.initialize();
      const item = await service.getQueueItem('rec-1');
      expect(item).toBeNull();
    });
  });

  describe('addToQueue', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should add suggestion to queue', async () => {
      const suggestion = createTestSuggestion();
      const item = await service.addToQueue(suggestion, 'admin');
      expect(item.id).toBeDefined();
      expect(item.status).toBe('pending');
      expect(item.suggestion).toBe(suggestion);
      expect(item.addedBy).toBe('admin');
    });

    it('should persist to database', async () => {
      const suggestion = createTestSuggestion();
      await service.addToQueue(suggestion, 'admin');
      expect(mockAiRecommendation.create).toHaveBeenCalled();
    });

    it('should log audit event', async () => {
      const suggestion = createTestSuggestion();
      await service.addToQueue(suggestion, 'admin');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'queue_add',
            entityType: 'po_suggestion',
          }),
        })
      );
    });

    it('should use provided priority', async () => {
      const suggestion = createTestSuggestion();
      const item = await service.addToQueue(suggestion, 'admin', { priority: 'critical' });
      expect(item.priority).toBe('critical');
    });

    it('should use provided tags and notes', async () => {
      const suggestion = createTestSuggestion();
      const item = await service.addToQueue(suggestion, 'admin', {
        tags: ['urgent', 'important'],
        notes: ['review ASAP'],
      });
      expect(item.tags).toEqual(['urgent', 'important']);
      expect(item.notes).toEqual(['review ASAP']);
    });

    it('should calculate priority from suggestion when not provided', async () => {
      // Critical: stock is 0
      const criticalSuggestion = createTestSuggestion({
        reorderReason: {
          type: 'below_reorder_point',
          currentStock: 0,
          reorderPoint: 50,
          safetyStock: 10,
          forecastDemand: 100,
          forecastPeriodDays: 30,
          daysOfSupply: 0,
          leadTimeDays: 7,
          description: 'Out of stock',
        },
      });
      const item = await service.addToQueue(criticalSuggestion, 'admin');
      expect(item.priority).toBe('critical');
    });

    it('should calculate high priority for low stock', async () => {
      const suggestion = createTestSuggestion({
        confidenceScore: 0.9,
        urgencyLevel: 'high',
        reorderReason: {
          type: 'below_reorder_point',
          currentStock: 10,
          reorderPoint: 50,
          safetyStock: 10,
          forecastDemand: 100,
          forecastPeriodDays: 30,
          daysOfSupply: 2,
          leadTimeDays: 7,
          description: 'Low stock',
        },
      });
      const item = await service.addToQueue(suggestion, 'admin');
      expect(item.priority).toBe('high');
    });

    it('should calculate low priority for proactive suggestion', async () => {
      const suggestion = createTestSuggestion({
        confidenceScore: 0.5,
        urgencyLevel: 'low',
        reorderReason: {
          type: 'forecast_demand',
          currentStock: 200,
          reorderPoint: 50,
          safetyStock: 10,
          forecastDemand: 100,
          forecastPeriodDays: 30,
          daysOfSupply: 60,
          leadTimeDays: 7,
          description: 'Proactive',
        },
      });
      const item = await service.addToQueue(suggestion, 'admin');
      expect(item.priority).toBe('low');
    });

    it('should set custom expiry days', async () => {
      const suggestion = createTestSuggestion();
      const item = await service.addToQueue(suggestion, 'admin', { expiryDays: 3 });
      const expectedExpiry = Date.now() + 3 * 86400000;
      expect(Math.abs(item.expiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
    });
  });

  describe('getQueueItems', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
      // Add some items
      await service.addToQueue(createTestSuggestion({ partId: 'part-1', partName: 'Part A', confidenceScore: 0.9, totalAmount: 10000000 }), 'admin', { priority: 'high', tags: ['urgent'] });
      await service.addToQueue(createTestSuggestion({ partId: 'part-2', partName: 'Part B', supplierId: 'sup-2', confidenceScore: 0.6, totalAmount: 2000000 }), 'admin', { priority: 'low' });
      await service.addToQueue(createTestSuggestion({ partId: 'part-3', partName: 'Part C', confidenceScore: 0.75, totalAmount: 5000000 }), 'admin', { priority: 'medium' });
    });

    it('should return all items without filters', async () => {
      const result = await service.getQueueItems();
      expect(result.items.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should filter by priority', async () => {
      const result = await service.getQueueItems({ priority: ['high'] });
      expect(result.items.every(i => i.priority === 'high')).toBe(true);
    });

    it('should filter by partIds', async () => {
      const result = await service.getQueueItems({ partIds: ['part-1'] });
      expect(result.items.every(i => i.suggestion.partId === 'part-1')).toBe(true);
    });

    it('should filter by supplierIds', async () => {
      const result = await service.getQueueItems({ supplierIds: ['sup-2'] });
      expect(result.items.every(i => i.suggestion.supplierId === 'sup-2')).toBe(true);
    });

    it('should filter by minConfidence', async () => {
      const result = await service.getQueueItems({ minConfidence: 0.8 });
      expect(result.items.every(i => i.suggestion.confidenceScore >= 0.8)).toBe(true);
    });

    it('should filter by maxConfidence', async () => {
      const result = await service.getQueueItems({ maxConfidence: 0.7 });
      expect(result.items.every(i => i.suggestion.confidenceScore <= 0.7)).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await service.getQueueItems({ tags: ['urgent'] });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.every(i => i.tags.includes('urgent'))).toBe(true);
    });

    it('should filter by search term', async () => {
      const result = await service.getQueueItems({ search: 'Part A' });
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should sort by addedAt ascending', async () => {
      const result = await service.getQueueItems(undefined, { field: 'addedAt', direction: 'asc' });
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].addedAt.getTime()).toBeGreaterThanOrEqual(result.items[i - 1].addedAt.getTime());
      }
    });

    it('should sort by confidence descending', async () => {
      const result = await service.getQueueItems(undefined, { field: 'confidence', direction: 'desc' });
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].suggestion.confidenceScore).toBeLessThanOrEqual(result.items[i - 1].suggestion.confidenceScore);
      }
    });

    it('should sort by totalAmount', async () => {
      const result = await service.getQueueItems(undefined, { field: 'totalAmount', direction: 'desc' });
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i].suggestion.totalAmount).toBeLessThanOrEqual(result.items[i - 1].suggestion.totalAmount);
      }
    });

    it('should sort by priority (default)', async () => {
      const result = await service.getQueueItems();
      // Default sort: priority desc (critical first), then addedAt asc
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < result.items.length; i++) {
        const prevPrio = priorityOrder[result.items[i - 1].priority];
        const currPrio = priorityOrder[result.items[i].priority];
        expect(currPrio).toBeGreaterThanOrEqual(prevPrio);
      }
    });

    it('should paginate results', async () => {
      const result = await service.getQueueItems(undefined, undefined, { page: 1, pageSize: 2 });
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);

      const page2 = await service.getQueueItems(undefined, undefined, { page: 2, pageSize: 2 });
      expect(page2.items.length).toBe(1);
    });
  });

  describe('getQueueItem', () => {
    it('should return null for non-existent item', async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
      const item = await service.getQueueItem('nonexistent');
      expect(item).toBeNull();
    });
  });

  describe('approveItem', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should approve a pending item', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      const result = await service.approveItem(queued.id, 'approver', 'Looks good');
      expect(result.success).toBe(true);
      expect(result.decision).toBe('approved');
      expect(result.purchaseOrderId).toBeDefined();
    });

    it('should create a purchase order', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.approveItem(queued.id, 'approver');
      expect(mockPurchaseOrder.create).toHaveBeenCalled();
    });

    it('should update database status', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.approveItem(queued.id, 'approver');
      expect(mockAiRecommendation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: queued.id },
          data: expect.objectContaining({ status: 'approved' }),
        })
      );
    });

    it('should remove from in-memory queue after approval', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.approveItem(queued.id, 'approver');
      const item = await service.getQueueItem(queued.id);
      expect(item).toBeNull();
    });

    it('should fail for non-existent item', async () => {
      const result = await service.approveItem('nonexistent', 'approver');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail for already approved item', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');
      await service.approveItem(queued.id, 'approver');

      // Item is removed, so trying again returns not found
      const result = await service.approveItem(queued.id, 'approver');
      expect(result.success).toBe(false);
    });

    it('should handle PO creation error', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      mockPurchaseOrder.create.mockRejectedValueOnce(new Error('PO creation failed'));
      const result = await service.approveItem(queued.id, 'approver');
      expect(result.success).toBe(false);
      expect(result.error).toContain('PO creation failed');
    });
  });

  describe('rejectItem', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should reject a pending item', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      const result = await service.rejectItem(queued.id, 'reviewer', 'Not needed');
      expect(result.success).toBe(true);
      expect(result.decision).toBe('rejected');
    });

    it('should update database status', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.rejectItem(queued.id, 'reviewer', 'Not needed');
      expect(mockAiRecommendation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: queued.id },
          data: expect.objectContaining({ status: 'rejected' }),
        })
      );
    });

    it('should remove from queue after rejection', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.rejectItem(queued.id, 'reviewer', 'Not needed');
      const item = await service.getQueueItem(queued.id);
      expect(item).toBeNull();
    });

    it('should fail for non-existent item', async () => {
      const result = await service.rejectItem('nonexistent', 'reviewer', 'reason');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle database error', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      mockAiRecommendation.update.mockRejectedValueOnce(new Error('DB error'));
      const result = await service.rejectItem(queued.id, 'reviewer', 'reason');
      expect(result.success).toBe(false);
    });
  });

  describe('modifyAndApprove', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should modify and approve an item', async () => {
      const suggestion = createTestSuggestion({ quantity: 100, unitPrice: 50000, totalAmount: 5000000 });
      const queued = await service.addToQueue(suggestion, 'admin');

      const result = await service.modifyAndApprove(
        queued.id,
        [{ field: 'quantity', newValue: 200, reason: 'Need more' }],
        'approver'
      );
      expect(result.success).toBe(true);
      expect(result.decision).toBe('modified');
      expect(result.purchaseOrderId).toBeDefined();
    });

    it('should update quantity and recalculate total', async () => {
      const suggestion = createTestSuggestion({ quantity: 100, unitPrice: 50000, totalAmount: 5000000 });
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.modifyAndApprove(
        queued.id,
        [{ field: 'quantity', newValue: 200 }],
        'approver'
      );
      // The suggestion's quantity should have been updated before PO creation
      expect(mockPurchaseOrder.create).toHaveBeenCalled();
    });

    it('should update unitPrice and recalculate total', async () => {
      const suggestion = createTestSuggestion({ quantity: 100, unitPrice: 50000, totalAmount: 5000000 });
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.modifyAndApprove(
        queued.id,
        [{ field: 'unitPrice', newValue: 60000 }],
        'approver'
      );
      expect(mockPurchaseOrder.create).toHaveBeenCalled();
    });

    it('should fail for non-existent item', async () => {
      const result = await service.modifyAndApprove('nonexistent', [], 'approver');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle error during PO creation', async () => {
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      mockPurchaseOrder.create.mockRejectedValueOnce(new Error('Create failed'));
      const result = await service.modifyAndApprove(
        queued.id,
        [{ field: 'quantity', newValue: 200 }],
        'approver'
      );
      expect(result.success).toBe(false);
    });
  });

  describe('bulkApprove', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should approve multiple items', async () => {
      const q1 = await service.addToQueue(createTestSuggestion({ partId: 'p1' }), 'admin');
      const q2 = await service.addToQueue(createTestSuggestion({ partId: 'p2' }), 'admin');

      const result = await service.bulkApprove([q1.id, q2.id], 'approver');
      expect(result.totalProcessed).toBe(2);
      expect(result.summary.approved).toBe(2);
      expect(result.summary.errors).toBe(0);
    });

    it('should handle partial failures', async () => {
      const q1 = await service.addToQueue(createTestSuggestion({ partId: 'p1' }), 'admin');

      const result = await service.bulkApprove([q1.id, 'nonexistent'], 'approver');
      expect(result.totalProcessed).toBe(2);
      expect(result.successful.length).toBe(1);
      expect(result.failed.length).toBe(1);
    });
  });

  describe('bulkReject', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should reject multiple items', async () => {
      const q1 = await service.addToQueue(createTestSuggestion({ partId: 'p1' }), 'admin');
      const q2 = await service.addToQueue(createTestSuggestion({ partId: 'p2' }), 'admin');

      const result = await service.bulkReject([q1.id, q2.id], 'reviewer', 'Not needed');
      expect(result.totalProcessed).toBe(2);
      expect(result.summary.rejected).toBe(2);
    });
  });

  describe('getQueueStats', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should return stats for empty queue', async () => {
      const stats = await service.getQueueStats();
      expect(stats.totalPending).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.totalValue).toBe(0);
    });

    it('should return correct stats with items', async () => {
      await service.addToQueue(createTestSuggestion({ confidenceScore: 0.8, totalAmount: 1000000 }), 'admin', { priority: 'high' });
      await service.addToQueue(createTestSuggestion({ confidenceScore: 0.9, totalAmount: 2000000, partId: 'p2' }), 'admin', { priority: 'critical' });

      const stats = await service.getQueueStats();
      expect(stats.totalPending).toBe(2);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
      expect(stats.avgConfidence).toBeCloseTo(0.85, 1);
      expect(stats.totalValue).toBe(3000000);
    });

    it('should count items expiring in 24h', async () => {
      // Add item that expires very soon
      const suggestion = createTestSuggestion();
      const item = await service.addToQueue(suggestion, 'admin', { expiryDays: 0 });
      // The item expiresAt is effectively now, which is within 24h

      const stats = await service.getQueueStats();
      expect(stats.expiringIn24h).toBeGreaterThanOrEqual(1);
    });
  });

  describe('startReview', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should mark item as in_review', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');

      const result = await service.startReview(queued.id, 'reviewer');
      expect(result).toBe(true);

      const item = await service.getQueueItem(queued.id);
      expect(item!.status).toBe('in_review');
    });

    it('should fail for non-existent item', async () => {
      const result = await service.startReview('nonexistent', 'reviewer');
      expect(result).toBe(false);
    });

    it('should fail for non-pending item', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');
      await service.startReview(queued.id, 'reviewer');

      // Try again - should fail since status is in_review
      const result = await service.startReview(queued.id, 'another');
      expect(result).toBe(false);
    });
  });

  describe('cancelReview', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should return item to pending', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');
      await service.startReview(queued.id, 'reviewer');

      const result = await service.cancelReview(queued.id, 'reviewer');
      expect(result).toBe(true);

      const item = await service.getQueueItem(queued.id);
      expect(item!.status).toBe('pending');
    });

    it('should fail for non-in_review item', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');
      const result = await service.cancelReview(queued.id, 'reviewer');
      expect(result).toBe(false);
    });
  });

  describe('addNote', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should add note to queue item', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');
      mockAiRecommendation.findUnique.mockResolvedValueOnce({
        id: queued.id,
        factors: {},
      });

      const result = await service.addNote(queued.id, 'Important note', 'admin');
      expect(result).toBe(true);

      const item = await service.getQueueItem(queued.id);
      expect(item!.notes.length).toBeGreaterThan(0);
      expect(item!.notes[item!.notes.length - 1]).toContain('Important note');
    });

    it('should fail for non-existent item', async () => {
      const result = await service.addNote('nonexistent', 'Note', 'admin');
      expect(result).toBe(false);
    });
  });

  describe('PO number generation', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should generate PO number with correct format', async () => {
      mockPurchaseOrder.count.mockResolvedValueOnce(5);
      const suggestion = createTestSuggestion();
      const queued = await service.addToQueue(suggestion, 'admin');

      await service.approveItem(queued.id, 'approver');

      const createCall = mockPurchaseOrder.create.mock.calls[0][0];
      expect(createCall.data.poNumber).toMatch(/^PO-\d{4}-\d{4}$/);
    });
  });

  describe('approve in_review item', () => {
    beforeEach(async () => {
      mockAiRecommendation.findMany.mockResolvedValue([]);
    });

    it('should approve an item that is in review', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');
      await service.startReview(queued.id, 'reviewer');

      const result = await service.approveItem(queued.id, 'approver');
      expect(result.success).toBe(true);
    });

    it('should reject an item that is in review', async () => {
      const queued = await service.addToQueue(createTestSuggestion(), 'admin');
      await service.startReview(queued.id, 'reviewer');

      const result = await service.rejectItem(queued.id, 'reviewer', 'No good');
      expect(result.success).toBe(true);
    });
  });
});
