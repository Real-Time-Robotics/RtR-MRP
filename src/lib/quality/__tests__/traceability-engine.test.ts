/**
 * Traceability Engine Unit Tests
 * Tests for forward/backward traceability, lot summary, and recall impact
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  getForwardTraceability,
  getBackwardTraceability,
  getLotSummary,
  getRecallImpact,
} from '../traceability-engine';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lotTransaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    purchaseOrder: {
      findUnique: vi.fn(),
    },
    inspection: {
      findFirst: vi.fn(),
    },
    nCR: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
    shipment: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Traceability Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getForwardTraceability', () => {
    it('should return null when no transactions found', async () => {
      (prisma.lotTransaction.findMany as Mock).mockResolvedValue([]);

      const result = await getForwardTraceability('LOT-NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should build root node from first transaction', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'RECEIVED',
          quantity: 100,
          poId: null,
          workOrderId: null,
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);

      const result = await getForwardTraceability('LOT-001');

      expect(result).not.toBeNull();
      expect(result!.lotNumber).toBe('LOT-001');
      expect(result!.partId).toBe('part-1');
      expect(result!.partNumber).toBe('P-001');
      expect(result!.partName).toBe('Widget');
      expect(result!.quantity).toBe(100);
      expect(result!.type).toBe('part');
      expect(result!.status).toBe('released');
      expect(result!.children).toEqual([]);
    });

    it('should include supplier info from PO', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'RECEIVED',
          quantity: 100,
          poId: 'po-1',
          workOrderId: null,
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({
        poNumber: 'PO-001',
        orderDate: new Date('2026-01-01'),
        supplier: { id: 'sup-1', name: 'Acme Corp', code: 'ACM' },
      });
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);

      const result = await getForwardTraceability('LOT-001');

      expect(result!.supplier).toEqual({
        supplierId: 'sup-1',
        supplierName: 'Acme Corp',
        supplierCode: 'ACM',
      });
      expect(result!.documents).toContainEqual(
        expect.objectContaining({ type: 'PO', number: 'PO-001' })
      );
    });

    it('should include inspection results', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'RECEIVED',
          quantity: 100,
          poId: null,
          workOrderId: null,
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.inspection.findFirst as Mock).mockResolvedValue({
        inspectionNumber: 'INS-001',
        result: 'PASS',
        inspectedAt: new Date('2026-01-05'),
        createdAt: new Date('2026-01-05'),
      });
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);

      const result = await getForwardTraceability('LOT-001');

      expect(result!.quality.inspectionResult).toBe('PASS');
      expect(result!.documents).toContainEqual(
        expect.objectContaining({ type: 'Inspection', number: 'INS-001' })
      );
    });

    it('should include NCR info', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'RECEIVED',
          quantity: 100,
          poId: null,
          workOrderId: null,
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);
      (prisma.nCR.findMany as Mock).mockResolvedValue([
        { ncrNumber: 'NCR-001' },
        { ncrNumber: 'NCR-002' },
      ]);

      const result = await getForwardTraceability('LOT-001');

      expect(result!.quality.ncrCount).toBe(2);
      expect(result!.quality.ncrNumbers).toEqual(['NCR-001', 'NCR-002']);
    });

    it('should trace forward through work orders', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'ISSUED',
          quantity: -50,
          poId: null,
          workOrderId: 'wo-1',
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock)
        .mockResolvedValueOnce(transactions) // main query
        .mockResolvedValueOnce([ // produced transactions
          {
            lotNumber: 'FG-LOT-001',
            quantity: 25,
            transactionType: 'PRODUCED',
          },
        ]);

      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);
      (prisma.nCR.count as Mock).mockResolvedValue(0);

      (prisma.workOrder.findUnique as Mock).mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        productId: 'prod-1',
        status: 'completed',
        createdAt: new Date('2026-01-10'),
        product: { sku: 'SKU-001', name: 'Finished Widget' },
        salesOrder: null,
        salesOrderId: null,
      });

      const result = await getForwardTraceability('LOT-001');

      expect(result!.children).toHaveLength(1);
      expect(result!.children[0].lotNumber).toBe('FG-LOT-001');
      expect(result!.children[0].productName).toBe('Finished Widget');
      expect(result!.children[0].type).toBe('product');
    });
  });

  describe('getBackwardTraceability', () => {
    it('should return null when no transactions found', async () => {
      (prisma.lotTransaction.findMany as Mock).mockResolvedValue([]);

      const result = await getBackwardTraceability('LOT-NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should return null when depth exceeds maxDepth', async () => {
      const result = await getBackwardTraceability('LOT-001', 11, 10);

      expect(result).toBeNull();
    });

    it('should build root node for raw material lot', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'RM-001', name: 'Raw Steel' },
          product: null,
          productId: null,
          transactionType: 'RECEIVED',
          quantity: 500,
          poId: null,
          workOrderId: null,
          parentLots: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);

      const result = await getBackwardTraceability('RM-LOT-001');

      expect(result).not.toBeNull();
      expect(result!.lotNumber).toBe('RM-LOT-001');
      expect(result!.type).toBe('part');
      expect(result!.status).toBe('released');
      expect(result!.quantity).toBe(500);
    });

    it('should include supplier info for raw material', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'RM-001', name: 'Raw Steel' },
          product: null,
          productId: null,
          transactionType: 'RECEIVED',
          quantity: 500,
          poId: 'po-1',
          workOrderId: null,
          parentLots: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({
        poNumber: 'PO-001',
        orderDate: new Date('2026-01-01'),
        supplier: { id: 'sup-1', name: 'Steel Co', code: 'STC' },
      });
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);

      const result = await getBackwardTraceability('RM-LOT-001');

      expect(result!.supplier).toEqual({
        supplierId: 'sup-1',
        supplierName: 'Steel Co',
        supplierCode: 'STC',
      });
    });

    it('should build produced node with parent lots', async () => {
      const transactions = [
        {
          partId: null,
          part: null,
          product: { sku: 'FG-001', name: 'Final Product' },
          productId: 'prod-1',
          transactionType: 'PRODUCED',
          quantity: 50,
          poId: null,
          workOrderId: 'wo-1',
          parentLots: [
            { lotNumber: 'RM-LOT-001', partId: 'part-1', quantity: 100 },
          ],
        },
      ];

      // Main query
      (prisma.lotTransaction.findMany as Mock)
        .mockResolvedValueOnce(transactions)
        .mockResolvedValueOnce([]); // recursive call for parent lot returns empty

      (prisma.nCR.findMany as Mock).mockResolvedValue([]);
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({
        woNumber: 'WO-001',
        createdAt: new Date('2026-01-10'),
      });

      const result = await getBackwardTraceability('FG-LOT-001');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('product');
      expect(result!.productName).toBe('Final Product');
      expect(result!.status).toBe('produced');
      expect(result!.documents).toContainEqual(
        expect.objectContaining({ type: 'Work Order', number: 'WO-001' })
      );
    });
  });

  describe('getLotSummary', () => {
    it('should return null when no transactions found', async () => {
      (prisma.lotTransaction.findMany as Mock).mockResolvedValue([]);

      const result = await getLotSummary('LOT-NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should calculate quantities correctly', async () => {
      const transactions = [
        {
          transactionType: 'RECEIVED',
          quantity: 100,
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          productId: null,
        },
        {
          transactionType: 'ISSUED',
          quantity: 30,
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          productId: null,
        },
        {
          transactionType: 'CONSUMED',
          quantity: 20,
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          productId: null,
        },
        {
          transactionType: 'SCRAPPED',
          quantity: 5,
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          productId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);

      const result = await getLotSummary('LOT-001');

      expect(result).not.toBeNull();
      expect(result!.lotNumber).toBe('LOT-001');
      expect(result!.originalQty).toBe(100);
      expect(result!.consumedQty).toBe(50); // 30 ISSUED + 20 CONSUMED
      expect(result!.scrappedQty).toBe(5);
      expect(result!.availableQty).toBe(45); // 100 - 50 - 5
      expect(result!.partNumber).toBe('P-001');
      expect(result!.transactions).toHaveLength(4);
    });

    it('should handle lot with only received transactions', async () => {
      const transactions = [
        {
          transactionType: 'RECEIVED',
          quantity: 200,
          partId: 'part-1',
          part: { partNumber: 'P-002', name: 'Gadget' },
          product: null,
          productId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);

      const result = await getLotSummary('LOT-002');

      expect(result!.originalQty).toBe(200);
      expect(result!.consumedQty).toBe(0);
      expect(result!.scrappedQty).toBe(0);
      expect(result!.availableQty).toBe(200);
    });
  });

  describe('getRecallImpact', () => {
    it('should return null when forward traceability returns null', async () => {
      (prisma.lotTransaction.findMany as Mock).mockResolvedValue([]);

      const result = await getRecallImpact('LOT-NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should collect affected products, customers, and orders', async () => {
      // Build a forward traceability tree with shipped products
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'ISSUED',
          quantity: -50,
          poId: null,
          workOrderId: 'wo-1',
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock)
        .mockResolvedValueOnce(transactions) // main
        .mockResolvedValueOnce([ // produced
          {
            lotNumber: 'FG-LOT-001',
            quantity: 25,
            transactionType: 'PRODUCED',
          },
        ]);

      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);
      (prisma.nCR.count as Mock).mockResolvedValue(0);

      (prisma.workOrder.findUnique as Mock).mockResolvedValue({
        id: 'wo-1',
        woNumber: 'WO-001',
        productId: 'prod-1',
        status: 'completed',
        createdAt: new Date('2026-01-10'),
        product: { sku: 'SKU-001', name: 'Finished Widget' },
        salesOrder: {
          orderNumber: 'SO-001',
          createdAt: new Date('2026-01-05'),
          customer: { name: 'Customer A' },
        },
        salesOrderId: 'so-1',
      });

      (prisma.lotTransaction.findFirst as Mock).mockResolvedValue(null); // no shipped tx

      const result = await getRecallImpact('LOT-001');

      expect(result).not.toBeNull();
      expect(result!.sourceLot).toBe('LOT-001');
      expect(result!.affectedProducts).toHaveLength(1);
      expect(result!.affectedProducts[0].productName).toBe('Finished Widget');
      expect(result!.affectedOrders).toContainEqual(
        expect.objectContaining({ orderNumber: 'WO-001', type: 'Work Order' })
      );
      expect(result!.affectedOrders).toContainEqual(
        expect.objectContaining({ orderNumber: 'SO-001', type: 'Sales Order' })
      );
    });

    it('should return source part info', async () => {
      const transactions = [
        {
          partId: 'part-1',
          part: { partNumber: 'P-001', name: 'Widget' },
          product: null,
          transactionType: 'RECEIVED',
          quantity: 100,
          poId: null,
          workOrderId: null,
          salesOrderId: null,
        },
      ];

      (prisma.lotTransaction.findMany as Mock).mockResolvedValue(transactions);
      (prisma.inspection.findFirst as Mock).mockResolvedValue(null);
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);

      const result = await getRecallImpact('LOT-001');

      expect(result).not.toBeNull();
      expect(result!.sourcePart).toBe('P-001');
      expect(result!.totalImpact.products).toBe(0);
      expect(result!.totalImpact.customers).toBe(0);
      expect(result!.totalImpact.orders).toBe(0);
    });
  });
});
