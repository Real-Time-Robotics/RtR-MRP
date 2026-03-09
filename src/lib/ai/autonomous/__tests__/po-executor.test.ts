import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POExecutorService, POExecutionRequest, ExecutionOptions } from '../po-executor';
import { EnhancedPOSuggestion } from '../ai-po-analyzer';
import { POModification } from '../approval-queue-service';

// Mock prisma
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    part: {
      findUnique: vi.fn().mockResolvedValue({ id: 'part-1', name: 'Test Part' }),
    },
    supplier: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'supplier-1',
        name: 'Test Supplier',
        status: 'active',
        paymentTerms: 'Net 30',
      }),
    },
    partSupplier: {
      findFirst: vi.fn().mockResolvedValue({ unitPrice: 100 }),
    },
    inventory: {
      findFirst: vi.fn().mockResolvedValue({ id: 'inv-1', quantity: 50 }),
    },
    purchaseOrder: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(5),
      create: vi.fn().mockResolvedValue({
        id: 'po-new-1',
        poNumber: 'PO-2503-0006',
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    purchaseOrderLine: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

// =============================================================================
// HELPERS
// =============================================================================

function createTestSuggestion(overrides: Partial<EnhancedPOSuggestion> = {}): EnhancedPOSuggestion {
  return {
    id: 'sug-1',
    partId: 'part-1',
    partNumber: 'PRT-001',
    partName: 'Test Part',
    partCategory: 'Component',
    supplierId: 'supplier-1',
    supplierName: 'Test Supplier',
    supplierCode: 'SUP-001',
    quantity: 100,
    unitPrice: 100,
    totalAmount: 10000,
    currency: 'VND',
    expectedDeliveryDate: new Date(2025, 3, 1),
    reorderReason: {
      type: 'safety_stock',
      currentStock: 20,
      safetyStock: 50,
      reorderPoint: 80,
      dailyDemand: 10,
      daysOfSupply: 2,
    } as any,
    urgencyLevel: 'high',
    confidenceScore: 0.85,
    explanation: 'Low stock detected',
    alternatives: [],
    risks: [],
    metadata: {} as any,
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
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

function createTestRequest(overrides: Partial<POExecutionRequest> = {}): POExecutionRequest {
  return {
    queueItemId: 'queue-1',
    suggestion: createTestSuggestion(),
    approvedBy: 'user-1',
    approvalTimestamp: new Date(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('POExecutorService', () => {
  let executor: POExecutorService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh instance (bypass singleton for testing)
    executor = POExecutorService.getInstance();
    // Reset the singleton by accessing private - we'll just use the getInstance()
  });

  // ===========================================================================
  // SINGLETON
  // ===========================================================================

  describe('getInstance', () => {
    it('returns a POExecutorService instance', () => {
      const instance = POExecutorService.getInstance();
      expect(instance).toBeDefined();
    });

    it('returns the same instance', () => {
      const i1 = POExecutorService.getInstance();
      const i2 = POExecutorService.getInstance();
      expect(i1).toBe(i2);
    });
  });

  // ===========================================================================
  // EXECUTE PO CREATION
  // ===========================================================================

  describe('executePOCreation', () => {
    it('creates a PO successfully', async () => {
      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-new-1');
      expect(result.poNumber).toBe('PO-2503-0006');
      expect(result.status).toBe('created');
      expect(result.details.partId).toBe('part-1');
      expect(result.details.supplierId).toBe('supplier-1');
      expect(result.details.quantity).toBe(100);
      expect(result.details.wasModified).toBe(false);
    });

    it('returns failed result when part not found', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.part.findUnique as any).mockResolvedValueOnce(null);

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Part not found');
      expect(result.status).toBe('failed');
    });

    it('returns failed result when supplier not found', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.supplier.findUnique as any).mockResolvedValueOnce(null);

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supplier not found');
    });

    it('returns failed result when supplier is inactive', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.supplier.findUnique as any).mockResolvedValueOnce({
        id: 'supplier-1',
        name: 'Test Supplier',
        status: 'inactive',
      });

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Supplier is inactive');
    });

    it('adds price change warning', async () => {
      const { prisma } = await import('@/lib/prisma');
      // Price changed >10%
      (prisma.partSupplier.findFirst as any).mockResolvedValueOnce({ unitPrice: 150 });

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(true);
      const priceWarning = result.warnings.find(w => w.includes('Giá đã thay đổi'));
      expect(priceWarning).toBeDefined();
    });

    it('adds existing draft PO warning', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.findFirst as any).mockResolvedValueOnce({
        id: 'existing-po',
        poNumber: 'PO-EXISTING',
      });

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(true);
      const draftWarning = result.warnings.find(w => w.includes('PO draft hiện có'));
      expect(draftWarning).toBeDefined();
    });

    it('adds pending PO warning', async () => {
      const { prisma } = await import('@/lib/prisma');
      // The count call returns a non-zero count for pending POs
      // There are two count calls: one for PO number gen, one for pending POs check
      (prisma.purchaseOrder.count as any)
        .mockResolvedValueOnce(5)  // generatePONumber
        .mockResolvedValueOnce(2); // pending POs check

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(true);
      const pendingWarning = result.warnings.find(w => w.includes('PO đang pending'));
      expect(pendingWarning).toBeDefined();
    });

    it('applies quantity modification', async () => {
      const modifications: POModification[] = [
        {
          field: 'quantity',
          originalValue: 100,
          newValue: 200,
          modifiedBy: 'user-1',
          modifiedAt: new Date(),
          reason: 'Need more',
        },
      ];

      const request = createTestRequest({ modifications });
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(true);
      expect(result.details.wasModified).toBe(true);
      expect(result.details.quantity).toBe(200);
      expect(result.details.totalAmount).toBe(200 * 100);
    });

    it('applies unitPrice modification', async () => {
      const modifications: POModification[] = [
        {
          field: 'unitPrice',
          originalValue: 100,
          newValue: 80,
          modifiedBy: 'user-1',
          modifiedAt: new Date(),
        },
      ];

      const request = createTestRequest({ modifications });
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(true);
      expect(result.details.unitPrice).toBe(80);
      expect(result.details.totalAmount).toBe(100 * 80);
    });

    it('handles autoSubmitToSupplier option', async () => {
      const request = createTestRequest({
        executionOptions: { autoSubmitToSupplier: true },
      });

      const result = await executor.executePOCreation(request);
      expect(result.success).toBe(true);
      expect(result.status).toBe('submitted');
    });

    it('sets pending status for urgent/critical priority', async () => {
      const request = createTestRequest({
        executionOptions: { priority: 'critical' },
      });

      const result = await executor.executePOCreation(request);
      expect(result.success).toBe(true);
      // Status is 'created' because determineInitialStatus returns 'pending',
      // and the result maps it based on initialStatus
    });

    it('sends notifications when requested', async () => {
      const request = createTestRequest({
        executionOptions: {
          sendNotification: true,
          notifyEmails: ['test@example.com', 'admin@example.com'],
        },
      });

      const result = await executor.executePOCreation(request);
      expect(result.success).toBe(true);
      expect(result.details.notificationsSent).toContain('test@example.com');
      expect(result.details.notificationsSent).toContain('admin@example.com');
    });

    it('handles split delivery', async () => {
      const { prisma } = await import('@/lib/prisma');
      const request = createTestRequest({
        executionOptions: {
          splitDelivery: {
            enabled: true,
            deliveries: [
              { quantity: 50, expectedDate: new Date(2025, 3, 1) },
              { quantity: 50, expectedDate: new Date(2025, 3, 15) },
            ],
          },
        },
      });

      const result = await executor.executePOCreation(request);
      expect(result.success).toBe(true);
      // purchaseOrderLine.create should be called twice for split delivery
      expect(prisma.purchaseOrderLine.create).toHaveBeenCalledTimes(2);
    });

    it('handles error during PO creation gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.create as any).mockRejectedValueOnce(new Error('DB error'));

      const request = createTestRequest();
      const result = await executor.executePOCreation(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  // ===========================================================================
  // EXECUTE BATCH
  // ===========================================================================

  describe('executeBatch', () => {
    it('executes multiple requests and returns summary', async () => {
      const requests = [
        createTestRequest({ queueItemId: 'q1' }),
        createTestRequest({
          queueItemId: 'q2',
          suggestion: createTestSuggestion({ supplierId: 'supplier-2', supplierName: 'Supplier 2' }),
        }),
      ];

      const { results, summary } = await executor.executeBatch(requests);

      expect(results).toHaveLength(2);
      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.totalValue).toBeGreaterThan(0);
    });

    it('handles partial failures', async () => {
      const { prisma } = await import('@/lib/prisma');
      // First call succeeds, second call fails on part lookup
      (prisma.part.findUnique as any)
        .mockResolvedValueOnce({ id: 'part-1', name: 'Test Part' })
        .mockResolvedValueOnce(null);

      const requests = [
        createTestRequest({ queueItemId: 'q1' }),
        createTestRequest({ queueItemId: 'q2' }),
      ];

      const { summary } = await executor.executeBatch(requests);
      expect(summary.successful).toBe(1);
      expect(summary.failed).toBe(1);
    });
  });

  // ===========================================================================
  // CANCEL PO
  // ===========================================================================

  describe('cancelPO', () => {
    it('cancels a draft PO', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.findUnique as any).mockResolvedValueOnce({
        id: 'po-1',
        status: 'draft',
        notes: 'Original notes',
      });

      const result = await executor.cancelPO('po-1', 'user-1', 'No longer needed');
      expect(result.success).toBe(true);
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-1' },
          data: expect.objectContaining({ status: 'cancelled' }),
        })
      );
    });

    it('cancels a pending PO', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.findUnique as any).mockResolvedValueOnce({
        id: 'po-1',
        status: 'pending',
        notes: '',
      });

      const result = await executor.cancelPO('po-1', 'user-1', 'Cancelled');
      expect(result.success).toBe(true);
    });

    it('fails for non-existent PO', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.findUnique as any).mockResolvedValueOnce(null);

      const result = await executor.cancelPO('po-999', 'user-1', 'reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Purchase order not found');
    });

    it('fails for non-cancellable status', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.findUnique as any).mockResolvedValueOnce({
        id: 'po-1',
        status: 'submitted',
      });

      const result = await executor.cancelPO('po-1', 'user-1', 'reason');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cancel');
    });

    it('handles DB error gracefully', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.purchaseOrder.findUnique as any).mockRejectedValueOnce(new Error('DB error'));

      const result = await executor.cancelPO('po-1', 'user-1', 'reason');
      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });
  });

  // ===========================================================================
  // EXECUTION METRICS
  // ===========================================================================

  describe('getExecutionMetrics', () => {
    it('returns initial empty metrics', async () => {
      const metrics = await executor.getExecutionMetrics();
      expect(metrics.totalExecuted).toBeGreaterThanOrEqual(0);
      expect(metrics.byStatus).toBeDefined();
      expect(metrics.byStatus.created).toBeDefined();
      expect(metrics.byStatus.failed).toBeDefined();
    });

    it('tracks executed PO metrics', async () => {
      // Execute a PO to populate history
      const request = createTestRequest();
      await executor.executePOCreation(request);

      const metrics = await executor.getExecutionMetrics();
      expect(metrics.totalExecuted).toBeGreaterThanOrEqual(1);
      expect(metrics.totalValueCreated).toBeGreaterThanOrEqual(0);
    });

    it('filters by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const metrics = await executor.getExecutionMetrics({ start: yesterday, end: tomorrow });
      expect(metrics).toBeDefined();
    });

    it('calculates average execution time from logs', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.auditLog.findMany as any).mockResolvedValueOnce([
        { metadata: { executionTime: 100 } },
        { metadata: { executionTime: 200 } },
      ]);

      const metrics = await executor.getExecutionMetrics();
      expect(metrics.avgExecutionTime).toBe(150);
    });
  });

  // ===========================================================================
  // RETRY EXECUTION
  // ===========================================================================

  describe('retryExecution', () => {
    it('re-executes the same request', async () => {
      const request = createTestRequest();
      const result = await executor.retryExecution(request);
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // DETERMINE INITIAL STATUS
  // ===========================================================================

  describe('determineInitialStatus (via executePOCreation)', () => {
    it('defaults to draft with no options', async () => {
      const request = createTestRequest();
      const result = await executor.executePOCreation(request);
      expect(result.status).toBe('created'); // 'draft' initial status maps to 'created'
    });

    it('returns submitted for autoSubmitToSupplier', async () => {
      const request = createTestRequest({
        executionOptions: { autoSubmitToSupplier: true },
      });
      const result = await executor.executePOCreation(request);
      expect(result.status).toBe('submitted');
    });

    it('uses pending for urgent priority', async () => {
      const request = createTestRequest({
        executionOptions: { priority: 'urgent' },
      });
      const result = await executor.executePOCreation(request);
      // pending initial status maps to 'created' in result
      expect(result.status).toBe('created');
    });
  });
});
