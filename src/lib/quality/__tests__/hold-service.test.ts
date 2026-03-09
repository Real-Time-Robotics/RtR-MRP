/**
 * Hold Service Unit Tests
 * Tests for HOLD warehouse decisions (release/reject)
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { executeHoldDecision, getHoldInventory } from '../hold-service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    warehouse: {
      findFirst: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
    nCR: {
      create: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    nCRHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../ncr-workflow', () => ({
  generateNCRNumber: vi.fn().mockResolvedValue('NCR-2026-0001'),
}));

const mockHoldInventory = {
  id: 'inv-1',
  partId: 'part-1',
  warehouseId: 'wh-hold',
  quantity: 100,
  lotNumber: 'LOT-001',
  warehouse: { id: 'wh-hold', code: 'HOLD-01', type: 'HOLD' },
  part: { id: 'part-1', partNumber: 'P-001' },
};

describe('Hold Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeHoldDecision', () => {
    it('should return error when inventory not found', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(null);

      const result = await executeHoldDecision({
        inventoryId: 'nonexistent',
        decision: 'RELEASE',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inventory not found');
    });

    it('should return error when inventory is not in HOLD warehouse', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue({
        ...mockHoldInventory,
        warehouse: { id: 'wh-main', code: 'MAIN-01', type: 'MAIN' },
      });

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'RELEASE',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inventory is not in HOLD warehouse');
    });

    it('should return error when quantity is insufficient', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockHoldInventory);

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'RELEASE',
        quantity: 200,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Insufficient quantity');
      expect(result.fromWarehouse).toBe('HOLD-01');
    });

    it('should find MAIN warehouse for RELEASE decision', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockHoldInventory);
      (prisma.warehouse.findFirst as Mock).mockResolvedValue({ id: 'wh-main', code: 'MAIN-01', type: 'MAIN' });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'RELEASE',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.fromWarehouse).toBe('HOLD-01');
      expect(result.toWarehouse).toBe('MAIN-01');
      expect(result.ncrNumber).toBeUndefined();
    });

    it('should find QUARANTINE warehouse for REJECT decision', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockHoldInventory);
      (prisma.warehouse.findFirst as Mock).mockResolvedValue({ id: 'wh-q', code: 'QUAR-01', type: 'QUARANTINE' });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'REJECT',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.toWarehouse).toBe('QUAR-01');
    });

    it('should return error when target warehouse not found', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockHoldInventory);
      (prisma.warehouse.findFirst as Mock).mockResolvedValue(null);

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'RELEASE',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Target warehouse not found');
    });

    it('should handle transaction errors gracefully', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockHoldInventory);
      (prisma.warehouse.findFirst as Mock).mockResolvedValue({ id: 'wh-main', code: 'MAIN-01', type: 'MAIN' });
      (prisma.$transaction as Mock).mockRejectedValue(new Error('DB connection failed'));

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'RELEASE',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('DB connection failed');
    });

    it('should handle non-Error transaction failures', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockHoldInventory);
      (prisma.warehouse.findFirst as Mock).mockResolvedValue({ id: 'wh-main', code: 'MAIN-01', type: 'MAIN' });
      (prisma.$transaction as Mock).mockRejectedValue('unknown error');

      const result = await executeHoldDecision({
        inventoryId: 'inv-1',
        decision: 'RELEASE',
        quantity: 10,
        reviewedBy: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Decision execution failed');
    });
  });

  describe('getHoldInventory', () => {
    it('should return empty array when no HOLD warehouse exists', async () => {
      (prisma.warehouse.findFirst as Mock).mockResolvedValue(null);

      const result = await getHoldInventory();

      expect(result).toEqual([]);
    });

    it('should query inventory in HOLD warehouse with quantity > 0', async () => {
      const holdWarehouse = { id: 'wh-hold', type: 'HOLD' };
      const inventoryItems = [
        { id: 'inv-1', partId: 'p-1', quantity: 50, part: { name: 'Part A' } },
        { id: 'inv-2', partId: 'p-2', quantity: 30, part: { name: 'Part B' } },
      ];

      (prisma.warehouse.findFirst as Mock).mockResolvedValue(holdWarehouse);
      (prisma.inventory.findMany as Mock).mockResolvedValue(inventoryItems);

      const result = await getHoldInventory();

      expect(result).toEqual(inventoryItems);
      expect(prisma.inventory.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-hold',
          quantity: { gt: 0 },
        },
        include: { part: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
