import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Prisma mock ----
const { mockSupplierModel, mockSupplierRiskScore } = vi.hoisted(() => ({
  mockSupplierModel: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockSupplierRiskScore: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    supplier: mockSupplierModel,
    supplierRiskScore: mockSupplierRiskScore,
  },
}));

// ---- Mock data extractor ----
const mockExtractDelivery = vi.fn();
const mockExtractQuality = vi.fn();
const mockExtractPricing = vi.fn();
const mockExtractResponse = vi.fn();

vi.mock('../supplier-data-extractor', () => ({
  getSupplierDataExtractor: () => ({
    extractDeliveryPerformance: mockExtractDelivery,
    extractQualityHistory: mockExtractQuality,
    extractPricingTrends: mockExtractPricing,
    extractResponseMetrics: mockExtractResponse,
  }),
  SupplierDataExtractor: vi.fn(),
}));

import {
  SupplierPerformanceScorer,
  getSupplierPerformanceScorer,
} from '../supplier-performance-scorer';
import type { SupplierScorecard } from '../supplier-performance-scorer';

// ---- Helpers ----
function makeDeliveryData(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: 'sup-1',
    supplierName: 'Test',
    periodMonths: 12,
    summary: {
      totalOrders: 50,
      onTimeOrders: 48,
      lateOrders: 2,
      earlyOrders: 0,
      onTimeRate: 96,
      avgDaysLate: 1,
      avgDaysEarly: 0,
      perfectOrderRate: 92,
    },
    trend: [
      { period: '2025-01', onTimeRate: 94 },
      { period: '2025-02', onTimeRate: 95 },
      { period: '2025-03', onTimeRate: 96 },
      { period: '2025-04', onTimeRate: 96 },
      { period: '2025-05', onTimeRate: 97 },
      { period: '2025-06', onTimeRate: 98 },
    ],
    worstPerformance: [],
    leadTimeVariance: {
      quotedAvg: 14,
      actualAvg: 15,
      variance: 1,
      variancePercent: 7,
    },
    ...overrides,
  };
}

function makeQualityData(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: 'sup-1',
    supplierName: 'Test',
    periodMonths: 12,
    summary: {
      totalLotsReceived: 100,
      acceptedLots: 98,
      rejectedLots: 2,
      acceptanceRate: 98,
      totalNCRs: 3,
      openNCRs: 1,
      closedNCRs: 2,
      totalCAPAs: 1,
      openCAPAs: 0,
      ppm: 200,
      avgDaysToResolveNCR: 10,
    },
    defectBreakdown: [],
    qualityTrend: [
      { period: '2025-01', acceptanceRate: 96 },
      { period: '2025-02', acceptanceRate: 97 },
      { period: '2025-03', acceptanceRate: 98 },
      { period: '2025-04', acceptanceRate: 98 },
      { period: '2025-05', acceptanceRate: 99 },
      { period: '2025-06', acceptanceRate: 99 },
    ],
    recentNCRs: [],
    lotQualityHistory: [],
    ...overrides,
  };
}

function makePricingData(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: 'sup-1',
    supplierName: 'Test',
    periodMonths: 12,
    summary: {
      avgUnitPrice: 50,
      minUnitPrice: 45,
      maxUnitPrice: 55,
      priceVariance: 2,
      totalSpend: 250000,
      avgOrderValue: 5000,
      priceChangePercent: 1,
      competitivenessScore: 85,
    },
    priceHistory: [
      { period: '2025-01', avgUnitPrice: 50, totalSpend: 40000, orderCount: 8 },
      { period: '2025-02', avgUnitPrice: 51, totalSpend: 42000, orderCount: 8 },
      { period: '2025-03', avgUnitPrice: 50, totalSpend: 41000, orderCount: 8 },
      { period: '2025-04', avgUnitPrice: 49, totalSpend: 40000, orderCount: 8 },
      { period: '2025-05', avgUnitPrice: 49, totalSpend: 39000, orderCount: 8 },
      { period: '2025-06', avgUnitPrice: 50, totalSpend: 40000, orderCount: 8 },
    ],
    partPricing: [],
    recentChanges: [],
    ...overrides,
  };
}

