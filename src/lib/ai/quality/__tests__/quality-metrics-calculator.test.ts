import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  QualityMetricsCalculator,
  getQualityMetricsCalculator,
} from '../quality-metrics-calculator';

// ============================================================================
// MOCKS
// ============================================================================

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: {
      findUnique: vi.fn(),
    },
    inspection: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    nCR: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    cAPA: {
      count: vi.fn(),
    },
  },
}));

const { mockDataExtractor } = vi.hoisted(() => ({
  mockDataExtractor: {
    extractSupplierQualityData: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../quality-data-extractor', () => ({
  getQualityDataExtractor: () => mockDataExtractor,
}));

// ============================================================================
// TESTS
// ============================================================================

describe('QualityMetricsCalculator', () => {
  let calculator: QualityMetricsCalculator;

  beforeEach(() => {
    vi.clearAllMocks();
    calculator = new QualityMetricsCalculator();
  });

  describe('getQualityMetricsCalculator', () => {
    it('should return a singleton instance', () => {
      const inst = getQualityMetricsCalculator();
      expect(inst).toBeInstanceOf(QualityMetricsCalculator);
    });
  });

  // ==========================================================================
  // calculateCpk (pure math, no DB)
  // ==========================================================================
  describe('calculateCpk', () => {
    it('should return poor status with insufficient data', () => {
      const result = calculator.calculateCpk([10], 15, 5, 'Length');
      expect(result.cpk).toBe(0);
      expect(result.status).toBe('poor');
      expect(result.interpretation).toContain('Insufficient');
      expect(result.mean).toBe(10);
    });

    it('should return poor status with empty data', () => {
      const result = calculator.calculateCpk([], 15, 5);
      expect(result.cpk).toBe(0);
      expect(result.mean).toBe(0);
    });

    it('should calculate excellent Cpk for centered, tight process', () => {
      // mean=10, very tight spread around center
      const measurements = [9.95, 10.0, 10.05, 9.98, 10.02, 10.01, 9.99, 10.03, 9.97, 10.0];
      const result = calculator.calculateCpk(measurements, 12, 8, 'Diameter');

      expect(result.mean).toBeCloseTo(10, 1);
      expect(result.usl).toBe(12);
      expect(result.lsl).toBe(8);
      expect(result.cpk).toBeGreaterThan(1.67);
      expect(result.status).toBe('excellent');
      expect(result.cp).toBeGreaterThan(0);
      expect(result.cpu).toBeGreaterThan(0);
      expect(result.cpl).toBeGreaterThan(0);
    });

    it('should calculate acceptable Cpk', () => {
      // Need cpk in [1.33, 1.67): use wider spread to get sample stddev ~0.5
      // With USL=12, LSL=8, mean=10: cpk = (12-10)/(3*s) must be in [1.33, 1.67)
      // => s must be in (0.4, 0.5], so cpk = 2/(3*s)
      const measurements = [9.5, 10.5, 9.55, 10.45, 9.6, 10.4, 9.65, 10.35, 9.7, 10.3];
      const result = calculator.calculateCpk(measurements, 12, 8, 'Width');

      expect(result.cpk).toBeGreaterThanOrEqual(1.33);
      expect(result.cpk).toBeLessThan(1.67);
      expect(result.status).toBe('acceptable');
    });

    it('should calculate marginal Cpk', () => {
      // Need cpk in [1.0, 1.33): mean=10, stdDev~0.67
      // cpu = (12-10)/(3*0.67) = 1.0, cpl = (10-8)/(3*0.67) = 1.0
      const measurements = [9.2, 10.8, 9.3, 10.7, 9.4, 10.6, 9.5, 10.5, 9.6, 10.4];
      const result = calculator.calculateCpk(measurements, 12, 8, 'Height');

      expect(result.cpk).toBeGreaterThanOrEqual(1.0);
      expect(result.cpk).toBeLessThan(1.33);
      expect(result.status).toBe('marginal');
    });

    it('should calculate poor Cpk for out-of-spec process', () => {
      // Very wide spread
      const measurements = [7, 13, 8, 12, 7.5, 12.5, 6, 14, 9, 11];
      const result = calculator.calculateCpk(measurements, 12, 8, 'Flatness');

      expect(result.cpk).toBeLessThan(1.0);
      expect(result.status).toBe('poor');
    });

    it('should handle zero std dev (all same values)', () => {
      const measurements = [10, 10, 10, 10, 10];
      const result = calculator.calculateCpk(measurements, 12, 8);

      expect(result.stdDev).toBe(0);
      expect(result.cpk).toBe(0);
      expect(result.cp).toBe(0);
    });

    it('should correctly identify CPU vs CPL as limiting factor', () => {
      // Mean shifted toward upper limit
      const measurements = [11, 11.2, 10.8, 11.1, 10.9, 11.3, 11.0, 10.7, 11.2, 11.1];
      const result = calculator.calculateCpk(measurements, 12, 8);

      expect(result.cpu).toBeLessThan(result.cpl);
      expect(result.cpk).toBe(result.cpu);
    });
  });

  // ==========================================================================
  // calculatePPM
  // ==========================================================================
  describe('calculatePPM', () => {
    it('should throw if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);
      await expect(calculator.calculatePPM('bad-id')).rejects.toThrow('Part not found');
    });

    it('should calculate PPM correctly', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([
          { quantityInspected: 10000 },
        ])
        .mockResolvedValueOnce([]); // prev period
      mockPrisma.nCR.findMany
        .mockResolvedValueOnce([
          { quantityAffected: 5 },
        ])
        .mockResolvedValueOnce([]); // prev period

      const result = await calculator.calculatePPM('p1');
      expect(result.ppm).toBe(500); // 5/10000 * 1M
      expect(result.status).toBe('acceptable'); // 500 is at the boundary (>=500 is acceptable)
      expect(result.partSku).toBe('P-001');
    });

    it('should return 0 PPM when no quantity inspected', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);

      const result = await calculator.calculatePPM('p1');
      expect(result.ppm).toBe(0);
      expect(result.status).toBe('excellent');
    });

    it('should detect improving trend', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      // Current: 100 PPM
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([{ quantityInspected: 10000 }])
        .mockResolvedValueOnce([{ quantityInspected: 10000 }]);
      mockPrisma.nCR.findMany
        .mockResolvedValueOnce([{ quantityAffected: 1 }])   // current: 100 PPM
        .mockResolvedValueOnce([{ quantityAffected: 5 }]);   // prev: 500 PPM

      const result = await calculator.calculatePPM('p1');
      expect(result.trend).toBe('improving');
    });

    it('should detect worsening trend', async () => {
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([{ quantityInspected: 10000 }])
        .mockResolvedValueOnce([{ quantityInspected: 10000 }]);
      mockPrisma.nCR.findMany
        .mockResolvedValueOnce([{ quantityAffected: 50 }])   // current: 5000 PPM
        .mockResolvedValueOnce([{ quantityAffected: 1 }]);    // prev: 100 PPM

      const result = await calculator.calculatePPM('p1');
      expect(result.trend).toBe('worsening');
    });

    it('should classify status correctly for each threshold', async () => {
      // Test critical status (PPM >= 5000)
      mockPrisma.part.findUnique.mockResolvedValue({ id: 'p1', partNumber: 'P-001' });
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([{ quantityInspected: 1000 }])
        .mockResolvedValueOnce([]);
      mockPrisma.nCR.findMany
        .mockResolvedValueOnce([{ quantityAffected: 10 }]) // 10000 PPM
        .mockResolvedValueOnce([]);

      const result = await calculator.calculatePPM('p1');
      expect(result.status).toBe('critical');
    });
  });

  // ==========================================================================
  // calculateFirstPassYield
  // ==========================================================================
  describe('calculateFirstPassYield', () => {
    it('should return 100% when no inspections', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const result = await calculator.calculateFirstPassYield();
      expect(result.fpy).toBe(100);
      expect(result.totalInspections).toBe(0);
    });

    it('should calculate FPY correctly', async () => {
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([
          { result: 'PASS' },
          { result: 'PASS' },
          { result: 'FAIL' },
          { result: 'PASS' },
        ])
        .mockResolvedValueOnce([]); // prev period

      const result = await calculator.calculateFirstPassYield({ partId: 'p1' });
      expect(result.fpy).toBe(75); // 3/4 * 100
      expect(result.totalInspections).toBe(4);
      expect(result.passFirstTime).toBe(3);
      expect(result.target).toBe(98);
      expect(result.gap).toBe(23); // 98 - 75
    });

    it('should detect improving FPY trend', async () => {
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([{ result: 'PASS' }, { result: 'PASS' }]) // current: 100%
        .mockResolvedValueOnce([{ result: 'PASS' }, { result: 'FAIL' }]); // prev: 50%

      const result = await calculator.calculateFirstPassYield();
      expect(result.trend).toBe('improving');
    });

    it('should detect worsening FPY trend', async () => {
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([{ result: 'FAIL' }, { result: 'FAIL' }]) // current: 0%
        .mockResolvedValueOnce([{ result: 'PASS' }, { result: 'PASS' }]); // prev: 100%

      const result = await calculator.calculateFirstPassYield();
      expect(result.trend).toBe('worsening');
    });

    it('should pass through partId and productId', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([]);

      const result = await calculator.calculateFirstPassYield({
        partId: 'p1',
        productId: 'prod-1',
      });
      expect(result.partId).toBe('p1');
      expect(result.productId).toBe('prod-1');
    });
  });

  // ==========================================================================
  // calculateNCRRate
  // ==========================================================================
  describe('calculateNCRRate', () => {
    it('should return 0 rate when no inspections', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([]);
      mockPrisma.nCR.findMany.mockResolvedValue([]);
      mockPrisma.nCR.count.mockResolvedValue(0);
      mockPrisma.inspection.count.mockResolvedValue(0);

      const result = await calculator.calculateNCRRate();
      expect(result.ncrRate).toBe(0);
      expect(result.totalLots).toBe(0);
    });

    it('should calculate NCR rate correctly', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([
        { lotNumber: 'LOT-1' },
        { lotNumber: 'LOT-2' },
        { lotNumber: 'LOT-3' },
      ]);
      mockPrisma.nCR.findMany.mockResolvedValue([
        {
          lotNumber: 'LOT-1',
          status: 'open',
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date(),
          defectCategory: 'Surface',
        },
        {
          lotNumber: 'LOT-2',
          status: 'closed',
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date('2025-06-15'),
          defectCategory: 'Dimensional',
        },
      ]);
      mockPrisma.nCR.count.mockResolvedValue(0);
      mockPrisma.inspection.count.mockResolvedValue(0);

      const result = await calculator.calculateNCRRate();
      expect(result.totalLots).toBe(3);
      expect(result.lotsWithNCR).toBe(2);
      expect(result.ncrRate).toBeCloseTo(66.7, 0);
      expect(result.ncrCount).toBe(2);
      expect(result.topCategories).toHaveLength(2);
    });

    it('should detect trend based on previous period', async () => {
      mockPrisma.inspection.findMany.mockResolvedValue([{ lotNumber: 'L1' }]);
      mockPrisma.nCR.findMany.mockResolvedValue([
        { lotNumber: 'L1', status: 'open', createdAt: new Date(), updatedAt: new Date(), defectCategory: 'X' },
      ]);
      // Previous had more NCRs relative to inspections
      mockPrisma.nCR.count.mockResolvedValue(5);
      mockPrisma.inspection.count.mockResolvedValue(5);

      const result = await calculator.calculateNCRRate();
      expect(result.trend).toBe('stable'); // 100% vs 100%
    });
  });

  // ==========================================================================
  // calculateSupplierQualityScore
  // ==========================================================================
  describe('calculateSupplierQualityScore', () => {
    it('should throw if supplier not found', async () => {
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue(null);
      await expect(calculator.calculateSupplierQualityScore('bad')).rejects.toThrow('Supplier not found');
    });

    it('should calculate grade A for excellent supplier', async () => {
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        supplierName: 'Best Supplier',
        acceptanceRate: 99,
        totalLots: 50,
        totalNCRs: 0,
        avgDaysToResolve: 5,
        openNCRs: 0,
        qualityTrend: [
          { firstPassYield: 98 },
          { firstPassYield: 99 },
          { firstPassYield: 99.5 },
        ],
      });

      const result = await calculator.calculateSupplierQualityScore('sup-1');
      expect(result.grade).toBe('A');
      expect(result.overallScore).toBeGreaterThanOrEqual(90);
      expect(result.supplierName).toBe('Best Supplier');
    });

    it('should calculate grade F for poor supplier', async () => {
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        supplierName: 'Poor Supplier',
        acceptanceRate: 50,
        totalLots: 20,
        totalNCRs: 15,
        avgDaysToResolve: 60,
        openNCRs: 5,
        qualityTrend: [
          { firstPassYield: 60 },
          { firstPassYield: 50 },
          { firstPassYield: 40 },
        ],
      });

      const result = await calculator.calculateSupplierQualityScore('sup-2');
      expect(result.grade).toBe('F');
      expect(result.overallScore).toBeLessThan(60);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContainEqual(expect.stringContaining('alternative supplier'));
    });

    it('should detect improving trend', async () => {
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        supplierName: 'Improving Supplier',
        acceptanceRate: 90,
        totalLots: 30,
        totalNCRs: 2,
        avgDaysToResolve: 10,
        openNCRs: 0,
        qualityTrend: [
          { firstPassYield: 80 },
          { firstPassYield: 82 },
          { firstPassYield: 84 },
          { firstPassYield: 90 },
          { firstPassYield: 92 },
          { firstPassYield: 95 },
        ],
      });

      const result = await calculator.calculateSupplierQualityScore('sup-3');
      expect(result.trend).toBe('improving');
    });

    it('should detect worsening trend', async () => {
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        supplierName: 'Declining Supplier',
        acceptanceRate: 85,
        totalLots: 30,
        totalNCRs: 3,
        avgDaysToResolve: 15,
        openNCRs: 1,
        qualityTrend: [
          { firstPassYield: 95 },
          { firstPassYield: 93 },
          { firstPassYield: 90 },
          { firstPassYield: 85 },
          { firstPassYield: 82 },
          { firstPassYield: 80 },
        ],
      });

      const result = await calculator.calculateSupplierQualityScore('sup-4');
      expect(result.trend).toBe('worsening');
    });

    it('should generate recommendations for open NCRs', async () => {
      mockDataExtractor.extractSupplierQualityData.mockResolvedValue({
        supplierName: 'Supplier',
        acceptanceRate: 95,
        totalLots: 20,
        totalNCRs: 2,
        avgDaysToResolve: 10,
        openNCRs: 3,
        qualityTrend: [],
      });

      const result = await calculator.calculateSupplierQualityScore('sup-5');
      expect(result.recommendations).toContainEqual(expect.stringContaining('3 open NCR'));
    });
  });

  // ==========================================================================
  // getQualityMetricsSummary
  // ==========================================================================
  describe('getQualityMetricsSummary', () => {
    it('should return summary with all fields', async () => {
      // For calculateFirstPassYield internal call
      mockPrisma.inspection.findMany
        .mockResolvedValueOnce([{ result: 'PASS' }, { result: 'FAIL' }]) // FPY current
        .mockResolvedValueOnce([])                                        // FPY prev
        .mockResolvedValueOnce([                                          // summary inspections
          { result: 'PASS', createdAt: new Date(), quantityInspected: 100 },
        ]);
      mockPrisma.nCR.findMany
        .mockResolvedValueOnce([                                         // summary NCRs
          { quantityAffected: 2, defectCategory: 'Surface', createdAt: new Date() },
        ])
        .mockResolvedValueOnce([]);                                      // closedNCRs
      mockPrisma.nCR.count.mockResolvedValue(1);
      mockPrisma.cAPA.count.mockResolvedValue(2);

      const result = await calculator.getQualityMetricsSummary();
      expect(result.overallFPY).toBeDefined();
      expect(result.overallPPM).toBeDefined();
      expect(result.openNCRs).toBe(1);
      expect(result.openCAPAs).toBe(2);
      expect(result.topDefectCategories).toBeDefined();
      expect(result.qualityTrend).toBeDefined();
    });
  });
});
