/**
 * Purchase Orders & Sales Orders API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE importing routes
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  default: {
    purchaseOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    purchaseOrderLine: { deleteMany: vi.fn() },
    supplier: { findUnique: vi.fn() },
    salesOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customer: { findUnique: vi.fn() },
    part: { findMany: vi.fn() },
    warehouse: { findFirst: vi.fn(), create: vi.fn() },
    inventory: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    lotTransaction: { create: vi.fn() },
    inspection: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
  prisma: {
    purchaseOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    purchaseOrderLine: { deleteMany: vi.fn() },
    supplier: { findUnique: vi.fn() },
    salesOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    customer: { findUnique: vi.fn() },
    part: { findMany: vi.fn() },
    warehouse: { findFirst: vi.fn(), create: vi.fn() },
    inventory: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    lotTransaction: { create: vi.fn() },
    inspection: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
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

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/workflow/workflow-triggers', () => ({
  triggerPurchaseOrderWorkflow: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/audit/route-audit', () => ({
  auditUpdate: vi.fn(),
  auditStatusChange: vi.fn(),
  auditDelete: vi.fn(),
}));

vi.mock('@/lib/quality/inspection-engine', () => ({
  generateInspectionNumber: vi.fn().mockResolvedValue('RI-2026-001'),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

import {
  GET as PO_LIST_GET,
  POST as PO_POST,
} from '../purchase-orders/route';

import {
  GET as PO_ID_GET,
  PUT as PO_ID_PUT,
  DELETE as PO_ID_DELETE,
} from '../purchase-orders/[id]/route';

import {
  GET as SO_LIST_GET,
  POST as SO_POST,
} from '../sales-orders/route';

import {
  GET as SO_ID_GET,
  PUT as SO_ID_PUT,
  DELETE as SO_ID_DELETE,
} from '../sales-orders/[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Admin session that satisfies withPermission */
const adminSession = {
  user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
};

/** Viewer session (read-only permissions) */
const viewerSession = {
  user: { id: 'user-4', email: 'viewer@rtr.vn', name: 'Viewer', role: 'viewer' },
};

/** Context for withAuth-wrapped routes (params is a Promise) */
const mockAuthContext = { params: Promise.resolve({}) };
const mockAuthContextWithId = (id: string) => ({ params: Promise.resolve({ id }) });

/** Context for withPermission-wrapped routes (params is a plain object) */
const mockPermCtx = (params?: Record<string, string>) => params ? { params } : undefined;

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  const init: NextRequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

// ===========================================================================
// PURCHASE ORDERS
// ===========================================================================

