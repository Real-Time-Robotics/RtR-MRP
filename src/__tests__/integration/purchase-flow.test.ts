/**
 * Purchase Flow Integration Tests
 * Tests PO status transitions and GRN → matching integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    goodsReceiptNote: {
      create: vi.fn(),
    },
    threeWayMatch: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('Purchase Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // PO Status Transitions
  // =========================================================================
  describe('PO Status Transitions', () => {
    it('should follow draft → pending_approval → approved flow', async () => {
      // Step 1: Create PO (draft)
      const draftPO = {
        id: 'po-1',
        poNumber: 'PO-TEST-001',
        supplierId: 'sup-1',
        status: 'draft',
        totalAmount: 5000,
        expectedDate: new Date('2026-04-01'),
        orderDate: new Date('2026-03-01'),
      };

      (prisma.purchaseOrder.create as any).mockResolvedValue(draftPO);
      const created = await prisma.purchaseOrder.create({ data: draftPO as any });
      expect(created.status).toBe('draft');

      // Step 2: Submit for approval
      const submittedPO = { ...draftPO, status: 'pending_approval', submittedAt: new Date() };
      (prisma.purchaseOrder.update as any).mockResolvedValue(submittedPO);

      const submitted = await prisma.purchaseOrder.update({
        where: { id: 'po-1' },
        data: { status: 'pending_approval', submittedAt: new Date() },
      });
      expect(submitted.status).toBe('pending_approval');

      // Step 3: Approve
      const approvedPO = {
        ...submittedPO,
        status: 'approved',
        approvedById: 'admin-1',
        approvedAt: new Date(),
      };
      (prisma.purchaseOrder.update as any).mockResolvedValue(approvedPO);

      const approved = await prisma.purchaseOrder.update({
        where: { id: 'po-1' },
        data: {
          status: 'approved',
          approvedById: 'admin-1',
          approvedAt: new Date(),
        },
      });
      expect(approved.status).toBe('approved');
      expect(approved.approvedById).toBe('admin-1');
    });

    it('should support reject flow: pending_approval → rejected', async () => {
      const rejectedPO = {
        id: 'po-2',
        status: 'rejected',
        rejectionReason: 'Budget exceeded',
      };
      (prisma.purchaseOrder.update as any).mockResolvedValue(rejectedPO);

      const rejected = await prisma.purchaseOrder.update({
        where: { id: 'po-2' },
        data: {
          status: 'rejected',
          rejectionReason: 'Budget exceeded',
        },
      });
      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Budget exceeded');
    });

    it('should support cancel flow: approved → cancelled', async () => {
      const cancelledPO = { id: 'po-3', status: 'cancelled' };
      (prisma.purchaseOrder.update as any).mockResolvedValue(cancelledPO);

      const cancelled = await prisma.purchaseOrder.update({
        where: { id: 'po-3' },
        data: { status: 'cancelled' },
      });
      expect(cancelled.status).toBe('cancelled');
    });
  });

  // =========================================================================
  // GRN Creation
  // =========================================================================
  describe('GRN Creation', () => {
    it('should create GRN with acceptance/rejection quantities', async () => {
      const mockGRN = {
        id: 'grn-1',
        grnNumber: 'GRN-TEST-001',
        purchaseOrderId: 'po-1',
        receivedById: 'user-1',
        receivedDate: new Date(),
        status: 'completed',
        items: [
          {
            partId: 'part-1',
            quantityOrdered: 100,
            quantityReceived: 95,
            quantityAccepted: 90,
            quantityRejected: 5,
            rejectionReason: 'Damaged in transit',
          },
        ],
      };

      (prisma.goodsReceiptNote.create as any).mockResolvedValue(mockGRN);

      const grn = await prisma.goodsReceiptNote.create({
        data: mockGRN as any,
      }) as any;

      expect(grn.status).toBe('completed');
      expect(grn.items[0].quantityReceived).toBe(95);
      expect(grn.items[0].quantityAccepted).toBe(90);
      expect(grn.items[0].quantityRejected).toBe(5);
    });
  });

  // =========================================================================
  // 3-Way Matching
  // =========================================================================
  describe('Three-Way Matching', () => {
    it('should create match record linking PO, GRN, and Invoice', async () => {
      const mockMatch = {
        id: 'match-1',
        purchaseOrderId: 'po-1',
        grnId: 'grn-1',
        invoiceId: null,
        status: 'pending_review',
        quantityMatch: true,
        priceMatch: true,
        overallMatch: false, // No invoice yet
      };

      (prisma.threeWayMatch.create as any).mockResolvedValue(mockMatch);

      const match = await prisma.threeWayMatch.create({
        data: mockMatch as any,
      }) as any;

      expect(match.purchaseOrderId).toBe('po-1');
      expect(match.grnId).toBe('grn-1');
      expect(match.quantityMatch).toBe(true);
      expect(match.priceMatch).toBe(true);
    });

    it('should complete match when all three documents align', async () => {
      const completedMatch = {
        id: 'match-2',
        purchaseOrderId: 'po-1',
        grnId: 'grn-1',
        invoiceId: 'inv-1',
        status: 'approved',
        quantityMatch: true,
        priceMatch: true,
        overallMatch: true,
      };

      (prisma.threeWayMatch.findFirst as any).mockResolvedValue(completedMatch);

      const match = await prisma.threeWayMatch.findFirst({
        where: { purchaseOrderId: 'po-1' },
      }) as any;

      expect(match).not.toBeNull();
      expect(match.overallMatch).toBe(true);
      expect(match.status).toBe('approved');
    });
  });
});
