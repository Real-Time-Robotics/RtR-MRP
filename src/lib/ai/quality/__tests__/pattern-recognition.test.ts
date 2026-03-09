import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  QualityPatternRecognition,
  getQualityPatternRecognition,
} from '../pattern-recognition';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: {
      findUnique: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
    },
    inspection: {
      findMany: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
  },
}));

const { mockDataExtractor } = vi.hoisted(() => ({
  mockDataExtractor: {
    extractPartQualitySummary: vi.fn(),
    extractNCRHistory: vi.fn(),
    extractSupplierQualityData: vi.fn(),
    extractProductionQualityData: vi.fn(),
  },
}));

const { mockMetricsCalculator } = vi.hoisted(() => ({
  mockMetricsCalculator: {},
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../quality-data-extractor', () => ({
  getQualityDataExtractor: () => mockDataExtractor,
}));

vi.mock('../quality-metrics-calculator', () => ({
  getQualityMetricsCalculator: () => mockMetricsCalculator,
}));

// ============================================================================
// HELPERS
// ============================================================================

function makeNCR(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ncr-1',
    ncrNumber: 'NCR-001',
    createdAt: new Date('2025-06-01'),
    closedAt: null,
    status: 'open',
    priority: 'high',
    source: 'RECEIVING',
    defectCategory: 'Dimensional',
    defectCode: 'DIM-001',
    quantityAffected: 10,
    partId: 'part-1',
    partSku: 'P-001',
    supplierId: 'sup-1',
    supplierName: 'Supplier A',
    disposition: null,
    daysOpen: 5,
    preliminaryCause: 'Tooling wear',
    rootCause: null,
    ...overrides,
  };
}

function makeTrendData(months: number, baseFpy: number, slope: number = 0) {
  const data = [];
  for (let i = 0; i < months; i++) {
    const month = String(i + 1).padStart(2, '0');
    data.push({
      period: `2025-${month}`,
      totalInspections: 100,
      passCount: Math.round(baseFpy + slope * i),
      failCount: Math.round(100 - (baseFpy + slope * i)),
      firstPassYield: baseFpy + slope * i,
      ncrCount: Math.max(0, Math.round((100 - baseFpy - slope * i) / 10)),
      avgDefectsPerLot: 0.5,
    });
  }
  return data;
}

// ============================================================================
// TESTS
// ============================================================================

