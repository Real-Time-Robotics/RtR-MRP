import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Prisma mock ----
const { mockSupplier, mockSupplierRiskScore } = vi.hoisted(() => ({
  mockSupplier: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockSupplierRiskScore: {
    upsert: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    supplier: mockSupplier,
    supplierRiskScore: mockSupplierRiskScore,
  },
}));

// ---- Mock dependencies ----
const mockGenerateScorecard = vi.fn();
const mockAnalyzeDependencies = vi.fn();

vi.mock('../supplier-performance-scorer', () => ({
  getSupplierPerformanceScorer: () => ({
    generateScorecard: mockGenerateScorecard,
  }),
  SupplierPerformanceScorer: vi.fn(),
}));

vi.mock('../dependency-analyzer', () => ({
  getDependencyAnalyzer: () => ({
    analyzeDependencies: mockAnalyzeDependencies,
  }),
  DependencyAnalyzer: vi.fn(),
}));

import { RiskCalculator, getRiskCalculator } from '../risk-calculator';
import type { SupplierRiskAssessment } from '../risk-calculator';

// ---- Helpers ----
function makeSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sup-1',
    code: 'SUP001',
    name: 'Test Supplier',
    country: 'USA',
    category: 'Electronics',
    status: 'active',
    rating: 85,
    leadTimeDays: 14,
    ndaaCompliant: true,
    partSuppliers: [],
    purchaseOrders: [],
    riskScore: null,
    ...overrides,
  };
}

function makeScorecard(overrides: Record<string, unknown> = {}) {
  return {
    overallScore: 80,
    dimensions: {
      delivery: { score: 85 },
      quality: { score: 90 },
      cost: { score: 75 },
      responsiveness: { score: 70 },
    },
    ...overrides,
  };
}

function makePartSupplier(
  partOverrides: Record<string, unknown> = {},
  psOverrides: Record<string, unknown> = {}
) {
  return {
    partId: 'part-1',
    part: {
      id: 'part-1',
      isCritical: false,
      partSuppliers: [{ supplierId: 'sup-1' }, { supplierId: 'sup-2' }],
      ...partOverrides,
    },
    ...psOverrides,
  };
}

