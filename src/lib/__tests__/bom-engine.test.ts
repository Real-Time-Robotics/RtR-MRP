/**
 * BOM Engine Unit Tests
 * Tests for BOM explosion, stock status, and utility functions
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { explodeBOM, getStockStatus, formatCurrency, formatNumber } from '../bom-engine';
import prisma from '../prisma';

// Mock Prisma
vi.mock('../prisma', () => ({
  default: {
    product: {
      findMany: vi.fn(),
    },
    bomHeader: {
      findFirst: vi.fn(),
    },
    inventory: {
      groupBy: vi.fn(),
    },
  },
}));

describe('BOM Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('explodeBOM', () => {
    it('should explode BOM and calculate requirements correctly', async () => {
      const mockBomHeader = {
        id: 'bom-1',
        productId: 'product-1',
        status: 'active',
        bomLines: [
          {
            id: 'line-1',
            partId: 'part-1',
            quantity: 2,
            scrapRate: 0.05,
            unit: 'EA',
            lineNumber: 1,
            moduleCode: 'FRAME',
            moduleName: 'Frame Assembly',
            subAssembly: false,
            phantom: false,
            part: {
              partNumber: 'P001',
              name: 'Component A',
              costs: [{ unitCost: 10.00 }],
            },
          },
          {
            id: 'line-2',
            partId: 'part-2',
            quantity: 5,
            scrapRate: 0.02,
            unit: 'EA',
            lineNumber: 2,
            moduleCode: 'ELEC',
            moduleName: 'Electronics',
            subAssembly: false,
            phantom: false,
            part: {
              partNumber: 'P002',
              name: 'Component B',
              costs: [{ unitCost: 5.00 }],
            },
          },
        ],
      };

      const mockInventory = [
        { partId: 'part-1', _sum: { quantity: 100, reservedQty: 10 } },
        { partId: 'part-2', _sum: { quantity: 50, reservedQty: 5 } },
      ];

      (prisma.product.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.findFirst as Mock).mockResolvedValue(mockBomHeader);
      (prisma.inventory.groupBy as Mock).mockResolvedValue(mockInventory);

      const result = await explodeBOM('product-1', 10);

      expect(result.results).toHaveLength(2);
      expect(result.modules).toHaveLength(2);

      // Check first component calculations
      // needed = ceil(2 * 10 * 1.05) = ceil(21) = 21
      expect(result.results[0].needed).toBe(21);
      expect(result.results[0].available).toBe(90); // 100 - 10 reserved
      expect(result.results[0].shortage).toBe(0);
      expect(result.results[0].status).toBe('OK');

      // Check second component
      // needed = ceil(5 * 10 * 1.02) = ceil(51) = 51
      expect(result.results[1].needed).toBe(51);
      expect(result.results[1].available).toBe(45); // 50 - 5 reserved
      expect(result.results[1].shortage).toBe(6); // 51 - 45
      expect(result.results[1].status).toBe('SHORTAGE');

      // Check summary
      expect(result.summary.totalParts).toBe(2);
      expect(result.summary.shortageCount).toBe(1);
    });

    it('should return empty results when no active BOM found', async () => {
      (prisma.product.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.findFirst as Mock).mockResolvedValue(null);
      (prisma.inventory.groupBy as Mock).mockResolvedValue([]);

      const result = await explodeBOM('invalid-product', 10);

      expect(result.results).toHaveLength(0);
      expect(result.tree).toHaveLength(0);
      expect(result.modules).toHaveLength(0);
      expect(result.summary.totalParts).toBe(0);
      expect(result.summary.canBuild).toBe(10);
    });

    it('should handle parts with no inventory', async () => {
      const mockBomHeader = {
        id: 'bom-1',
        productId: 'product-1',
        status: 'active',
        bomLines: [
          {
            id: 'line-1',
            partId: 'part-no-inventory',
            quantity: 5,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 1,
            moduleCode: null,
            moduleName: null,
            subAssembly: false,
            phantom: false,
            part: {
              partNumber: 'P003',
              name: 'No Inventory Part',
              costs: [],
            },
          },
        ],
      };

      (prisma.product.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.findFirst as Mock).mockResolvedValue(mockBomHeader);
      (prisma.inventory.groupBy as Mock).mockResolvedValue([]);

      const result = await explodeBOM('product-1', 10);

      expect(result.results[0].available).toBe(0);
      expect(result.results[0].shortage).toBe(50); // All 50 needed are shortage
      expect(result.results[0].status).toBe('SHORTAGE');
    });

    it('should calculate canBuild correctly', async () => {
      const mockBomHeader = {
        id: 'bom-1',
        productId: 'product-1',
        status: 'active',
        bomLines: [
          {
            id: 'line-1',
            partId: 'part-1',
            quantity: 2,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 1,
            moduleCode: null,
            moduleName: null,
            subAssembly: false,
            phantom: false,
            part: { partNumber: 'P001', name: 'Part 1', costs: [] },
          },
          {
            id: 'line-2',
            partId: 'part-2',
            quantity: 5,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 2,
            moduleCode: null,
            moduleName: null,
            subAssembly: false,
            phantom: false,
            part: { partNumber: 'P002', name: 'Part 2', costs: [] },
          },
        ],
      };

      const mockInventory = [
        { partId: 'part-1', _sum: { quantity: 100, reservedQty: 0 } }, // Can make 50 units
        { partId: 'part-2', _sum: { quantity: 30, reservedQty: 0 } },  // Can make 6 units
      ];

      (prisma.product.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.findFirst as Mock).mockResolvedValue(mockBomHeader);
      (prisma.inventory.groupBy as Mock).mockResolvedValue(mockInventory);

      const result = await explodeBOM('product-1', 10);

      // Limited by part-2: 30 available / 5 per unit = 6 units max
      expect(result.summary.canBuild).toBe(6);
    });

    it('should group by modules correctly', async () => {
      const mockBomHeader = {
        id: 'bom-1',
        productId: 'product-1',
        status: 'active',
        bomLines: [
          {
            id: 'line-1',
            partId: 'part-1',
            quantity: 1,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 1,
            moduleCode: 'MOD-A',
            moduleName: 'Module A',
            subAssembly: false,
            phantom: false,
            part: { partNumber: 'P001', name: 'Part 1', costs: [{ unitCost: 10 }] },
          },
          {
            id: 'line-2',
            partId: 'part-2',
            quantity: 1,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 2,
            moduleCode: 'MOD-A',
            moduleName: 'Module A',
            subAssembly: false,
            phantom: false,
            part: { partNumber: 'P002', name: 'Part 2', costs: [{ unitCost: 20 }] },
          },
          {
            id: 'line-3',
            partId: 'part-3',
            quantity: 1,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 3,
            moduleCode: 'MOD-B',
            moduleName: 'Module B',
            subAssembly: false,
            phantom: false,
            part: { partNumber: 'P003', name: 'Part 3', costs: [{ unitCost: 15 }] },
          },
        ],
      };

      (prisma.product.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.findFirst as Mock).mockResolvedValue(mockBomHeader);
      (prisma.inventory.groupBy as Mock).mockResolvedValue([]);

      const result = await explodeBOM('product-1', 1);

      expect(result.modules).toHaveLength(2);

      const modA = result.modules.find((m) => m.moduleCode === 'MOD-A');
      expect(modA?.totalParts).toBe(2);
      expect(modA?.totalCost).toBe(30); // 10 + 20

      const modB = result.modules.find((m) => m.moduleCode === 'MOD-B');
      expect(modB?.totalParts).toBe(1);
      expect(modB?.totalCost).toBe(15);
    });

    it('should put parts without module into MISC', async () => {
      const mockBomHeader = {
        id: 'bom-1',
        productId: 'product-1',
        status: 'active',
        bomLines: [
          {
            id: 'line-1',
            partId: 'part-1',
            quantity: 1,
            scrapRate: 0,
            unit: 'EA',
            lineNumber: 1,
            moduleCode: null, // No module
            moduleName: null,
            subAssembly: false,
            phantom: false,
            part: { partNumber: 'P001', name: 'Part 1', costs: [] },
          },
        ],
      };

      (prisma.product.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.findFirst as Mock).mockResolvedValue(mockBomHeader);
      (prisma.inventory.groupBy as Mock).mockResolvedValue([]);

      const result = await explodeBOM('product-1', 1);

      expect(result.modules[0].moduleCode).toBe('MISC');
      expect(result.modules[0].moduleName).toBe('Miscellaneous');
    });
  });

  describe('getStockStatus', () => {
    it('should return OUT_OF_STOCK when available is 0 or less', () => {
      expect(getStockStatus(0, 10, 20)).toBe('OUT_OF_STOCK');
      expect(getStockStatus(-5, 10, 20)).toBe('OUT_OF_STOCK');
    });

    it('should return CRITICAL when available is below minStockLevel', () => {
      expect(getStockStatus(5, 10, 20)).toBe('CRITICAL');
      expect(getStockStatus(9, 10, 20)).toBe('CRITICAL');
    });

    it('should return REORDER when available is below reorderPoint but above minStockLevel', () => {
      expect(getStockStatus(15, 10, 20)).toBe('REORDER');
      expect(getStockStatus(19, 10, 20)).toBe('REORDER');
    });

    it('should return OK when available is at or above reorderPoint', () => {
      expect(getStockStatus(20, 10, 20)).toBe('OK');
      expect(getStockStatus(100, 10, 20)).toBe('OK');
    });

    it('should handle edge case where minStockLevel equals available', () => {
      expect(getStockStatus(10, 10, 20)).toBe('REORDER');
    });

    it('should handle edge case where reorderPoint equals available', () => {
      expect(getStockStatus(20, 10, 20)).toBe('OK');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(1234567)).toBe('$1,234,567');
    });

    it('should format with specified currency', () => {
      expect(formatCurrency(1000, 'EUR')).toMatch(/1,000/);
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000');
    });

    it('should round decimal values', () => {
      expect(formatCurrency(1234.56)).toBe('$1,235');
      expect(formatCurrency(1234.49)).toBe('$1,234');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousands separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });
  });
});