describe('QualityPatternRecognition', () => {
  let service: QualityPatternRecognition;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QualityPatternRecognition();
  });

  describe('getQualityPatternRecognition', () => {
    it('should return a singleton instance', () => {
      const inst = getQualityPatternRecognition();
      expect(inst).toBeInstanceOf(QualityPatternRecognition);
    });
  });

  // ==========================================================================
  // detectQualityDrift
  // ==========================================================================
  describe('detectQualityDrift', () => {
    it('should throw if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      await expect(service.detectQualityDrift('bad-id')).rejects.toThrow('Part not found');
    });

    it('should throw if no quality data', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue(null);
      await expect(service.detectQualityDrift('p1')).rejects.toThrow('No quality data');
    });

    it('should detect stable quality (no drift)', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue({
        firstPassYield: 98,
        openNCRs: 0,
        topDefects: [],
        qualityTrend: makeTrendData(12, 98, 0),
      });

      const result = await service.detectQualityDrift('p1', 12);
      expect(result.hasDrift).toBe(false);
      expect(result.driftDirection).toBe('stable');
      expect(result.partId).toBe('p1');
      expect(result.partSku).toBe('P-001');
      expect(result.trendData).toHaveLength(12);
      expect(result.movingAverage).toHaveLength(12);
    });

    it('should detect degrading quality drift', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      // Strongly declining FPY: 98 -> 74 over 12 months
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue({
        firstPassYield: 74,
        openNCRs: 3,
        topDefects: [{ category: 'Dimensional', count: 15 }],
        qualityTrend: makeTrendData(12, 98, -2),
      });

      const result = await service.detectQualityDrift('p1', 12);
      expect(result.hasDrift).toBe(true);
      expect(result.driftDirection).toBe('degrading');
      expect(result.driftMagnitude).toBeLessThan(0);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect improving quality drift', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      // Strongly improving FPY: 80 -> 104 (capped logic) over 12 months
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue({
        firstPassYield: 99,
        openNCRs: 0,
        topDefects: [],
        qualityTrend: makeTrendData(12, 80, 2),
      });

      const result = await service.detectQualityDrift('p1', 12);
      expect(result.hasDrift).toBe(true);
      expect(result.driftDirection).toBe('improving');
      expect(result.driftMagnitude).toBeGreaterThan(0);
    });

    it('should generate alert for low FPY', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue({
        firstPassYield: 90,
        openNCRs: 2,
        topDefects: [],
        qualityTrend: makeTrendData(6, 90, 0),
      });

      const result = await service.detectQualityDrift('p1', 6);
      expect(result.alerts).toContainEqual(expect.stringContaining('below target'));
      expect(result.alerts).toContainEqual(expect.stringContaining('2 open NCR'));
    });

    it('should generate recommendation for top defect', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue({
        firstPassYield: 97,
        openNCRs: 0,
        topDefects: [{ category: 'Surface Finish', count: 8 }],
        qualityTrend: makeTrendData(6, 97, 0),
      });

      const result = await service.detectQualityDrift('p1', 6);
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Surface Finish')
      );
    });
  });

  // ==========================================================================
  // detectRecurringIssues
  // ==========================================================================
  describe('detectRecurringIssues', () => {
    it('should throw if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      await expect(service.detectRecurringIssues('bad-id')).rejects.toThrow('Part not found');
    });

    it('should return no issues if no NCRs', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue([]);

      const result = await service.detectRecurringIssues('p1');
      expect(result.hasRecurringIssues).toBe(false);
      expect(result.issues).toHaveLength(0);
      expect(result.totalOccurrences).toBe(0);
    });

    it('should skip categories with only 1 NCR', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue([
        makeNCR({ defectCategory: 'Scratch', createdAt: new Date('2025-01-01') }),
      ]);

      const result = await service.detectRecurringIssues('p1');
      expect(result.hasRecurringIssues).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect recurring issues with high frequency', async () => {
      const now = new Date();
      const ncrs = [];
      // 6 NCRs in the same category in 1 month => high frequency
      for (let i = 0; i < 6; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 3);
        ncrs.push(
          makeNCR({
            id: `ncr-${i}`,
            defectCategory: 'Crack',
            defectCode: 'CRK-001',
            createdAt: d,
            quantityAffected: 5,
            supplierName: 'Supplier A',
            rootCause: 'Material defect',
          })
        );
      }

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.hasRecurringIssues).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].defectCategory).toBe('Crack');
      expect(result.issues[0].occurrences).toBe(6);
      expect(result.issues[0].frequency).toBe('high');
      expect(result.issues[0].totalQuantityAffected).toBe(30);
      expect(result.issues[0].associatedSuppliers).toContain('Supplier A');
      expect(result.issues[0].commonRootCauses).toContain('Material defect');
      expect(result.issues[0].isResolved).toBe(false);
    });

    it('should detect resolved issues (no recent occurrences)', async () => {
      const oldDate1 = new Date();
      oldDate1.setMonth(oldDate1.getMonth() - 6);
      const oldDate2 = new Date();
      oldDate2.setMonth(oldDate2.getMonth() - 5);

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue([
        makeNCR({ defectCategory: 'Rust', createdAt: oldDate1, quantityAffected: 3 }),
        makeNCR({ defectCategory: 'Rust', createdAt: oldDate2, quantityAffected: 4 }),
      ]);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].isResolved).toBe(true);
    });

    it('should generate recommendations for unresolved and high-frequency issues', async () => {
      const now = new Date();
      const ncrs = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 5);
        ncrs.push(
          makeNCR({
            id: `ncr-${i}`,
            defectCategory: 'Contamination',
            createdAt: d,
            quantityAffected: 20,
            supplierName: 'Supplier B',
          })
        );
      }

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.recommendations.length).toBeGreaterThanOrEqual(2);
      expect(result.recommendations).toContainEqual(expect.stringContaining('unresolved'));
      expect(result.recommendations).toContainEqual(expect.stringContaining('high-frequency'));
      expect(result.recommendations).toContainEqual(expect.stringContaining('Supplier B'));
    });

    it('should sort issues by occurrence count descending', async () => {
      const now = new Date();
      const ncrs = [];
      // 3 Dimensional NCRs
      for (let i = 0; i < 3; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 10);
        ncrs.push(makeNCR({ id: `a-${i}`, defectCategory: 'Dimensional', createdAt: d }));
      }
      // 5 Surface NCRs
      for (let i = 0; i < 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        ncrs.push(makeNCR({ id: `b-${i}`, defectCategory: 'Surface', createdAt: d }));
      }

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].defectCategory).toBe('Surface');
      expect(result.issues[1].defectCategory).toBe('Dimensional');
    });

    it('should calculate impact score capped at 100', async () => {
      const now = new Date();
      const ncrs = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 5);
        ncrs.push(
          makeNCR({ id: `ncr-${i}`, defectCategory: 'Big', createdAt: d, quantityAffected: 500 })
        );
      }

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.impactScore).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // correlateWithSupplier
  // ==========================================================================
  describe('correlateWithSupplier', () => {
    it('should throw if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      await expect(service.correlateWithSupplier('bad', 'sup-1')).rejects.toThrow('Part not found');
    });

    it('should throw if supplier not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.supplier.findUnique.mockResolvedValue(null);
      await expect(service.correlateWithSupplier('p1', 'bad')).rejects.toThrow('Supplier not found');
    });

    it('should return no correlation when both defect rates are 0', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockDataExtractor.extractNCRHistory.mockResolvedValue([]);
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        totalLots: 0,
        rejectedLots: 0,
        totalNCRs: 0,
        defectCategories: [],
      });

      const result = await service.correlateWithSupplier('p1', 'sup-1');
      expect(result.hasCorrelation).toBe(false);
      expect(result.correlationStrength).toBe('none');
      expect(result.correlationScore).toBe(0);
    });

    it('should detect strong correlation when supplier rate is much higher', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });

      // Overall: 10% defect rate
      const inspections = Array.from({ length: 10 }, (_, i) => ({
        id: `insp-${i}`,
        result: i === 0 ? 'FAIL' : 'PASS',
      }));
      mockPrisma.inspection.findMany.mockResolvedValue(inspections);
      mockDataExtractor.extractNCRHistory.mockResolvedValue([
        makeNCR({ defectCategory: 'Crack' }),
      ]);

      // Supplier: 50% defect rate
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        totalLots: 10,
        rejectedLots: 5,
        totalNCRs: 5,
        defectCategories: [{ category: 'Crack', count: 5 }],
      });

      const result = await service.correlateWithSupplier('p1', 'sup-1');
      expect(result.hasCorrelation).toBe(true);
      expect(result.correlationStrength).toBe('strong');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('improvement program')
      );
    });

    it('should identify overrepresented defect categories', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      mockPrisma.inspection.findMany.mockResolvedValue([{ id: 'i1', result: 'PASS' }]);
      mockDataExtractor.extractNCRHistory.mockResolvedValue([
        makeNCR({ defectCategory: 'Dimensional' }),
        makeNCR({ defectCategory: 'Dimensional' }),
        makeNCR({ defectCategory: 'Surface' }),
      ]);
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        totalLots: 5,
        rejectedLots: 3,
        totalNCRs: 4,
        defectCategories: [
          { category: 'Dimensional', count: 4 }, // supplier has 100% dimensional vs 66% overall
        ],
      });

      const result = await service.correlateWithSupplier('p1', 'sup-1');
      expect(result.defectComparison.length).toBeGreaterThan(0);
      const dimComparison = result.defectComparison.find(d => d.category === 'Dimensional');
      expect(dimComparison).toBeDefined();
      expect(dimComparison!.isOverrepresented).toBe(true);
    });
  });

  // ==========================================================================
  // correlateWithProduction
  // ==========================================================================
  describe('correlateWithProduction', () => {
    it('should throw if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      await expect(service.correlateWithProduction('bad', 'wo-1')).rejects.toThrow('Part not found');
    });

    it('should throw if work order not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);
      await expect(service.correlateWithProduction('p1', 'bad')).rejects.toThrow('Work order not found');
    });

    it('should return no correlation when production quality is perfect', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'IN_PROGRESS',
        product: { sku: 'SKU-1' },
        operations: [],
      });
      mockDataExtractor.extractProductionQualityData.mockResolvedValue({
        yieldRate: 100,
        defectRate: 0,
        ncrs: [],
        inspections: [],
      });

      const result = await service.correlateWithProduction('p1', 'wo-1');
      expect(result.hasCorrelation).toBe(false);
      expect(result.correlationFactors).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });

    it('should identify multiple correlation factors', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'ON_HOLD',
        product: { sku: 'SKU-1' },
        operations: [],
      });
      mockDataExtractor.extractProductionQualityData.mockResolvedValue({
        yieldRate: 80,
        defectRate: 6,
        ncrs: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
        inspections: [
          { criticalDefects: 2 },
          { criticalDefects: 1 },
        ],
      });

      const result = await service.correlateWithProduction('p1', 'wo-1');
      expect(result.hasCorrelation).toBe(true);
      expect(result.correlationFactors.length).toBeGreaterThanOrEqual(4);

      const factors = result.correlationFactors.map(f => f.factor);
      expect(factors).toContain('Low Yield Rate');
      expect(factors).toContain('High Defect Rate');
      expect(factors).toContain('NCR Issues');
      expect(factors).toContain('Critical Defects');
      expect(factors).toContain('Production Hold');

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate risk score based on impact weights', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'IN_PROGRESS',
        product: { sku: 'SKU-1' },
        operations: [],
      });
      // Only yield below 95 but above 90 => 'low' impact
      mockDataExtractor.extractProductionQualityData.mockResolvedValue({
        yieldRate: 93,
        defectRate: 0.5,
        ncrs: [],
        inspections: [],
      });

      const result = await service.correlateWithProduction('p1', 'wo-1');
      expect(result.correlationFactors).toHaveLength(1);
      expect(result.correlationFactors[0].impact).toBe('low');
      // 1 factor with low impact (1), max = 3 => score = 33
      expect(result.riskScore).toBe(33);
    });

    it('should handle null production quality data', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        status: 'IN_PROGRESS',
        product: { sku: 'SKU-1' },
        operations: [],
      });
      mockDataExtractor.extractProductionQualityData.mockResolvedValue(null);

      const result = await service.correlateWithProduction('p1', 'wo-1');
      expect(result.hasCorrelation).toBe(false);
      expect(result.riskScore).toBe(0);
    });
  });

  // ==========================================================================
  // PRIVATE HELPER METHODS (tested indirectly through public API)
  // ==========================================================================

  describe('helper method behaviors', () => {
    it('calculateMovingAverage: should handle single value', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractPartQualitySummary.mockResolvedValue({
        firstPassYield: 95,
        openNCRs: 0,
        topDefects: [],
        qualityTrend: [
          { period: '2025-01', totalInspections: 10, passCount: 9, failCount: 1, firstPassYield: 95, ncrCount: 0, avgDefectsPerLot: 0 },
        ],
      });

      // Single-point: moving avg = the point itself
      const result = await service.detectQualityDrift('p1', 1);
      expect(result.movingAverage).toHaveLength(1);
    });

    it('identifyPattern via detectRecurringIssues: regular pattern', async () => {
      // Create NCRs with regular ~30 day intervals
      const ncrs = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date('2025-01-01');
        d.setDate(d.getDate() + i * 30);
        ncrs.push(
          makeNCR({
            id: `ncr-${i}`,
            defectCategory: 'Regular',
            createdAt: d,
            quantityAffected: 5,
          })
        );
      }

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].pattern).toContain('Regular pattern');
    });

    it('identifyPattern via detectRecurringIssues: clustered', async () => {
      // Create NCRs with mix of short and longer intervals,
      // where >50% are < 14 days but variability is too high for "regular"
      const dates = [
        new Date('2025-06-01'),
        new Date('2025-06-03'),  // 2 days
        new Date('2025-06-05'),  // 2 days
        new Date('2025-06-06'),  // 1 day
        new Date('2025-07-20'),  // 44 days (big gap makes cv > 0.3)
        new Date('2025-07-22'),  // 2 days
      ];
      const ncrs = dates.map((d, i) =>
        makeNCR({
          id: `ncr-${i}`,
          defectCategory: 'Clustered',
          createdAt: d,
          quantityAffected: 3,
        })
      );

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].pattern).toContain('Clustered');
    });

    it('identifyPattern via detectRecurringIssues: insufficient data', async () => {
      const ncrs = [
        makeNCR({ id: 'ncr-1', defectCategory: 'Few', createdAt: new Date('2025-01-01') }),
        makeNCR({ id: 'ncr-2', defectCategory: 'Few', createdAt: new Date('2025-02-01') }),
      ];

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].pattern).toBe('Insufficient data');
    });

    it('identifyPattern: increasing frequency', async () => {
      // Large intervals first, then small intervals
      const dates = [
        new Date('2025-01-01'),
        new Date('2025-04-01'), // 90 days
        new Date('2025-07-01'), // 91 days
        new Date('2025-07-15'), // 14 days
        new Date('2025-07-25'), // 10 days
        new Date('2025-08-01'), // 7 days
      ];
      const ncrs = dates.map((d, i) =>
        makeNCR({ id: `ncr-${i}`, defectCategory: 'Accel', createdAt: d, quantityAffected: 5 })
      );

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].pattern).toBe('Increasing frequency');
    });

    it('identifyPattern: decreasing frequency', async () => {
      // Small intervals first, then large intervals
      const dates = [
        new Date('2025-01-01'),
        new Date('2025-01-08'), // 7 days
        new Date('2025-01-18'), // 10 days
        new Date('2025-04-18'), // 90 days
        new Date('2025-07-18'), // 91 days
        new Date('2025-12-18'), // 153 days
      ];
      const ncrs = dates.map((d, i) =>
        makeNCR({ id: `ncr-${i}`, defectCategory: 'Decel', createdAt: d, quantityAffected: 5 })
      );

      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockDataExtractor.extractNCRHistory.mockResolvedValue(ncrs);

      const result = await service.detectRecurringIssues('p1');
      expect(result.issues[0].pattern).toBe('Decreasing frequency');
    });
  });
});