describe('Purchase Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/purchase-orders (list)
  // =========================================================================
  describe('GET /api/purchase-orders (list)', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders');
      const res = await PO_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated purchase orders successfully', async () => {
      const mockOrders = [
        { id: 'po-1', poNumber: 'PO-2026-001', status: 'draft', supplier: { id: 's1', code: 'S1', name: 'Sup 1' }, lines: [], _count: { lines: 0 } },
        { id: 'po-2', poNumber: 'PO-2026-002', status: 'pending', supplier: { id: 's2', code: 'S2', name: 'Sup 2' }, lines: [], _count: { lines: 0 } },
      ];

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.count as Mock).mockResolvedValue(2);
      (prisma.purchaseOrder.findMany as Mock).mockResolvedValue(mockOrders);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders');
      const res = await PO_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
    });

    it('should filter by status and supplierId', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.count as Mock).mockResolvedValue(0);
      (prisma.purchaseOrder.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders?status=draft&supplierId=sup-1');
      await PO_LIST_GET(req, mockAuthContext);

      expect(prisma.purchaseOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft', supplierId: 'sup-1' }),
        })
      );
    });

    it('should return 500 when database fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.count as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/purchase-orders');
      const res = await PO_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/purchase-orders
  // =========================================================================
  describe('POST /api/purchase-orders', () => {
    const validBody = {
      poNumber: 'PO-2026-010',
      supplierId: 'sup-1',
      orderDate: '2026-02-01',
      expectedDate: '2026-03-01',
      status: 'draft',
      lines: [{ partId: 'part-1', quantity: 10, unitPrice: 100 }],
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', validBody);
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user lacks permission', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', validBody);
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should create a purchase order successfully', async () => {
      const mockCreated = { id: 'po-new', poNumber: 'PO-2026-010', totalAmount: 1000, supplier: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(null); // no duplicate
      (prisma.supplier.findUnique as Mock).mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      (prisma.purchaseOrder.create as Mock).mockResolvedValue(mockCreated);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', validBody);
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.poNumber).toBe('PO-2026-010');
    });

    it('should auto-generate PO number when not provided', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findFirst as Mock).mockResolvedValue(null); // no existing POs for prefix
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(null);
      (prisma.supplier.findUnique as Mock).mockResolvedValue({ id: 'sup-1', name: 'Supplier A' });
      (prisma.purchaseOrder.create as Mock).mockResolvedValue({ id: 'po-auto', poNumber: `PO-${new Date().getFullYear()}-001`, supplier: {}, lines: [] });

      const body = { ...validBody, poNumber: undefined };
      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', body);
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should return 422 when supplierId is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', {
        orderDate: '2026-02-01',
        expectedDate: '2026-03-01',
      });
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 409 when PO number already exists', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({ id: 'existing', poNumber: 'PO-2026-010' });

      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', validBody);
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('should return 400 when supplier does not exist', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(null);
      (prisma.supplier.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders', 'POST', validBody);
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when request body is invalid JSON', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: 'not-valid-json{{{',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/purchase-orders/[id]
  // =========================================================================
  describe('GET /api/purchase-orders/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-1');
      const res = await PO_ID_GET(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return a single purchase order', async () => {
      const mockOrder = { id: 'po-1', poNumber: 'PO-2026-001', supplier: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(mockOrder);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-1');
      const res = await PO_ID_GET(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.poNumber).toBe('PO-2026-001');
    });

    it('should return 404 when PO not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/nonexistent');
      const res = await PO_ID_GET(req, { params: { id: 'nonexistent' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // PUT /api/purchase-orders/[id]
  // =========================================================================
  describe('PUT /api/purchase-orders/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders/po-1', 'PUT', { status: 'pending' });
      const res = await PO_ID_PUT(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should update a purchase order successfully', async () => {
      const existing = { id: 'po-1', poNumber: 'PO-2026-001', status: 'draft', lines: [] };
      const updated = { ...existing, status: 'pending', supplier: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(existing);
      (prisma.$transaction as Mock).mockResolvedValue(updated);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders/po-1', 'PUT', { status: 'pending' });
      const res = await PO_ID_PUT(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when PO not found for update', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders/no-po', 'PUT', { status: 'pending' });
      const res = await PO_ID_PUT(req, { params: { id: 'no-po' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when PO status is received (non-editable)', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({ id: 'po-1', status: 'received', lines: [] });

      const req = jsonRequest('http://localhost:3000/api/purchase-orders/po-1', 'PUT', { notes: 'late' });
      const res = await PO_ID_PUT(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 422 when validation fails', async () => {
      const existing = { id: 'po-1', poNumber: 'PO-2026-001', status: 'draft', lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(existing);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders/po-1', 'PUT', { status: 'invalid_status' });
      const res = await PO_ID_PUT(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 403 when viewer tries to update', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonRequest('http://localhost:3000/api/purchase-orders/po-1', 'PUT', { status: 'pending' });
      const res = await PO_ID_PUT(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // DELETE /api/purchase-orders/[id]
  // =========================================================================
  describe('DELETE /api/purchase-orders/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-1', { method: 'DELETE' });
      const res = await PO_ID_DELETE(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should hard-delete a draft PO', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({ id: 'po-1', poNumber: 'PO-001', status: 'draft' });
      (prisma.purchaseOrder.delete as Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-1', { method: 'DELETE' });
      const res = await PO_ID_DELETE(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should soft-cancel a pending PO', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({ id: 'po-2', poNumber: 'PO-002', status: 'pending' });
      (prisma.purchaseOrder.update as Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-2', { method: 'DELETE' });
      const res = await PO_ID_DELETE(req, { params: { id: 'po-2' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cancelled).toBe(true);
    });

    it('should return 404 when PO not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/no-po', { method: 'DELETE' });
      const res = await PO_ID_DELETE(req, { params: { id: 'no-po' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when PO is already received', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.purchaseOrder.findUnique as Mock).mockResolvedValue({ id: 'po-3', status: 'received' });

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-3', { method: 'DELETE' });
      const res = await PO_ID_DELETE(req, { params: { id: 'po-3' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 403 when viewer tries to delete', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = new NextRequest('http://localhost:3000/api/purchase-orders/po-1', { method: 'DELETE' });
      const res = await PO_ID_DELETE(req, { params: { id: 'po-1' } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });
});

// ===========================================================================
// SALES ORDERS
// ===========================================================================

describe('Sales Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/sales-orders (list)
  // =========================================================================
  describe('GET /api/sales-orders (list)', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/sales-orders');
      const res = await SO_LIST_GET(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated sales orders successfully', async () => {
      const mockOrders = [
        { id: 'so-1', orderNumber: 'SO-001', status: 'draft', customer: { id: 'c1', code: 'C1', name: 'Cust 1' }, lines: [], _count: { lines: 0 } },
      ];

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.count as Mock).mockResolvedValue(1);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue(mockOrders);

      const req = new NextRequest('http://localhost:3000/api/sales-orders');
      const res = await SO_LIST_GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(1);
    });

    it('should filter by status, customerId and priority', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.count as Mock).mockResolvedValue(0);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/sales-orders?status=pending&customerId=c-1&priority=high');
      await SO_LIST_GET(req);

      expect(prisma.salesOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending', customerId: 'c-1', priority: 'high' }),
        })
      );
    });

    it('should return 500 when database fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.count as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/sales-orders');
      const res = await SO_LIST_GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/sales-orders
  // =========================================================================
  describe('POST /api/sales-orders', () => {
    const validBody = {
      orderNumber: 'SO-2026-010',
      customerId: 'cust-1',
      orderDate: '2026-02-01',
      requiredDate: '2026-03-01',
      priority: 'normal',
      status: 'draft',
      lines: [{ productId: 'prod-1', quantity: 5, unitPrice: 200, discount: 10 }],
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', validBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when user lacks permission', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', validBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should create a sales order successfully', async () => {
      const mockCreated = { id: 'so-new', orderNumber: 'SO-2026-010', totalAmount: 900, customer: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Customer A' });
      (prisma.salesOrder.create as Mock).mockResolvedValue(mockCreated);

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', validBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.orderNumber).toBe('SO-2026-010');
    });

    it('should return 422 when orderNumber is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', {
        customerId: 'cust-1',
        orderDate: '2026-02-01',
        requiredDate: '2026-03-01',
      });
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 422 when customerId is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', {
        orderNumber: 'SO-001',
        orderDate: '2026-02-01',
        requiredDate: '2026-03-01',
      });
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 409 when order number already exists', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'existing', orderNumber: 'SO-2026-010' });

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', validBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('should return 400 when customer does not exist', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);
      (prisma.customer.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', validBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when request body is invalid JSON', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = new NextRequest('http://localhost:3000/api/sales-orders', {
        method: 'POST',
        body: '{{not json',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/sales-orders/[id]
  // =========================================================================
  describe('GET /api/sales-orders/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1');
      const res = await SO_ID_GET(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return a single sales order', async () => {
      const mockOrder = { id: 'so-1', orderNumber: 'SO-001', customer: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(mockOrder);

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1');
      const res = await SO_ID_GET(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.orderNumber).toBe('SO-001');
    });

    it('should return 404 when SO not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/sales-orders/nonexistent');
      const res = await SO_ID_GET(req, { params: { id: 'nonexistent' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // PUT /api/sales-orders/[id]
  // =========================================================================
  describe('PUT /api/sales-orders/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { status: 'pending' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should update a sales order successfully', async () => {
      const existing = { id: 'so-1', orderNumber: 'SO-001', status: 'draft' };
      const updated = { ...existing, status: 'pending', customer: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(existing);
      (prisma.salesOrder.update as Mock).mockResolvedValue(updated);

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { status: 'pending' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when SO not found for update', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/sales-orders/no-so', 'PUT', { status: 'pending' });
      const res = await SO_ID_PUT(req, { params: { id: 'no-so' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when SO is in completed status (non-editable)', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', status: 'completed' });

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { notes: 'updated' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 422 when validation fails on invalid status', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', status: 'draft' });

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { status: 'bogus_status' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 403 when viewer tries to update', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { notes: 'test' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // DELETE /api/sales-orders/[id]
  // =========================================================================
  describe('DELETE /api/sales-orders/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should hard-delete a draft SO', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', orderNumber: 'SO-001', status: 'draft' });
      (prisma.salesOrder.delete as Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should soft-cancel a pending SO', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-2', orderNumber: 'SO-002', status: 'pending' });
      (prisma.salesOrder.update as Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-2', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-2' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cancelled).toBe(true);
    });

    it('should return 404 when SO not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/sales-orders/no-so', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'no-so' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when SO is already completed', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-3', status: 'completed' });

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-3', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-3' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 403 when viewer tries to delete', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });
});
