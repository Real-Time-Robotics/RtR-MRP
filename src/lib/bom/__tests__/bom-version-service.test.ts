/**
 * BOM Version Service Unit Tests
 * Tests for BOM approval workflow: submit, approve, reject, create version, history
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    bomHeader: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import {
  submitBomForApproval,
  approveBom,
  rejectBom,
  createNewBomVersion,
  getBomVersionHistory,
  getEffectiveBom,
} from '../bom-version-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBom(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bom-1',
    productId: 'prod-1',
    version: '1.0',
    status: 'draft',
    effectiveDate: new Date('2024-01-01'),
    expiryDate: null,
    notes: '',
    product: { name: 'Widget A' },
    bomLines: [
      {
        id: 'line-1',
        lineNumber: 1,
        partId: 'part-1',
        quantity: 5,
        unit: 'pcs',
        level: 1,
        scrapRate: 0,
        isCritical: false,
        position: 'A1',
        findNumber: null,
        referenceDesignator: null,
        bomType: 'standard',
        part: { unitCost: 10 },
      },
    ],
    ...overrides,
  };
}

describe('BOM Version Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // submitBomForApproval
  // =========================================================================
  describe('submitBomForApproval', () => {
    it('should return error when BOM not found', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(null);

      const result = await submitBomForApproval('bom-missing', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('BOM not found');
    });

    it('should reject submission when BOM is not in draft status', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(
        makeBom({ status: 'active' })
      );

      const result = await submitBomForApproval('bom-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('must be in draft status');
      expect(result.previousStatus).toBe('active');
      expect(result.newStatus).toBe('active');
    });

    it('should reject submission when BOM has no lines', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(
        makeBom({ bomLines: [] })
      );

      const result = await submitBomForApproval('bom-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('at least one line');
    });

    it('should successfully submit a valid draft BOM', async () => {
      const bom = makeBom();
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);
      mockPrisma.bomHeader.update.mockResolvedValue({
        ...bom,
        status: 'pending_approval',
      });

      const result = await submitBomForApproval('bom-1', 'user-1', 'Please review');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('draft');
      expect(result.newStatus).toBe('pending_approval');
      expect(result.errors).toEqual([]);
      expect(mockPrisma.bomHeader.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bom-1' },
          data: expect.objectContaining({ status: 'pending_approval' }),
        })
      );
    });

    it('should append notes when submitting', async () => {
      const bom = makeBom({ notes: 'Initial note' });
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);
      mockPrisma.bomHeader.update.mockResolvedValue(bom);

      await submitBomForApproval('bom-1', 'user-1', 'Extra note');

      const updateCall = mockPrisma.bomHeader.update.mock.calls[0][0];
      expect(updateCall.data.notes).toContain('Initial note');
      expect(updateCall.data.notes).toContain('[SUBMITTED]');
      expect(updateCall.data.notes).toContain('user-1');
      expect(updateCall.data.notes).toContain('Extra note');
    });
  });

  // =========================================================================
  // approveBom
  // =========================================================================
  describe('approveBom', () => {
    it('should return error when BOM not found', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(null);

      const result = await approveBom('bom-missing', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('BOM not found');
    });

    it('should reject approval when BOM is not pending_approval', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(
        makeBom({ status: 'draft' })
      );

      const result = await approveBom('bom-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('must be pending_approval');
    });

    it('should approve and activate BOM immediately by default', async () => {
      const bom = makeBom({ status: 'pending_approval' });
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);
      mockPrisma.$transaction.mockImplementation(async (fn: (...args: any[]) => any) => {
        const tx = {
          bomHeader: {
            updateMany: vi.fn(),
            update: vi.fn(),
          },
        };
        return fn(tx);
      });

      const result = await approveBom('bom-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('active');
      expect(result.previousStatus).toBe('pending_approval');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should deactivate existing active BOMs for same product when activating', async () => {
      const bom = makeBom({ status: 'pending_approval' });
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);

      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(async (fn: (...args: any[]) => any) => {
        const tx = {
          bomHeader: {
            updateMany: vi.fn(),
            update: vi.fn(),
          },
        };
        capturedTx = tx;
        return fn(tx);
      });

      await approveBom('bom-1', 'user-1', true);

      expect(capturedTx.bomHeader.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'prod-1',
            status: 'active',
            id: { not: 'bom-1' },
          }),
          data: expect.objectContaining({ status: 'obsolete' }),
        })
      );
    });

    it('should approve without activating when activateImmediately is false', async () => {
      const bom = makeBom({ status: 'pending_approval' });
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);

      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(async (fn: (...args: any[]) => any) => {
        const tx = {
          bomHeader: {
            updateMany: vi.fn(),
            update: vi.fn(),
          },
        };
        capturedTx = tx;
        return fn(tx);
      });

      const result = await approveBom('bom-1', 'user-1', false, 'Approved for later');

      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('approved');
      // updateMany should NOT be called when not activating immediately
      expect(capturedTx.bomHeader.updateMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // rejectBom
  // =========================================================================
  describe('rejectBom', () => {
    it('should return error when BOM not found', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(null);

      const result = await rejectBom('bom-missing', 'user-1', 'Bad design');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('BOM not found');
    });

    it('should reject when BOM is not pending_approval', async () => {
      mockPrisma.bomHeader.findUnique.mockResolvedValue(
        makeBom({ status: 'active' })
      );

      const result = await rejectBom('bom-1', 'user-1', 'Reason');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('must be pending_approval');
    });

    it('should successfully reject a pending BOM back to draft', async () => {
      const bom = makeBom({ status: 'pending_approval' });
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);
      mockPrisma.bomHeader.update.mockResolvedValue({
        ...bom,
        status: 'draft',
      });

      const result = await rejectBom('bom-1', 'user-1', 'Design flaw');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('pending_approval');
      expect(result.newStatus).toBe('draft');
      expect(result.errors).toEqual([]);
    });

    it('should include rejection reason in notes', async () => {
      const bom = makeBom({ status: 'pending_approval', notes: 'Old notes' });
      mockPrisma.bomHeader.findUnique.mockResolvedValue(bom);
      mockPrisma.bomHeader.update.mockResolvedValue(bom);

      await rejectBom('bom-1', 'user-1', 'Missing components');

      const updateCall = mockPrisma.bomHeader.update.mock.calls[0][0];
      expect(updateCall.data.notes).toContain('[REJECTED]');
      expect(updateCall.data.notes).toContain('user-1');
      expect(updateCall.data.notes).toContain('Missing components');
      expect(updateCall.data.notes).toContain('Old notes');
    });
  });

  // =========================================================================
  // createNewBomVersion
  // =========================================================================
  describe('createNewBomVersion', () => {
    it('should create version 1.0 when no existing BOM', async () => {
      mockPrisma.bomHeader.findFirst.mockResolvedValue(null);
      mockPrisma.bomHeader.create.mockResolvedValue({
        id: 'bom-new',
        version: '1.0',
      });

      const result = await createNewBomVersion('prod-1', 'user-1');

      expect(result.bomId).toBe('bom-new');
      expect(result.version).toBe('1.0');
      expect(mockPrisma.bomHeader.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            version: '1.0',
            status: 'draft',
          }),
        })
      );
    });

    it('should increment major version from latest BOM', async () => {
      const latestBom = makeBom({ version: '2.0' });
      mockPrisma.bomHeader.findFirst.mockResolvedValue(latestBom);
      mockPrisma.bomHeader.create.mockResolvedValue({
        id: 'bom-new',
        version: '3.0',
      });

      const result = await createNewBomVersion('prod-1', 'user-1');

      expect(result.version).toBe('3.0');
    });

    it('should clone BOM lines from latest version', async () => {
      const latestBom = makeBom({
        version: '1.0',
        bomLines: [
          {
            lineNumber: 1,
            partId: 'part-1',
            quantity: 5,
            unit: 'pcs',
            level: 1,
            scrapRate: 0.02,
            isCritical: true,
            position: 'A1',
            findNumber: 'F1',
            referenceDesignator: 'R1',
            bomType: 'standard',
          },
        ],
      });
      mockPrisma.bomHeader.findFirst.mockResolvedValue(latestBom);
      mockPrisma.bomHeader.create.mockResolvedValue({
        id: 'bom-new',
        version: '2.0',
      });

      await createNewBomVersion('prod-1', 'user-1', 'Clone note');

      const createCall = mockPrisma.bomHeader.create.mock.calls[0][0];
      expect(createCall.data.bomLines.create).toHaveLength(1);
      expect(createCall.data.bomLines.create[0].partId).toBe('part-1');
      expect(createCall.data.bomLines.create[0].quantity).toBe(5);
      expect(createCall.data.notes).toContain('Cloned from v1.0');
      expect(createCall.data.notes).toContain('Clone note');
    });

    it('should not include bomLines create when no latest BOM', async () => {
      mockPrisma.bomHeader.findFirst.mockResolvedValue(null);
      mockPrisma.bomHeader.create.mockResolvedValue({
        id: 'bom-new',
        version: '1.0',
      });

      await createNewBomVersion('prod-1', 'user-1');

      const createCall = mockPrisma.bomHeader.create.mock.calls[0][0];
      expect(createCall.data.bomLines).toBeUndefined();
    });
  });

  // =========================================================================
  // getBomVersionHistory
  // =========================================================================
  describe('getBomVersionHistory', () => {
    it('should return empty array when no BOMs exist', async () => {
      mockPrisma.bomHeader.findMany.mockResolvedValue([]);

      const result = await getBomVersionHistory('prod-1');

      expect(result).toEqual([]);
    });

    it('should return mapped version info with calculated total cost', async () => {
      mockPrisma.bomHeader.findMany.mockResolvedValue([
        {
          id: 'bom-1',
          productId: 'prod-1',
          version: '2.0',
          status: 'active',
          effectiveDate: new Date('2024-06-01'),
          expiryDate: null,
          product: { name: 'Widget A' },
          bomLines: [
            { quantity: 3, part: { unitCost: 10 } },
            { quantity: 2, part: { unitCost: 25 } },
          ],
        },
        {
          id: 'bom-2',
          productId: 'prod-1',
          version: '1.0',
          status: 'obsolete',
          effectiveDate: new Date('2024-01-01'),
          expiryDate: new Date('2024-06-01'),
          product: { name: 'Widget A' },
          bomLines: [{ quantity: 5, part: { unitCost: 8 } }],
        },
      ]);

      const result = await getBomVersionHistory('prod-1');

      expect(result).toHaveLength(2);
      expect(result[0].bomId).toBe('bom-1');
      expect(result[0].version).toBe('2.0');
      expect(result[0].productName).toBe('Widget A');
      expect(result[0].lineCount).toBe(2);
      expect(result[0].totalCost).toBe(3 * 10 + 2 * 25); // 80

      expect(result[1].totalCost).toBe(5 * 8); // 40
      expect(result[1].expiryDate).toEqual(new Date('2024-06-01'));
    });
  });

  // =========================================================================
  // getEffectiveBom
  // =========================================================================
  describe('getEffectiveBom', () => {
    it('should return null when no active BOM found', async () => {
      mockPrisma.bomHeader.findFirst.mockResolvedValue(null);

      const result = await getEffectiveBom('prod-1');

      expect(result).toBeNull();
    });

    it('should return the effective BOM with calculated fields', async () => {
      mockPrisma.bomHeader.findFirst.mockResolvedValue({
        id: 'bom-1',
        productId: 'prod-1',
        version: '1.0',
        status: 'active',
        effectiveDate: new Date('2024-01-01'),
        expiryDate: null,
        product: { name: 'Widget A' },
        bomLines: [
          { quantity: 10, part: { unitCost: 5 } },
          { quantity: 4, part: { unitCost: 12.5 } },
        ],
      });

      const result = await getEffectiveBom('prod-1', new Date('2024-06-15'));

      expect(result).not.toBeNull();
      expect(result!.bomId).toBe('bom-1');
      expect(result!.productName).toBe('Widget A');
      expect(result!.lineCount).toBe(2);
      expect(result!.totalCost).toBe(10 * 5 + 4 * 12.5); // 100
    });

    it('should pass date filters to prisma query', async () => {
      mockPrisma.bomHeader.findFirst.mockResolvedValue(null);

      const asOfDate = new Date('2024-03-15');
      await getEffectiveBom('prod-1', asOfDate);

      expect(mockPrisma.bomHeader.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'prod-1',
            status: 'active',
            effectiveDate: { lte: asOfDate },
          }),
        })
      );
    });
  });
});
