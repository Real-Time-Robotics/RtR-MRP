/**
 * Customers, Sales Orders (additional), Employees & Warehouses API Route Tests
 *
 * Covers:
 * 1. GET/POST    /api/customers                (withAuth / withPermission)
 * 2. GET/PUT/DEL /api/customers/[id]           (withPermission)
 * 3. GET/POST    /api/sales-orders             (plain / withPermission) - extra edge cases
 * 4. GET/PUT/DEL /api/sales-orders/[id]        (withPermission) - extra edge cases
 * 5. GET/POST    /api/employees                (withAuth)
 * 6. GET/PUT/PATCH/DEL /api/employees/[id]     (withAuth)
 * 7. GET         /api/warehouses               (withAuth)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE importing routes
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => {
  const customer = {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const salesOrder = {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const employee = {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const employeeSkill = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const warehouse = {
    count: vi.fn(),
    findMany: vi.fn(),
  };

  const db = {
    customer,
    salesOrder,
    employee,
    employeeSkill,
    warehouse,
  };

  return { default: db, prisma: db };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/audit/route-audit', () => ({
  auditUpdate: vi.fn(),
  auditStatusChange: vi.fn(),
  auditDelete: vi.fn(),
}));

vi.mock('@/types', () => ({
  WAREHOUSE_FLOW_ORDER: {
    RECEIVING: 1,
    QUARANTINE: 2,
    MAIN: 3,
    WIP: 4,
    FINISHED_GOODS: 5,
    SHIPPING: 6,
    HOLD: 7,
    SCRAP: 8,
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Customer routes
import {
  GET as CUST_LIST_GET,
  POST as CUST_POST,
} from '../customers/route';
import {
  GET as CUST_ID_GET,
  PUT as CUST_ID_PUT,
  DELETE as CUST_ID_DELETE,
} from '../customers/[id]/route';

// Sales-order routes (extra edge-case tests)
import {
  GET as SO_LIST_GET,
  POST as SO_POST,
} from '../sales-orders/route';
import {
  GET as SO_ID_GET,
  PUT as SO_ID_PUT,
  DELETE as SO_ID_DELETE,
} from '../sales-orders/[id]/route';

// Employee routes
import {
  GET as EMP_LIST_GET,
  POST as EMP_POST,
} from '../employees/route';
import {
  GET as EMP_ID_GET,
  PUT as EMP_ID_PUT,
  PATCH as EMP_ID_PATCH,
  DELETE as EMP_ID_DELETE,
} from '../employees/[id]/route';

// Warehouse route
import { GET as WH_LIST_GET } from '../warehouses/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Admin session that satisfies both withAuth and withPermission */
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

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  const init: NextRequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

// ===========================================================================
// 1. CUSTOMERS
// ===========================================================================

