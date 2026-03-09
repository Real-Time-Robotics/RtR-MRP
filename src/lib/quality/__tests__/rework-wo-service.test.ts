/**
 * Rework WO Service Unit Tests
 * Tests for rework work order creation, completion, and pending rework queries
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  createReworkWorkOrder,
  completeReworkWO,
  getPendingReworkNCRs,
} from '../rework-wo-service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    nCR: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    nCRHistory: {
      create: vi.fn(),
    },
    workOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Rework WO Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReworkWorkOrder', () => {
    it('should return error when NCR not found', async () => {
      (prisma.nCR.findUnique as Mock).mockResolvedValue(null);

      const result = await createReworkWorkOrder({
        ncrId: 'nonexistent',
        reworkInstructions: 'Fix it',
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('NCR not found');
    });

    it('should return error when NCR disposition is not REWORK', async () => {
      (prisma.nCR.findUnique as Mock).mockResolvedValue({
        id: 'ncr-1',
        disposition: 'SCRAP',
        ncrNumber: 'NCR-2026-0001',
      });

      const result = await createReworkWorkOrder({
        ncrId: 'ncr-1',
        reworkInstructions: 'Fix it',
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('NCR disposition must be REWORK');
    });

    it('should return error when rework WO already created', async () => {
      (prisma.nCR.findUnique as Mock).mockResolvedValue({
        id: 'ncr-1',
        disposition: 'REWORK',
        reworkWorkOrderId: 'wo-existing',
        ncrNumber: 'NCR-2026-0001',
      });

      const result = await createReworkWorkOrder({
        ncrId: 'ncr-1',
        reworkInstructions: 'Fix it',
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rework WO already created for this NCR');
      expect(result.reworkWOId).toBe('wo-existing');
    });

    it('should return error when rework quantity is <= 0', async () => {
      (prisma.nCR.findUnique as Mock).mockResolvedValue({
        id: 'ncr-1',
        disposition: 'REWORK',
        reworkWorkOrderId: null,
        quantityAffected: 0,
        ncrNumber: 'NCR-2026-0001',
        workOrder: null,
        part: null,
        productId: null,
      });

      const result = await createReworkWorkOrder({
        ncrId: 'ncr-1',
        reworkInstructions: 'Fix it',
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rework quantity must be > 0');
    });

    it('should return error when no product linked to NCR', async () => {
      (prisma.nCR.findUnique as Mock).mockResolvedValue({
        id: 'ncr-1',
        disposition: 'REWORK',
        reworkWorkOrderId: null,
        quantityAffected: 10,
        ncrNumber: 'NCR-2026-0001',
        workOrder: null,
        part: null,
        productId: null,
      });

      const result = await createReworkWorkOrder({
        ncrId: 'ncr-1',
        reworkInstructions: 'Fix it',
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No product linked to NCR — cannot create rework WO');
    });

    it('should create rework WO successfully with linked work order', async () => {
      const mockNCR = {
        id: 'ncr-1',
        disposition: 'REWORK',
        reworkWorkOrderId: null,
        quantityAffected: 10,
        ncrNumber: 'NCR-2026-0001',
        status: 'disposition_approved',
        priority: 'high',
        productId: 'prod-1',
        workOrder: {
          id: 'wo-1',
          woNumber: 'WO-001',
          product: {
            id: 'prod-1',
            bomHeaders: [],
          },
        },
        part: { id: 'part-1' },
      };

      const mockCreatedWO = {
        id: 'rework-wo-1',
        woNumber: 'RW-NCR-2026-0001',
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);
      (prisma.$transaction as Mock).mockResolvedValue(mockCreatedWO);

      const result = await createReworkWorkOrder({
        ncrId: 'ncr-1',
        reworkInstructions: 'Regrind and re-inspect',
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.reworkWOId).toBe('rework-wo-1');
      expect(result.reworkWONumber).toBe('RW-NCR-2026-0001');
      expect(result.originalWOId).toBe('wo-1');
      expect(result.quantity).toBe(10);
    });

    it('should use custom quantity when provided', async () => {
      const mockNCR = {
        id: 'ncr-1',
        disposition: 'REWORK',
        reworkWorkOrderId: null,
        quantityAffected: 10,
        ncrNumber: 'NCR-2026-0001',
        status: 'disposition_approved',
        priority: 'medium',
        productId: 'prod-1',
        workOrder: {
          id: 'wo-1',
          woNumber: 'WO-001',
          product: { id: 'prod-1', bomHeaders: [] },
        },
        part: null,
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);
      (prisma.$transaction as Mock).mockResolvedValue({
        id: 'rework-wo-2',
        woNumber: 'RW-NCR-2026-0001',
      });

      const result = await createReworkWorkOrder({
        ncrId: 'ncr-1',
        reworkInstructions: 'Partial rework',
        quantity: 5,
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.quantity).toBe(5);
    });
  });

  describe('completeReworkWO', () => {
    it('should return error when no NCR linked to work order', async () => {
      (prisma.nCR.findFirst as Mock).mockResolvedValue(null);

      const result = await completeReworkWO('wo-1', 10, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No NCR linked to this rework WO');
    });

    it('should return error when work order not found', async () => {
      (prisma.nCR.findFirst as Mock).mockResolvedValue({
        id: 'ncr-1',
        quantityAffected: 10,
      });
      (prisma.workOrder.findUnique as Mock).mockResolvedValue(null);

      const result = await completeReworkWO('wo-1', 10, 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Work order not found');
    });

    it('should complete rework WO successfully', async () => {
      (prisma.nCR.findFirst as Mock).mockResolvedValue({
        id: 'ncr-1',
        ncrNumber: 'NCR-2026-0001',
        quantityAffected: 10,
        lotNumber: 'LOT-001',
        partId: 'part-1',
      });
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({
        id: 'wo-1',
        woNumber: 'RW-NCR-2026-0001',
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await completeReworkWO('wo-1', 8, 'user-1', 'Rework complete');

      expect(result.success).toBe(true);
      expect(result.ncrId).toBe('ncr-1');
      expect(result.passedQty).toBe(8);
      expect(result.failedQty).toBe(2);
    });

    it('should handle zero failed quantity', async () => {
      (prisma.nCR.findFirst as Mock).mockResolvedValue({
        id: 'ncr-1',
        quantityAffected: 10,
        lotNumber: null,
        partId: 'part-1',
      });
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ id: 'wo-1' });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await completeReworkWO('wo-1', 10, 'user-1');

      expect(result.success).toBe(true);
      expect(result.failedQty).toBe(0);
    });

    it('should clamp failed qty to 0 when completed exceeds affected', async () => {
      (prisma.nCR.findFirst as Mock).mockResolvedValue({
        id: 'ncr-1',
        quantityAffected: 10,
        lotNumber: null,
        partId: 'part-1',
      });
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ id: 'wo-1' });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await completeReworkWO('wo-1', 12, 'user-1');

      expect(result.success).toBe(true);
      expect(result.failedQty).toBe(0); // Math.max(0, -2) = 0
    });
  });

  describe('getPendingReworkNCRs', () => {
    it('should return mapped list of pending rework NCRs', async () => {
      const mockNCRs = [
        {
          id: 'ncr-1',
          ncrNumber: 'NCR-2026-0001',
          quantityAffected: 10,
          priority: 'high',
          part: { partNumber: 'P-001' },
          workOrder: {
            woNumber: 'WO-001',
            product: { name: 'Widget A' },
          },
        },
        {
          id: 'ncr-2',
          ncrNumber: 'NCR-2026-0002',
          quantityAffected: 5,
          priority: 'medium',
          part: null,
          workOrder: null,
        },
      ];

      (prisma.nCR.findMany as Mock).mockResolvedValue(mockNCRs);

      const result = await getPendingReworkNCRs();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ncrId: 'ncr-1',
        ncrNumber: 'NCR-2026-0001',
        partNumber: 'P-001',
        productName: 'Widget A',
        quantityAffected: 10,
        originalWONumber: 'WO-001',
        priority: 'high',
      });
      expect(result[1]).toEqual({
        ncrId: 'ncr-2',
        ncrNumber: 'NCR-2026-0002',
        partNumber: null,
        productName: null,
        quantityAffected: 5,
        originalWONumber: null,
        priority: 'medium',
      });
    });

    it('should query with correct filters', async () => {
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);

      await getPendingReworkNCRs();

      expect(prisma.nCR.findMany).toHaveBeenCalledWith({
        where: {
          disposition: 'REWORK',
          reworkWorkOrderId: null,
          status: { in: ['disposition_approved', 'pending_disposition'] },
        },
        include: {
          part: { select: { partNumber: true } },
          workOrder: { select: { woNumber: true, product: { select: { name: true } } } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
    });
  });
});
