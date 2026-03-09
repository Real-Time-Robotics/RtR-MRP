/**
 * Scrap Service Unit Tests
 * Tests for scrap disposal and scrap inventory queries
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { disposeScrapInventory, getScrapInventory } from '../scrap-service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    warehouse: {
      findFirst: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
    scrapDisposal: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockScrapInventory = {
  id: 'inv-1',
  partId: 'part-1',
  warehouseId: 'wh-scrap',
  quantity: 50,
  lotNumber: 'LOT-001',
  warehouse: { id: 'wh-scrap', code: 'SCRAP-01', type: 'SCRAP' },
  part: { id: 'part-1', partNumber: 'P-001', unitCost: 25.0 },
};

describe('Scrap Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('disposeScrapInventory', () => {
    it('should return error when inventory not found', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(null);

      const result = await disposeScrapInventory(
        {
          inventoryId: 'nonexistent',
          quantity: 10,
          disposalMethod: 'PHYSICAL_DESTRUCTION',
        },
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inventory not found');
      expect(result.transactionId).toBeNull();
      expect(result.writeOffValue).toBe(0);
    });

    it('should return error when inventory is not in SCRAP warehouse', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue({
        ...mockScrapInventory,
        warehouse: { id: 'wh-main', code: 'MAIN-01', type: 'MAIN' },
      });

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 10,
          disposalMethod: 'RECYCLING',
        },
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Inventory is not in SCRAP warehouse');
    });

    it('should return error when quantity is insufficient', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockScrapInventory);

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 100,
          disposalMethod: 'PHYSICAL_DESTRUCTION',
        },
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Insufficient quantity');
    });

    it('should calculate write-off value correctly', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockScrapInventory);
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 10,
          disposalMethod: 'PHYSICAL_DESTRUCTION',
        },
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.writeOffValue).toBe(250); // 10 * 25.0
    });

    it('should handle zero unit cost', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue({
        ...mockScrapInventory,
        part: { ...mockScrapInventory.part, unitCost: null },
      });
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 10,
          disposalMethod: 'RECYCLING',
        },
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.writeOffValue).toBe(0);
    });

    it('should handle transaction errors gracefully', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockScrapInventory);
      (prisma.$transaction as Mock).mockRejectedValue(new Error('DB error'));

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 10,
          disposalMethod: 'HAZARDOUS_WASTE',
        },
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('DB error');
      expect(result.transactionId).toBeNull();
    });

    it('should handle non-Error transaction failures', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockScrapInventory);
      (prisma.$transaction as Mock).mockRejectedValue('something went wrong');

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 10,
          disposalMethod: 'OTHER',
        },
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Disposal failed');
    });

    it('should pass disposal reference and notes', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(mockScrapInventory);
      (prisma.$transaction as Mock).mockResolvedValue(undefined);

      const result = await disposeScrapInventory(
        {
          inventoryId: 'inv-1',
          quantity: 5,
          disposalMethod: 'HAZARDOUS_WASTE',
          disposalReference: 'HAZ-REF-001',
          notes: 'Contains hazardous material',
        },
        'user-1'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getScrapInventory', () => {
    it('should return empty array when no SCRAP warehouse exists', async () => {
      (prisma.warehouse.findFirst as Mock).mockResolvedValue(null);

      const result = await getScrapInventory();

      expect(result).toEqual([]);
    });

    it('should query inventory in SCRAP warehouse with quantity > 0', async () => {
      const scrapWarehouse = { id: 'wh-scrap', type: 'SCRAP' };
      const inventoryItems = [
        { id: 'inv-1', quantity: 20, part: { name: 'Part A' } },
      ];

      (prisma.warehouse.findFirst as Mock).mockResolvedValue(scrapWarehouse);
      (prisma.inventory.findMany as Mock).mockResolvedValue(inventoryItems);

      const result = await getScrapInventory();

      expect(result).toEqual(inventoryItems);
      expect(prisma.inventory.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'wh-scrap',
          quantity: { gt: 0 },
        },
        include: { part: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