describe('Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/customers (list) -- uses withAuth
  // =========================================================================
  describe('GET /api/customers (list)', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/customers');
      const res = await CUST_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated customers successfully', async () => {
      const mockCustomers = [
        { id: 'c-1', code: 'CUST-001', name: 'Acme Corp', status: 'active', _count: { salesOrders: 3 } },
        { id: 'c-2', code: 'CUST-002', name: 'Globex', status: 'active', _count: { salesOrders: 1 } },
      ];

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.count as Mock).mockResolvedValue(2);
      (prisma.customer.findMany as Mock).mockResolvedValue(mockCustomers);

      const req = new NextRequest('http://localhost:3000/api/customers');
      const res = await CUST_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
    });

    it('should filter customers by search query', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.count as Mock).mockResolvedValue(1);
      (prisma.customer.findMany as Mock).mockResolvedValue([
        { id: 'c-1', code: 'CUST-001', name: 'Acme Corp', _count: { salesOrders: 0 } },
      ]);

      const req = new NextRequest('http://localhost:3000/api/customers?search=Acme');
      const res = await CUST_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('should filter customers by status', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.count as Mock).mockResolvedValue(0);
      (prisma.customer.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/customers?status=inactive');
      await CUST_LIST_GET(req, mockAuthContext);

      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'inactive' }),
        })
      );
    });

    it('should filter customers by type', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.count as Mock).mockResolvedValue(0);
      (prisma.customer.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/customers?type=wholesale');
      await CUST_LIST_GET(req, mockAuthContext);

      expect(prisma.customer.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'wholesale' }),
        })
      );
    });

    it('should return empty data when no customers match', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.count as Mock).mockResolvedValue(0);
      (prisma.customer.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/customers?search=NoMatch');
      const res = await CUST_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.totalItems).toBe(0);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.count as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/customers');
      const res = await CUST_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/customers -- uses withPermission
  // =========================================================================
  describe('POST /api/customers', () => {
    const validBody = {
      code: 'CUST-NEW',
      name: 'New Customer Co.',
      country: 'VN',
      contactEmail: 'contact@newcustomer.vn',
      status: 'active',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', validBody);
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when viewer tries to create', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', validBody);
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should create a customer successfully', async () => {
      const mockCreated = { id: 'c-new', ...validBody };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(null);
      (prisma.customer.create as Mock).mockResolvedValue(mockCreated);

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', validBody);
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('CUST-NEW');
    });

    it('should return 422 when code is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', { name: 'No Code' });
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 422 when name is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', { code: 'CUST-001' });
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 422 when contactEmail is invalid', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', {
        code: 'CUST-001',
        name: 'Test',
        contactEmail: 'not-an-email',
      });
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return 409 when customer code already exists', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'existing', code: 'CUST-DUP' });

      const req = jsonRequest('http://localhost:3000/api/customers', 'POST', {
        code: 'CUST-DUP',
        name: 'Duplicate',
      });
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('should return 400 when request body is invalid JSON', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: '{{invalid json',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await CUST_POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/customers/[id] -- uses withPermission
  // =========================================================================
  describe('GET /api/customers/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/customers/c-1');
      const res = await CUST_ID_GET(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return a single customer with sales orders', async () => {
      const mockCustomer = {
        id: 'c-1',
        code: 'CUST-001',
        name: 'Acme Corp',
        salesOrders: [{ id: 'so-1', orderNumber: 'SO-001', status: 'draft' }],
        _count: { salesOrders: 1 },
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(mockCustomer);

      const req = new NextRequest('http://localhost:3000/api/customers/c-1');
      const res = await CUST_ID_GET(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('CUST-001');
      expect(data.data.salesOrders).toHaveLength(1);
    });

    it('should return 404 when customer not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/customers/nonexistent');
      const res = await CUST_ID_GET(req, { params: { id: 'nonexistent' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // PUT /api/customers/[id] -- uses withPermission
  // =========================================================================
  describe('PUT /api/customers/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/customers/c-1', 'PUT', { name: 'Updated' });
      const res = await CUST_ID_PUT(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when viewer tries to update', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonRequest('http://localhost:3000/api/customers/c-1', 'PUT', { name: 'Updated' });
      const res = await CUST_ID_PUT(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should update a customer successfully', async () => {
      const existing = { id: 'c-1', code: 'CUST-001', name: 'Acme Corp', status: 'active' };
      const updated = { ...existing, name: 'Acme Corp Updated' };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(existing);
      (prisma.customer.update as Mock).mockResolvedValue(updated);

      const req = jsonRequest('http://localhost:3000/api/customers/c-1', 'PUT', { name: 'Acme Corp Updated' });
      const res = await CUST_ID_PUT(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Acme Corp Updated');
    });

    it('should return 404 when customer not found for update', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/customers/no-c', 'PUT', { name: 'X' });
      const res = await CUST_ID_PUT(req, { params: { id: 'no-c' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 409 when updating code to an existing code', async () => {
      const existing = { id: 'c-1', code: 'CUST-001', name: 'Acme' };

      (auth as Mock).mockResolvedValue(adminSession);
      // First call: find the customer being updated
      (prisma.customer.findUnique as Mock)
        .mockResolvedValueOnce(existing)
        // Second call: check if new code already exists
        .mockResolvedValueOnce({ id: 'c-other', code: 'CUST-DUP' });

      const req = jsonRequest('http://localhost:3000/api/customers/c-1', 'PUT', { code: 'CUST-DUP' });
      const res = await CUST_ID_PUT(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('should return 422 when contactEmail is invalid in update', async () => {
      const existing = { id: 'c-1', code: 'CUST-001', name: 'Acme' };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(existing);

      const req = jsonRequest('http://localhost:3000/api/customers/c-1', 'PUT', { contactEmail: 'bad-email' });
      const res = await CUST_ID_PUT(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 400 when request body is invalid JSON', async () => {
      const existing = { id: 'c-1', code: 'CUST-001', name: 'Acme' };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(existing);

      const req = new NextRequest('http://localhost:3000/api/customers/c-1', {
        method: 'PUT',
        body: '{{{invalid',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await CUST_ID_PUT(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // DELETE /api/customers/[id] -- uses withPermission
  // =========================================================================
  describe('DELETE /api/customers/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/customers/c-1', { method: 'DELETE' });
      const res = await CUST_ID_DELETE(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 when viewer tries to delete', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = new NextRequest('http://localhost:3000/api/customers/c-1', { method: 'DELETE' });
      const res = await CUST_ID_DELETE(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should soft-delete a customer (set status to inactive)', async () => {
      const existing = {
        id: 'c-1',
        code: 'CUST-001',
        name: 'Acme',
        _count: { salesOrders: 0 },
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(existing);
      (prisma.customer.update as Mock).mockResolvedValue({ ...existing, status: 'inactive' });

      const req = new NextRequest('http://localhost:3000/api/customers/c-1', { method: 'DELETE' });
      const res = await CUST_ID_DELETE(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should return 404 when customer not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/customers/no-c', { method: 'DELETE' });
      const res = await CUST_ID_DELETE(req, { params: { id: 'no-c' } });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 409 when customer has active sales orders', async () => {
      const existing = {
        id: 'c-1',
        code: 'CUST-001',
        name: 'Acme',
        _count: { salesOrders: 3 },
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.customer.findUnique as Mock).mockResolvedValue(existing);

      const req = new NextRequest('http://localhost:3000/api/customers/c-1', { method: 'DELETE' });
      const res = await CUST_ID_DELETE(req, { params: { id: 'c-1' } });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.success).toBe(false);
    });
  });
});

// ===========================================================================
// 2. SALES ORDERS - Additional edge-case tests
// ===========================================================================

describe('Sales Orders API (additional edge cases)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/sales-orders -- search by order number / customer name
  // =========================================================================
  describe('GET /api/sales-orders (search)', () => {
    it('should search by order number or customer name', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.count as Mock).mockResolvedValue(1);
      (prisma.salesOrder.findMany as Mock).mockResolvedValue([
        { id: 'so-1', orderNumber: 'SO-SEARCH-001', customer: { id: 'c1', code: 'C1', name: 'Searched' }, lines: [], _count: { lines: 0 } },
      ]);

      const req = new NextRequest('http://localhost:3000/api/sales-orders?search=SEARCH');
      const res = await SO_LIST_GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(prisma.salesOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ orderNumber: { contains: 'SEARCH', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });
  });

  // =========================================================================
  // POST /api/sales-orders -- total amount calculation
  // =========================================================================
  describe('POST /api/sales-orders (total calculation)', () => {
    it('should calculate totalAmount from lines with discount', async () => {
      const orderBody = {
        orderNumber: 'SO-CALC',
        customerId: 'cust-1',
        orderDate: '2026-02-01',
        requiredDate: '2026-03-01',
        lines: [
          { productId: 'p1', quantity: 10, unitPrice: 100, discount: 10 },
          { productId: 'p2', quantity: 5, unitPrice: 200, discount: 0 },
        ],
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Cust' });
      (prisma.salesOrder.create as Mock).mockResolvedValue({
        id: 'so-calc',
        orderNumber: 'SO-CALC',
        totalAmount: 1900,
        customer: {},
        lines: [],
      });

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', orderBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      // Verify create was called with correct totalAmount: (10*100*0.9) + (5*200*1.0) = 900 + 1000 = 1900
      expect(prisma.salesOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 1900,
          }),
        })
      );
    });

    it('should create order without lines (totalAmount = 0)', async () => {
      const orderBody = {
        orderNumber: 'SO-NOLINE',
        customerId: 'cust-1',
        orderDate: '2026-02-01',
        requiredDate: '2026-03-01',
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(null);
      (prisma.customer.findUnique as Mock).mockResolvedValue({ id: 'cust-1', name: 'Cust' });
      (prisma.salesOrder.create as Mock).mockResolvedValue({
        id: 'so-noline',
        orderNumber: 'SO-NOLINE',
        totalAmount: 0,
        customer: {},
        lines: [],
      });

      const req = jsonRequest('http://localhost:3000/api/sales-orders', 'POST', orderBody);
      const res = await SO_POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(prisma.salesOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmount: 0 }),
        })
      );
    });
  });

  // =========================================================================
  // PUT /api/sales-orders/[id] -- editable statuses
  // =========================================================================
  describe('PUT /api/sales-orders/[id] (editable status checks)', () => {
    it('should allow editing a confirmed order', async () => {
      const existing = { id: 'so-1', orderNumber: 'SO-001', status: 'confirmed' };
      const updated = { ...existing, notes: 'updated note', customer: {}, lines: [] };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue(existing);
      (prisma.salesOrder.update as Mock).mockResolvedValue(updated);

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { notes: 'updated note' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject editing an in_progress order', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', status: 'in_progress' });

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { notes: 'test' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject editing a cancelled order', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', status: 'cancelled' });

      const req = jsonRequest('http://localhost:3000/api/sales-orders/so-1', 'PUT', { notes: 'test' });
      const res = await SO_ID_PUT(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // DELETE /api/sales-orders/[id] -- cancel vs delete
  // =========================================================================
  describe('DELETE /api/sales-orders/[id] (cancel vs delete logic)', () => {
    it('should soft-cancel a confirmed order', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', status: 'confirmed' });
      (prisma.salesOrder.update as Mock).mockResolvedValue({});

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cancelled).toBe(true);
    });

    it('should return 400 when trying to delete a cancelled order', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.salesOrder.findUnique as Mock).mockResolvedValue({ id: 'so-1', status: 'cancelled' });

      const req = new NextRequest('http://localhost:3000/api/sales-orders/so-1', { method: 'DELETE' });
      const res = await SO_ID_DELETE(req, { params: { id: 'so-1' } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});

// ===========================================================================
// 3. EMPLOYEES
// ===========================================================================

describe('Employees API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/employees (list) -- uses withAuth
  // =========================================================================
  describe('GET /api/employees (list)', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/employees');
      const res = await EMP_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated employees successfully', async () => {
      const mockEmployees = [
        { id: 'e-1', employeeCode: 'EMP-001', firstName: 'John', lastName: 'Doe', status: 'active', _count: { skills: 2, shiftAssignments: 1 } },
        { id: 'e-2', employeeCode: 'EMP-002', firstName: 'Jane', lastName: 'Smith', status: 'active', _count: { skills: 0, shiftAssignments: 0 } },
      ];

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.count as Mock).mockResolvedValue(2);
      (prisma.employee.findMany as Mock).mockResolvedValue(mockEmployees);

      const req = new NextRequest('http://localhost:3000/api/employees');
      const res = await EMP_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
    });

    it('should filter employees by search query', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.count as Mock).mockResolvedValue(1);
      (prisma.employee.findMany as Mock).mockResolvedValue([
        { id: 'e-1', employeeCode: 'EMP-001', firstName: 'John', lastName: 'Doe', _count: { skills: 0, shiftAssignments: 0 } },
      ]);

      const req = new NextRequest('http://localhost:3000/api/employees?search=John');
      const res = await EMP_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it('should filter employees by status', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.count as Mock).mockResolvedValue(0);
      (prisma.employee.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/employees?status=terminated');
      await EMP_LIST_GET(req, mockAuthContext);

      expect(prisma.employee.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'terminated' }),
        })
      );
    });

    it('should filter employees by department', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.count as Mock).mockResolvedValue(0);
      (prisma.employee.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/employees?department=Engineering');
      await EMP_LIST_GET(req, mockAuthContext);

      expect(prisma.employee.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ department: 'Engineering' }),
        })
      );
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.count as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/employees');
      const res = await EMP_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/employees -- uses withAuth
  // =========================================================================
  describe('POST /api/employees', () => {
    const validBody = {
      employeeCode: 'EMP-NEW',
      firstName: 'New',
      lastName: 'Employee',
      email: 'new@rtr.vn',
      department: 'Production',
      position: 'Operator',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', validBody);
      const res = await EMP_POST(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should create an employee successfully', async () => {
      const mockCreated = {
        id: 'e-new',
        employeeCode: 'EMP-NEW',
        firstName: 'New',
        lastName: 'Employee',
        email: 'new@rtr.vn',
        status: 'active',
        employmentType: 'full_time',
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.create as Mock).mockResolvedValue(mockCreated);

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', validBody);
      const res = await EMP_POST(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.employeeCode).toBe('EMP-NEW');
      expect(data.status).toBe('active');
    });

    it('should return 400 when employeeCode is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', {
        firstName: 'No',
        lastName: 'Code',
      });
      const res = await EMP_POST(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when firstName is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', {
        employeeCode: 'EMP-001',
        lastName: 'NoFirst',
      });
      const res = await EMP_POST(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when lastName is missing', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', {
        employeeCode: 'EMP-001',
        firstName: 'NoLast',
      });
      const res = await EMP_POST(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 500 when database create fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.create as Mock).mockRejectedValue(new Error('DB constraint'));

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', validBody);
      const res = await EMP_POST(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should set default employmentType to full_time', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.create as Mock).mockResolvedValue({
        id: 'e-def',
        ...validBody,
        employmentType: 'full_time',
        status: 'active',
      });

      const req = jsonRequest('http://localhost:3000/api/employees', 'POST', validBody);
      await EMP_POST(req, mockAuthContext);

      expect(prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employmentType: 'full_time',
            status: 'active',
          }),
        })
      );
    });
  });

  // =========================================================================
  // GET /api/employees/[id] -- uses withAuth
  // =========================================================================
  describe('GET /api/employees/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/employees/e-1');
      const res = await EMP_ID_GET(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return a single employee with skills and shifts', async () => {
      const mockEmployee = {
        id: 'e-1',
        employeeCode: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        skills: [{ skill: { id: 's1', code: 'SK-001', name: 'Welding' }, level: 3 }],
        shiftAssignments: [],
      };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.findUnique as Mock).mockResolvedValue(mockEmployee);

      const req = new NextRequest('http://localhost:3000/api/employees/e-1');
      const res = await EMP_ID_GET(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.employeeCode).toBe('EMP-001');
      expect(data.skills).toHaveLength(1);
    });

    it('should return 404 when employee not found', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/employees/nonexistent');
      const res = await EMP_ID_GET(req, mockAuthContextWithId('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Employee not found');
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/employees/e-1');
      const res = await EMP_ID_GET(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch employee');
    });
  });

  // =========================================================================
  // PUT /api/employees/[id] -- uses withAuth
  // =========================================================================
  describe('PUT /api/employees/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PUT', { firstName: 'Updated' });
      const res = await EMP_ID_PUT(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should update an employee successfully', async () => {
      const updated = { id: 'e-1', employeeCode: 'EMP-001', firstName: 'Updated', lastName: 'Doe' };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.update as Mock).mockResolvedValue(updated);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PUT', { firstName: 'Updated' });
      const res = await EMP_ID_PUT(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.firstName).toBe('Updated');
    });

    it('should return 400 when validation fails (invalid email)', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PUT', { email: 'not-an-email' });
      const res = await EMP_ID_PUT(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when hourlyRate is negative', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PUT', { hourlyRate: -10 });
      const res = await EMP_ID_PUT(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 500 when database update fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.update as Mock).mockRejectedValue(new Error('DB error'));

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PUT', { firstName: 'Fail' });
      const res = await EMP_ID_PUT(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to update employee');
    });
  });

  // =========================================================================
  // PATCH /api/employees/[id] -- skill management, uses withAuth
  // =========================================================================
  describe('PATCH /api/employees/[id] (skill management)', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PATCH', { action: 'addSkill', skillId: 's1' });
      const res = await EMP_ID_PATCH(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should add a skill to an employee', async () => {
      const mockSkill = { employeeId: 'e-1', skillId: 's1', level: 1, proficiency: 'beginner', skill: { id: 's1', name: 'Welding' } };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employeeSkill.create as Mock).mockResolvedValue(mockSkill);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PATCH', {
        action: 'addSkill',
        skillId: 's1',
        level: 1,
        proficiency: 'beginner',
      });
      const res = await EMP_ID_PATCH(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.skillId).toBe('s1');
    });

    it('should update a skill for an employee', async () => {
      const mockUpdated = { employeeId: 'e-1', skillId: 's1', level: 3, proficiency: 'advanced', skill: { id: 's1', name: 'Welding' } };

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employeeSkill.update as Mock).mockResolvedValue(mockUpdated);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PATCH', {
        action: 'updateSkill',
        skillId: 's1',
        level: 3,
        proficiency: 'advanced',
      });
      const res = await EMP_ID_PATCH(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.level).toBe(3);
    });

    it('should remove a skill from an employee', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employeeSkill.delete as Mock).mockResolvedValue({});

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PATCH', {
        action: 'removeSkill',
        skillId: 's1',
      });
      const res = await EMP_ID_PATCH(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid action', async () => {
      (auth as Mock).mockResolvedValue(adminSession);

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PATCH', {
        action: 'invalidAction',
        skillId: 's1',
      });
      const res = await EMP_ID_PATCH(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });

    it('should return 500 when skill operation fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employeeSkill.create as Mock).mockRejectedValue(new Error('DB error'));

      const req = jsonRequest('http://localhost:3000/api/employees/e-1', 'PATCH', {
        action: 'addSkill',
        skillId: 's1',
      });
      const res = await EMP_ID_PATCH(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to manage employee skills');
    });
  });

  // =========================================================================
  // DELETE /api/employees/[id] -- uses withAuth (soft delete)
  // =========================================================================
  describe('DELETE /api/employees/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/employees/e-1', { method: 'DELETE' });
      const res = await EMP_ID_DELETE(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should soft-delete an employee (set status to terminated)', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.update as Mock).mockResolvedValue({
        id: 'e-1',
        status: 'terminated',
        terminationDate: new Date(),
      });

      const req = new NextRequest('http://localhost:3000/api/employees/e-1', { method: 'DELETE' });
      const res = await EMP_ID_DELETE(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'e-1' },
          data: expect.objectContaining({
            status: 'terminated',
          }),
        })
      );
    });

    it('should return 500 when database delete fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.employee.update as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/employees/e-1', { method: 'DELETE' });
      const res = await EMP_ID_DELETE(req, mockAuthContextWithId('e-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to delete employee');
    });
  });
});

