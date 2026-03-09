import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupplierDataExtractor, getSupplierDataExtractor } from '../supplier-data-extractor';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    supplier: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findMany: vi.fn(),
    },
    partSupplier: {
      findMany: vi.fn(),
    },
    inspection: {
      findMany: vi.fn(),
    },
    nCR: {
      findMany: vi.fn(),
    },
    cAPA: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// ============================================================================
// HELPERS
// ============================================================================

function createMockSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sup-1',
    name: 'Test Supplier',
    code: 'SUP-001',
    country: 'Vietnam',
    status: 'active',
    rating: 80,
    category: 'raw_material',
    contactName: 'John',
    contactEmail: 'john@test.com',
    contactPhone: '123456',
    leadTimeDays: 14,
    ...overrides,
  };
}

function createMockOrder(overrides: Record<string, unknown> = {}) {
  const orderDate = new Date('2025-01-01');
  const expectedDate = new Date('2025-01-15');
  const updatedAt = new Date('2025-01-14');
  return {
    id: 'po-1',
    poNumber: 'PO-001',
    supplierId: 'sup-1',
    orderDate,
    expectedDate,
    updatedAt,
    status: 'completed',
    totalAmount: 10000,
    lines: [],
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('SupplierDataExtractor', () => {
  let extractor: SupplierDataExtractor;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new SupplierDataExtractor();
  });

  describe('getSupplierDataExtractor', () => {
    it('should return singleton instance', () => {
      // Reset module state - we just check it returns an instance
      const inst = getSupplierDataExtractor();
      expect(inst).toBeInstanceOf(SupplierDataExtractor);
    });
  });

  describe('extractDeliveryPerformance', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractDeliveryPerformance('non-existent');
      expect(result).toBeNull();
    });

    it('should calculate delivery metrics for on-time orders', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const onTimeOrder = createMockOrder({
        updatedAt: new Date('2025-01-14'), // 1 day early
        expectedDate: new Date('2025-01-15'),
      });
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([onTimeOrder]);

      const result = await extractor.extractDeliveryPerformance('sup-1', 12);

      expect(result).not.toBeNull();
      expect(result!.supplierId).toBe('sup-1');
      expect(result!.supplierName).toBe('Test Supplier');
      expect(result!.summary.totalOrders).toBe(1);
      expect(result!.summary.onTimeOrders).toBe(1);
      expect(result!.summary.lateOrders).toBe(0);
    });

    it('should detect late orders correctly', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const lateOrder = createMockOrder({
        updatedAt: new Date('2025-01-20'),
        expectedDate: new Date('2025-01-15'),
      });
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([lateOrder]);

      const result = await extractor.extractDeliveryPerformance('sup-1', 12);

      expect(result!.summary.lateOrders).toBe(1);
      expect(result!.summary.onTimeOrders).toBe(0);
      expect(result!.summary.avgDaysLate).toBeGreaterThan(0);
    });

    it('should detect early orders correctly', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const earlyOrder = createMockOrder({
        updatedAt: new Date('2025-01-10'), // 5 days early
        expectedDate: new Date('2025-01-15'),
      });
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([earlyOrder]);

      const result = await extractor.extractDeliveryPerformance('sup-1', 12);

      expect(result!.summary.earlyOrders).toBe(1);
      expect(result!.summary.avgDaysEarly).toBeGreaterThan(0);
    });

    it('should calculate on-time rate and perfect order rate', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const orders = [
        createMockOrder({ id: 'po-1', updatedAt: new Date('2025-01-14'), expectedDate: new Date('2025-01-15'), status: 'completed' }),
        createMockOrder({ id: 'po-2', updatedAt: new Date('2025-01-20'), expectedDate: new Date('2025-01-15'), status: 'completed' }),
      ];
      mockPrisma.purchaseOrder.findMany.mockResolvedValue(orders);

      const result = await extractor.extractDeliveryPerformance('sup-1', 12);

      expect(result!.summary.totalOrders).toBe(2);
      expect(result!.summary.onTimeRate).toBe(50);
    });

    it('should handle no orders gracefully', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await extractor.extractDeliveryPerformance('sup-1', 12);

      expect(result!.summary.totalOrders).toBe(0);
      expect(result!.summary.onTimeRate).toBe(100);
      expect(result!.summary.perfectOrderRate).toBe(100);
    });

    it('should track worst performance for significantly late orders', async () => {
      const supplier = createMockSupplier();
      mockPrisma.supplier.findUnique.mockResolvedValue(supplier);

      const veryLateOrder = createMockOrder({
        poNumber: 'PO-LATE',
        updatedAt: new Date('2025-01-25'), // 10 days late
        expectedDate: new Date('2025-01-15'),
      });
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([veryLateOrder]);

      const result = await extractor.extractDeliveryPerformance('sup-1', 12);

      expect(result!.worstPerformance.length).toBe(1);
      expect(result!.worstPerformance[0].poNumber).toBe('PO-LATE');
      expect(result!.worstPerformance[0].daysLate).toBe(10);
    });
  });

  describe('extractQualityHistory', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractQualityHistory('non-existent');
      expect(result).toBeNull();
    });

    it('should return empty quality history when no parts', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(createMockSupplier());
      mockPrisma.partSupplier.findMany.mockResolvedValue([]);

      const result = await extractor.extractQualityHistory('sup-1');

      expect(result).not.toBeNull();
      expect(result!.summary.totalLotsReceived).toBe(0);
      expect(result!.summary.acceptanceRate).toBe(100);
      expect(result!.summary.ppm).toBe(0);
    });

    it('should calculate quality metrics correctly', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(createMockSupplier());
      mockPrisma.partSupplier.findMany.mockResolvedValue([{ partId: 'part-1' }]);

      const inspections = [
        { id: 'i1', result: 'PASS', quantityInspected: 100, quantityRejected: 0, createdAt: new Date('2025-01-10'), lotNumber: 'LOT-1', part: { partNumber: 'P001' } },
        { id: 'i2', result: 'FAIL', quantityInspected: 100, quantityRejected: 5, createdAt: new Date('2025-01-15'), lotNumber: 'LOT-2', part: { partNumber: 'P001' } },
      ];
      mockPrisma.inspection.findMany.mockResolvedValue(inspections);
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.cAPA.findMany.mockResolvedValue([]);

      const result = await extractor.extractQualityHistory('sup-1');

      expect(result!.summary.totalLotsReceived).toBe(2);
      expect(result!.summary.acceptedLots).toBe(1);
      expect(result!.summary.rejectedLots).toBe(1);
      expect(result!.summary.acceptanceRate).toBe(50);
      expect(result!.summary.ppm).toBe(25000); // 5/200 * 1M
    });

    it('should compute NCR and CAPA metrics', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(createMockSupplier());
      mockPrisma.partSupplier.findMany.mockResolvedValue([{ partId: 'part-1' }]);
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const ncrs = [
        { id: 'ncr-1', ncrNumber: 'NCR-001', status: 'closed', priority: 'high', defectCategory: 'dimensional', quantityAffected: 10, createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-11'), part: { partNumber: 'P001' }, lotNumber: null, disposition: null },
        { id: 'ncr-2', ncrNumber: 'NCR-002', status: 'open', priority: 'medium', defectCategory: 'visual', quantityAffected: 5, createdAt: new Date('2025-01-05'), updatedAt: new Date('2025-01-05'), part: { partNumber: 'P001' }, lotNumber: null, disposition: null },
      ];
      mockPrisma.nCR.findMany.mockResolvedValue(ncrs);
      mockPrisma.cAPA.findMany.mockResolvedValue([
        { id: 'capa-1', status: 'open', source: 'NCR', sourceReference: 'ncr-1' },
      ]);

      const result = await extractor.extractQualityHistory('sup-1');

      expect(result!.summary.totalNCRs).toBe(2);
      expect(result!.summary.openNCRs).toBe(1);
      expect(result!.summary.closedNCRs).toBe(1);
      expect(result!.summary.totalCAPAs).toBe(1);
      expect(result!.summary.openCAPAs).toBe(1);
      expect(result!.summary.avgDaysToResolveNCR).toBe(10);
    });
  });

  describe('extractPricingTrends', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractPricingTrends('non-existent');
      expect(result).toBeNull();
    });

    it('should calculate pricing metrics correctly', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(createMockSupplier());

      const orders = [
        createMockOrder({
          id: 'po-1',
          orderDate: new Date('2025-01-01'),
          totalAmount: 5000,
          lines: [
            { partId: 'p1', unitPrice: 100, quantity: 50, lineTotal: 5000, receivedQty: 50, createdAt: new Date('2025-01-01'), part: { partNumber: 'SKU1' } },
          ],
        }),
        createMockOrder({
          id: 'po-2',
          orderDate: new Date('2025-06-01'),
          totalAmount: 6000,
          lines: [
            { partId: 'p1', unitPrice: 120, quantity: 50, lineTotal: 6000, receivedQty: 50, createdAt: new Date('2025-06-01'), part: { partNumber: 'SKU1' } },
          ],
        }),
      ];
      mockPrisma.purchaseOrder.findMany.mockResolvedValue(orders);
      mockPrisma.partSupplier.findMany.mockResolvedValue([
        { partId: 'p1', supplierId: 'sup-1', unitPrice: 120, part: { partNumber: 'SKU1' }, leadTimeDays: 14 },
      ]);

      const result = await extractor.extractPricingTrends('sup-1');

      expect(result).not.toBeNull();
      expect(result!.summary.avgUnitPrice).toBe(110);
      expect(result!.summary.minUnitPrice).toBe(100);
      expect(result!.summary.maxUnitPrice).toBe(120);
      expect(result!.summary.totalSpend).toBe(11000);
    });
  });

  describe('extractOrderHistory', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractOrderHistory('non-existent');
      expect(result).toBeNull();
    });

    it('should calculate order history summary', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(createMockSupplier());

      const orders = [
        createMockOrder({
          id: 'po-1',
          status: 'completed',
          totalAmount: 5000,
          lines: [
            { partId: 'p1', quantity: 50, receivedQty: 50, unitPrice: 100, lineTotal: 5000, part: { partNumber: 'SKU1' }, createdAt: new Date('2025-01-01') },
          ],
        }),
        createMockOrder({
          id: 'po-2',
          orderDate: new Date('2025-02-01'),
          status: 'completed',
          totalAmount: 3000,
          lines: [
            { partId: 'p1', quantity: 30, receivedQty: 25, unitPrice: 100, lineTotal: 3000, part: { partNumber: 'SKU1' }, createdAt: new Date('2025-02-01') },
          ],
        }),
      ];
      mockPrisma.purchaseOrder.findMany.mockResolvedValue(orders);

      const result = await extractor.extractOrderHistory('sup-1');

      expect(result!.summary.totalOrders).toBe(2);
      expect(result!.summary.totalLineItems).toBe(2);
      expect(result!.summary.totalQuantityOrdered).toBe(80);
      expect(result!.summary.totalQuantityReceived).toBe(75);
      expect(result!.summary.totalSpend).toBe(8000);
    });
  });

  describe('extractLeadTimeHistory', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractLeadTimeHistory('non-existent');
      expect(result).toBeNull();
    });

    it('should calculate lead time statistics', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({
        ...createMockSupplier(),
        partSuppliers: [
          { partId: 'p1', part: { partNumber: 'SKU1' }, leadTimeDays: 14 },
        ],
      });

      const orders = [
        createMockOrder({
          id: 'po-1',
          orderDate: new Date('2025-01-01'),
          expectedDate: new Date('2025-01-15'),
          updatedAt: new Date('2025-01-16'), // 16 days actual
          lines: [{ partId: 'p1', part: { partNumber: 'SKU1' } }],
        }),
        createMockOrder({
          id: 'po-2',
          orderDate: new Date('2025-02-01'),
          expectedDate: new Date('2025-02-15'),
          updatedAt: new Date('2025-02-13'), // 12 days actual
          lines: [{ partId: 'p1', part: { partNumber: 'SKU1' } }],
        }),
      ];
      mockPrisma.purchaseOrder.findMany.mockResolvedValue(orders);

      const result = await extractor.extractLeadTimeHistory('sup-1');

      expect(result).not.toBeNull();
      expect(result!.summary.quotedLeadTimeDays).toBe(14);
      expect(result!.summary.minActualLeadTime).toBeLessThanOrEqual(result!.summary.maxActualLeadTime);
      expect(result!.leadTimeHistory.length).toBe(2);
    });
  });

  describe('extractResponseMetrics', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractResponseMetrics('non-existent');
      expect(result).toBeNull();
    });

    it('should compute response metrics from NCR/CAPA data', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(createMockSupplier());
      mockPrisma.partSupplier.findMany.mockResolvedValue([{ partId: 'p1' }]);

      const ncrs = [
        { id: 'ncr-1', ncrNumber: 'NCR-001', status: 'closed', priority: 'high', createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-01-06'), source: 'RECEIVING' },
        { id: 'ncr-2', ncrNumber: 'NCR-002', status: 'closed', priority: 'medium', createdAt: new Date('2025-01-10'), updatedAt: new Date('2025-01-25'), source: 'RECEIVING' },
      ];
      mockPrisma.nCR.findMany.mockResolvedValue(ncrs);

      const capas = [
        { id: 'capa-1', capaNumber: 'CAPA-001', status: 'completed', priority: 'high', createdAt: new Date('2025-01-02'), updatedAt: new Date('2025-01-12'), source: 'NCR', sourceReference: 'ncr-1' },
      ];
      mockPrisma.cAPA.findMany.mockResolvedValue(capas);

      const result = await extractor.extractResponseMetrics('sup-1');

      expect(result).not.toBeNull();
      expect(result!.summary.fastResponseRate).toBeGreaterThanOrEqual(0);
      expect(result!.ncrResolutionHistory.length).toBe(2);
      expect(result!.capaClosureHistory.length).toBe(1);
    });
  });

  describe('extractComprehensiveData', () => {
    it('should return null when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractComprehensiveData('non-existent');
      expect(result).toBeNull();
    });
  });
});
