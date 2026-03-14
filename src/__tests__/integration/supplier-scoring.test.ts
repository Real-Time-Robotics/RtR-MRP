/**
 * Supplier Scoring Engine Integration Tests
 * Tests KPI calculations: Delivery, Quality, Price, Response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateSupplierScore } from '@/lib/suppliers/scoring-engine';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseOrder: {
      findMany: vi.fn(),
    },
    purchaseOrderLine: {
      aggregate: vi.fn(),
    },
  },
}));

const periodStart = new Date('2026-01-01');
const periodEnd = new Date('2026-03-31');

describe('Supplier Scoring Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // No data
  // =========================================================================
  it('should return zero scores when no POs exist', async () => {
    (prisma.purchaseOrder.findMany as any).mockResolvedValue([]);

    const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

    expect(result.overallScore).toBe(0);
    expect(result.deliveryScore).toBe(0);
    expect(result.qualityScore).toBe(0);
    expect(result.priceScore).toBe(0);
    expect(result.responseScore).toBe(0);
    expect(result.stats.totalOrders).toBe(0);
  });

  // =========================================================================
  // Delivery KPI
  // =========================================================================
  describe('Delivery Score', () => {
    it('should score 100% when all deliveries on time', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'), // Before expected
              items: [{ quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }],
            },
          ],
          lines: [],
        },
        {
          id: 'po-2',
          expectedDate: new Date('2026-03-01'),
          createdAt: new Date('2026-02-01'),
          grns: [
            {
              receivedDate: new Date('2026-03-01'), // On expected date
              items: [{ quantityReceived: 5, quantityAccepted: 5, quantityRejected: 0 }],
            },
          ],
          lines: [],
        },
      ]);

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      expect(result.deliveryScore).toBe(100);
      expect(result.stats.onTimeOrders).toBe(2);
      expect(result.stats.lateOrders).toBe(0);
    });

    it('should score 50% when half deliveries late', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'),
              items: [{ quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }],
            },
          ],
          lines: [],
        },
        {
          id: 'po-2',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-20'), // Late
              items: [{ quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }],
            },
          ],
          lines: [],
        },
      ]);

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      expect(result.deliveryScore).toBe(50);
      expect(result.stats.onTimeOrders).toBe(1);
      expect(result.stats.lateOrders).toBe(1);
    });
  });

  // =========================================================================
  // Quality KPI
  // =========================================================================
  describe('Quality Score', () => {
    it('should calculate quality from accepted/received ratio', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'),
              items: [
                { quantityReceived: 100, quantityAccepted: 95, quantityRejected: 5 },
              ],
            },
          ],
          lines: [],
        },
      ]);

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      expect(result.qualityScore).toBe(95);
      expect(result.stats.totalItems).toBe(100);
      expect(result.stats.acceptedItems).toBe(95);
      expect(result.stats.rejectedItems).toBe(5);
    });

    it('should aggregate across multiple GRNs', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'),
              items: [
                { quantityReceived: 50, quantityAccepted: 50, quantityRejected: 0 },
              ],
            },
            {
              receivedDate: new Date('2026-02-12'),
              items: [
                { quantityReceived: 50, quantityAccepted: 40, quantityRejected: 10 },
              ],
            },
          ],
          lines: [],
        },
      ]);

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      // 90/100 = 90%
      expect(result.qualityScore).toBe(90);
      expect(result.stats.totalItems).toBe(100);
      expect(result.stats.acceptedItems).toBe(90);
      expect(result.stats.rejectedItems).toBe(10);
    });
  });

  // =========================================================================
  // Price KPI
  // =========================================================================
  describe('Price Score', () => {
    it('should score 100 when at market average', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'),
              items: [{ quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }],
            },
          ],
          lines: [
            { partId: 'part-1', unitPrice: 100 },
          ],
        },
      ]);

      // Benchmark = same price
      (prisma.purchaseOrderLine.aggregate as any).mockResolvedValue({
        _avg: { unitPrice: 100 },
      });

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      expect(result.priceScore).toBe(100);
      expect(result.stats.avgPriceVariance).toBe(0);
    });

    it('should score higher when cheaper than average', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'),
              items: [{ quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }],
            },
          ],
          lines: [
            { partId: 'part-1', unitPrice: 90 }, // 10% cheaper
          ],
        },
      ]);

      (prisma.purchaseOrderLine.aggregate as any).mockResolvedValue({
        _avg: { unitPrice: 100 },
      });

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      // -10% variance → score = 100 - (-10) = 110, capped at 100
      expect(result.priceScore).toBe(100);
    });

    it('should score lower when more expensive than average', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-01-15'),
          grns: [
            {
              receivedDate: new Date('2026-02-10'),
              items: [{ quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }],
            },
          ],
          lines: [
            { partId: 'part-1', unitPrice: 120 }, // 20% more expensive
          ],
        },
      ]);

      (prisma.purchaseOrderLine.aggregate as any).mockResolvedValue({
        _avg: { unitPrice: 100 },
      });

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      // +20% variance → score = 100 - 20 = 80
      expect(result.priceScore).toBe(80);
    });
  });

  // =========================================================================
  // Overall Score (weighted)
  // =========================================================================
  describe('Overall Score', () => {
    it('should calculate weighted average: D30% Q30% P25% R15%', async () => {
      (prisma.purchaseOrder.findMany as any).mockResolvedValue([
        {
          id: 'po-1',
          expectedDate: new Date('2026-02-15'),
          createdAt: new Date('2026-02-08'), // 7 day lead time → response = 100
          grns: [
            {
              receivedDate: new Date('2026-02-14'), // On time → delivery = 100
              items: [
                { quantityReceived: 100, quantityAccepted: 80, quantityRejected: 20 }, // quality = 80
              ],
            },
          ],
          lines: [
            { partId: 'part-1', unitPrice: 100 },
          ],
        },
      ]);

      // Price at market average → price = 100
      (prisma.purchaseOrderLine.aggregate as any).mockResolvedValue({
        _avg: { unitPrice: 100 },
      });

      const result = await calculateSupplierScore('sup-1', periodStart, periodEnd);

      // D=100*0.30 + Q=80*0.30 + P=100*0.25 + R=100*0.15
      // = 30 + 24 + 25 + 15 = 94
      expect(result.deliveryScore).toBe(100);
      expect(result.qualityScore).toBe(80);
      expect(result.priceScore).toBe(100);
      expect(result.responseScore).toBe(100); // 7 day lead = 100
      expect(result.overallScore).toBe(94);
    });
  });
});
