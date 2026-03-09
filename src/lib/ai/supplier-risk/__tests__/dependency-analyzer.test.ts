import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Prisma mock ----
const { mockPart, mockSupplier, mockPurchaseOrder } = vi.hoisted(() => ({
  mockPart: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  mockSupplier: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  mockPurchaseOrder: {
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: mockPart,
    supplier: mockSupplier,
    purchaseOrder: mockPurchaseOrder,
  },
}));

import { DependencyAnalyzer, getDependencyAnalyzer } from '../dependency-analyzer';

// ---- Helpers ----
function makePartWithSuppliers(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part-1',
    partNumber: 'P001',
    name: 'Test Part',
    category: 'Electronics',
    status: 'active',
    isCritical: false,
    partSuppliers: [
      {
        supplierId: 'sup-1',
        status: 'active',
        leadTimeDays: 14,
        supplier: {
          id: 'sup-1',
          name: 'Supplier A',
          country: 'USA',
          rating: 85,
          leadTimeDays: 14,
        },
      },
      {
        supplierId: 'sup-2',
        status: 'active',
        leadTimeDays: 21,
        supplier: {
          id: 'sup-2',
          name: 'Supplier B',
          country: 'Germany',
          rating: 90,
          leadTimeDays: 21,
        },
      },
    ],
    ...overrides,
  };
}

function makeSingleSourcePart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'part-ss',
    partNumber: 'P-SS',
    name: 'Single Source Part',
    category: 'Electronics',
    status: 'active',
    isCritical: false,
    partSuppliers: [
      {
        supplierId: 'sup-1',
        status: 'active',
        leadTimeDays: 14,
        supplier: {
          id: 'sup-1',
          name: 'Supplier A',
          country: 'USA',
          rating: 85,
          leadTimeDays: 14,
        },
      },
    ],
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'po-1',
    supplierId: 'sup-1',
    totalAmount: 10000,
    status: 'received',
    orderDate: new Date(),
    supplier: {
      id: 'sup-1',
      name: 'Supplier A',
      country: 'USA',
      rating: 85,
    },
    lines: [
      {
        partId: 'part-1',
        quantity: 100,
        part: { id: 'part-1' },
      },
    ],
    ...overrides,
  };
}

