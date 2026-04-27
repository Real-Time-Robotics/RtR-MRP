/**
 * Sprint 27 TIP-S27-03 — Assembly Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted — cannot reference outer variables.
// Use vi.hoisted to define mocks before hoisting.
const { mockPrisma, mockGenerateSerial } = vi.hoisted(() => {
  const mockPrisma = {
    assemblyOrder: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    serialUnit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    serialLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    moduleDesign: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const mockGenerateSerial = vi.fn().mockResolvedValue('EBOX-V10-270426-001');
  return { mockPrisma, mockGenerateSerial };
});

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));

vi.mock('@/lib/serial/numbering', () => ({
  generateSerial: (...args: unknown[]) => mockGenerateSerial(...args),
  SerialNumberingRuleNotFoundError: class extends Error {
    constructor(id: string) { super(`Rule not found: ${id}`); this.name = 'SerialNumberingRuleNotFoundError'; }
  },
}));

import {
  generateAoNumber,
  validateChildSerial,
  completeAssemblyOrder,
  IncompleteAssemblyError,
} from '../service';

describe('Assembly Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // generateAoNumber
  // =========================================================================

  describe('generateAoNumber', () => {
    it('generates sequential AO numbers for year 2026', async () => {
      mockPrisma.assemblyOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);

      const d = new Date('2026-06-15');
      expect(await generateAoNumber(d, mockPrisma as any)).toBe('AO-2026-0001');
      expect(await generateAoNumber(d, mockPrisma as any)).toBe('AO-2026-0002');
      expect(await generateAoNumber(d, mockPrisma as any)).toBe('AO-2026-0003');
      expect(await generateAoNumber(d, mockPrisma as any)).toBe('AO-2026-0004');
      expect(await generateAoNumber(d, mockPrisma as any)).toBe('AO-2026-0005');
    });

    it('resets counter on cross-year boundary', async () => {
      mockPrisma.assemblyOrder.count.mockResolvedValueOnce(99);
      expect(await generateAoNumber(new Date('2026-12-31'), mockPrisma as any)).toBe('AO-2026-0100');

      mockPrisma.assemblyOrder.count.mockResolvedValueOnce(0);
      expect(await generateAoNumber(new Date('2027-01-01'), mockPrisma as any)).toBe('AO-2027-0001');
    });
  });

  // =========================================================================
  // validateChildSerial
  // =========================================================================

  describe('validateChildSerial', () => {
    const aoId = 'ao-1';
    const bomLines = [
      { id: 'bl-1', partId: 'part-A', quantity: 2 },
      { id: 'bl-2', partId: 'part-B', quantity: 1 },
    ];
    const ao = { id: aoId, bomHeader: { bomLines } };

    it('returns NOT_FOUND for unknown serial', async () => {
      mockPrisma.serialUnit.findUnique.mockResolvedValue(null);
      const result = await validateChildSerial(aoId, 'UNKNOWN-001', mockPrisma as any);
      expect(result).toEqual({ ok: false, reason: 'NOT_FOUND' });
    });

    it('returns NOT_IN_STOCK for non-IN_STOCK serial', async () => {
      mockPrisma.serialUnit.findUnique.mockResolvedValue({
        id: 'su-1', serial: 'S-001', status: 'CONSUMED', partId: 'part-A',
      });
      mockPrisma.assemblyOrder.findUnique.mockResolvedValue(ao);
      const result = await validateChildSerial(aoId, 'S-001', mockPrisma as any);
      expect(result).toEqual({ ok: false, reason: 'NOT_IN_STOCK' });
    });

    it('returns NOT_IN_BOM when part not in BOM', async () => {
      mockPrisma.serialUnit.findUnique.mockResolvedValue({
        id: 'su-1', serial: 'S-001', status: 'IN_STOCK', partId: 'part-UNKNOWN',
      });
      mockPrisma.assemblyOrder.findUnique.mockResolvedValue(ao);
      const result = await validateChildSerial(aoId, 'S-001', mockPrisma as any);
      expect(result).toEqual({ ok: false, reason: 'NOT_IN_BOM' });
    });

    it('returns ALREADY_USED when serial already linked', async () => {
      mockPrisma.serialUnit.findUnique.mockResolvedValue({
        id: 'su-1', serial: 'S-001', status: 'IN_STOCK', partId: 'part-A',
      });
      mockPrisma.assemblyOrder.findUnique.mockResolvedValue(ao);
      mockPrisma.serialLink.findUnique.mockResolvedValue({ id: 'sl-1' });
      const result = await validateChildSerial(aoId, 'S-001', mockPrisma as any);
      expect(result).toEqual({ ok: false, reason: 'ALREADY_USED' });
    });

    it('returns ok=true for valid child serial', async () => {
      const childUnit = { id: 'su-1', serial: 'S-001', status: 'IN_STOCK', partId: 'part-A' };
      mockPrisma.serialUnit.findUnique.mockResolvedValue(childUnit);
      mockPrisma.assemblyOrder.findUnique.mockResolvedValue(ao);
      mockPrisma.serialLink.findUnique.mockResolvedValue(null);
      const result = await validateChildSerial(aoId, 'S-001', mockPrisma as any);
      expect(result).toEqual({ ok: true, childUnit, bomLine: bomLines[0] });
    });
  });

  // =========================================================================
  // completeAssemblyOrder
  // =========================================================================

  describe('completeAssemblyOrder', () => {
    it('throws IncompleteAssemblyError when children missing', async () => {
      const ao = {
        id: 'ao-1', status: 'IN_PROGRESS', productId: 'prod-1', targetQuantity: 1,
        bomHeader: {
          bomLines: [
            { id: 'bl-1', partId: 'part-A', quantity: 3 },
            { id: 'bl-2', partId: 'part-B', quantity: 2 },
          ],
        },
      };

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          assemblyOrder: { findUnique: vi.fn().mockResolvedValue(ao), update: vi.fn() },
          serialUnit: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'su-1', partId: 'part-A', status: 'ALLOCATED', meta: { allocatedToAoId: 'ao-1' } },
            ]),
            create: vi.fn(),
            update: vi.fn(),
          },
          serialLink: { create: vi.fn() },
          moduleDesign: { findFirst: vi.fn().mockResolvedValue({ id: 'md-1' }) },
        };
        return fn(tx);
      });

      await expect(completeAssemblyOrder('ao-1', 'user-1', mockPrisma as any))
        .rejects.toThrow(IncompleteAssemblyError);
    });

    it('completes AO: creates parent serial + SerialLinks + marks children CONSUMED', async () => {
      const bomLines = [
        { id: 'bl-1', partId: 'part-A', quantity: 2 },
        { id: 'bl-2', partId: 'part-B', quantity: 1 },
      ];
      const ao = {
        id: 'ao-1', status: 'IN_PROGRESS', productId: 'prod-1', targetQuantity: 1,
        bomHeader: { bomLines },
      };
      const allocatedChildren = [
        { id: 'su-1', partId: 'part-A', status: 'ALLOCATED', meta: { allocatedToAoId: 'ao-1' } },
        { id: 'su-2', partId: 'part-A', status: 'ALLOCATED', meta: { allocatedToAoId: 'ao-1' } },
        { id: 'su-3', partId: 'part-B', status: 'ALLOCATED', meta: { allocatedToAoId: 'ao-1' } },
      ];
      const parentUnit = { id: 'parent-1', serial: 'EBOX-V10-270426-001' };

      const txUpdate = vi.fn();
      const txLinkCreate = vi.fn();
      const txAoUpdate = vi.fn();

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          assemblyOrder: { findUnique: vi.fn().mockResolvedValue(ao), update: txAoUpdate },
          serialUnit: {
            findMany: vi.fn().mockResolvedValue(allocatedChildren),
            create: vi.fn().mockResolvedValue(parentUnit),
            update: txUpdate,
          },
          serialLink: { create: txLinkCreate },
          moduleDesign: { findFirst: vi.fn().mockResolvedValue({ id: 'md-1', code: 'EBOX_V10' }) },
        };
        return fn(tx);
      });

      const result = await completeAssemblyOrder('ao-1', 'user-1', mockPrisma as any);
      expect(result.parentSerial).toBe('EBOX-V10-270426-001');
      expect(result.aoId).toBe('ao-1');
      // 3 children marked CONSUMED
      expect(txUpdate).toHaveBeenCalledTimes(3);
      // 3 SerialLinks created
      expect(txLinkCreate).toHaveBeenCalledTimes(3);
      // AO updated to COMPLETED
      expect(txAoUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }));
    });
  });
});
