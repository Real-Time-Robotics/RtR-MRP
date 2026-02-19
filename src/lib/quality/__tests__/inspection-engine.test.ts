/**
 * Inspection Engine Unit Tests
 * Tests for inspection number generation, result calculation, and measurement statistics
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  generateInspectionNumber,
  generateInspectionPlanNumber,
  calculateInspectionResult,
  completeInspection,
  isWithinSpec,
  calculateMeasurementStats,
} from '../inspection-engine';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    inspection: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    inspectionPlan: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
  },
}));

describe('Inspection Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateInspectionNumber', () => {
    it('should generate receiving inspection number with RI prefix', async () => {
      const year = new Date().getFullYear();
      (prisma.inspection.findFirst as Mock).mockResolvedValue({ inspectionNumber: `RI-${year}-0010` });

      const number = await generateInspectionNumber('RECEIVING');

      expect(number).toBe(`RI-${year}-0011`);
    });

    it('should generate in-process inspection number with IP prefix', async () => {
      const year = new Date().getFullYear();
      (prisma.inspection.findFirst as Mock).mockResolvedValue({ inspectionNumber: `IP-${year}-0005` });

      const number = await generateInspectionNumber('IN_PROCESS');

      expect(number).toBe(`IP-${year}-0006`);
    });

    it('should generate final inspection number with FI prefix', async () => {
      const year = new Date().getFullYear();
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);

      const number = await generateInspectionNumber('FINAL');

      expect(number).toBe(`FI-${year}-0001`);
    });

    it('should handle unknown type with FI prefix', async () => {
      const year = new Date().getFullYear();
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);

      const number = await generateInspectionNumber('UNKNOWN');

      expect(number).toBe(`FI-${year}-0001`);
    });
  });

  describe('generateInspectionPlanNumber', () => {
    it('should generate inspection plan number', async () => {
      (prisma.inspectionPlan.findFirst as Mock).mockResolvedValue({ planNumber: 'IP-010' });

      const number = await generateInspectionPlanNumber();

      expect(number).toBe('IP-011');
    });

    it('should generate first plan number', async () => {
      (prisma.inspectionPlan.findFirst as Mock).mockResolvedValue(null);

      const number = await generateInspectionPlanNumber();

      expect(number).toBe('IP-001');
    });
  });

  describe('calculateInspectionResult', () => {
    it('should return PENDING when inspection has no plan', async () => {
      (prisma.inspection.findUnique as Mock).mockResolvedValue(null);

      const result = await calculateInspectionResult('insp-1');

      expect(result).toEqual({
        totalCharacteristics: 0,
        passCount: 0,
        failCount: 0,
        pendingCount: 0,
        overallResult: 'PENDING',
        criticalFailures: 0,
      });
    });

    it('should return PASS when all characteristics pass', async () => {
      const mockInspection = {
        id: 'insp-1',
        plan: {
          characteristics: [
            { id: 'char-1', name: 'Dimension A' },
            { id: 'char-2', name: 'Dimension B' },
          ],
        },
        results: [
          { result: 'PASS', characteristic: { isCritical: false } },
          { result: 'PASS', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const result = await calculateInspectionResult('insp-1');

      expect(result.overallResult).toBe('PASS');
      expect(result.passCount).toBe(2);
      expect(result.failCount).toBe(0);
      expect(result.pendingCount).toBe(0);
    });

    it('should return FAIL when any critical characteristic fails', async () => {
      const mockInspection = {
        id: 'insp-1',
        plan: {
          characteristics: [
            { id: 'char-1', name: 'Critical Dimension' },
            { id: 'char-2', name: 'Non-critical' },
          ],
        },
        results: [
          { result: 'FAIL', characteristic: { isCritical: true } },
          { result: 'PASS', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const result = await calculateInspectionResult('insp-1');

      expect(result.overallResult).toBe('FAIL');
      expect(result.criticalFailures).toBe(1);
    });

    it('should return CONDITIONAL when non-critical characteristics fail', async () => {
      const mockInspection = {
        id: 'insp-1',
        plan: {
          characteristics: [
            { id: 'char-1', name: 'Non-critical A' },
            { id: 'char-2', name: 'Non-critical B' },
          ],
        },
        results: [
          { result: 'FAIL', characteristic: { isCritical: false } },
          { result: 'PASS', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const result = await calculateInspectionResult('insp-1');

      expect(result.overallResult).toBe('CONDITIONAL');
      expect(result.failCount).toBe(1);
      expect(result.criticalFailures).toBe(0);
    });

    it('should return PENDING when some characteristics are not inspected', async () => {
      const mockInspection = {
        id: 'insp-1',
        plan: {
          characteristics: [
            { id: 'char-1', name: 'Dimension A' },
            { id: 'char-2', name: 'Dimension B' },
            { id: 'char-3', name: 'Dimension C' },
          ],
        },
        results: [
          { result: 'PASS', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const result = await calculateInspectionResult('insp-1');

      expect(result.overallResult).toBe('PENDING');
      expect(result.pendingCount).toBe(2);
    });

    it('should count N/A as pass', async () => {
      const mockInspection = {
        id: 'insp-1',
        plan: {
          characteristics: [
            { id: 'char-1', name: 'Optional Check' },
          ],
        },
        results: [
          { result: 'N/A', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const result = await calculateInspectionResult('insp-1');

      expect(result.overallResult).toBe('PASS');
      expect(result.passCount).toBe(1);
    });
  });

  describe('completeInspection', () => {
    it('should fail if characteristics are still pending', async () => {
      const mockInspection = {
        id: 'insp-1',
        plan: {
          characteristics: [{ id: 'char-1' }],
        },
        results: [],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const result = await completeInspection('insp-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('1 characteristics still pending');
    });

    it('should complete inspection and update status', async () => {
      const mockInspection = {
        id: 'insp-1',
        inspectionNumber: 'RI-2025-0001',
        lotNumber: null,
        partId: 'part-1',
        productId: null,
        quantityInspected: 100,
        plan: {
          characteristics: [{ id: 'char-1' }],
        },
        results: [
          { result: 'PASS', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock)
        .mockResolvedValueOnce(mockInspection)
        .mockResolvedValueOnce({ ...mockInspection, status: 'completed' });
      (prisma.inspection.update as Mock).mockResolvedValue({});

      const result = await completeInspection('insp-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.result).toBe('PASS');
      expect(prisma.inspection.update).toHaveBeenCalledWith({
        where: { id: 'insp-1' },
        data: expect.objectContaining({
          status: 'completed',
          result: 'PASS',
          inspectedAt: expect.any(Date),
        }),
      });
    });

    it('should create lot transaction when lot number exists', async () => {
      const mockInspection = {
        id: 'insp-1',
        inspectionNumber: 'RI-2025-0001',
        lotNumber: 'LOT-001',
        partId: 'part-1',
        productId: null,
        quantityInspected: 100,
        plan: {
          characteristics: [{ id: 'char-1' }],
        },
        results: [
          { result: 'PASS', characteristic: { isCritical: false } },
        ],
      };

      (prisma.inspection.findUnique as Mock)
        .mockResolvedValueOnce(mockInspection)
        .mockResolvedValueOnce(mockInspection);
      (prisma.inspection.update as Mock).mockResolvedValue({});
      (prisma.lotTransaction.create as Mock).mockResolvedValue({});

      await completeInspection('insp-1', 'user-1');

      expect(prisma.lotTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          lotNumber: 'LOT-001',
          transactionType: 'INSPECTED',
          partId: 'part-1',
          quantity: 100,
          inspectionId: 'insp-1',
        }),
      });
    });
  });

  describe('isWithinSpec', () => {
    it('should return true when value is within limits', () => {
      expect(isWithinSpec(10, 10, 12, 8)).toBe(true);
      expect(isWithinSpec(8, 10, 12, 8)).toBe(true);
      expect(isWithinSpec(12, 10, 12, 8)).toBe(true);
    });

    it('should return false when value exceeds upper limit', () => {
      expect(isWithinSpec(13, 10, 12, 8)).toBe(false);
      expect(isWithinSpec(12.1, 10, 12, 8)).toBe(false);
    });

    it('should return false when value is below lower limit', () => {
      expect(isWithinSpec(7, 10, 12, 8)).toBe(false);
      expect(isWithinSpec(7.9, 10, 12, 8)).toBe(false);
    });

    it('should handle null upper limit', () => {
      expect(isWithinSpec(100, 10, null, 8)).toBe(true);
      expect(isWithinSpec(7, 10, null, 8)).toBe(false);
    });

    it('should handle null lower limit', () => {
      expect(isWithinSpec(-100, 10, 12, null)).toBe(true);
      expect(isWithinSpec(13, 10, 12, null)).toBe(false);
    });

    it('should handle both limits null', () => {
      expect(isWithinSpec(1000, 10, null, null)).toBe(true);
      expect(isWithinSpec(-1000, 10, null, null)).toBe(true);
    });

    it('should handle null nominal', () => {
      expect(isWithinSpec(10, null, 12, 8)).toBe(true);
    });
  });

  describe('calculateMeasurementStats', () => {
    it('should calculate statistics correctly', () => {
      const values = [10, 12, 14, 16, 18];
      const stats = calculateMeasurementStats(values);

      expect(stats).not.toBeNull();
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(18);
      expect(stats!.avg).toBe(14);
      expect(stats!.range).toBe(8);
      expect(stats!.count).toBe(5);
    });

    it('should return null for empty array', () => {
      const stats = calculateMeasurementStats([]);
      expect(stats).toBeNull();
    });

    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const stats = calculateMeasurementStats(values);

      // Mean = 5, variance = 4, stdDev = 2
      expect(stats!.avg).toBe(5);
      expect(stats!.stdDev).toBe(2);
    });

    it('should handle single value', () => {
      const stats = calculateMeasurementStats([42]);

      expect(stats!.min).toBe(42);
      expect(stats!.max).toBe(42);
      expect(stats!.avg).toBe(42);
      expect(stats!.range).toBe(0);
      expect(stats!.stdDev).toBe(0);
      expect(stats!.count).toBe(1);
    });

    it('should handle negative values', () => {
      const values = [-5, -3, 0, 3, 5];
      const stats = calculateMeasurementStats(values);

      expect(stats!.min).toBe(-5);
      expect(stats!.max).toBe(5);
      expect(stats!.avg).toBe(0);
      expect(stats!.range).toBe(10);
    });

    it('should handle decimal values', () => {
      const values = [1.5, 2.5, 3.5];
      const stats = calculateMeasurementStats(values);

      expect(stats!.min).toBe(1.5);
      expect(stats!.max).toBe(3.5);
      expect(stats!.avg).toBe(2.5);
    });
  });
});
