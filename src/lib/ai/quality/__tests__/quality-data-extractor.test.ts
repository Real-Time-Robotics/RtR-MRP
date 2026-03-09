import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  QualityDataExtractor,
  getQualityDataExtractor,
} from '../quality-data-extractor';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    inspection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    nCR: {
      findMany: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
    },
    partSupplier: {
      findMany: vi.fn(),
    },
    lotTransaction: {
      findMany: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// ============================================================================
// HELPERS
// ============================================================================

function makeInspection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'insp-1',
    inspectionNumber: 'INS-001',
    createdAt: new Date('2025-06-15'),
    type: 'RECEIVING',
    result: 'PASS',
    status: 'completed',
    quantityInspected: 100,
    quantityAccepted: 98,
    quantityRejected: 2,
    lotNumber: 'LOT-001',
    part: {
      partSuppliers: [
        { supplier: { id: 'sup-1', name: 'Supplier A' } },
      ],
    },
    results: [],
    ...overrides,
  };
}

function makeNCR(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ncr-1',
    ncrNumber: 'NCR-001',
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-10'),
    status: 'open',
    priority: 'high',
    source: 'RECEIVING',
    defectCategory: 'Dimensional',
    defectCode: 'DIM-001',
    quantityAffected: 10,
    partId: 'part-1',
    lotNumber: null,
    disposition: null,
    preliminaryCause: 'Tooling wear',
    part: {
      partNumber: 'P-001',
      partSuppliers: [
        { supplier: { id: 'sup-1', name: 'Supplier A' } },
      ],
    },
    capa: null,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('QualityDataExtractor', () => {
  let extractor: QualityDataExtractor;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new QualityDataExtractor();
  });

  describe('getQualityDataExtractor', () => {
    it('should return a singleton instance', () => {
      const inst = getQualityDataExtractor();
      expect(inst).toBeInstanceOf(QualityDataExtractor);
    });
  });

  // ==========================================================================
  // extractInspectionHistory
  // ==========================================================================
  describe('extractInspectionHistory', () => {
    it('should return empty array when no inspections', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      const result = await extractor.extractInspectionHistory('part-1');
      expect(result).toEqual([]);
    });

    it('should map inspection data correctly', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([
        makeInspection({
          results: [
            {
              result: 'PASS',
              measuredValue: 10.1,
              characteristic: {
                name: 'Length',
                type: 'DIMENSIONAL',
                isCritical: false,
                nominalValue: 10.0,
                upperLimit: 10.5,
                lowerLimit: 9.5,
              },
            },
            {
              result: 'FAIL',
              measuredValue: 8.0,
              characteristic: {
                name: 'Width',
                type: 'DIMENSIONAL',
                isCritical: true,
                nominalValue: 10.0,
                upperLimit: 10.5,
                lowerLimit: 9.5,
              },
            },
          ],
        }),
      ]);

      const result = await extractor.extractInspectionHistory('part-1');
      expect(result).toHaveLength(1);
      expect(result[0].defectCount).toBe(1);
      expect(result[0].criticalDefects).toBe(1);
      expect(result[0].supplierName).toBe('Supplier A');
      expect(result[0].characteristics).toHaveLength(2);
      expect(result[0].characteristics[0].deviation).toBeCloseTo(0.1);
      expect(result[0].characteristics[1].deviation).toBeCloseTo(-2.0);
    });

    it('should handle missing supplier', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([
        makeInspection({
          part: { partSuppliers: [] },
          results: [],
        }),
      ]);

      const result = await extractor.extractInspectionHistory('part-1');
      expect(result[0].supplierId).toBeNull();
      expect(result[0].supplierName).toBeNull();
    });

    it('should handle null measured values', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([
        makeInspection({
          results: [
            {
              result: 'PASS',
              measuredValue: null,
              characteristic: {
                name: 'Visual',
                type: 'ATTRIBUTE',
                isCritical: false,
                nominalValue: null,
                upperLimit: null,
                lowerLimit: null,
              },
            },
          ],
        }),
      ]);

      const result = await extractor.extractInspectionHistory('part-1');
      expect(result[0].characteristics[0].deviation).toBeNull();
    });
  });

  // ==========================================================================
  // extractNCRHistory
  // ==========================================================================
  describe('extractNCRHistory', () => {
    it('should return empty array when no NCRs', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      const result = await extractor.extractNCRHistory();
      expect(result).toEqual([]);
    });

    it('should map NCR data correctly', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([makeNCR()]);

      const result = await extractor.extractNCRHistory({ partId: 'part-1' });
      expect(result).toHaveLength(1);
      expect(result[0].ncrNumber).toBe('NCR-001');
      expect(result[0].defectCategory).toBe('Dimensional');
      expect(result[0].supplierName).toBe('Supplier A');
      expect(result[0].daysOpen).toBeGreaterThan(0);
      expect(result[0].closedAt).toBeNull();
    });

    it('should calculate closedAt and daysOpen for closed NCRs', async () => {
      const created = new Date('2025-06-01');
      const updated = new Date('2025-06-11');
      mockPrisma.nCR.findMany.mockResolvedValue([
        makeNCR({ status: 'closed', createdAt: created, updatedAt: updated }),
      ]);

      const result = await extractor.extractNCRHistory();
      expect(result[0].closedAt).toEqual(updated);
      expect(result[0].daysOpen).toBe(10);
    });

    it('should apply all filters (partId, status, defectCategory, supplierId)', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      await extractor.extractNCRHistory({
        partId: 'part-1',
        supplierId: 'sup-1',
        status: ['open', 'in_progress'],
        defectCategory: 'Dimensional',
        months: 6,
      });

      const callArg = mockPrisma.nCR.findMany.mock.calls[0][0];
      expect(callArg.where.partId).toBe('part-1');
      expect(callArg.where.status).toEqual({ in: ['open', 'in_progress'] });
      expect(callArg.where.defectCategory).toBe('Dimensional');
      expect(callArg.where.part.partSuppliers.some.supplierId).toBe('sup-1');
    });

    it('should extract root cause from CAPA', async () => {
      mockPrisma.nCR.findMany.mockResolvedValue([
        makeNCR({ capa: { rootCause: 'Worn tooling' } }),
      ]);

      const result = await extractor.extractNCRHistory();
      expect(result[0].rootCause).toBe('Worn tooling');
    });
  });

  // ==========================================================================
  // extractSupplierQualityData
  // ==========================================================================
  describe('extractSupplierQualityData', () => {
    it('should return null if supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      const result = await extractor.extractSupplierQualityData('bad-id');
      expect(result).toBeNull();
    });

    it('should calculate supplier quality metrics', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      mockPrisma.partSupplier.findMany.mockResolvedValue([{ partId: 'p1' }, { partId: 'p2' }]);
      mockPrisma.inspection.findMany.mockResolvedValue([
        { result: 'PASS', createdAt: new Date() },
        { result: 'PASS', createdAt: new Date() },
        { result: 'FAIL', createdAt: new Date() },
      ]);
      mockPrisma.nCR.findMany.mockResolvedValue([
        {
          status: 'closed',
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date('2025-06-08'),
          defectCategory: 'Dimensional',
          quantityAffected: 5,
        },
        {
          status: 'open',
          createdAt: new Date('2025-06-10'),
          updatedAt: new Date('2025-06-10'),
          defectCategory: 'Dimensional',
          quantityAffected: 3,
        },
      ]);

      const result = await extractor.extractSupplierQualityData('sup-1');
      expect(result).not.toBeNull();
      expect(result!.totalLots).toBe(3);
      expect(result!.acceptedLots).toBe(2);
      expect(result!.rejectedLots).toBe(1);
      expect(result!.acceptanceRate).toBeCloseTo(66.7, 0);
      expect(result!.totalNCRs).toBe(2);
      expect(result!.openNCRs).toBe(1);
      expect(result!.avgDaysToResolve).toBeCloseTo(7, 0);
      expect(result!.defectCategories).toHaveLength(1);
      expect(result!.defectCategories[0].category).toBe('Dimensional');
      expect(result!.qualityScore).toBeLessThanOrEqual(100);
      expect(result!.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate quality score with penalties and bonuses', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      mockPrisma.partSupplier.findMany.mockResolvedValue([{ partId: 'p1' }]);
      // 100% acceptance
      mockPrisma.inspection.findMany.mockResolvedValue([
        { result: 'PASS', createdAt: new Date() },
      ]);
      // No NCRs
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await extractor.extractSupplierQualityData('sup-1');
      // 100 acceptance - 0 penalty + 0 bonus (avgDays=0 which is <14 => +5)
      expect(result!.qualityScore).toBe(100); // capped at 100
    });

    it('should handle no inspections (100% acceptance rate)', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      mockPrisma.partSupplier.findMany.mockResolvedValue([]);
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await extractor.extractSupplierQualityData('sup-1');
      expect(result!.acceptanceRate).toBe(100);
    });
  });

  // ==========================================================================
  // extractLotQualityData
  // ==========================================================================
  describe('extractLotQualityData', () => {
    it('should return null if no transactions', async () => {
      mockPrisma.lotTransaction.findMany.mockResolvedValue([]);
      const result = await extractor.extractLotQualityData('LOT-999');
      expect(result).toBeNull();
    });

    it('should map lot data with inspection and NCRs', async () => {
      mockPrisma.lotTransaction.findMany.mockResolvedValue([
        {
          partId: 'p1',
          transactionType: 'RECEIVED',
          quantity: 100,
          createdAt: new Date('2025-06-01'),
          notes: 'Received',
          part: { id: 'p1' },
        },
      ]);
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        partSuppliers: [{ supplier: { id: 'sup-1', name: 'Supplier A' } }],
      });
      mockPrisma.inspection.findFirst.mockResolvedValue({
        result: 'PASS',
        inspectedAt: new Date('2025-06-02'),
      });
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await extractor.extractLotQualityData('LOT-001');
      expect(result).not.toBeNull();
      expect(result!.lotNumber).toBe('LOT-001');
      expect(result!.partSku).toBe('P-001');
      expect(result!.status).toBe('accepted');
      expect(result!.quantity).toBe(100);
      expect(result!.supplierName).toBe('Supplier A');
    });

    it('should set status to rejected on FAIL inspection', async () => {
      mockPrisma.lotTransaction.findMany.mockResolvedValue([
        { partId: 'p1', transactionType: 'RECEIVED', quantity: 50, createdAt: new Date(), notes: null, part: { id: 'p1' } },
      ]);
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        partSuppliers: [],
      });
      mockPrisma.inspection.findFirst.mockResolvedValue({ result: 'FAIL', inspectedAt: new Date() });
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await extractor.extractLotQualityData('LOT-002');
      expect(result!.status).toBe('rejected');
    });

    it('should set status to scrapped when NCR has SCRAP disposition', async () => {
      mockPrisma.lotTransaction.findMany.mockResolvedValue([
        { partId: 'p1', transactionType: 'RECEIVED', quantity: 50, createdAt: new Date(), notes: null, part: { id: 'p1' } },
      ]);
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        partSuppliers: [],
      });
      mockPrisma.inspection.findFirst.mockResolvedValue(null);
      mockPrisma.nCR.findMany.mockResolvedValue([{ disposition: 'SCRAP' }]);

      const result = await extractor.extractLotQualityData('LOT-003');
      expect(result!.status).toBe('scrapped');
    });

    it('should use first transaction quantity when no RECEIVED transaction', async () => {
      mockPrisma.lotTransaction.findMany.mockResolvedValue([
        { partId: 'p1', transactionType: 'ADJUST', quantity: 30, createdAt: new Date(), notes: null, part: { id: 'p1' } },
      ]);
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        partSuppliers: [],
      });
      mockPrisma.inspection.findFirst.mockResolvedValue(null);
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await extractor.extractLotQualityData('LOT-004');
      expect(result!.quantity).toBe(30);
      expect(result!.status).toBe('received');
    });
  });

  // ==========================================================================
  // extractPartQualitySummary
  // ==========================================================================
  describe('extractPartQualitySummary', () => {
    it('should return null if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      const result = await extractor.extractPartQualitySummary('bad-id');
      expect(result).toBeNull();
    });

    it('should calculate quality summary correctly', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        partSuppliers: [{ supplierId: 'sup-1', supplier: { name: 'Supplier A' } }],
      });
      mockPrisma.inspection.findMany.mockResolvedValue([
        { result: 'PASS', createdAt: new Date() },
        { result: 'PASS', createdAt: new Date() },
        { result: 'FAIL', createdAt: new Date() },
      ]);
      mockPrisma.nCR.findMany.mockResolvedValue([
        { status: 'open', defectCategory: 'Surface', createdAt: new Date(), quantityAffected: 5 },
        { status: 'closed', defectCategory: 'Surface', createdAt: new Date(), quantityAffected: 3 },
        { status: 'open', defectCategory: 'Dimensional', createdAt: new Date(), quantityAffected: 2 },
      ]);
      mockPrisma.partSupplier.findMany.mockResolvedValue([]);

      const result = await extractor.extractPartQualitySummary('p1');
      expect(result).not.toBeNull();
      expect(result!.totalInspections).toBe(3);
      expect(result!.passCount).toBe(2);
      expect(result!.failCount).toBe(1);
      expect(result!.firstPassYield).toBeCloseTo(66.7, 0);
      expect(result!.totalNCRs).toBe(3);
      expect(result!.openNCRs).toBe(2);
      expect(result!.topDefects[0].category).toBe('Surface');
      expect(result!.topDefects[0].count).toBe(2);
    });

    it('should return 100% FPY when no inspections', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        partSuppliers: [],
      });
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.partSupplier.findMany.mockResolvedValue([]);

      const result = await extractor.extractPartQualitySummary('p1');
      expect(result!.firstPassYield).toBe(100);
    });
  });

  // ==========================================================================
  // extractProductionQualityData
  // ==========================================================================
  describe('extractProductionQualityData', () => {
    it('should return null if work order not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);
      const result = await extractor.extractProductionQualityData('bad-id');
      expect(result).toBeNull();
    });

    it('should calculate yield rate and defect rate', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        product: { sku: 'SKU-001' },
      });
      mockPrisma.inspection.findMany.mockResolvedValue([
        {
          id: 'i1',
          inspectionNumber: 'INS-1',
          createdAt: new Date(),
          type: 'IN_PROCESS',
          result: 'PASS',
          quantityInspected: 100,
          quantityAccepted: 100,
          quantityRejected: 0,
          lotNumber: null,
          results: [],
        },
        {
          id: 'i2',
          inspectionNumber: 'INS-2',
          createdAt: new Date(),
          type: 'IN_PROCESS',
          result: 'FAIL',
          quantityInspected: 50,
          quantityAccepted: 40,
          quantityRejected: 10,
          lotNumber: null,
          results: [],
        },
      ]);
      mockPrisma.nCR.findMany.mockResolvedValue([
        {
          id: 'n1',
          ncrNumber: 'NCR-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'open',
          priority: 'high',
          source: 'PRODUCTION',
          defectCategory: 'Dimensional',
          defectCode: null,
          quantityAffected: 5,
          partId: 'p1',
          disposition: null,
          preliminaryCause: null,
        },
      ]);

      const result = await extractor.extractProductionQualityData('wo-1');
      expect(result).not.toBeNull();
      expect(result!.yieldRate).toBe(50); // 1 pass / 2 total = 50%
      expect(result!.defectRate).toBeCloseTo(3.33, 1); // 5 / 150 * 100
      expect(result!.inspections).toHaveLength(2);
      expect(result!.ncrs).toHaveLength(1);
    });

    it('should return 100% yield and 0% defect rate when no inspections', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        product: { sku: 'SKU-001' },
      });
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await extractor.extractProductionQualityData('wo-1');
      expect(result!.yieldRate).toBe(100);
      expect(result!.defectRate).toBe(0);
    });
  });

  // ==========================================================================
  // calculateMonthlyQualityTrend (tested via extractPartQualitySummary)
  // ==========================================================================
  describe('calculateMonthlyQualityTrend', () => {
    it('should generate monthly trend with correct periods', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 'p1',
        partNumber: 'P-001',
        name: 'Part One',
        partSuppliers: [],
      });
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.partSupplier.findMany.mockResolvedValue([]);

      const result = await extractor.extractPartQualitySummary('p1', 6);
      expect(result!.qualityTrend).toHaveLength(6);
      // Each trend item should have proper structure
      for (const t of result!.qualityTrend) {
        expect(t.period).toMatch(/^\d{4}-\d{2}$/);
        expect(t.firstPassYield).toBe(100);
        expect(t.totalInspections).toBe(0);
      }
    });
  });
});