// ---- Tests ----
describe('RiskCalculator', () => {
  let calculator: RiskCalculator;

  beforeEach(() => {
    vi.clearAllMocks();
    calculator = new RiskCalculator();
  });

  describe('getRiskCalculator', () => {
    it('returns a singleton instance', () => {
      const a = getRiskCalculator();
      const b = getRiskCalculator();
      expect(a).toBeInstanceOf(RiskCalculator);
      expect(a).toBe(b);
    });
  });

  // =========================================================================
  // calculateSupplierRisk
  // =========================================================================
  describe('calculateSupplierRisk', () => {
    it('returns null when supplier not found', async () => {
      mockSupplier.findUnique.mockResolvedValue(null);
      const result = await calculator.calculateSupplierRisk('non-existent');
      expect(result).toBeNull();
    });

    it('calculates risk assessment for a low-risk supplier', async () => {
      const supplier = makeSupplier({
        partSuppliers: [makePartSupplier()],
        purchaseOrders: [
          { id: 'po-1', totalAmount: 5000 },
          { id: 'po-2', totalAmount: 3000 },
        ],
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const result = await calculator.calculateSupplierRisk('sup-1', 12);

      expect(result).not.toBeNull();
      expect(result!.supplierId).toBe('sup-1');
      expect(result!.supplierCode).toBe('SUP001');
      expect(result!.supplierName).toBe('Test Supplier');
      expect(result!.country).toBe('USA');
      expect(typeof result!.overallRiskScore).toBe('number');
      expect(result!.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result!.overallRiskScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high', 'critical']).toContain(result!.riskLevel);
    });

    it('returns higher risk for supplier in high-risk country', async () => {
      const usaSupplier = makeSupplier({ country: 'USA', leadTimeDays: 10 });
      const chinaSupplier = makeSupplier({
        id: 'sup-2',
        country: 'China',
        leadTimeDays: 45,
        ndaaCompliant: false,
      });

      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      mockSupplier.findUnique.mockResolvedValue(usaSupplier);
      const usaResult = await calculator.calculateSupplierRisk('sup-1');

      mockSupplier.findUnique.mockResolvedValue(chinaSupplier);
      const chinaResult = await calculator.calculateSupplierRisk('sup-2');

      expect(chinaResult!.riskFactors.external.score).toBeGreaterThan(
        usaResult!.riskFactors.external.score
      );
    });

    it('handles supplier with no performance data', async () => {
      const supplier = makeSupplier();
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(null);

      const result = await calculator.calculateSupplierRisk('sup-1');
      expect(result).not.toBeNull();
      expect(result!.riskFactors.performance.score).toBe(50);
      expect(result!.riskFactors.performance.factors[0].name).toBe('No Data');
    });

    it('identifies single-source dependency risk', async () => {
      const supplier = makeSupplier({
        partSuppliers: [
          makePartSupplier({ partSuppliers: [{ supplierId: 'sup-1' }] }), // single source
          makePartSupplier({
            id: 'part-2',
            partSuppliers: [{ supplierId: 'sup-1' }],
          }),
        ],
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const result = await calculator.calculateSupplierRisk('sup-1');
      expect(result!.riskFactors.dependency.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Single Source Parts' }),
        ])
      );
    });

    it('identifies critical parts dependency risk', async () => {
      const supplier = makeSupplier({
        partSuppliers: [
          makePartSupplier({ isCritical: true }),
        ],
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const result = await calculator.calculateSupplierRisk('sup-1');
      expect(result!.riskFactors.dependency.factors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Critical Parts Dependency' }),
        ])
      );
    });

    it('flags financial risk for suppliers with no orders and low rating', async () => {
      const supplier = makeSupplier({
        rating: 50,
        purchaseOrders: [],
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const result = await calculator.calculateSupplierRisk('sup-1');
      const financialFactorNames = result!.riskFactors.financial.factors.map((f) => f.name);
      expect(financialFactorNames).toContain('No Recent Orders');
      expect(financialFactorNames).toContain('Low Supplier Rating');
    });

    it('calculates risk trend as improving when risk decreases', async () => {
      const supplier = makeSupplier({
        riskScore: { overallScore: 60 }, // previous score 60 → previous risk 40
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      // High-scoring scorecard → low risk
      mockGenerateScorecard.mockResolvedValue(
        makeScorecard({
          dimensions: {
            delivery: { score: 95 },
            quality: { score: 95 },
            cost: { score: 95 },
            responsiveness: { score: 95 },
          },
        })
      );

      const result = await calculator.calculateSupplierRisk('sup-1');
      // With overall score ~5 risk, and previous risk was 40, direction should be 'improving'
      expect(result!.trend.previousScore).toBe(40);
    });

    it('generates recommendations for high-risk suppliers', async () => {
      const supplier = makeSupplier({
        country: 'China',
        ndaaCompliant: false,
        leadTimeDays: 60,
        rating: 40,
        purchaseOrders: [],
        partSuppliers: [
          makePartSupplier({ isCritical: true, partSuppliers: [{ supplierId: 'sup-1' }] }),
          makePartSupplier({
            id: 'part-2',
            isCritical: true,
            partSuppliers: [{ supplierId: 'sup-1' }],
          }),
          makePartSupplier({
            id: 'part-3',
            isCritical: true,
            partSuppliers: [{ supplierId: 'sup-1' }],
          }),
          makePartSupplier({
            id: 'part-4',
            isCritical: true,
            partSuppliers: [{ supplierId: 'sup-1' }],
          }),
        ],
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      // Low-scoring scorecard → high risk
      mockGenerateScorecard.mockResolvedValue(
        makeScorecard({
          dimensions: {
            delivery: { score: 30 },
            quality: { score: 25 },
            cost: { score: 40 },
            responsiveness: { score: 35 },
          },
        })
      );

      const result = await calculator.calculateSupplierRisk('sup-1');
      expect(result!.recommendations.length).toBeGreaterThan(0);
      // Should include performance recommendation (perf risk > 50)
      expect(result!.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: expect.stringContaining('performance review') }),
        ])
      );
    });

    it('generates historical risk points matching the period', async () => {
      const supplier = makeSupplier();
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const result = await calculator.calculateSupplierRisk('sup-1', 6);
      expect(result!.historicalRisk).toHaveLength(6);
      // Last entry should match overall risk score
      expect(result!.historicalRisk[5].riskScore).toBe(result!.overallRiskScore);
    });

    it('calculates mitigation status correctly', async () => {
      // All parts have alternates, many POs (>12), high rating
      const supplier = makeSupplier({
        rating: 90,
        partSuppliers: [makePartSupplier()], // has 2 suppliers
        purchaseOrders: Array.from({ length: 15 }, (_, i) => ({
          id: `po-${i}`,
          totalAmount: 1000,
        })),
      });
      mockSupplier.findUnique.mockResolvedValue(supplier);
      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const result = await calculator.calculateSupplierRisk('sup-1');
      expect(result!.mitigationStatus.hasAlternateSupplier).toBe(true);
      expect(result!.mitigationStatus.hasLongTermContract).toBe(true);
      expect(result!.mitigationStatus.mitigationScore).toBe(100);
    });
  });

  // =========================================================================
  // saveRiskAssessment
  // =========================================================================
  describe('saveRiskAssessment', () => {
    it('upserts the risk score in the database', async () => {
      mockSupplierRiskScore.upsert.mockResolvedValue({});

      const assessment: SupplierRiskAssessment = {
        supplierId: 'sup-1',
        supplierCode: 'SUP001',
        supplierName: 'Test',
        country: 'USA',
        category: null,
        assessmentDate: new Date(),
        overallRiskScore: 45,
        riskLevel: 'medium',
        riskFactors: {
          performance: { score: 40, weight: 0.35, factors: [{ name: 'test', score: 40, impact: 'medium', description: 'test desc' }] },
          dependency: { score: 50, weight: 0.30, factors: [] },
          external: { score: 30, weight: 0.20, factors: [] },
          financial: { score: 35, weight: 0.15, factors: [] },
        },
        performanceScore: 60,
        dependencyScore: 50,
        externalRiskScore: 30,
        trend: { direction: 'stable', changePercent: 0, previousScore: null, projectedScore: 45 },
        historicalRisk: [],
        mitigationStatus: {
          hasAlternateSupplier: true,
          hasSafetyStock: false,
          hasLongTermContract: false,
          lastAuditDate: null,
          auditScore: null,
          mitigationScore: 70,
        },
        recommendations: [
          {
            priority: 'medium',
            category: 'short_term',
            action: 'Review supplier',
            expectedImpact: 10,
            estimatedCost: 'low',
            deadline: '30 days',
          },
        ],
      };

      await calculator.saveRiskAssessment(assessment);

      expect(mockSupplierRiskScore.upsert).toHaveBeenCalledOnce();
      const call = mockSupplierRiskScore.upsert.mock.calls[0][0];
      expect(call.where.supplierId).toBe('sup-1');
      expect(call.update.overallScore).toBe(55); // 100 - 45
      expect(call.create.overallScore).toBe(55);
    });
  });

  // =========================================================================
  // batchAssessRisk
  // =========================================================================
  describe('batchAssessRisk', () => {
    it('returns sorted assessments for multiple suppliers', async () => {
      const supplier1 = makeSupplier({ id: 'sup-1', country: 'USA' });
      const supplier2 = makeSupplier({
        id: 'sup-2',
        code: 'SUP002',
        name: 'Risky Supplier',
        country: 'China',
        ndaaCompliant: false,
        leadTimeDays: 60,
        rating: 40,
        purchaseOrders: [],
      });

      mockSupplier.findUnique
        .mockResolvedValueOnce(supplier1)
        .mockResolvedValueOnce(supplier2);

      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const results = await calculator.batchAssessRisk(['sup-1', 'sup-2']);
      expect(results).toHaveLength(2);
      // Should be sorted by risk score descending
      expect(results[0].overallRiskScore).toBeGreaterThanOrEqual(results[1].overallRiskScore);
    });

    it('skips suppliers that return null', async () => {
      mockSupplier.findUnique
        .mockResolvedValueOnce(makeSupplier())
        .mockResolvedValueOnce(null);

      mockGenerateScorecard.mockResolvedValue(makeScorecard());

      const results = await calculator.batchAssessRisk(['sup-1', 'sup-missing']);
      expect(results).toHaveLength(1);
    });
  });

  // =========================================================================
  // analyzeRiskScenarios
  // =========================================================================
  describe('analyzeRiskScenarios', () => {
    it('returns at least quality and transportation scenarios even with no suppliers', async () => {
      mockSupplier.findMany.mockResolvedValue([]);

      const scenarios = await calculator.analyzeRiskScenarios();
      expect(scenarios.length).toBeGreaterThanOrEqual(2);
      const names = scenarios.map((s) => s.name);
      expect(names).toContain('Quality Crisis');
      expect(names).toContain('Global Transportation Disruption');
    });

    it('includes top supplier failure scenario when suppliers exist', async () => {
      const suppliers = [
        makeSupplier({
          id: 'sup-1',
          country: 'USA',
          purchaseOrders: [{ id: 'po-1', totalAmount: 50000 }],
          partSuppliers: [
            makePartSupplier({ partSuppliers: [{ supplierId: 'sup-1' }] }),
          ],
        }),
      ];
      mockSupplier.findMany.mockResolvedValue(suppliers);

      const scenarios = await calculator.analyzeRiskScenarios();
      expect(scenarios.map((s) => s.name)).toContain('Top Supplier Failure');
      const topFailure = scenarios.find((s) => s.name === 'Top Supplier Failure')!;
      expect(topFailure.financialImpact.minimum).toBeLessThan(topFailure.financialImpact.maximum);
    });

    it('includes Asia Pacific disruption scenario when Asia suppliers exist', async () => {
      const suppliers = [
        makeSupplier({ id: 'sup-1', country: 'China', purchaseOrders: [{ id: 'po-1', totalAmount: 10000 }] }),
        makeSupplier({ id: 'sup-2', country: 'Vietnam', purchaseOrders: [{ id: 'po-2', totalAmount: 5000 }] }),
      ];
      mockSupplier.findMany.mockResolvedValue(suppliers);

      const scenarios = await calculator.analyzeRiskScenarios();
      expect(scenarios.map((s) => s.name)).toContain('Asia Pacific Regional Disruption');
    });
  });
});
