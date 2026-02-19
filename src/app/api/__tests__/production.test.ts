/**
 * Production API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../production/route';
import prisma from '@/lib/prisma';
import { createWorkOrder } from '@/lib/mrp-engine';
import { auth } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    workOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/mrp-engine', () => ({
  createWorkOrder: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('Production API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/production
  // ===========================================================================
  describe('GET /api/production', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/production');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated work orders successfully', async () => {
      const mockWorkOrders = [
        {
          id: 'wo-1',
          woNumber: 'WO-2026-000001',
          status: 'PLANNED',
          priority: 'normal',
          quantity: 100,
          product: { id: 'prod-1', name: 'Widget A', sku: 'SKU-001' },
          salesOrder: {
            id: 'so-1',
            orderNumber: 'SO-001',
            customer: { id: 'cust-1', name: 'Acme Corp' },
          },
          allocations: [],
          createdAt: new Date('2026-01-15'),
        },
        {
          id: 'wo-2',
          woNumber: 'WO-2026-000002',
          status: 'IN_PROGRESS',
          priority: 'high',
          quantity: 50,
          product: { id: 'prod-2', name: 'Widget B', sku: 'SKU-002' },
          salesOrder: null,
          allocations: [],
          createdAt: new Date('2026-01-16'),
        },
      ];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.workOrder.count as Mock).mockResolvedValue(2);
      (prisma.workOrder.findMany as Mock).mockResolvedValue(mockWorkOrders);

      const request = new NextRequest('http://localhost:3000/api/production');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
    });

    it('should pass status filter to query', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.workOrder.count as Mock).mockResolvedValue(0);
      (prisma.workOrder.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/production?status=PLANNED');
      await GET(request, mockContext);

      expect(prisma.workOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PLANNED' }),
        })
      );
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.workOrder.count as Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/production');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch work orders');
    });
  });

  // ===========================================================================
  // POST /api/production
  // ===========================================================================
  describe('POST /api/production', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', quantity: 10 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create a work order successfully', async () => {
      const mockWorkOrder = {
        id: 'wo-new-1',
        woNumber: 'WO-2026-123456',
        status: 'PLANNED',
        quantity: 50,
        productId: 'prod-1',
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (createWorkOrder as Mock).mockResolvedValue(mockWorkOrder);

      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', quantity: 50 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockWorkOrder);
      expect(data.message).toBe('Work order created successfully');
      expect(createWorkOrder).toHaveBeenCalledWith(
        'prod-1',
        50,
        undefined, // salesOrderId
        undefined, // salesOrderLine
        undefined, // plannedStart
        'normal',  // priority default
        'user-1',  // userId from session
        'DISCRETE', // woType default
        undefined, // batchSize
      );
    });

    it('should return 400 when productId is missing', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({ quantity: 10 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when quantity is missing', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when quantity is less than 1', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-1', quantity: 0 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should pass optional fields to createWorkOrder', async () => {
      const mockWorkOrder = { id: 'wo-new-2', woNumber: 'WO-2026-654321' };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (createWorkOrder as Mock).mockResolvedValue(mockWorkOrder);

      const plannedStart = '2026-03-01T00:00:00.000Z';
      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'prod-1',
          quantity: 100,
          salesOrderId: 'so-1',
          salesOrderLine: 1,
          plannedStart,
          priority: 'high',
          woType: 'BATCH',
          batchSize: 25,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(createWorkOrder).toHaveBeenCalledWith(
        'prod-1',
        100,
        'so-1',
        1,
        new Date(plannedStart),
        'high',
        'user-1',
        'BATCH',
        25,
      );
    });

    it('should return 500 when createWorkOrder throws an error', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (createWorkOrder as Mock).mockRejectedValue(new Error('Product not found'));

      const request = new NextRequest('http://localhost:3000/api/production', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod-nonexistent', quantity: 10 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create work order');
    });
  });
});
