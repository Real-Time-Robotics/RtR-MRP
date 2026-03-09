import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
const { mockJobQueue } = vi.hoisted(() => ({
  mockJobQueue: {
    register: vi.fn(),
    clear: vi.fn().mockReturnValue(5),
  },
}));

const { mockWarmAllCaches } = vi.hoisted(() => ({
  mockWarmAllCaches: vi.fn().mockResolvedValue({ warmed: true }),
}));

const {
  mockAuditLog,
  mockNotification,
  mockInventory,
  mockSalesOrder,
  mockWorkOrder,
  mockPurchaseOrder,
  mockPurchaseOrderLine,
  mockPart,
  mockSupplier,
  mockProduct,
  mockCustomer,
  mockWarehouse,
  mockImportJob,
  mockBomHeader,
  mockMrpRun,
  mockMrpSuggestion,
} = vi.hoisted(() => ({
  mockAuditLog: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
  mockNotification: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
  mockInventory: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(10),
    upsert: vi.fn().mockResolvedValue({}),
  },
  mockSalesOrder: {
    findMany: vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: 1000 } }),
  },
  mockWorkOrder: { findMany: vi.fn().mockResolvedValue([]) },
  mockPurchaseOrder: {
    aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: 500 } }),
  },
  mockPurchaseOrderLine: {
    groupBy: vi.fn().mockResolvedValue([]),
    findMany: vi.fn().mockResolvedValue([]),
  },
  mockPart: {
    update: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  },
  mockSupplier: {
    findFirst: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  mockProduct: {
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  mockCustomer: {
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  mockWarehouse: { findUnique: vi.fn() },
  mockImportJob: { update: vi.fn().mockResolvedValue({}) },
  mockBomHeader: { findFirst: vi.fn() },
  mockMrpRun: { create: vi.fn().mockResolvedValue({ id: 'mrp-1', runNumber: 'MRP-001', runDate: new Date() }) },
  mockMrpSuggestion: { createMany: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/lib/jobs/job-queue', () => ({
  jobQueue: mockJobQueue,
  JOB_NAMES: {
    CACHE_WARMING: 'cache:warm',
    CLEANUP: 'system:cleanup',
    REPORT_GENERATION: 'report:generate',
    DATA_SYNC: 'data:sync',
    EXCEL_IMPORT: 'excel:import',
    MRP_CALCULATION: 'mrp:calculate',
  },
}));

vi.mock('@/lib/cache/cache-warmer', () => ({
  warmAllCaches: mockWarmAllCaches,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    auditLog: mockAuditLog,
    notification: mockNotification,
    inventory: mockInventory,
    salesOrder: mockSalesOrder,
    workOrder: mockWorkOrder,
    purchaseOrder: mockPurchaseOrder,
    purchaseOrderLine: mockPurchaseOrderLine,
    part: mockPart,
    supplier: mockSupplier,
    product: mockProduct,
    customer: mockCustomer,
    warehouse: mockWarehouse,
    importJob: mockImportJob,
    bomHeader: mockBomHeader,
    mrpRun: mockMrpRun,
    mrpSuggestion: mockMrpSuggestion,
  },
}));

