import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    supplier: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    salesOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    purchaseOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  globalSearch,
  searchParts,
  searchSuppliers,
  searchOrders,
  searchPurchaseOrders,
} from '../search-engine';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// TESTS
// =============================================================================

describe('search-engine', () => {
  describe('globalSearch', () => {
    it('should return empty array for empty query', async () => {
      const result = await globalSearch('');
      expect(result).toEqual([]);
    });

    it('should return empty array for query shorter than 2 chars', async () => {
      const result = await globalSearch('a');
      expect(result).toEqual([]);
    });

    it('should search across all entity types', async () => {
      const mockParts = [
        { id: 'p1', partNumber: 'PN-001', name: 'Bolt M8', category: 'Fasteners' },
      ];
      const mockSuppliers = [
        { id: 's1', code: 'SUP-001', name: 'Acme Corp', country: 'Vietnam' },
      ];
      const mockOrders = [
        {
          id: 'so1',
          orderNumber: 'SO-001',
          status: 'CONFIRMED',
          customer: { name: 'Customer A' },
        },
      ];
      const mockPOs = [
        {
          id: 'po1',
          poNumber: 'PO-001',
          status: 'SENT',
          supplier: { name: 'Acme Corp' },
        },
      ];
      const mockCustomers = [
        { id: 'c1', code: 'CUS-001', name: 'Customer A', type: 'Platinum', country: 'Vietnam' },
      ];
      const mockProducts = [
        { id: 'pr1', sku: 'SKU-001', name: 'Widget A' },
      ];

      vi.mocked(prisma.part.findMany).mockResolvedValue(mockParts as never);
      vi.mocked(prisma.supplier.findMany).mockResolvedValue(mockSuppliers as never);
      vi.mocked(prisma.salesOrder.findMany).mockResolvedValue(mockOrders as never);
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs as never);
      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as never);
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as never);

      const results = await globalSearch('test');

      expect(results).toHaveLength(6);
      expect(results[0]).toMatchObject({
        type: 'part',
        id: 'p1',
        title: 'PN-001 • Bolt M8',
        subtitle: 'Category: Fasteners',
        link: '/inventory/p1',
      });
      expect(results[1]).toMatchObject({
        type: 'supplier',
        id: 's1',
        title: 'SUP-001 • Acme Corp',
        link: '/suppliers/s1',
      });
      expect(results[2]).toMatchObject({
        type: 'order',
        id: 'so1',
        title: 'SO-001',
        link: '/orders/so1',
      });
      expect(results[3]).toMatchObject({
        type: 'po',
        id: 'po1',
        title: 'PO-001',
        link: '/purchasing/po1',
      });
      expect(results[4]).toMatchObject({
        type: 'customer',
        id: 'c1',
        title: 'Customer A',
      });
      expect(results[5]).toMatchObject({
        type: 'product',
        id: 'pr1',
        title: 'SKU-001 • Widget A',
        link: '/bom/pr1',
      });
    });

    it('should respect the limit parameter', async () => {
      const mockParts = Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        partNumber: `PN-00${i}`,
        name: `Part ${i}`,
        category: 'Cat',
      }));

      vi.mocked(prisma.part.findMany).mockResolvedValue(mockParts as never);

      const results = await globalSearch('test', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should handle customer with null type and country', async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([
        { id: 'c1', code: 'C1', name: 'No Type', type: null, country: null },
      ] as never);

      const results = await globalSearch('No Type');
      const customerResult = results.find(r => r.type === 'customer');
      expect(customerResult).toBeDefined();
      expect(customerResult?.subtitle).toBe('Customer • ');
    });

    it('should call prisma with correct search parameters', async () => {
      await globalSearch('bolt');

      expect(prisma.part.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { partNumber: { contains: 'bolt', mode: 'insensitive' } },
            { name: { contains: 'bolt', mode: 'insensitive' } },
            { category: { contains: 'bolt', mode: 'insensitive' } },
          ],
        },
        take: 5,
      });
    });
  });

  describe('searchParts', () => {
    it('should search parts with partNumber, name, category, and description', async () => {
      const mockParts = [
        { id: 'p1', partNumber: 'PN-001', name: 'Bolt', category: 'Fasteners', description: 'M8 bolt' },
      ];
      vi.mocked(prisma.part.findMany).mockResolvedValue(mockParts as never);

      const result = await searchParts('bolt');

      expect(prisma.part.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { partNumber: { contains: 'bolt', mode: 'insensitive' } },
            { name: { contains: 'bolt', mode: 'insensitive' } },
            { category: { contains: 'bolt', mode: 'insensitive' } },
            { description: { contains: 'bolt', mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockParts);
    });

    it('should respect custom limit', async () => {
      await searchParts('bolt', 5);

      expect(prisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('searchSuppliers', () => {
    it('should search suppliers by code, name, and country', async () => {
      const mockSuppliers = [
        { id: 's1', code: 'SUP-001', name: 'Acme', country: 'Vietnam' },
      ];
      vi.mocked(prisma.supplier.findMany).mockResolvedValue(mockSuppliers as never);

      const result = await searchSuppliers('acme');

      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { code: { contains: 'acme', mode: 'insensitive' } },
            { name: { contains: 'acme', mode: 'insensitive' } },
            { country: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockSuppliers);
    });
  });

  describe('searchOrders', () => {
    it('should search sales orders with customer include', async () => {
      const mockOrders = [
        { id: 'o1', orderNumber: 'SO-001', customer: { name: 'Cust A' } },
      ];
      vi.mocked(prisma.salesOrder.findMany).mockResolvedValue(mockOrders as never);

      const result = await searchOrders('SO-001');

      expect(prisma.salesOrder.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { orderNumber: { contains: 'SO-001', mode: 'insensitive' } },
            { customer: { name: { contains: 'SO-001', mode: 'insensitive' } } },
          ],
        },
        include: { customer: { select: { name: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockOrders);
    });
  });

  describe('searchPurchaseOrders', () => {
    it('should search purchase orders with supplier include', async () => {
      const mockPOs = [
        { id: 'po1', poNumber: 'PO-001', supplier: { name: 'Supplier A' } },
      ];
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs as never);

      const result = await searchPurchaseOrders('PO-001');

      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { poNumber: { contains: 'PO-001', mode: 'insensitive' } },
            { supplier: { name: { contains: 'PO-001', mode: 'insensitive' } } },
          ],
        },
        include: { supplier: { select: { name: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockPOs);
    });

    it('should use default limit of 10', async () => {
      await searchPurchaseOrders('test');
      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should respect custom limit', async () => {
      await searchPurchaseOrders('test', 25);
      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 })
      );
    });
  });
});