// ===========================================================================
// 4. WAREHOUSES
// ===========================================================================

describe('Warehouses API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/warehouses -- uses withAuth
  // =========================================================================
  describe('GET /api/warehouses (list)', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/warehouses');
      const res = await WH_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated warehouses sorted by material flow', async () => {
      const mockWarehouses = [
        { id: 'w-3', code: 'WH-MAIN', name: 'Main Warehouse', type: 'MAIN' },
        { id: 'w-1', code: 'WH-RCV', name: 'Receiving Dock', type: 'RECEIVING' },
        { id: 'w-2', code: 'WH-QAR', name: 'Quarantine Area', type: 'QUARANTINE' },
      ];

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.warehouse.count as Mock).mockResolvedValue(3);
      (prisma.warehouse.findMany as Mock).mockResolvedValue(mockWarehouses);

      const req = new NextRequest('http://localhost:3000/api/warehouses');
      const res = await WH_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(3);
      // Verify sorting: RECEIVING (1) < QUARANTINE (2) < MAIN (3)
      expect(data.data[0].type).toBe('RECEIVING');
      expect(data.data[1].type).toBe('QUARANTINE');
      expect(data.data[2].type).toBe('MAIN');
    });

    it('should return empty data when no warehouses exist', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.warehouse.count as Mock).mockResolvedValue(0);
      (prisma.warehouse.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/warehouses');
      const res = await WH_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.totalItems).toBe(0);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.warehouse.count as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/warehouses');
      const res = await WH_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle warehouses with unknown type gracefully', async () => {
      const mockWarehouses = [
        { id: 'w-1', code: 'WH-MAIN', name: 'Main', type: 'MAIN' },
        { id: 'w-2', code: 'WH-CUSTOM', name: 'Custom', type: 'UNKNOWN_TYPE' },
      ];

      (auth as Mock).mockResolvedValue(adminSession);
      (prisma.warehouse.count as Mock).mockResolvedValue(2);
      (prisma.warehouse.findMany as Mock).mockResolvedValue(mockWarehouses);

      const req = new NextRequest('http://localhost:3000/api/warehouses');
      const res = await WH_LIST_GET(req, mockAuthContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      // MAIN (order 3) should come before UNKNOWN_TYPE (order 99)
      expect(data.data[0].type).toBe('MAIN');
      expect(data.data[1].type).toBe('UNKNOWN_TYPE');
    });
  });
});