// ---- Tests ----
describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new DependencyAnalyzer();
  });

  describe('getDependencyAnalyzer', () => {
    it('returns a singleton instance', () => {
      const a = getDependencyAnalyzer();
      const b = getDependencyAnalyzer();
      expect(a).toBeInstanceOf(DependencyAnalyzer);
      expect(a).toBe(b);
    });
  });

  // =========================================================================
  // analyzeDependencies
  // =========================================================================
  describe('analyzeDependencies', () => {
    it('returns a complete analysis with no parts and no orders', async () => {
      mockPart.findMany.mockResolvedValue([]);
      mockPurchaseOrder.findMany.mockResolvedValue([]);

      const result = await analyzer.analyzeDependencies(12);

      expect(result.periodMonths).toBe(12);
      expect(result.summary.totalActiveParts).toBe(0);
      expect(result.summary.totalActiveSuppliers).toBe(0);
      expect(result.summary.singleSourcePartCount).toBe(0);
      expect(result.singleSourceParts).toHaveLength(0);
      expect(result.concentrationRisk).toBeDefined();
      expect(result.geographicRisk).toBeDefined();
    });

    it('identifies single-source parts', async () => {
      mockPart.findMany.mockResolvedValue([
        makeSingleSourcePart({ id: 'part-ss-1', partNumber: 'PSS1' }),
        makePartWithSuppliers({ id: 'part-dual', partNumber: 'PD1' }),
      ]);
      mockPurchaseOrder.findMany.mockResolvedValue([
        makeOrder({ supplierId: 'sup-1' }),
      ]);
      // findAlternativeSuppliers calls
      mockPart.findUnique.mockResolvedValue({ id: 'part-ss-1', category: 'Electronics' });
      mockSupplier.findMany.mockResolvedValue([]);

      const result = await analyzer.analyzeDependencies(12);

      expect(result.singleSourceParts).toHaveLength(1);
      expect(result.singleSourceParts[0].partId).toBe('part-ss-1');
      expect(result.summary.singleSourcePartCount).toBe(1);
      expect(result.summary.singleSourcePercent).toBeCloseTo(50, 0);
    });

    it('calculates concentration risk from orders', async () => {
      mockPart.findMany.mockResolvedValue([makePartWithSuppliers()]);
      mockPurchaseOrder.findMany.mockResolvedValue([
        makeOrder({ id: 'po-1', supplierId: 'sup-1', totalAmount: 90000, supplier: { id: 'sup-1', name: 'Big Supplier', country: 'USA', rating: 85 } }),
        makeOrder({ id: 'po-2', supplierId: 'sup-2', totalAmount: 10000, supplier: { id: 'sup-2', name: 'Small Supplier', country: 'Germany', rating: 80 } }),
      ]);

      const result = await analyzer.analyzeDependencies(12);

      expect(result.concentrationRisk.spendConcentration.top1SupplierPercent).toBe(90);
      // HHI should be high (0.9^2 + 0.1^2) * 10000 = 8200
      expect(result.concentrationRisk.spendConcentration.herfindahlIndex).toBe(8200);
      // Risk should be elevated
      expect(result.concentrationRisk.overallScore).toBeGreaterThan(0);
    });

    it('calculates geographic risk from supplier countries', async () => {
      mockPart.findMany.mockResolvedValue([makePartWithSuppliers()]);
      mockPurchaseOrder.findMany.mockResolvedValue([
        makeOrder({
          id: 'po-1',
          supplierId: 'sup-cn',
          totalAmount: 80000,
          supplier: { id: 'sup-cn', name: 'China Supplier', country: 'China', rating: 70 },
        }),
        makeOrder({
          id: 'po-2',
          supplierId: 'sup-us',
          totalAmount: 20000,
          supplier: { id: 'sup-us', name: 'US Supplier', country: 'USA', rating: 90 },
        }),
      ]);

      const result = await analyzer.analyzeDependencies(12);

      expect(result.geographicRisk.countryConcentration.length).toBe(2);
      // China should have risk factors
      const chinaConc = result.geographicRisk.countryConcentration.find(
        (c) => c.country === 'China'
      );
      expect(chinaConc).toBeDefined();
      expect(chinaConc!.riskFactors.length).toBeGreaterThan(0);
    });

    it('generates recommendations for critical single-source parts', async () => {
      mockPart.findMany.mockResolvedValue([
        makeSingleSourcePart({ isCritical: true }),
      ]);
      mockPurchaseOrder.findMany.mockResolvedValue([]);
      mockPart.findUnique.mockResolvedValue({ id: 'part-ss', category: 'Electronics' });
      mockSupplier.findMany.mockResolvedValue([]);

      const result = await analyzer.analyzeDependencies(12);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].priority).toBe('critical');
      expect(result.recommendations[0].type).toBe('dual_source');
    });

    it('assigns higher risk score to critical single-source parts', async () => {
      mockPart.findMany.mockResolvedValue([
        makeSingleSourcePart({ id: 'p-noncrit', isCritical: false }),
        makeSingleSourcePart({
          id: 'p-crit',
          partNumber: 'PCRIT',
          isCritical: true,
          partSuppliers: [
            {
              supplierId: 'sup-bad',
              status: 'active',
              leadTimeDays: 45,
              supplier: {
                id: 'sup-bad',
                name: 'Bad Supplier',
                country: 'China',
                rating: 50,
                leadTimeDays: 45,
              },
            },
          ],
        }),
      ]);
      mockPurchaseOrder.findMany.mockResolvedValue([]);
      mockPart.findUnique.mockResolvedValue({ id: 'part', category: 'Electronics' });
      mockSupplier.findMany.mockResolvedValue([]);

      const result = await analyzer.analyzeDependencies(12);

      const critPart = result.singleSourceParts.find((p) => p.partId === 'p-crit');
      const nonCritPart = result.singleSourceParts.find((p) => p.partId === 'p-noncrit');
      expect(critPart!.riskScore).toBeGreaterThan(nonCritPart!.riskScore);
    });

    it('identifies critical dependencies', async () => {
      mockPart.findMany.mockResolvedValue([
        makeSingleSourcePart({
          isCritical: true,
          partSuppliers: [{
            supplierId: 'sup-1',
            status: 'active',
            leadTimeDays: 45,
            supplier: {
              id: 'sup-1',
              name: 'Risky Supplier',
              country: 'China',
              rating: 50,
              leadTimeDays: 45,
            },
          }],
        }),
      ]);
      mockPurchaseOrder.findMany.mockResolvedValue([]);
      mockPart.findUnique.mockResolvedValue({ id: 'part-ss', category: 'Electronics' });
      mockSupplier.findMany.mockResolvedValue([]);

      const result = await analyzer.analyzeDependencies(12);

      // Critical single-source part with risk >= 50 should be in critical dependencies
      expect(result.criticalDependencies.length).toBeGreaterThan(0);
      expect(result.criticalDependencies[0].dependencyType).toBe('single_source');
    });
  });

  // =========================================================================
  // analyzePartDependency
  // =========================================================================
  describe('analyzePartDependency', () => {
    it('returns null when part not found', async () => {
      mockPart.findUnique.mockResolvedValue(null);
      const result = await analyzer.analyzePartDependency('non-existent');
      expect(result).toBeNull();
    });

    it('identifies a single-source part correctly', async () => {
      mockPart.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        name: 'Test Part',
        category: 'Electronics',
        isCritical: false,
        partSuppliers: [
          {
            supplierId: 'sup-1',
            isPreferred: true,
            qualified: true,
            leadTimeDays: 14,
            supplier: {
              id: 'sup-1',
              name: 'Supplier A',
              country: 'USA',
              rating: 85,
              riskScore: null,
            },
          },
        ],
      });

      const result = await analyzer.analyzePartDependency('part-1');
      expect(result).not.toBeNull();
      expect(result!.isSingleSource).toBe(true);
      expect(result!.supplierCount).toBe(1);
      expect(result!.riskScore).toBeGreaterThanOrEqual(40); // base 40 for single source
      expect(result!.recommendations).toContain('Qualify at least one alternate supplier');
    });

    it('returns low risk for a multi-sourced non-critical part', async () => {
      mockPart.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        name: 'Test Part',
        category: 'Electronics',
        isCritical: false,
        partSuppliers: [
          {
            supplierId: 'sup-1',
            isPreferred: true,
            qualified: true,
            leadTimeDays: 14,
            supplier: { id: 'sup-1', name: 'A', country: 'USA', rating: 90, riskScore: null },
          },
          {
            supplierId: 'sup-2',
            isPreferred: false,
            qualified: true,
            leadTimeDays: 21,
            supplier: { id: 'sup-2', name: 'B', country: 'Germany', rating: 85, riskScore: null },
          },
        ],
      });

      const result = await analyzer.analyzePartDependency('part-1');
      expect(result!.isSingleSource).toBe(false);
      expect(result!.riskLevel).toBe('low');
    });

    it('flags critical risk for single-source critical part with no suppliers', async () => {
      mockPart.findUnique.mockResolvedValue({
        id: 'part-1',
        partNumber: 'P001',
        name: 'Critical Part',
        category: 'Electronics',
        isCritical: true,
        partSuppliers: [],
      });

      const result = await analyzer.analyzePartDependency('part-1');
      expect(result!.riskScore).toBeGreaterThanOrEqual(70);
      expect(result!.riskLevel).toBe('critical');
      expect(result!.recommendations).toContain('Urgently identify and qualify suppliers');
    });
  });

  // =========================================================================
  // getSupplierDependencyBreakdown
  // =========================================================================
  describe('getSupplierDependencyBreakdown', () => {
    it('returns null when supplier not found', async () => {
      mockSupplier.findUnique.mockResolvedValue(null);
      const result = await analyzer.getSupplierDependencyBreakdown('non-existent');
      expect(result).toBeNull();
    });

    it('calculates dependency breakdown correctly', async () => {
      mockSupplier.findUnique.mockResolvedValue({
        id: 'sup-1',
        name: 'Supplier A',
        country: 'USA',
        rating: 85,
        partSuppliers: [
          {
            partId: 'p1',
            isPreferred: true,
            unitPrice: 10,
            part: {
              id: 'p1',
              partNumber: 'P001',
              name: 'Part 1',
              isCritical: true,
              partSuppliers: [
                { supplierId: 'sup-1', status: 'active' },
              ],
            },
          },
          {
            partId: 'p2',
            isPreferred: false,
            unitPrice: 20,
            part: {
              id: 'p2',
              partNumber: 'P002',
              name: 'Part 2',
              isCritical: false,
              partSuppliers: [
                { supplierId: 'sup-1', status: 'active' },
                { supplierId: 'sup-2', status: 'active' },
              ],
            },
          },
        ],
      });

      const result = await analyzer.getSupplierDependencyBreakdown('sup-1');
      expect(result).not.toBeNull();
      expect(result!.totalPartsSupplied).toBe(2);
      expect(result!.criticalPartsSupplied).toBe(1);
      expect(result!.soleSourceParts).toBe(1); // p1 has only sup-1
      expect(result!.riskIfRemoved).toBe('medium'); // 1 sole source, 1 critical
    });

    it('returns critical risk when many sole-source and critical parts', async () => {
      const partSuppliers = Array.from({ length: 6 }, (_, i) => ({
        partId: `p${i}`,
        isPreferred: true,
        unitPrice: 10,
        part: {
          id: `p${i}`,
          partNumber: `P00${i}`,
          name: `Part ${i}`,
          isCritical: i < 4, // 4 critical
          partSuppliers: [{ supplierId: 'sup-1', status: 'active' }], // all sole source
        },
      }));

      mockSupplier.findUnique.mockResolvedValue({
        id: 'sup-1',
        name: 'Critical Supplier',
        country: 'USA',
        rating: 85,
        partSuppliers,
      });

      const result = await analyzer.getSupplierDependencyBreakdown('sup-1');
      expect(result!.riskIfRemoved).toBe('critical');
    });
  });
});
