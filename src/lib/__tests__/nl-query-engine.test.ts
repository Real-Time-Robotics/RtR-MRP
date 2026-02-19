/**
 * Natural Language Query Engine Unit Tests
 * Tests for processNaturalLanguageQuery() and getSupportedQueryTypes()
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    inventory: {
      findMany: vi.fn(),
    },
    salesOrder: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    salesOrderLine: {
      findMany: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
    },
    workOrder: {
      findMany: vi.fn(),
    },
    nCR: {
      findMany: vi.fn(),
    },
    cAPA: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logError: vi.fn(),
  },
}));

import { processNaturalLanguageQuery, getSupportedQueryTypes } from '../nl-query-engine';
import { prisma } from '@/lib/prisma';

describe('Natural Language Query Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Inventory queries
  // ===========================================================================
  describe('processNaturalLanguageQuery() - inventory queries', () => {
    it('should handle "show low stock items" query in English', async () => {
      (prisma.inventory.findMany as Mock).mockResolvedValue([
        {
          quantity: 5,
          part: {
            partNumber: 'PN-001',
            name: 'Bolt M8',
            category: 'COMPONENT',
            unit: 'EA',
            costs: [{ unitCost: 2.5 }],
            planning: { minStockLevel: 20 },
          },
          warehouse: { name: 'Main', code: 'WH-01' },
        },
      ]);

      const result = await processNaturalLanguageQuery('show low stock items', 'en');

      expect(result.success).toBe(true);
      expect(result.metadata.confidence).toBeGreaterThan(0.8);
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toHaveProperty('partNumber', 'PN-001');
      expect(result.data[0]).toHaveProperty('currentStock', 5);
      expect(result.suggestedFollowups.length).toBeGreaterThan(0);
    });

    it('should handle Vietnamese low stock query', async () => {
      (prisma.inventory.findMany as Mock).mockResolvedValue([]);

      const result = await processNaturalLanguageQuery('hiển thị hàng sắp hết', 'vi');

      expect(result.success).toBe(true);
      expect(result.naturalLanguage).toContain('Tìm các linh kiện');
      expect(result.metadata.explanationVi).toBeDefined();
    });

    it('should handle "total inventory value" query', async () => {
      (prisma.inventory.findMany as Mock).mockResolvedValue([
        {
          quantity: 100,
          part: {
            partNumber: 'PN-001',
            name: 'Bolt M8',
            category: 'COMPONENT',
            costs: [{ unitCost: 2.5 }],
          },
        },
        {
          quantity: 50,
          part: {
            partNumber: 'PN-002',
            name: 'Nut M8',
            category: 'COMPONENT',
            costs: [{ unitCost: 0.5 }],
          },
        },
      ]);

      const result = await processNaturalLanguageQuery('total inventory value', 'en');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('summary');
      expect(result.data[0].summary).toHaveProperty('totalValue');
      expect(result.data[0].summary).toHaveProperty('totalQuantity');
    });
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Vietnamese queries
  // ===========================================================================
  describe('processNaturalLanguageQuery() - Vietnamese queries', () => {
    it('should handle "sắp hết hàng" (running low) query', async () => {
      (prisma.inventory.findMany as Mock).mockResolvedValue([]);

      const result = await processNaturalLanguageQuery('sắp hết hàng', 'vi');

      expect(result.success).toBe(true);
      expect(result.metadata.explanationVi).toBeDefined();
    });

    it('should handle "tổng tồn kho giá trị" (total inventory value)', async () => {
      (prisma.inventory.findMany as Mock).mockResolvedValue([]);

      // Pattern: /(?:total|tổng)\s*(?:inventory|tồn kho)\s*(?:value|giá trị)/i
      const result = await processNaturalLanguageQuery('tổng tồn kho giá trị', 'vi');

      expect(result.success).toBe(true);
    });

    it('should handle "doanh thu tháng này" (sales this month)', async () => {
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);
      (prisma.salesOrder.count as Mock).mockResolvedValue(0);

      const result = await processNaturalLanguageQuery('doanh thu tháng này', 'vi');

      expect(result.success).toBe(true);
    });

    it('should handle "nhà cung cấp hiệu suất" (supplier performance)', async () => {
      (prisma.supplier.findMany as Mock).mockResolvedValue([
        {
          code: 'SUP-001',
          name: 'MotorTech',
          country: 'Vietnam',
          rating: 4.5,
          leadTimeDays: 14,
          ndaaCompliant: true,
          paymentTerms: 'Net 30',
        },
      ]);

      // Pattern: /(?:supplier|ncc|nhà cung cấp)\s*(?:performance|hiệu suất|rating|đánh giá)/i
      const result = await processNaturalLanguageQuery('nhà cung cấp hiệu suất', 'vi');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Sales queries
  // ===========================================================================
  describe('processNaturalLanguageQuery() - sales queries', () => {
    it('should handle "sales this month" query', async () => {
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([
        {
          orderNumber: 'SO-001',
          totalAmount: 5000,
          customer: { name: 'Acme Corp' },
          status: 'CONFIRMED',
        },
      ]);
      (prisma.salesOrder.count as Mock).mockResolvedValue(2);

      const result = await processNaturalLanguageQuery('sales this month', 'en');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('thisMonth');
      expect(result.data[0]).toHaveProperty('lastMonth');
      expect(result.data[0]).toHaveProperty('comparison');
    });

    it('should handle "top selling products" query', async () => {
      (prisma.salesOrderLine.findMany as Mock).mockResolvedValue([
        {
          productId: 'prod1',
          product: { sku: 'SKU-001', name: 'Widget A' },
          quantity: 100,
          lineTotal: 5000,
        },
        {
          productId: 'prod1',
          product: { sku: 'SKU-001', name: 'Widget A' },
          quantity: 50,
          lineTotal: 2500,
        },
      ]);

      const result = await processNaturalLanguageQuery('top selling products', 'en');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('rank');
      expect(result.data[0]).toHaveProperty('sku');
    });
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Production queries
  // ===========================================================================
  describe('processNaturalLanguageQuery() - production queries', () => {
    it('should handle "work orders status" query', async () => {
      (prisma.workOrder.findMany as Mock).mockResolvedValue([
        {
          woNumber: 'WO-001',
          product: { sku: 'SKU-001', name: 'Widget A' },
          quantity: 100,
          completedQty: 50,
          status: 'IN_PROGRESS',
          plannedStart: new Date('2024-01-01'),
          plannedEnd: new Date('2024-01-15'),
        },
      ]);

      const result = await processNaturalLanguageQuery('work orders status', 'en');

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toHaveProperty('woNumber', 'WO-001');
      expect(result.data[0]).toHaveProperty('progress', 50);
    });
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Quality queries
  // ===========================================================================
  describe('processNaturalLanguageQuery() - quality queries', () => {
    it('should handle "open quality issues" query', async () => {
      (prisma.nCR.findMany as Mock).mockResolvedValue([
        {
          ncrNumber: 'NCR-001',
          title: 'Defective Motor',
          source: 'Incoming',
          priority: 'HIGH',
          createdAt: new Date('2024-01-10'),
        },
      ]);
      (prisma.cAPA.count as Mock).mockResolvedValue(3);

      const result = await processNaturalLanguageQuery('open quality issues', 'en');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('summary');
      const summary = (result.data[0] as Record<string, Record<string, unknown>>).summary;
      expect(summary.openNCRs).toBe(1);
      expect(summary.openCAPAs).toBe(3);
    });
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Invalid/empty queries
  // ===========================================================================
  describe('processNaturalLanguageQuery() - invalid/empty queries', () => {
    it('should return not understood for unrecognized query', async () => {
      const result = await processNaturalLanguageQuery('what is the weather today?', 'en');

      expect(result.success).toBe(false);
      expect(result.metadata.confidence).toBeLessThan(0.5);
      expect(result.warnings).toContain('Query not understood');
      expect(result.suggestedFollowups.length).toBeGreaterThan(0);
    });

    it('should return not understood for empty query', async () => {
      const result = await processNaturalLanguageQuery('', 'en');

      expect(result.success).toBe(false);
      expect(result.warnings).toBeDefined();
    });

    it('should return not understood for random text', async () => {
      const result = await processNaturalLanguageQuery('asdfghjkl', 'en');

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
    });

    it('should provide explanation in both English and Vietnamese for failed queries', async () => {
      const result = await processNaturalLanguageQuery('gibberish', 'en');

      expect(result.metadata.explanation).toBeDefined();
      expect(result.metadata.explanationVi).toBeDefined();
    });
  });

  // ===========================================================================
  // processNaturalLanguageQuery - Error handling
  // ===========================================================================
  describe('processNaturalLanguageQuery() - error handling', () => {
    it('should return error result when database query fails', async () => {
      (prisma.inventory.findMany as Mock).mockRejectedValue(new Error('DB connection failed'));

      const result = await processNaturalLanguageQuery('show low stock items', 'en');

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Query processing failed');
    });
  });

  // ===========================================================================
  // getSupportedQueryTypes
  // ===========================================================================
  describe('getSupportedQueryTypes()', () => {
    it('should return expected query types', () => {
      const types = getSupportedQueryTypes();

      expect(types.length).toBeGreaterThan(0);
      const intents = types.map(t => t.intent);
      expect(intents).toContain('inventory');
      expect(intents).toContain('sales');
      expect(intents).toContain('suppliers');
      expect(intents).toContain('production');
      expect(intents).toContain('quality');
    });

    it('should include examples in both English and Vietnamese', () => {
      const types = getSupportedQueryTypes();

      for (const type of types) {
        expect(type.examples.length).toBeGreaterThan(0);
        for (const example of type.examples) {
          expect(example.en).toBeDefined();
          expect(example.vi).toBeDefined();
          expect(example.en.length).toBeGreaterThan(0);
          expect(example.vi.length).toBeGreaterThan(0);
        }
      }
    });

    it('should return a stable structure', () => {
      const types1 = getSupportedQueryTypes();
      const types2 = getSupportedQueryTypes();

      expect(types1).toEqual(types2);
    });
  });
});
