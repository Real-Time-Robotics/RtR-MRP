/**
 * Sales Flow Integration Tests
 * Tests Quote → SO conversion logic and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertQuotationToSO } from '@/lib/sales/quote-conversion';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    quotation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    salesOrder: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/sales/so-number', () => ({
  generateSONumber: vi.fn().mockResolvedValue('SO-2026-00001'),
}));

describe('Sales Flow: Quote → SO Conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Validation
  // =========================================================================
  describe('Validation', () => {
    it('should reject non-existent quotation', async () => {
      (prisma.quotation.findUnique as any).mockResolvedValue(null);

      await expect(
        convertQuotationToSO({
          quotationId: 'invalid',
          userId: 'user-1',
          sourceType: 'quote_manual',
        })
      ).rejects.toThrow('Báo giá không tồn tại');
    });

    it('should reject already converted quotation', async () => {
      (prisma.quotation.findUnique as any).mockResolvedValue({
        id: 'q-1',
        salesOrderId: 'so-existing',
        status: 'converted',
        items: [],
      });

      await expect(
        convertQuotationToSO({
          quotationId: 'q-1',
          userId: 'user-1',
          sourceType: 'quote_manual',
        })
      ).rejects.toThrow('đã được chuyển đổi');
    });

    it('should reject quotation in draft status', async () => {
      (prisma.quotation.findUnique as any).mockResolvedValue({
        id: 'q-1',
        salesOrderId: null,
        status: 'draft',
        items: [{ id: 'item-1' }],
      });

      await expect(
        convertQuotationToSO({
          quotationId: 'q-1',
          userId: 'user-1',
          sourceType: 'quote_manual',
        })
      ).rejects.toThrow('Chỉ có thể chuyển đổi');
    });

    it('should reject quotation with no items', async () => {
      (prisma.quotation.findUnique as any).mockResolvedValue({
        id: 'q-1',
        salesOrderId: null,
        status: 'sent',
        items: [],
        customer: { id: 'c-1', name: 'Test' },
      });

      await expect(
        convertQuotationToSO({
          quotationId: 'q-1',
          userId: 'user-1',
          sourceType: 'quote_manual',
        })
      ).rejects.toThrow('không có sản phẩm');
    });
  });

  // =========================================================================
  // Part → Product mapping
  // =========================================================================
  describe('Part to Product Mapping', () => {
    it('should fail when parts have no matching products', async () => {
      (prisma.quotation.findUnique as any).mockResolvedValue({
        id: 'q-1',
        salesOrderId: null,
        status: 'sent',
        customerId: 'c-1',
        currency: 'VND',
        notes: null,
        acceptedAt: null,
        quoteNumber: 'QT-001',
        items: [
          {
            id: 'item-1',
            quantity: 5,
            unitPrice: 100,
            discountPercent: 0,
            part: { id: 'part-1', partNumber: 'UNMAPPED-001', name: 'Unmapped Part' },
          },
        ],
        customer: { id: 'c-1', name: 'Test Customer' },
      });

      // No matching products
      (prisma.product.findMany as any).mockResolvedValue([]);

      await expect(
        convertQuotationToSO({
          quotationId: 'q-1',
          userId: 'user-1',
          sourceType: 'quote_manual',
        })
      ).rejects.toThrow('Không tìm thấy Product tương ứng');
    });
  });

  // =========================================================================
  // Successful conversion
  // =========================================================================
  describe('Successful Conversion', () => {
    it('should convert sent quotation to SO', async () => {
      const mockQuotation = {
        id: 'q-1',
        quoteNumber: 'QT-001',
        salesOrderId: null,
        status: 'sent',
        customerId: 'c-1',
        currency: 'VND',
        notes: 'Test notes',
        acceptedAt: null,
        items: [
          {
            id: 'item-1',
            quantity: 5,
            unitPrice: 200,
            discountPercent: 10,
            part: { id: 'part-1', partNumber: 'PART-001', name: 'Test Part' },
          },
        ],
        customer: { id: 'c-1', name: 'Test Customer' },
      };

      (prisma.quotation.findUnique as any).mockResolvedValue(mockQuotation);
      (prisma.product.findMany as any).mockResolvedValue([
        { id: 'prod-1', sku: 'PART-001' },
      ]);

      const mockSO = {
        id: 'so-1',
        orderNumber: 'SO-2026-00001',
      };

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          salesOrder: { create: vi.fn().mockResolvedValue(mockSO) },
          quotation: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await convertQuotationToSO({
        quotationId: 'q-1',
        userId: 'user-1',
        sourceType: 'quote_auto',
      });

      expect(result.salesOrderId).toBe('so-1');
      expect(result.orderNumber).toBe('SO-2026-00001');
      expect(result.quoteNumber).toBe('QT-001');
      expect(result.linesConverted).toBe(1);
      // 5 * 200 * 0.9 = 900
      expect(result.totalAmount).toBe(900);
      expect(result.unmappedParts).toEqual([]);
    });

    it('should accept accepted quotation for conversion', async () => {
      const mockQuotation = {
        id: 'q-2',
        quoteNumber: 'QT-002',
        salesOrderId: null,
        status: 'accepted', // Also valid
        customerId: 'c-1',
        currency: 'VND',
        notes: null,
        acceptedAt: new Date(),
        items: [
          {
            id: 'item-1',
            quantity: 3,
            unitPrice: 100,
            discountPercent: 0,
            part: { id: 'part-1', partNumber: 'PART-001', name: 'Test Part' },
          },
        ],
        customer: { id: 'c-1', name: 'Test Customer' },
      };

      (prisma.quotation.findUnique as any).mockResolvedValue(mockQuotation);
      (prisma.product.findMany as any).mockResolvedValue([
        { id: 'prod-1', sku: 'PART-001' },
      ]);

      const mockSO = { id: 'so-2', orderNumber: 'SO-2026-00002' };
      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          salesOrder: { create: vi.fn().mockResolvedValue(mockSO) },
          quotation: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await convertQuotationToSO({
        quotationId: 'q-2',
        userId: 'user-1',
        sourceType: 'quote_manual',
      });

      expect(result.salesOrderId).toBe('so-2');
      expect(result.totalAmount).toBe(300);
    });
  });
});
