// src/lib/finance/__tests__/variance.test.ts
// Unit tests for cost variance analysis

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma with vi.hoisted
const mockPrisma = vi.hoisted(() => ({
  purchaseOrderLine: {
    findMany: vi.fn(),
  },
  workOrder: {
    findMany: vi.fn(),
  },
  costVariance: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import {
  calculateMaterialPriceVariance,
  calculateMaterialUsageVariance,
  calculateLaborEfficiencyVariance,
  calculateAllVariances,
  saveVarianceResults,
  getVarianceSummary,
} from '../variance';

describe('Variance Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // calculateMaterialPriceVariance
  // ==========================================================================
  describe('calculateMaterialPriceVariance', () => {
    it('should return zero variance when no PO lines', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([]);

      const result = await calculateMaterialPriceVariance(2025, 6);

      expect(result.varianceType).toBe('MATERIAL_PRICE');
      expect(result.standardAmount).toBe(0);
      expect(result.actualAmount).toBe(0);
      expect(result.varianceAmount).toBe(0);
      expect(result.variancePercent).toBe(0);
      expect(result.favorable).toBe(true);
      expect(result.details).toEqual([]);
    });

    it('should calculate favorable variance when actual < standard', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 8,
          receivedQty: 100,
          part: {
            partNumber: 'PART-001',
            costs: [{ standardCost: 10, unitCost: 10 }],
          },
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 6);

      expect(result.varianceType).toBe('MATERIAL_PRICE');
      expect(result.standardAmount).toBe(1000); // 10 * 100
      expect(result.actualAmount).toBe(800);    // 8 * 100
      expect(result.varianceAmount).toBe(200);  // 1000 - 800
      expect(result.favorable).toBe(true);
      expect(result.details.length).toBe(1);
      expect(result.details[0].reference).toBe('PART-001');
    });

    it('should calculate unfavorable variance when actual > standard', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 12,
          receivedQty: 50,
          part: {
            partNumber: 'PART-002',
            costs: [{ standardCost: 10, unitCost: 10 }],
          },
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 6);

      expect(result.standardAmount).toBe(500);
      expect(result.actualAmount).toBe(600);
      expect(result.varianceAmount).toBe(-100);
      expect(result.favorable).toBe(false);
    });

    it('should use unitCost as fallback when no standardCost', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 8,
          receivedQty: 10,
          part: {
            partNumber: 'PART-003',
            costs: [{ unitCost: 9 }],
          },
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 1);

      expect(result.standardAmount).toBe(90); // 9 * 10
      expect(result.actualAmount).toBe(80);   // 8 * 10
    });

    it('should handle parts with no costs', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 5,
          receivedQty: 10,
          part: {
            partNumber: 'PART-004',
            costs: [],
          },
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 3);

      // standardPrice = 0, actualPrice = 5, qty = 10
      expect(result.standardAmount).toBe(0);
      expect(result.actualAmount).toBe(50);
      expect(result.varianceAmount).toBe(-50);
    });

    it('should skip details when variance is negligible', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 10,
          receivedQty: 100,
          part: {
            partNumber: 'PART-005',
            costs: [{ standardCost: 10, unitCost: 10 }],
          },
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 6);

      expect(result.details.length).toBe(0);
    });

    it('should sort details by absolute variance descending', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 9,
          receivedQty: 10,
          part: { partNumber: 'SMALL', costs: [{ standardCost: 10 }] },
        },
        {
          unitPrice: 5,
          receivedQty: 100,
          part: { partNumber: 'BIG', costs: [{ standardCost: 10 }] },
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 6);

      expect(result.details[0].reference).toBe('BIG');
      expect(result.details[1].reference).toBe('SMALL');
    });

    it('should handle part with null partNumber', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([
        {
          unitPrice: 8,
          receivedQty: 10,
          part: null,
        },
      ]);

      const result = await calculateMaterialPriceVariance(2025, 6);

      // standardPrice = 0 (no part), so variance = 0 - 80 = -80
      expect(result.actualAmount).toBe(80);
      // detail reference should be 'Unknown'
      expect(result.details[0].reference).toBe('Unknown');
    });
  });

  // ==========================================================================
  // calculateMaterialUsageVariance
  // ==========================================================================
  describe('calculateMaterialUsageVariance', () => {
    it('should return zero variance when no work orders', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateMaterialUsageVariance(2025, 6);

      expect(result.varianceType).toBe('MATERIAL_USAGE');
      expect(result.varianceAmount).toBe(0);
      expect(result.details).toEqual([]);
    });

    it('should skip work orders without BOM', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          woNumber: 'WO-001',
          completedQty: 10,
          product: { name: 'Product A', bomHeaders: [] },
          allocations: [],
        },
      ]);

      const result = await calculateMaterialUsageVariance(2025, 6);

      expect(result.varianceAmount).toBe(0);
      expect(result.details).toEqual([]);
    });

    it('should calculate variance between standard and actual material usage', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          woNumber: 'WO-002',
          completedQty: 5,
          product: {
            name: 'Widget A',
            bomHeaders: [
              {
                status: 'active',
                bomLines: [
                  {
                    quantity: 2,
                    part: { costs: [{ standardCost: 10 }] },
                  },
                ],
              },
            ],
          },
          allocations: [
            {
              issuedQty: 12,
              returnedQty: 0,
              part: { costs: [{ standardCost: 10 }] },
            },
          ],
        },
      ]);

      const result = await calculateMaterialUsageVariance(2025, 6);

      // Standard: 2 * 5 * 10 = 100
      // Actual: (12 - 0) * 10 = 120
      // Variance: 100 - 120 = -20
      expect(result.standardAmount).toBe(100);
      expect(result.actualAmount).toBe(120);
      expect(result.varianceAmount).toBe(-20);
      expect(result.favorable).toBe(false);
      expect(result.details.length).toBe(1);
    });
  });

  // ==========================================================================
  // calculateLaborEfficiencyVariance
  // ==========================================================================
  describe('calculateLaborEfficiencyVariance', () => {
    it('should return zero variance when no work orders', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateLaborEfficiencyVariance(2025, 6);

      expect(result.varianceType).toBe('LABOR_EFFICIENCY');
      expect(result.varianceAmount).toBe(0);
    });

    it('should calculate variance using routing operations', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          woNumber: 'WO-003',
          completedQty: 10,
          product: {
            routings: [
              {
                status: 'active',
                operations: [
                  { setupTime: 60, runTimePerUnit: 6 }, // 1h setup + 1h run = 2h total
                ],
              },
            ],
          },
          operations: [
            {
              laborEntries: [
                { durationMinutes: 150 }, // 2.5 hours
              ],
            },
          ],
        },
      ]);

      const result = await calculateLaborEfficiencyVariance(2025, 6, 40);

      // Std hours: setupTime/60 + (runTimePerUnit * completedQty)/60 = 1 + (6*10)/60 = 1 + 1 = 2h
      // Actual hours: 150/60 = 2.5h
      // Std amount: 2 * 40 = 80
      // Actual amount: 2.5 * 40 = 100
      // Variance: 80 - 100 = -20
      expect(result.standardAmount).toBe(80);
      expect(result.actualAmount).toBe(100);
      expect(result.varianceAmount).toBe(-20);
      expect(result.favorable).toBe(false);
    });

    it('should use assemblyHours fallback when no routing', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([
        {
          woNumber: 'WO-004',
          completedQty: 5,
          product: {
            assemblyHours: 2,
            routings: [],
          },
          operations: [
            {
              laborEntries: [
                { durationMinutes: 480 }, // 8 hours
              ],
            },
          ],
        },
      ]);

      const result = await calculateLaborEfficiencyVariance(2025, 6, 35);

      // Std hours: 2 * 5 = 10h
      // Actual: 480/60 = 8h
      // Std amount: 10 * 35 = 350
      // Actual amount: 8 * 35 = 280
      // Variance: 350 - 280 = 70 (favorable)
      expect(result.standardAmount).toBe(350);
      expect(result.actualAmount).toBe(280);
      expect(result.varianceAmount).toBe(70);
      expect(result.favorable).toBe(true);
    });

    it('should use default standard rate of 35', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await calculateLaborEfficiencyVariance(2025, 6);

      // No work orders, so all zeros
      expect(result.varianceAmount).toBe(0);
    });
  });

  // ==========================================================================
  // calculateAllVariances
  // ==========================================================================
  describe('calculateAllVariances', () => {
    it('should return all three variance types', async () => {
      mockPrisma.purchaseOrderLine.findMany.mockResolvedValue([]);
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const results = await calculateAllVariances(2025, 6);

      expect(results.length).toBe(3);
      expect(results[0].varianceType).toBe('MATERIAL_PRICE');
      expect(results[1].varianceType).toBe('MATERIAL_USAGE');
      expect(results[2].varianceType).toBe('LABOR_EFFICIENCY');
    });
  });

  // ==========================================================================
  // saveVarianceResults
  // ==========================================================================
  describe('saveVarianceResults', () => {
    it('should save each variance to database', async () => {
      mockPrisma.costVariance.create.mockResolvedValue({});

      const variances = [
        {
          varianceType: 'MATERIAL_PRICE',
          standardAmount: 1000,
          actualAmount: 900,
          varianceAmount: 100,
          variancePercent: 10,
          favorable: true,
          details: [],
        },
        {
          varianceType: 'MATERIAL_USAGE',
          standardAmount: 500,
          actualAmount: 600,
          varianceAmount: -100,
          variancePercent: -20,
          favorable: false,
          details: [],
        },
      ];

      await saveVarianceResults(variances, 2025, 6);

      expect(mockPrisma.costVariance.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.costVariance.create).toHaveBeenCalledWith({
        data: {
          periodYear: 2025,
          periodMonth: 6,
          varianceType: 'MATERIAL_PRICE',
          standardAmount: 1000,
          actualAmount: 900,
          varianceAmount: 100,
          variancePercent: 10,
          favorableFlag: true,
        },
      });
    });

    it('should handle empty variances array', async () => {
      await saveVarianceResults([], 2025, 6);
      expect(mockPrisma.costVariance.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getVarianceSummary
  // ==========================================================================
  describe('getVarianceSummary', () => {
    it('should aggregate variance summary from database', async () => {
      mockPrisma.costVariance.findMany.mockResolvedValue([
        {
          varianceType: 'MATERIAL_PRICE',
          standardAmount: 1000,
          actualAmount: 900,
          varianceAmount: 100,
          variancePercent: 10,
          favorableFlag: true,
        },
        {
          varianceType: 'LABOR_EFFICIENCY',
          standardAmount: 500,
          actualAmount: 600,
          varianceAmount: -100,
          variancePercent: -20,
          favorableFlag: false,
        },
      ]);

      const result = await getVarianceSummary(2025, 6);

      expect(result.totalStandard).toBe(1500);
      expect(result.totalActual).toBe(1500);
      expect(result.totalVariance).toBe(0);
      expect(result.variances.length).toBe(2);
      expect(result.variances[0].type).toBe('MATERIAL_PRICE');
      expect(result.variances[0].favorable).toBe(true);
      expect(result.variances[1].type).toBe('LABOR_EFFICIENCY');
      expect(result.variances[1].favorable).toBe(false);
    });

    it('should return empty summary when no variances exist', async () => {
      mockPrisma.costVariance.findMany.mockResolvedValue([]);

      const result = await getVarianceSummary(2025, 6);

      expect(result.totalStandard).toBe(0);
      expect(result.totalActual).toBe(0);
      expect(result.totalVariance).toBe(0);
      expect(result.variances).toEqual([]);
    });
  });
});