vi.mock('@/lib/monitoring/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

// We need to import AFTER mocks are set up
// handlers.ts auto-registers on import, so registerJobHandlers is called
import { registerJobHandlers } from '../handlers';

describe('handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerJobHandlers', () => {
    it('should register 6 job handlers', () => {
      registerJobHandlers();
      expect(mockJobQueue.register).toHaveBeenCalledTimes(6);
    });

    it('should register handlers with correct names', () => {
      registerJobHandlers();
      const registeredNames = mockJobQueue.register.mock.calls.map(
        (call: unknown[]) => call[0]
      );
      expect(registeredNames).toContain('cache:warm');
      expect(registeredNames).toContain('system:cleanup');
      expect(registeredNames).toContain('report:generate');
      expect(registeredNames).toContain('data:sync');
      expect(registeredNames).toContain('excel:import');
      expect(registeredNames).toContain('mrp:calculate');
    });
  });

  describe('cacheWarmingHandler', () => {
    it('should call warmAllCaches and return report', async () => {
      registerJobHandlers();
      const handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'cache:warm'
      )![1];

      const job = { data: {} };
      const updateProgress = vi.fn();
      const result = await handler(job, updateProgress);

      expect(mockWarmAllCaches).toHaveBeenCalled();
      expect(updateProgress).toHaveBeenCalledWith(10);
      expect(updateProgress).toHaveBeenCalledWith(100);
      expect(result).toEqual({ warmed: true });
    });
  });

  describe('cleanupHandler', () => {
    it('should clean up old data with default 30 days', async () => {
      registerJobHandlers();
      const handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'system:cleanup'
      )![1];

      const job = { data: {} };
      const updateProgress = vi.fn();
      const result = await handler(job, updateProgress);

      expect(mockJobQueue.clear).toHaveBeenCalled();
      expect(mockAuditLog.deleteMany).toHaveBeenCalled();
      expect(mockNotification.deleteMany).toHaveBeenCalled();
      expect(result).toHaveProperty('clearedJobs');
      expect(result).toHaveProperty('deletedAuditLogs', 3);
      expect(result).toHaveProperty('deletedNotifications', 2);
      expect(result).toHaveProperty('cutoffDate');
    });

    it('should use custom olderThanDays', async () => {
      registerJobHandlers();
      const handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'system:cleanup'
      )![1];

      const job = { data: { olderThanDays: 7 } };
      const updateProgress = vi.fn();
      await handler(job, updateProgress);

      expect(mockJobQueue.clear).toHaveBeenCalledWith(7 * 24 * 60 * 60 * 1000);
    });

    it('should handle errors gracefully when tables do not exist', async () => {
      mockAuditLog.deleteMany.mockRejectedValueOnce(new Error('Table not found'));
      mockNotification.deleteMany.mockRejectedValueOnce(new Error('Table not found'));

      registerJobHandlers();
      const handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'system:cleanup'
      )![1];

      const job = { data: {} };
      const updateProgress = vi.fn();
      const result = await handler(job, updateProgress);

      expect(result.deletedAuditLogs).toBe(0);
      expect(result.deletedNotifications).toBe(0);
    });
  });

  describe('reportGenerationHandler', () => {
    let handler: (job: { data: Record<string, unknown> }, updateProgress: (p: number) => void) => Promise<unknown>;

    beforeEach(() => {
      registerJobHandlers();
      handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'report:generate'
      )![1];
    });

    it('should generate an inventory report in JSON format', async () => {
      mockInventory.findMany.mockResolvedValueOnce([{ id: '1', quantity: 10 }]);

      const result = await handler(
        { data: { type: 'inventory', format: 'json' } },
        vi.fn()
      ) as { type: string; format: string; recordCount: number; data: string };

      expect(result.type).toBe('inventory');
      expect(result.format).toBe('json');
      expect(result.recordCount).toBe(1);
      expect(JSON.parse(result.data)).toEqual([{ id: '1', quantity: 10 }]);
    });

    it('should generate a sales report with date range', async () => {
      mockSalesOrder.findMany.mockResolvedValueOnce([]);

      const result = await handler(
        {
          data: {
            type: 'sales',
            format: 'json',
            dateRange: { start: '2026-01-01', end: '2026-01-31' },
          },
        },
        vi.fn()
      ) as { recordCount: number };

      expect(mockSalesOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
      expect(result.recordCount).toBe(0);
    });

    it('should generate a production report', async () => {
      mockWorkOrder.findMany.mockResolvedValueOnce([{ id: 'wo1' }]);

      const result = await handler(
        { data: { type: 'production', format: 'json' } },
        vi.fn()
      ) as { type: string; recordCount: number };

      expect(result.type).toBe('production');
      expect(result.recordCount).toBe(1);
    });

    it('should generate a financial report', async () => {
      const result = await handler(
        { data: { type: 'financial', format: 'json' } },
        vi.fn()
      ) as { type: string; recordCount: number; data: string };

      expect(result.type).toBe('financial');
      expect(result.recordCount).toBe(1);
      const parsed = JSON.parse(result.data);
      expect(parsed[0]).toHaveProperty('totalSales');
      expect(parsed[0]).toHaveProperty('totalPurchases');
    });

    it('should format output as CSV', async () => {
      mockInventory.findMany.mockResolvedValueOnce([
        { id: '1', quantity: 10 },
        { id: '2', quantity: 20 },
      ]);

      const result = await handler(
        { data: { type: 'inventory', format: 'csv' } },
        vi.fn()
      ) as { data: string };

      expect(result.data).toContain('id,quantity');
      expect(result.data.split('\n')).toHaveLength(3); // header + 2 rows
    });

    it('should return empty string for CSV with no data', async () => {
      mockInventory.findMany.mockResolvedValueOnce([]);

      const result = await handler(
        { data: { type: 'inventory', format: 'csv' } },
        vi.fn()
      ) as { data: string };

      expect(result.data).toBe('');
    });
  });

  describe('dataSyncHandler', () => {
    let handler: (job: { data: Record<string, unknown> }, updateProgress: (p: number) => void) => Promise<unknown>;

    beforeEach(() => {
      registerJobHandlers();
      handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'data:sync'
      )![1];
    });

    it('should sync inventory only', async () => {
      const result = await handler(
        { data: { entityType: 'inventory' } },
        vi.fn()
      ) as { entityType: string; results: Record<string, number> };

      expect(mockInventory.count).toHaveBeenCalled();
      expect(result.entityType).toBe('inventory');
      expect(result.results.inventoryRecords).toBe(10);
    });

    it('should sync prices only', async () => {
      mockPurchaseOrderLine.groupBy.mockResolvedValueOnce([
        { partId: 'p1', _avg: { unitPrice: 25.5 } },
      ]);

      const result = await handler(
        { data: { entityType: 'prices' } },
        vi.fn()
      ) as { results: Record<string, number> };

      expect(mockPart.update).toHaveBeenCalled();
      expect(result.results.pricesUpdated).toBe(1);
    });

    it('should sync all entities', async () => {
      mockPurchaseOrderLine.groupBy.mockResolvedValueOnce([]);

      const result = await handler(
        { data: { entityType: 'all' } },
        vi.fn()
      ) as { entityType: string; results: Record<string, number>; syncedAt: string };

      expect(mockInventory.count).toHaveBeenCalled();
      expect(result.entityType).toBe('all');
      expect(result.syncedAt).toBeDefined();
    });

    it('should skip part update when partId or unitPrice is null', async () => {
      mockPurchaseOrderLine.groupBy.mockResolvedValueOnce([
        { partId: null, _avg: { unitPrice: 10 } },
        { partId: 'p2', _avg: { unitPrice: null } },
      ]);

      await handler({ data: { entityType: 'prices' } }, vi.fn());
      expect(mockPart.update).not.toHaveBeenCalled();
    });
  });

  describe('excelImportHandler', () => {
    let handler: (job: { data: Record<string, unknown> }, updateProgress: (p: number) => void) => Promise<unknown>;

    beforeEach(() => {
      registerJobHandlers();
      handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'excel:import'
      )![1];
    });

    it('should process parts import with insert mode', async () => {
      const result = await handler(
        {
          data: {
            jobId: 'job-1',
            entityType: 'parts',
            updateMode: 'insert',
            mappings: [
              { sourceColumn: 'col1', targetField: 'partNumber' },
              { sourceColumn: 'col2', targetField: 'name' },
            ],
            data: [
              { col1: 'PN-001', col2: 'Part One' },
            ],
          },
        },
        vi.fn()
      ) as { processed: number; success: number; errorCount: number };

      expect(mockImportJob.update).toHaveBeenCalledTimes(2); // start + complete
      expect(mockPart.create).toHaveBeenCalled();
      expect(result.processed).toBe(1);
      expect(result.success).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it('should process suppliers import', async () => {
      const result = await handler(
        {
          data: {
            jobId: 'job-2',
            entityType: 'suppliers',
            updateMode: 'insert',
            mappings: [
              { sourceColumn: 'c', targetField: 'code' },
              { sourceColumn: 'n', targetField: 'name' },
            ],
            data: [{ c: 'SUP-001', n: 'Supplier One' }],
          },
        },
        vi.fn()
      ) as { success: number };

      expect(mockSupplier.create).toHaveBeenCalled();
      expect(result.success).toBe(1);
    });

    it('should process products import with upsert mode', async () => {
      const result = await handler(
        {
          data: {
            jobId: 'job-3',
            entityType: 'products',
            updateMode: 'upsert',
            mappings: [
              { sourceColumn: 's', targetField: 'sku' },
              { sourceColumn: 'n', targetField: 'name' },
            ],
            data: [{ s: 'SKU-001', n: 'Product One' }],
          },
        },
        vi.fn()
      ) as { success: number };

      expect(mockProduct.upsert).toHaveBeenCalled();
      expect(result.success).toBe(1);
    });

    it('should process customers import with update mode', async () => {
      const result = await handler(
        {
          data: {
            jobId: 'job-4',
            entityType: 'customers',
            updateMode: 'update',
            mappings: [
              { sourceColumn: 'c', targetField: 'code' },
              { sourceColumn: 'n', targetField: 'name' },
            ],
            data: [{ c: 'CUST-001', n: 'Customer One' }],
          },
        },
        vi.fn()
      ) as { success: number };

      expect(mockCustomer.update).toHaveBeenCalled();
      expect(result.success).toBe(1);
    });

    it('should process inventory import', async () => {
      mockPart.findUnique.mockResolvedValueOnce({ id: 'part-id' });
      mockWarehouse.findUnique.mockResolvedValueOnce({ id: 'wh-id' });

      const result = await handler(
        {
          data: {
            jobId: 'job-5',
            entityType: 'inventory',
            updateMode: 'upsert',
            mappings: [
              { sourceColumn: 'pn', targetField: 'partNumber' },
              { sourceColumn: 'wh', targetField: 'warehouseCode' },
              { sourceColumn: 'qty', targetField: 'quantity' },
            ],
            data: [{ pn: 'PN-001', wh: 'WH-01', qty: 100 }],
          },
        },
        vi.fn()
      ) as { success: number };

      expect(mockInventory.upsert).toHaveBeenCalled();
      expect(result.success).toBe(1);
    });

    it('should record errors for unknown entity types', async () => {
      const result = await handler(
        {
          data: {
            jobId: 'job-6',
            entityType: 'unknown',
            updateMode: 'insert',
            mappings: [{ sourceColumn: 'a', targetField: 'b' }],
            data: [{ a: 'val' }],
          },
        },
        vi.fn()
      ) as { errorCount: number; errors: { row: number; message: string }[] };

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('Unknown entity type');
    });

    it('should handle errors in individual rows', async () => {
      mockPart.create.mockRejectedValueOnce(new Error('Duplicate key'));

      const result = await handler(
        {
          data: {
            jobId: 'job-7',
            entityType: 'parts',
            updateMode: 'insert',
            mappings: [
              { sourceColumn: 'pn', targetField: 'partNumber' },
              { sourceColumn: 'n', targetField: 'name' },
            ],
            data: [{ pn: 'PN-DUP', n: 'Dup Part' }],
          },
        },
        vi.fn()
      ) as { success: number; errorCount: number; errors: { message: string }[] };

      expect(result.success).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('Duplicate key');
    });

    it('should throw error when part number is empty for parts import', async () => {
      const result = await handler(
        {
          data: {
            jobId: 'job-8',
            entityType: 'parts',
            updateMode: 'insert',
            mappings: [{ sourceColumn: 'pn', targetField: 'partNumber' }],
            data: [{ pn: '' }],
          },
        },
        vi.fn()
      ) as { errorCount: number; errors: { message: string }[] };

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].message).toContain('Part Number is required');
    });
  });

  describe('mrpCalculateHandler', () => {
    let handler: (job: { data: Record<string, unknown> }, updateProgress: (p: number) => void) => Promise<unknown>;

    beforeEach(() => {
      registerJobHandlers();
      handler = mockJobQueue.register.mock.calls.find(
        (c: unknown[]) => c[0] === 'mrp:calculate'
      )![1];
    });

    it('should throw error when no sales orders found', async () => {
      mockSalesOrder.findMany.mockResolvedValueOnce([]);

      await expect(
        handler(
          { data: { orderIds: ['order-1'], options: {} } },
          vi.fn()
        )
      ).rejects.toThrow('No valid sales orders found');
    });

    it('should calculate MRP requirements from sales orders', async () => {
      const requiredDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      mockSalesOrder.findMany.mockResolvedValueOnce([
        {
          id: 'so-1',
          requiredDate,
          lines: [{ productId: 'prod-1', product: { id: 'prod-1' }, quantity: 10 }],
          customer: { name: 'Customer A' },
        },
      ]);

      mockBomHeader.findFirst.mockResolvedValueOnce({
        id: 'bom-1',
        bomLines: [
          {
            partId: 'part-1',
            quantity: 2,
            scrapRate: 0.05,
            part: { id: 'part-1', partNumber: 'PN-001', name: 'Part 1' },
          },
        ],
      });

      mockPart.findMany.mockResolvedValueOnce([
        {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Part 1',
          category: 'Raw',
          unit: 'pcs',
          safetyStock: 5,
          leadTimeDays: 14,
          unitCost: 10,
          partSuppliers: [{ supplier: { name: 'Supplier A' }, supplierId: 's1', unitPrice: 12 }],
        },
      ]);

      mockInventory.findMany.mockResolvedValueOnce([
        { partId: 'part-1', quantity: 5, reservedQty: 0 },
      ]);

      mockPurchaseOrderLine.findMany.mockResolvedValueOnce([]);

      const result = await handler(
        { data: { orderIds: ['so-1'] } },
        vi.fn()
      ) as { runId: string; requirements: unknown[]; suggestions: unknown[]; summary: Record<string, number> };

      expect(result.runId).toBe('mrp-1');
      expect(result.requirements.length).toBeGreaterThan(0);
      expect(result.summary).toHaveProperty('totalRequirements');
      expect(mockMrpRun.create).toHaveBeenCalled();
    });
  });
});
