/**
 * Quality Metrics Unit Tests
 * Tests for quality metrics calculation and dashboard stats
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { getQualityMetrics, getQualityDashboardStats } from '../quality-metrics';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    inspection: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    nCR: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    cAPA: {
      count: vi.fn(),
    },
  },
}));

describe('Quality Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQualityMetrics', () => {
    it('should return 100% first pass yield when no inspections exist', async () => {
      (prisma.inspection.findMany as Mock).mockResolvedValue([]);
      (prisma.nCR.count as Mock).mockResolvedValue(0);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);
      (prisma.inspection.count as Mock).mockResolvedValue(0);
      (prisma.nCR.groupBy as Mock).mockResolvedValue([]);

      const result = await getQualityMetrics();

      expect(result.firstPassYield).toBe(100);
      expect(result.firstPassYieldTrend).toBe(0);
      expect(result.openNCRs).toBe(0);
      expect(result.openCAPAs).toBe(0);
      expect(result.pendingInspections).toBe(0);
      expect(result.defectsByCategory).toEqual([]);
      expect(result.inspectionTrend).toEqual([]);
      expect(result.supplierQuality).toEqual([]);
    });

    it('should calculate first pass yield correctly', async () => {
      const inspections = [
        { result: 'PASS', createdAt: new Date() },
        { result: 'PASS', createdAt: new Date() },
        { result: 'FAIL', createdAt: new Date() },
        { result: 'PASS', createdAt: new Date() },
      ];

      // First call: current period inspections
      // Second call: previous period inspections
      // Third call: allInspections for trend
      // Fourth call: supplier inspections
      (prisma.inspection.findMany as Mock)
        .mockResolvedValueOnce(inspections) // current period
        .mockResolvedValueOnce([]) // previous period
        .mockResolvedValueOnce(inspections) // all inspections for trend
        .mockResolvedValueOnce([]); // supplier inspections

      (prisma.nCR.count as Mock).mockResolvedValue(2);
      (prisma.cAPA.count as Mock).mockResolvedValue(1);
      (prisma.inspection.count as Mock).mockResolvedValue(3);
      (prisma.nCR.groupBy as Mock).mockResolvedValue([]);

      const result = await getQualityMetrics();

      // 3/4 = 75%
      expect(result.firstPassYield).toBe(75);
      expect(result.openNCRs).toBe(2);
      expect(result.openCAPAs).toBe(1);
      expect(result.pendingInspections).toBe(3);
    });

    it('should calculate first pass yield trend', async () => {
      const currentInspections = [
        { result: 'PASS', createdAt: new Date() },
        { result: 'PASS', createdAt: new Date() },
      ];
      const prevInspections = [
        { result: 'PASS', createdAt: new Date() },
        { result: 'FAIL', createdAt: new Date() },
      ];

      (prisma.inspection.findMany as Mock)
        .mockResolvedValueOnce(currentInspections) // current = 100%
        .mockResolvedValueOnce(prevInspections) // prev = 50%
        .mockResolvedValueOnce(currentInspections) // all inspections
        .mockResolvedValueOnce([]); // supplier

      (prisma.nCR.count as Mock).mockResolvedValue(0);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);
      (prisma.inspection.count as Mock).mockResolvedValue(0);
      (prisma.nCR.groupBy as Mock).mockResolvedValue([]);

      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date();
      const result = await getQualityMetrics(start, end);

      // 100% - 50% = 50%
      expect(result.firstPassYieldTrend).toBe(50);
    });

    it('should sort defects by category count descending', async () => {
      (prisma.inspection.findMany as Mock).mockResolvedValue([]);
      (prisma.nCR.count as Mock).mockResolvedValue(0);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);
      (prisma.inspection.count as Mock).mockResolvedValue(0);
      (prisma.nCR.groupBy as Mock).mockResolvedValue([
        { defectCategory: 'Dimensional', _count: 5 },
        { defectCategory: 'Visual', _count: 10 },
        { defectCategory: null, _count: 2 },
      ]);

      const result = await getQualityMetrics();

      expect(result.defectsByCategory).toEqual([
        { category: 'Visual', count: 10 },
        { category: 'Dimensional', count: 5 },
        { category: 'Unknown', count: 2 },
      ]);
    });

    it('should group inspection trend by week', async () => {
      // Create inspections on different days
      const monday = new Date('2026-03-02T12:00:00Z'); // a Monday
      const tuesday = new Date('2026-03-03T12:00:00Z');

      const inspections = [
        { result: 'PASS', createdAt: monday },
        { result: 'FAIL', createdAt: tuesday },
      ];

      (prisma.inspection.findMany as Mock)
        .mockResolvedValueOnce([]) // current period
        .mockResolvedValueOnce([]) // previous period
        .mockResolvedValueOnce(inspections) // all inspections for trend
        .mockResolvedValueOnce([]); // supplier

      (prisma.nCR.count as Mock).mockResolvedValue(0);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);
      (prisma.inspection.count as Mock).mockResolvedValue(0);
      (prisma.nCR.groupBy as Mock).mockResolvedValue([]);

      const result = await getQualityMetrics();

      expect(result.inspectionTrend.length).toBeGreaterThan(0);
      // Both are in the same week, so should have 1 entry with pass=1, fail=1
      const weekEntry = result.inspectionTrend[0];
      expect(weekEntry.pass).toBe(1);
      expect(weekEntry.fail).toBe(1);
    });

    it('should accept custom date range', async () => {
      (prisma.inspection.findMany as Mock).mockResolvedValue([]);
      (prisma.nCR.count as Mock).mockResolvedValue(0);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);
      (prisma.inspection.count as Mock).mockResolvedValue(0);
      (prisma.nCR.groupBy as Mock).mockResolvedValue([]);

      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');

      await getQualityMetrics(start, end);

      expect(prisma.inspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: start, lte: end },
          }),
        })
      );
    });
  });

  describe('getQualityDashboardStats', () => {
    it('should return all dashboard stats', async () => {
      (prisma.inspection.count as Mock)
        .mockResolvedValueOnce(5)  // pendingReceiving
        .mockResolvedValueOnce(3)  // pendingInProcess
        .mockResolvedValueOnce(2); // pendingFinal

      (prisma.nCR.count as Mock).mockResolvedValue(4);
      (prisma.cAPA.count as Mock).mockResolvedValue(1);

      const recentInspections = [
        { result: 'PASS' },
        { result: 'PASS' },
        { result: 'FAIL' },
        { result: 'PASS' },
      ];
      (prisma.inspection.findMany as Mock).mockResolvedValue(recentInspections);

      const result = await getQualityDashboardStats();

      expect(result.pendingReceiving).toBe(5);
      expect(result.pendingInProcess).toBe(3);
      expect(result.pendingFinal).toBe(2);
      expect(result.totalPending).toBe(10);
      expect(result.openNCRs).toBe(4);
      expect(result.openCAPAs).toBe(1);
      expect(result.firstPassYield).toBe(75);
    });

    it('should return 100% yield when no recent inspections', async () => {
      (prisma.inspection.count as Mock).mockResolvedValue(0);
      (prisma.nCR.count as Mock).mockResolvedValue(0);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);
      (prisma.inspection.findMany as Mock).mockResolvedValue([]);

      const result = await getQualityDashboardStats();

      expect(result.firstPassYield).toBe(100);
      expect(result.totalPending).toBe(0);
    });
  });
});