function makeResponseData(overrides: Record<string, unknown> = {}) {
  return {
    supplierId: 'sup-1',
    supplierName: 'Test',
    periodMonths: 12,
    summary: {
      avgResponseTimeDays: 3,
      fastResponseRate: 80,
      slowResponseRate: 5,
      avgNCRResolutionDays: 8,
      avgCAPAClosureDays: 18,
      communicationScore: 85,
    },
    ncrResolutionHistory: [
      { id: 'n1', referenceNumber: 'NCR-1', openedDate: new Date(), closedDate: new Date(), daysToResolve: 7, priority: 'high' },
      { id: 'n2', referenceNumber: 'NCR-2', openedDate: new Date(), closedDate: new Date(), daysToResolve: 9, priority: 'medium' },
      { id: 'n3', referenceNumber: 'NCR-3', openedDate: new Date(), closedDate: new Date(), daysToResolve: 8, priority: 'medium' },
      { id: 'n4', referenceNumber: 'NCR-4', openedDate: new Date(), closedDate: new Date(), daysToResolve: 10, priority: 'low' },
      { id: 'n5', referenceNumber: 'NCR-5', openedDate: new Date(), closedDate: new Date(), daysToResolve: 6, priority: 'high' },
    ],
    capaClosureHistory: [],
    ...overrides,
  };
}

