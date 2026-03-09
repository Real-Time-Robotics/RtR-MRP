import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createPurchaseInvoice,
  createSalesInvoice,
  recordPurchasePayment,
  recordSalesPayment,
  getAPAging,
  getARAging,
} from '../invoicing';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    purchaseInvoice: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesInvoice: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    purchasePayment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    salesPayment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../cost-rollup', () => ({
  getPartCostRollup: vi.fn().mockResolvedValue({ totalCost: 5 }),
}));

import { prisma } from '@/lib/prisma';

const mp = prisma as unknown as {
  purchaseInvoice: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  salesInvoice: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  purchasePayment: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  salesPayment: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

describe('Invoicing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPurchaseInvoice', () => {
    it('should create a purchase invoice with calculated totals', async () => {
      mp.purchaseInvoice.findFirst.mockResolvedValue(null);
      mp.purchaseInvoice.create.mockResolvedValue({
        id: 'pi-1',
        invoiceNumber: `PI-${new Date().getFullYear()}-0001`,
      });

      const result = await createPurchaseInvoice(
        {
          supplierId: 'sup-1',
          invoiceDate: new Date('2026-03-01'),
          dueDate: new Date('2026-04-01'),
          lines: [
            { description: 'Part A', quantity: 10, unitPrice: 25, taxRate: 10 },
            { description: 'Part B', quantity: 5, unitPrice: 50 },
          ],
        },
        'user-1'
      );

      expect(result.invoiceId).toBe('pi-1');
      const createCall = mp.purchaseInvoice.create.mock.calls[0][0];
      // line1: 10*25=250, tax=25; line2: 5*50=250, tax=0
      expect(createCall.data.subtotal).toBe(500);
      expect(createCall.data.taxAmount).toBe(25);
      expect(createCall.data.totalAmount).toBe(525);
    });

    it('should include shipping in total', async () => {
      mp.purchaseInvoice.findFirst.mockResolvedValue(null);
      mp.purchaseInvoice.create.mockResolvedValue({ id: 'pi-2', invoiceNumber: 'PI-2026-0001' });

      await createPurchaseInvoice(
        {
          supplierId: 'sup-1',
          invoiceDate: new Date(),
          dueDate: new Date(),
          lines: [{ description: 'Part', quantity: 1, unitPrice: 100 }],
          shippingAmount: 15,
        },
        'user-1'
      );

      const data = mp.purchaseInvoice.create.mock.calls[0][0].data;
      expect(data.totalAmount).toBe(115);
    });

    it('should increment invoice number', async () => {
      const year = new Date().getFullYear();
      mp.purchaseInvoice.findFirst.mockResolvedValue({ invoiceNumber: `PI-${year}-0003` });
      mp.purchaseInvoice.create.mockImplementation(({ data }: { data: { invoiceNumber: string } }) =>
        Promise.resolve({ id: 'pi-3', invoiceNumber: data.invoiceNumber })
      );

      const result = await createPurchaseInvoice(
        {
          supplierId: 'sup-1',
          invoiceDate: new Date(),
          dueDate: new Date(),
          lines: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
        },
        'user-1'
      );

      expect(result.invoiceId).toBe('pi-3');
    });
  });

  describe('createSalesInvoice', () => {
    it('should create a sales invoice', async () => {
      mp.salesInvoice.findFirst.mockResolvedValue(null);
      mp.salesInvoice.create.mockResolvedValue({ id: 'si-1', invoiceNumber: 'INV-2026-0001' });

      const result = await createSalesInvoice(
        {
          customerId: 'cust-1',
          invoiceDate: new Date(),
          dueDate: new Date(),
          lines: [{ description: 'Product A', quantity: 2, unitPrice: 100, partId: 'part-1' }],
        },
        'user-1'
      );

      expect(result.invoiceId).toBe('si-1');
      const data = mp.salesInvoice.create.mock.calls[0][0].data;
      expect(data.subtotal).toBe(200);
      expect(data.totalAmount).toBe(200);
    });

    it('should apply discount and tax correctly', async () => {
      mp.salesInvoice.findFirst.mockResolvedValue(null);
      mp.salesInvoice.create.mockResolvedValue({ id: 'si-2', invoiceNumber: 'INV-2026-0001' });

      await createSalesInvoice(
        {
          customerId: 'cust-1',
          invoiceDate: new Date(),
          dueDate: new Date(),
          lines: [
            { description: 'Prod', quantity: 1, unitPrice: 100, discountPercent: 10, taxRate: 10 },
          ],
        },
        'user-1'
      );

      const data = mp.salesInvoice.create.mock.calls[0][0].data;
      expect(data.subtotal).toBe(100);
      expect(data.discountAmount).toBe(10);
      expect(data.taxAmount).toBe(9);
      expect(data.totalAmount).toBe(99); // 100 - 10 + 9
    });

    it('should calculate margin info', async () => {
      mp.salesInvoice.findFirst.mockResolvedValue(null);
      mp.salesInvoice.create.mockResolvedValue({ id: 'si-3', invoiceNumber: 'INV-2026-0001' });

      await createSalesInvoice(
        {
          customerId: 'cust-1',
          invoiceDate: new Date(),
          dueDate: new Date(),
          lines: [{ description: 'Prod', quantity: 10, unitPrice: 20, partId: 'part-1' }],
        },
        'user-1'
      );

      const data = mp.salesInvoice.create.mock.calls[0][0].data;
      // cost per unit = 5 (mocked), qty=10, totalCost=50, subtotal=200
      expect(data.totalCost).toBe(50);
      expect(data.grossMargin).toBe(150);
      expect(data.marginPercent).toBe(75);
    });
  });

  describe('recordPurchasePayment', () => {
    it('should record partial payment', async () => {
      mp.purchasePayment.findFirst.mockResolvedValue(null);
      mp.purchaseInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: 1000,
        paidAmount: 0,
        balanceDue: 1000,
        status: 'APPROVED',
      });
      mp.purchasePayment.create.mockResolvedValue({ id: 'pay-1', paymentNumber: 'PAY-AP-2026-0001' });
      mp.purchaseInvoice.update.mockResolvedValue({});

      const result = await recordPurchasePayment(
        { invoiceId: 'inv-1', paymentDate: new Date(), amount: 500, paymentMethod: 'CHECK' },
        'user-1'
      );

      expect(result.paymentId).toBe('pay-1');
      const updateData = mp.purchaseInvoice.update.mock.calls[0][0].data;
      expect(updateData.paidAmount).toBe(500);
      expect(updateData.balanceDue).toBe(500);
      expect(updateData.status).toBe('PARTIALLY_PAID');
    });

    it('should mark PAID when fully paid', async () => {
      mp.purchasePayment.findFirst.mockResolvedValue(null);
      mp.purchaseInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: 100,
        paidAmount: 50,
        status: 'PARTIALLY_PAID',
      });
      mp.purchasePayment.create.mockResolvedValue({ id: 'pay-2', paymentNumber: 'PAY-AP-2026-0001' });
      mp.purchaseInvoice.update.mockResolvedValue({});

      await recordPurchasePayment(
        { invoiceId: 'inv-1', paymentDate: new Date(), amount: 50, paymentMethod: 'WIRE' },
        'user-1'
      );

      expect(mp.purchaseInvoice.update.mock.calls[0][0].data.status).toBe('PAID');
    });

    it('should throw if invoice not found', async () => {
      mp.purchasePayment.findFirst.mockResolvedValue(null);
      mp.purchaseInvoice.findUnique.mockResolvedValue(null);

      await expect(
        recordPurchasePayment(
          { invoiceId: 'bad', paymentDate: new Date(), amount: 100, paymentMethod: 'CHECK' },
          'user-1'
        )
      ).rejects.toThrow('Invoice not found');
    });
  });

  describe('recordSalesPayment', () => {
    it('should record payment and update invoice', async () => {
      mp.salesPayment.findFirst.mockResolvedValue(null);
      mp.salesInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: 500,
        receivedAmount: 0,
        balanceDue: 500,
        status: 'SENT',
      });
      mp.salesPayment.create.mockResolvedValue({ id: 'pay-3', paymentNumber: 'PAY-AR-2026-0001' });
      mp.salesInvoice.update.mockResolvedValue({});

      const result = await recordSalesPayment(
        { invoiceId: 'inv-1', paymentDate: new Date(), amount: 500, paymentMethod: 'CREDIT_CARD' },
        'user-1'
      );

      expect(result.paymentId).toBe('pay-3');
      expect(mp.salesInvoice.update.mock.calls[0][0].data.status).toBe('PAID');
    });

    it('should throw if invoice not found', async () => {
      mp.salesPayment.findFirst.mockResolvedValue(null);
      mp.salesInvoice.findUnique.mockResolvedValue(null);

      await expect(
        recordSalesPayment(
          { invoiceId: 'bad', paymentDate: new Date(), amount: 100, paymentMethod: 'CHECK' },
          'user-1'
        )
      ).rejects.toThrow('Invoice not found');
    });
  });

  describe('getAPAging', () => {
    it('should categorize invoices by aging', async () => {
      const now = Date.now();
      mp.purchaseInvoice.findMany.mockResolvedValue([
        { dueDate: new Date(now + 5 * 86400000), balanceDue: 100 },   // current
        { dueDate: new Date(now - 20 * 86400000), balanceDue: 200 },  // 1-30 days
        { dueDate: new Date(now - 45 * 86400000), balanceDue: 300 },  // 31-60 days
        { dueDate: new Date(now - 75 * 86400000), balanceDue: 400 },  // 61-90 days
      ]);

      const result = await getAPAging();

      expect(result.current).toBe(100);
      expect(result.overdue30).toBe(200);
      expect(result.overdue60).toBe(300);
      expect(result.overdue90).toBe(400);
      expect(result.total).toBe(1000);
    });

    it('should return zeros when no invoices', async () => {
      mp.purchaseInvoice.findMany.mockResolvedValue([]);
      const result = await getAPAging();
      expect(result.total).toBe(0);
    });
  });

  describe('getARAging', () => {
    it('should categorize sales invoices by aging', async () => {
      const now = Date.now();
      mp.salesInvoice.findMany.mockResolvedValue([
        { dueDate: new Date(now + 5 * 86400000), balanceDue: 500 },
      ]);

      const result = await getARAging();
      expect(result.current).toBe(500);
      expect(result.total).toBe(500);
    });

    it('should return zeros when no invoices', async () => {
      mp.salesInvoice.findMany.mockResolvedValue([]);
      const result = await getARAging();
      expect(result.total).toBe(0);
    });
  });
});
