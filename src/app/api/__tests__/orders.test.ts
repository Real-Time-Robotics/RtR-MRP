/**
 * Orders API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../orders/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
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

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/orders
  // ===========================================================================
  describe('GET /api/orders', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/orders');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated orders successfully', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderNumber: 'SO-00001',
          status: 'draft',
          totalAmount: 1000,
          createdAt: new Date().toISOString(),
          customer: { id: 'cust-1', name: 'Customer A' },
          lines: [],
        },
        {
          id: 'order-2',
          orderNumber: 'SO-00002',
          status: 'draft',
          totalAmount: 2000,
          createdAt: new Date().toISOString(),
          customer: { id: 'cust-2', name: 'Customer B' },
          lines: [],
        },
      ];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.salesOrder.count as Mock).mockResolvedValue(2);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue(mockOrders);

      const request = new NextRequest('http://localhost:3000/api/orders?page=1&pageSize=50');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
      expect(data.pagination.page).toBe(1);
    });

    it('should apply status filter', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.salesOrder.count as Mock).mockResolvedValue(0);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/orders?status=draft');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      expect(prisma.salesOrder.findMany).toHaveBeenCalled();
      // Verify the where clause includes the status filter
      const findManyCall = (prisma.salesOrder.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('status', 'draft');
    });

    it('should apply customerId filter', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.salesOrder.count as Mock).mockResolvedValue(0);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/orders?customerId=cust-1');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.salesOrder.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('customerId', 'cust-1');
    });

    it('should apply search filter on orderNumber', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.salesOrder.count as Mock).mockResolvedValue(0);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/orders?search=SO-0001');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.salesOrder.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('OR');
    });

    it('should handle pagination parameters', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.salesOrder.count as Mock).mockResolvedValue(100);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/orders?page=2&pageSize=20');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.pageSize).toBe(20);
      expect(data.pagination.totalItems).toBe(100);
      expect(data.pagination.totalPages).toBe(5);
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.hasPrevPage).toBe(true);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.salesOrder.count as Mock).mockRejectedValue(new Error('Database connection error'));

      const request = new NextRequest('http://localhost:3000/api/orders');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch orders');
    });
  });

  // ===========================================================================
  // POST /api/orders
  // ===========================================================================
  describe('POST /api/orders', () => {
    const validOrderBody = {
      customerId: 'cust-1',
      requiredDate: '2026-03-01',
      items: [
        { productId: 'prod-1', quantity: 10, unitPrice: 100 },
      ],
      priority: 'normal',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when body is missing required fields', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({ customerId: 'cust-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should return 400 when items array is empty', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          items: [],
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 when customer does not exist', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.customer.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('không tồn tại');
    });

    it('should return 400 when a product does not exist', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Customer A' });
      (prisma.product.findMany as Mock).mockResolvedValue([]); // no products found

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Sản phẩm không tồn tại');
    });

    it('should create an order successfully', async () => {
      const mockCreatedOrder = {
        id: 'order-new',
        orderNumber: 'SO-00001',
        customerId: 'cust-1',
        status: 'draft',
        totalAmount: 1000,
        customer: { id: 'cust-1', name: 'Customer A', code: 'CA' },
        lines: [
          {
            lineNumber: 1,
            productId: 'prod-1',
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000,
            product: { id: 'prod-1', name: 'Product A', sku: 'SKU-A' },
          },
        ],
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Customer A' });
      (prisma.product.findMany as Mock).mockResolvedValue([{ id: 'prod-1' }]);
      (prisma.salesOrder.findFirst as Mock).mockResolvedValue(null); // no existing orders
      (prisma.salesOrder.create as Mock).mockResolvedValue(mockCreatedOrder);

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.orderNumber).toBe('SO-00001');
      expect(data.customer.id).toBe('cust-1');
      expect(data.lines).toHaveLength(1);
    });

    it('should generate sequential order number', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Customer A' });
      (prisma.product.findMany as Mock).mockResolvedValue([{ id: 'prod-1' }]);
      (prisma.salesOrder.findFirst as Mock).mockResolvedValue({ orderNumber: 'SO-00042' });
      (prisma.salesOrder.create as Mock).mockResolvedValue({
        id: 'order-new',
        orderNumber: 'SO-00043',
      });

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
        headers: { 'Content-Type': 'application/json' },
      });
      await POST(request, mockContext);

      const createCall = (prisma.salesOrder.create as Mock).mock.calls[0][0];
      expect(createCall.data.orderNumber).toBe('SO-00043');
    });

    it('should return 400 when item quantity is less than 1', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...validOrderBody,
          items: [{ productId: 'prod-1', quantity: 0, unitPrice: 100 }],
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 500 when order creation fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Customer A' });
      (prisma.product.findMany as Mock).mockResolvedValue([{ id: 'prod-1' }]);
      (prisma.salesOrder.findFirst as Mock).mockResolvedValue(null);
      (prisma.salesOrder.create as Mock).mockRejectedValue(new Error('DB write error'));

      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create order');
    });
  });
});