// ---- Tests ----
describe('SupplierPerformanceScorer', () => {
  let scorer: SupplierPerformanceScorer;

  beforeEach(() => {
    vi.clearAllMocks();
    scorer = new SupplierPerformanceScorer();
  });

  describe('getSupplierPerformanceScorer', () => {
    it('returns a singleton instance', () => {
      const a = getSupplierPerformanceScorer();
      const b = getSupplierPerformanceScorer();
      expect(a).toBeInstanceOf(SupplierPerformanceScorer);
      expect(a).toBe(b);
    });
  });

  // =========================================================================
  // generateScorecard
  // =========================================================================
  describe('generateScorecard', () => {
    it('returns null when supplier not found', async () => {
      mockSupplierModel.findUnique.mockResolvedValue(null);
      const result = await scorer.generateScorecard('non-existent');
      expect(result).toBeNull();
    });

    it('generates a complete scorecard with all dimensions', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Test Supplier',
        country: 'USA',
        category: 'Electronics',
      });

      mockExtractDelivery.mockResolvedValue(makeDeliveryData());
      mockExtractQuality.mockResolvedValue(makeQualityData());
      mockExtractPricing.mockResolvedValue(makePricingData());
      mockExtractResponse.mockResolvedValue(makeResponseData());
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([
        { id: 'sup-1', riskScore: null },
      ]);

      const result = await scorer.generateScorecard('sup-1', 12);

      expect(result).not.toBeNull();
      expect(result!.supplierId).toBe('sup-1');
      expect(result!.supplierCode).toBe('SUP001');
      expect(result!.periodMonths).toBe(12);
      expect(result!.overallScore).toBeGreaterThan(0);
      expect(result!.overallScore).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result!.overallGrade);
      expect(result!.dimensions.delivery).toBeDefined();
      expect(result!.dimensions.quality).toBeDefined();
      expect(result!.dimensions.cost).toBeDefined();
      expect(result!.dimensions.responsiveness).toBeDefined();
    });

    it('assigns grade A to a high-performing supplier', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Star Supplier',
        country: 'USA',
        category: 'Electronics',
      });

      mockExtractDelivery.mockResolvedValue(
        makeDeliveryData({
          summary: {
            totalOrders: 100,
            onTimeOrders: 99,
            lateOrders: 1,
            earlyOrders: 0,
            onTimeRate: 99,
            avgDaysLate: 0,
            avgDaysEarly: 0,
            perfectOrderRate: 98,
          },
          leadTimeVariance: { quotedAvg: 14, actualAvg: 14, variance: 0, variancePercent: 2 },
        })
      );
      mockExtractQuality.mockResolvedValue(
        makeQualityData({
          summary: {
            totalLotsReceived: 200,
            acceptedLots: 199,
            rejectedLots: 1,
            acceptanceRate: 99.5,
            totalNCRs: 1,
            openNCRs: 0,
            closedNCRs: 1,
            totalCAPAs: 0,
            openCAPAs: 0,
            ppm: 50,
            avgDaysToResolveNCR: 5,
          },
        })
      );
      mockExtractPricing.mockResolvedValue(
        makePricingData({
          summary: {
            avgUnitPrice: 50,
            minUnitPrice: 49,
            maxUnitPrice: 51,
            priceVariance: 0.5,
            totalSpend: 500000,
            avgOrderValue: 5000,
            priceChangePercent: -1,
            competitivenessScore: 95,
          },
        })
      );
      mockExtractResponse.mockResolvedValue(
        makeResponseData({
          summary: {
            avgResponseTimeDays: 1,
            fastResponseRate: 95,
            slowResponseRate: 1,
            avgNCRResolutionDays: 4,
            avgCAPAClosureDays: 10,
            communicationScore: 95,
          },
        })
      );
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');
      expect(result!.overallGrade).toBe('A');
      expect(result!.overallScore).toBeGreaterThanOrEqual(90);
    });

    it('uses default scores when no data is available', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'New Supplier',
        country: 'USA',
        category: null,
      });

      mockExtractDelivery.mockResolvedValue(null);
      mockExtractQuality.mockResolvedValue(null);
      mockExtractPricing.mockResolvedValue(null);
      mockExtractResponse.mockResolvedValue(null);
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');

      expect(result).not.toBeNull();
      // Default score should be 70 for each dimension
      expect(result!.dimensions.delivery.score).toBe(70);
      expect(result!.dimensions.quality.score).toBe(70);
      expect(result!.dimensions.cost.score).toBe(70);
      expect(result!.dimensions.responsiveness.score).toBe(70);
      expect(result!.overallGrade).toBe('C');
    });

    it('handles delivery data with zero orders', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Test',
        country: 'USA',
        category: null,
      });

      mockExtractDelivery.mockResolvedValue(
        makeDeliveryData({
          summary: { ...makeDeliveryData().summary, totalOrders: 0 },
        })
      );
      mockExtractQuality.mockResolvedValue(null);
      mockExtractPricing.mockResolvedValue(null);
      mockExtractResponse.mockResolvedValue(null);
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');
      // Should use default delivery score
      expect(result!.dimensions.delivery.score).toBe(70);
    });

    it('handles pricing data with zero spend', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Test',
        country: 'USA',
        category: null,
      });

      mockExtractDelivery.mockResolvedValue(null);
      mockExtractQuality.mockResolvedValue(null);
      mockExtractPricing.mockResolvedValue(
        makePricingData({
          summary: { ...makePricingData().summary, totalSpend: 0 },
        })
      );
      mockExtractResponse.mockResolvedValue(null);
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');
      // Should use default cost score
      expect(result!.dimensions.cost.score).toBe(70);
    });

    it('calculates weighted scores correctly', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Test',
        country: 'USA',
        category: null,
      });

      mockExtractDelivery.mockResolvedValue(makeDeliveryData());
      mockExtractQuality.mockResolvedValue(makeQualityData());
      mockExtractPricing.mockResolvedValue(makePricingData());
      mockExtractResponse.mockResolvedValue(makeResponseData());
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');

      // Overall score should equal sum of weighted scores
      const expectedOverall =
        result!.dimensions.delivery.weightedScore +
        result!.dimensions.quality.weightedScore +
        result!.dimensions.cost.weightedScore +
        result!.dimensions.responsiveness.weightedScore;

      expect(result!.overallScore).toBeCloseTo(expectedOverall, 0);
    });

    it('generates correct insights for poor performer', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Bad Supplier',
        country: 'USA',
        category: null,
      });

      mockExtractDelivery.mockResolvedValue(
        makeDeliveryData({
          summary: {
            totalOrders: 50,
            onTimeOrders: 30,
            lateOrders: 20,
            earlyOrders: 0,
            onTimeRate: 60,
            avgDaysLate: 10,
            avgDaysEarly: 0,
            perfectOrderRate: 50,
          },
          leadTimeVariance: { quotedAvg: 14, actualAvg: 25, variance: 11, variancePercent: 78 },
        })
      );
      mockExtractQuality.mockResolvedValue(
        makeQualityData({
          summary: {
            totalLotsReceived: 100,
            acceptedLots: 80,
            rejectedLots: 20,
            acceptanceRate: 80,
            totalNCRs: 20,
            openNCRs: 10,
            closedNCRs: 10,
            totalCAPAs: 5,
            openCAPAs: 3,
            ppm: 10000,
            avgDaysToResolveNCR: 35,
          },
        })
      );
      mockExtractPricing.mockResolvedValue(
        makePricingData({
          summary: {
            avgUnitPrice: 50,
            minUnitPrice: 30,
            maxUnitPrice: 80,
            priceVariance: 25,
            totalSpend: 100000,
            avgOrderValue: 2000,
            priceChangePercent: 15,
            competitivenessScore: 40,
          },
        })
      );
      mockExtractResponse.mockResolvedValue(
        makeResponseData({
          summary: {
            avgResponseTimeDays: 20,
            fastResponseRate: 20,
            slowResponseRate: 40,
            avgNCRResolutionDays: 30,
            avgCAPAClosureDays: 50,
            communicationScore: 30,
          },
        })
      );
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');

      expect(result!.overallGrade === 'D' || result!.overallGrade === 'F').toBe(true);
      expect(result!.weaknesses.length).toBeGreaterThan(0);
      expect(result!.recommendations.length).toBeGreaterThan(0);
    });

    it('calculates score trend from previous risk score', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Test',
        country: 'USA',
        category: null,
      });

      mockExtractDelivery.mockResolvedValue(makeDeliveryData());
      mockExtractQuality.mockResolvedValue(makeQualityData());
      mockExtractPricing.mockResolvedValue(makePricingData());
      mockExtractResponse.mockResolvedValue(makeResponseData());
      mockSupplierRiskScore.findUnique.mockResolvedValue({
        supplierId: 'sup-1',
        overallScore: 60, // previous score was 60
      });
      mockSupplierModel.findMany.mockResolvedValue([]);

      const result = await scorer.generateScorecard('sup-1');
      expect(result!.trend.previousScore).toBe(60);
      expect(result!.trend.history.length).toBeGreaterThan(0);
    });

    it('provides benchmark comparison', async () => {
      mockSupplierModel.findUnique.mockResolvedValue({
        id: 'sup-1',
        code: 'SUP001',
        name: 'Test',
        country: 'USA',
        category: 'Electronics',
      });

      mockExtractDelivery.mockResolvedValue(makeDeliveryData());
      mockExtractQuality.mockResolvedValue(makeQualityData());
      mockExtractPricing.mockResolvedValue(makePricingData());
      mockExtractResponse.mockResolvedValue(makeResponseData());
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);
      mockSupplierModel.findMany.mockResolvedValue([
        { id: 'sup-1', riskScore: { overallScore: 80 } },
        { id: 'sup-2', riskScore: { overallScore: 70 } },
        { id: 'sup-3', riskScore: { overallScore: 60 } },
      ]);

      const result = await scorer.generateScorecard('sup-1');
      expect(result!.benchmarkComparison.totalInCategory).toBe(3);
      expect(result!.benchmarkComparison.rank).toBeGreaterThanOrEqual(1);
      expect(result!.benchmarkComparison.percentile).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // saveScorecard
  // =========================================================================
  describe('saveScorecard', () => {
    it('upserts the scorecard into the database', async () => {
      mockSupplierRiskScore.upsert.mockResolvedValue({});

      const scorecard: SupplierScorecard = {
        supplierId: 'sup-1',
        supplierCode: 'SUP001',
        supplierName: 'Test',
        country: 'USA',
        category: 'Electronics',
        periodMonths: 12,
        generatedAt: new Date(),
        overallScore: 85,
        overallGrade: 'B',
        dimensions: {
          delivery: { score: 90, grade: 'A', weight: 0.3, weightedScore: 27, metrics: [], trend: 'stable' },
          quality: { score: 88, grade: 'B', weight: 0.3, weightedScore: 26.4, metrics: [], trend: 'improving' },
          cost: { score: 80, grade: 'B', weight: 0.25, weightedScore: 20, metrics: [], trend: 'stable' },
          responsiveness: { score: 75, grade: 'C', weight: 0.15, weightedScore: 11.25, metrics: [], trend: 'stable' },
        },
        trend: { direction: 'improving', changePercent: 5, previousScore: 80, history: [] },
        strengths: ['Good delivery'],
        weaknesses: ['None critical'],
        recommendations: ['Keep monitoring'],
        benchmarkComparison: {
          categoryAverage: 75,
          percentile: 80,
          rank: 2,
          totalInCategory: 10,
          aboveAverage: true,
        },
      };

      await scorer.saveScorecard(scorecard);

      expect(mockSupplierRiskScore.upsert).toHaveBeenCalledOnce();
      const call = mockSupplierRiskScore.upsert.mock.calls[0][0];
      expect(call.where.supplierId).toBe('sup-1');
      expect(call.update.overallScore).toBe(85);
      expect(call.update.riskLevel).toBe('LOW'); // grade B -> LOW
      expect(call.create.deliveryScore).toBe(90);
    });

    it('maps grades to risk levels correctly', async () => {
      mockSupplierRiskScore.upsert.mockResolvedValue({});

      const baseScorecard: SupplierScorecard = {
        supplierId: 'sup-1',
        supplierCode: 'SUP001',
        supplierName: 'Test',
        country: 'USA',
        category: null,
        periodMonths: 12,
        generatedAt: new Date(),
        overallScore: 50,
        overallGrade: 'F',
        dimensions: {
          delivery: { score: 50, grade: 'F', weight: 0.3, weightedScore: 15, metrics: [], trend: 'stable' },
          quality: { score: 50, grade: 'F', weight: 0.3, weightedScore: 15, metrics: [], trend: 'stable' },
          cost: { score: 50, grade: 'F', weight: 0.25, weightedScore: 12.5, metrics: [], trend: 'stable' },
          responsiveness: { score: 50, grade: 'F', weight: 0.15, weightedScore: 7.5, metrics: [], trend: 'stable' },
        },
        trend: { direction: 'stable', changePercent: 0, previousScore: null, history: [] },
        strengths: [],
        weaknesses: [],
        recommendations: [],
        benchmarkComparison: { categoryAverage: 70, percentile: 10, rank: 10, totalInCategory: 10, aboveAverage: false },
      };

      await scorer.saveScorecard(baseScorecard);
      const call = mockSupplierRiskScore.upsert.mock.calls[0][0];
      expect(call.update.riskLevel).toBe('CRITICAL'); // grade F -> CRITICAL
    });
  });

  // =========================================================================
  // getSupplierRankings
  // =========================================================================
  describe('getSupplierRankings', () => {
    it('returns ranked suppliers', async () => {
      mockSupplierModel.findMany.mockResolvedValue([
        { id: 'sup-1', code: 'S1', name: 'A', country: 'USA', category: 'Electronics', riskScore: null },
        { id: 'sup-2', code: 'S2', name: 'B', country: 'USA', category: 'Electronics', riskScore: null },
      ]);

      // generateScorecard calls findUnique per supplier
      mockSupplierModel.findUnique
        .mockResolvedValueOnce({ id: 'sup-1', code: 'S1', name: 'A', country: 'USA', category: 'Electronics' })
        .mockResolvedValueOnce({ id: 'sup-2', code: 'S2', name: 'B', country: 'USA', category: 'Electronics' });

      mockExtractDelivery.mockResolvedValue(makeDeliveryData());
      mockExtractQuality.mockResolvedValue(makeQualityData());
      mockExtractPricing.mockResolvedValue(makePricingData());
      mockExtractResponse.mockResolvedValue(makeResponseData());
      mockSupplierRiskScore.findUnique.mockResolvedValue(null);

      const rankings = await scorer.getSupplierRankings('Electronics', 10);

      expect(rankings.length).toBeLessThanOrEqual(10);
      if (rankings.length >= 2) {
        expect(rankings[0].rank).toBe(1);
        expect(rankings[1].rank).toBe(2);
        expect(rankings[0].overallScore).toBeGreaterThanOrEqual(rankings[1].overallScore);
      }
    });
  });

  // =========================================================================
  // getCategoryBenchmarks
  // =========================================================================
  describe('getCategoryBenchmarks', () => {
    it('returns benchmarks with score averages', async () => {
      mockSupplierModel.findMany.mockResolvedValue([
        {
          id: 'sup-1',
          name: 'Supplier A',
          category: 'Electronics',
          riskScore: {
            supplierId: 'sup-1',
            overallScore: 80,
            deliveryScore: 85,
            qualityScore: 90,
            financialScore: 75,
            communicationScore: 70,
          },
        },
        {
          id: 'sup-2',
          name: 'Supplier B',
          category: 'Electronics',
          riskScore: {
            supplierId: 'sup-2',
            overallScore: 70,
            deliveryScore: 75,
            qualityScore: 80,
            financialScore: 65,
            communicationScore: 60,
          },
        },
      ]);

      const benchmarks = await scorer.getCategoryBenchmarks();

      expect(benchmarks).toHaveLength(1);
      expect(benchmarks[0].category).toBe('Electronics');
      expect(benchmarks[0].avgOverallScore).toBe(75);
      expect(benchmarks[0].supplierCount).toBe(2);
      expect(benchmarks[0].topPerformer).not.toBeNull();
      expect(benchmarks[0].topPerformer!.score).toBe(80);
    });

    it('handles categories with no risk scores', async () => {
      mockSupplierModel.findMany.mockResolvedValue([
        { id: 'sup-1', name: 'New Supplier', category: 'Packaging', riskScore: null },
      ]);

      const benchmarks = await scorer.getCategoryBenchmarks();

      expect(benchmarks).toHaveLength(1);
      expect(benchmarks[0].avgOverallScore).toBe(70); // default
      expect(benchmarks[0].topPerformer).toBeNull();
    });

    it('groups suppliers by category', async () => {
      mockSupplierModel.findMany.mockResolvedValue([
        {
          id: 'sup-1',
          name: 'A',
          category: 'Electronics',
          riskScore: { supplierId: 'sup-1', overallScore: 80, deliveryScore: 80, qualityScore: 80, financialScore: 80, communicationScore: 80 },
        },
        {
          id: 'sup-2',
          name: 'B',
          category: 'Packaging',
          riskScore: { supplierId: 'sup-2', overallScore: 70, deliveryScore: 70, qualityScore: 70, financialScore: 70, communicationScore: 70 },
        },
        {
          id: 'sup-3',
          name: 'C',
          category: null,
          riskScore: { supplierId: 'sup-3', overallScore: 60, deliveryScore: 60, qualityScore: 60, financialScore: 60, communicationScore: 60 },
        },
      ]);

      const benchmarks = await scorer.getCategoryBenchmarks();

      expect(benchmarks).toHaveLength(3);
      const categories = benchmarks.map((b) => b.category);
      expect(categories).toContain('Electronics');
      expect(categories).toContain('Packaging');
      expect(categories).toContain('Uncategorized');
    });
  });
});
