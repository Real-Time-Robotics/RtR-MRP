/**
 * Inventory Sub-routes & Warehouse Receipt API Route Tests
 *
 * Covers:
 * 1. GET/PATCH  /api/inventory/[id]
 * 2. POST       /api/inventory/adjust
 * 3. GET/POST   /api/inventory/cycle-count
 * 4. GET        /api/inventory/expiry-alerts
 * 5. GET/POST   /api/inventory/issue
 * 6. GET        /api/warehouse-receipts
 * 7. POST       /api/warehouse-receipts/[id]/confirm
 * 8. POST       /api/warehouse-receipts/[id]/reject
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------
import { GET as getInventoryById, PATCH as patchInventory } from '../inventory/[id]/route';
import { POST as postAdjust } from '../inventory/adjust/route';
import { GET as getCycleCount, POST as postCycleCount } from '../inventory/cycle-count/route';
import { GET as getExpiryAlerts } from '../inventory/expiry-alerts/route';
import { GET as getIssue, POST as postIssue } from '../inventory/issue/route';
import { GET as getWarehouseReceipts } from '../warehouse-receipts/route';
import { POST as postConfirm } from '../warehouse-receipts/[id]/confirm/route';
import { POST as postReject } from '../warehouse-receipts/[id]/reject/route';

// ---------------------------------------------------------------------------
// Dependency imports (mocked below)
// ---------------------------------------------------------------------------
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => {
  const inventory = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  const inspection = { findMany: vi.fn() };
  const warehouse = { findFirst: vi.fn() };
  const lotTransaction = { create: vi.fn() };
  const materialAllocation = { findMany: vi.fn(), findUnique: vi.fn() };
  const productionReceipt = { count: vi.fn(), findMany: vi.fn() };
  const p = {
    inventory,
    inspection,
    warehouse,
    lotTransaction,
    materialAllocation,
    productionReceipt,
    $transaction: vi.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        inventory: { update: vi.fn(), create: vi.fn() },
        lotTransaction: { create: vi.fn() },
      })
    ),
  };
  return { prisma: p, default: p };
});

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
    audit: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/audit/route-audit', () => ({
  auditUpdate: vi.fn(),
  getAuditContext: vi.fn(),
  getFieldChanges: vi.fn(),
}));

vi.mock('@/lib/inventory/cycle-count-service', () => ({
  generateCycleCountList: vi.fn(),
  recordCycleCount: vi.fn(),
}));

vi.mock('@/lib/inventory/expiry-alert-service', () => ({
  getExpiryAlerts: vi.fn(),
}));

vi.mock('@/lib/mrp-engine', () => ({
  issueMaterials: vi.fn(),
  issueAdHocMaterials: vi.fn(),
  confirmProductionReceipt: vi.fn(),
  rejectProductionReceipt: vi.fn(),
}));

vi.mock('@/lib/error-handler', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/error-handler')>();
  return {
    ...actual,
    handleError: vi.fn((error: unknown) => {
      // Reproduce minimal handleError behaviour for test assertions
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NextResponse } = require('next/server');
      if (error instanceof Error) {
        const appErr = error as { statusCode?: number; code?: string };
        return NextResponse.json(
          { success: false, error: error.message, code: appErr.code || 'INTERNAL_ERROR' },
          { status: appErr.statusCode || 500 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
        { status: 500 }
      );
    }),
    successResponse: vi.fn((data: unknown, message?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NextResponse } = require('next/server');
      return NextResponse.json({ success: true, data, message }, { status: 200 });
    }),
  };
});

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn(() => ({
    page: 1,
    pageSize: 50,
    sortBy: undefined,
    sortOrder: 'desc',
  })),
  buildOffsetPaginationQuery: vi.fn(() => ({ skip: 0, take: 50 })),
  buildPaginatedResponse: vi.fn(
    (data: unknown[], totalCount: number, params: unknown, startTime: number) => ({
      data,
      pagination: { page: 1, pageSize: 50, totalItems: totalCount, totalPages: 1 },
      meta: { took: Date.now() - startTime, cached: false },
    })
  ),
  paginatedSuccess: vi.fn(),
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
}));

vi.mock('@/lib/compliance/audit-trail', () => ({
  createAuditMiddleware: vi.fn(),
}));

// Lazy-import mocked modules for use inside tests
import { generateCycleCountList, recordCycleCount } from '@/lib/inventory/cycle-count-service';
import { getExpiryAlerts as getExpiryAlertsFn } from '@/lib/inventory/expiry-alert-service';
import { issueMaterials, issueAdHocMaterials, confirmProductionReceipt, rejectProductionReceipt } from '@/lib/mrp-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** withAuth context (Next.js 15 async params, no id) */
const noIdCtx = { params: Promise.resolve({}) };

/** withAuth context with id param */
function idCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Authenticated admin session for withAuth (from @/lib/api/with-auth) */
const adminSession = {
  user: { id: 'user-1', name: 'Admin', email: 'admin@rtr.vn', role: 'admin' },
};

/** Authenticated admin session for withAuth (from @/lib/auth/middleware) */
const mwAdminSession = {
  user: { id: 'user-1', name: 'Admin', email: 'admin@rtr.vn', role: 'admin' },
};

/** Viewer session (limited permissions) */
const viewerSession = {
  user: { id: 'user-4', name: 'Viewer', email: 'viewer@rtr.vn', role: 'viewer' },
};

function jsonReq(url: string, body?: unknown, method = 'POST') {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe('Inventory Sub-routes & Warehouse Receipt API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: allow all rate limits and auth as admin
    (checkReadEndpointLimit as Mock).mockResolvedValue(null);
    (checkWriteEndpointLimit as Mock).mockResolvedValue(null);
    (auth as Mock).mockResolvedValue(adminSession);
  });

  // =========================================================================
  // 1. GET /api/inventory/[id]
  // =========================================================================
  describe('GET /api/inventory/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/inventory/inv-1');
      const res = await getInventoryById(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when inventory record not found', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/inventory/inv-999');
      const res = await getInventoryById(req, idCtx('inv-999'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Inventory record not found');
    });

    it('returns inventory with inspections and other locations on success', async () => {
      const record = {
        id: 'inv-1',
        partId: 'part-1',
        warehouseId: 'wh-1',
        quantity: 100,
        part: { partNumber: 'PN-001', partSuppliers: [] },
        warehouse: { id: 'wh-1', code: 'WH1', name: 'Main', location: 'HCM', type: 'MAIN' },
      };
      (prisma.inventory.findUnique as Mock).mockResolvedValue(record);
      (prisma.inspection.findMany as Mock).mockResolvedValue([]);
      (prisma.inventory.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/inventory/inv-1');
      const res = await getInventoryById(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('inv-1');
      expect(data.receivingInspections).toEqual([]);
      expect(data.otherLocations).toEqual([]);
    });

    it('returns 500 on database error', async () => {
      (prisma.inventory.findUnique as Mock).mockRejectedValue(new Error('DB fail'));

      const req = new NextRequest('http://localhost:3000/api/inventory/inv-1');
      const res = await getInventoryById(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch inventory details');
    });
  });

  // =========================================================================
  // 2. PATCH /api/inventory/[id]
  // =========================================================================
  describe('PATCH /api/inventory/[id]', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/inventory/inv-1', { lotNumber: 'L1' }, 'PATCH');
      const res = await patchInventory(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when inventory not found', async () => {
      (prisma.inventory.findUnique as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/inventory/inv-999', { lotNumber: 'L1' }, 'PATCH');
      const res = await patchInventory(req, idCtx('inv-999'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Inventory not found');
    });

    it('returns 400 for zod validation error', async () => {
      // Provide an invalid payload: quantity must be a number
      const req = jsonReq(
        'http://localhost:3000/api/inventory/inv-1',
        { quantity: 'not-a-number' },
        'PATCH'
      );
      const res = await patchInventory(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('updates lotNumber (non-transfer) successfully', async () => {
      const existing = {
        id: 'inv-1',
        partId: 'part-1',
        warehouseId: 'wh-1',
        quantity: 50,
        locationCode: 'A-01',
        warehouse: { id: 'wh-1', code: 'WH1', type: 'MAIN' },
      };
      (prisma.inventory.findUnique as Mock).mockResolvedValue(existing);
      (prisma.inventory.update as Mock).mockResolvedValue({
        ...existing,
        lotNumber: 'LOT-NEW',
        part: { name: 'Bolt' },
        warehouse: { name: 'Main' },
      });

      const req = jsonReq(
        'http://localhost:3000/api/inventory/inv-1',
        { lotNumber: 'LOT-NEW' },
        'PATCH'
      );
      const res = await patchInventory(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.lotNumber).toBe('LOT-NEW');
    });

    it('returns 400 when transfer quantity exceeds available', async () => {
      const existing = {
        id: 'inv-1',
        partId: 'part-1',
        warehouseId: 'wh-1',
        quantity: 10,
        locationCode: 'A-01',
        warehouse: { id: 'wh-1', code: 'WH1', type: 'MAIN' },
      };
      (prisma.inventory.findUnique as Mock).mockResolvedValue(existing);

      const req = jsonReq(
        'http://localhost:3000/api/inventory/inv-1',
        { locationCode: 'RECEIVING', transferQty: 50 },
        'PATCH'
      );
      const res = await patchInventory(req, idCtx('inv-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 3. POST /api/inventory/adjust
  // =========================================================================
  describe('POST /api/inventory/adjust', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        warehouseId: 'w1',
        adjustmentType: 'add',
        quantity: 10,
        reason: 'test',
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 when user lacks inventory:adjust permission', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        warehouseId: 'w1',
        adjustmentType: 'add',
        quantity: 10,
        reason: 'test',
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('returns 422 when validation fails (missing reason)', async () => {
      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        warehouseId: 'w1',
        adjustmentType: 'add',
        quantity: 10,
        // reason is missing
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.error).toBe('Validation Error');
    });

    it('performs "add" adjustment successfully', async () => {
      const existingInv = { id: 'inv-1', partId: 'p1', warehouseId: 'w1', quantity: 50, reservedQty: 0 };
      (prisma.inventory.findFirst as Mock).mockResolvedValue(existingInv);

      // Mock $transaction to resolve with the updated record
      const updatedResult = {
        ...existingInv,
        quantity: 60,
        part: { id: 'p1', partNumber: 'PN-1', name: 'Part1' },
        warehouse: { id: 'w1', code: 'WH1', name: 'Main' },
      };
      (prisma.$transaction as Mock).mockResolvedValue(updatedResult);

      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        warehouseId: 'w1',
        adjustmentType: 'add',
        quantity: 10,
        reason: 'Restock',
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.adjustment.type).toBe('add');
      expect(data.data.adjustment.newQuantity).toBe(60);
    });

    it('returns 400 when subtract would go negative', async () => {
      const existingInv = { id: 'inv-1', partId: 'p1', warehouseId: 'w1', quantity: 5, reservedQty: 0 };
      (prisma.inventory.findFirst as Mock).mockResolvedValue(existingInv);

      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        warehouseId: 'w1',
        adjustmentType: 'subtract',
        quantity: 20,
        reason: 'Over-deduct',
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('creates new inventory record when none exists and adjusts', async () => {
      (prisma.inventory.findFirst as Mock).mockResolvedValue(null);
      const createdInv = { id: 'inv-new', partId: 'p1', warehouseId: 'w1', quantity: 0, reservedQty: 0 };
      (prisma.inventory.create as Mock).mockResolvedValue(createdInv);

      const updatedResult = {
        ...createdInv,
        quantity: 25,
        part: { id: 'p1', partNumber: 'PN-1', name: 'Part1' },
        warehouse: { id: 'w1', code: 'WH1', name: 'Main' },
      };
      (prisma.$transaction as Mock).mockResolvedValue(updatedResult);

      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        warehouseId: 'w1',
        adjustmentType: 'set',
        quantity: 25,
        reason: 'Initial set',
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.inventory.create).toHaveBeenCalled();
    });

    it('handles transfer between warehouses (same source and destination returns 400)', async () => {
      const req = jsonReq('http://localhost:3000/api/inventory/adjust', {
        partId: 'p1',
        fromWarehouseId: 'w1',
        toWarehouseId: 'w1',
        quantity: 10,
      });
      const res = await postAdjust(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // 4. GET /api/inventory/cycle-count
  // =========================================================================
  describe('GET /api/inventory/cycle-count', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/inventory/cycle-count');
      const res = await getCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns cycle count list successfully', async () => {
      const items = [{ id: 'inv-1', partNumber: 'PN-1', quantity: 100 }];
      (generateCycleCountList as Mock).mockResolvedValue(items);

      const req = new NextRequest('http://localhost:3000/api/inventory/cycle-count?maxItems=10');
      const res = await getCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('returns 500 when service fails', async () => {
      (generateCycleCountList as Mock).mockRejectedValue(new Error('Service error'));

      const req = new NextRequest('http://localhost:3000/api/inventory/cycle-count');
      const res = await getCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to generate cycle count list');
    });
  });

  // =========================================================================
  // 5. POST /api/inventory/cycle-count
  // =========================================================================
  describe('POST /api/inventory/cycle-count', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/inventory/cycle-count', {
        inventoryId: 'inv-1',
        countedQty: 95,
      });
      const res = await postCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 400 for validation failure (missing inventoryId)', async () => {
      const req = jsonReq('http://localhost:3000/api/inventory/cycle-count', {
        countedQty: 95,
      });
      const res = await postCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('records cycle count successfully', async () => {
      const result = { success: true, variance: -5, previousQty: 100, newQty: 95 };
      (recordCycleCount as Mock).mockResolvedValue(result);

      const req = jsonReq('http://localhost:3000/api/inventory/cycle-count', {
        inventoryId: 'inv-1',
        countedQty: 95,
        notes: 'Slight shrinkage',
      });
      const res = await postCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.variance).toBe(-5);
    });

    it('returns 500 when recording fails', async () => {
      (recordCycleCount as Mock).mockRejectedValue(new Error('Record failed'));

      const req = jsonReq('http://localhost:3000/api/inventory/cycle-count', {
        inventoryId: 'inv-1',
        countedQty: 95,
      });
      const res = await postCycleCount(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to record cycle count');
    });
  });

  // =========================================================================
  // 6. GET /api/inventory/expiry-alerts
  // =========================================================================
  describe('GET /api/inventory/expiry-alerts', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/inventory/expiry-alerts');
      const res = await getExpiryAlerts(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns expiry alerts successfully', async () => {
      const alerts = [
        { id: 'inv-1', partNumber: 'PN-1', expiryDate: '2026-03-01', daysUntilExpiry: 10 },
      ];
      (getExpiryAlertsFn as Mock).mockResolvedValue(alerts);

      const req = new NextRequest('http://localhost:3000/api/inventory/expiry-alerts');
      const res = await getExpiryAlerts(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].daysUntilExpiry).toBe(10);
    });

    it('returns 500 when service fails', async () => {
      (getExpiryAlertsFn as Mock).mockRejectedValue(new Error('DB down'));

      const req = new NextRequest('http://localhost:3000/api/inventory/expiry-alerts');
      const res = await getExpiryAlerts(req, noIdCtx);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch expiry alerts');
    });
  });

  // =========================================================================
  // 7. GET /api/inventory/issue
  // =========================================================================
  describe('GET /api/inventory/issue', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/inventory/issue');
      const res = await getIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns empty allocations when no pending issues exist', async () => {
      (prisma.materialAllocation.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/inventory/issue');
      const res = await getIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.allocations).toHaveLength(0);
      expect(data.data.stats.pendingCount).toBe(0);
      expect(data.data.stats.totalQtyToIssue).toBe(0);
    });

    it('returns pending allocations on success', async () => {
      const allocations = [
        {
          id: 'alloc-1',
          allocatedQty: 100,
          issuedQty: 30,
          requiredQty: 100,
          status: 'allocated',
          part: { id: 'p1', partNumber: 'PN-1', name: 'Bolt', unit: 'EA' },
          workOrder: {
            id: 'wo-1',
            woNumber: 'WO-001',
            status: 'IN_PROGRESS',
            product: { name: 'Assembly A', sku: 'SKU-A' },
          },
        },
      ];
      (prisma.materialAllocation.findMany as Mock).mockResolvedValue(allocations);

      const req = new NextRequest('http://localhost:3000/api/inventory/issue');
      const res = await getIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.allocations).toHaveLength(1);
      expect(data.data.allocations[0].remainingQty).toBe(70);
      expect(data.data.stats.pendingCount).toBe(1);
    });
  });

  // =========================================================================
  // 8. POST /api/inventory/issue
  // =========================================================================
  describe('POST /api/inventory/issue', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/inventory/issue', {
        mode: 'wo',
        allocationIds: ['alloc-1'],
      });
      const res = await postIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it('returns 403 when user lacks inventory:issue permission', async () => {
      (auth as Mock).mockResolvedValue(viewerSession);

      const req = jsonReq('http://localhost:3000/api/inventory/issue', {
        mode: 'wo',
        allocationIds: ['alloc-1'],
      });
      const res = await postIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('returns 422 for invalid body (missing allocationIds)', async () => {
      const req = jsonReq('http://localhost:3000/api/inventory/issue', {
        mode: 'wo',
        // allocationIds missing
      });
      const res = await postIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.error).toBe('Validation Error');
    });

    it('issues WO materials successfully', async () => {
      (prisma.materialAllocation.findUnique as Mock).mockResolvedValue({
        workOrderId: 'wo-1',
      });
      (issueMaterials as Mock).mockResolvedValue({ issued: 3, totalQty: 100 });

      const req = jsonReq('http://localhost:3000/api/inventory/issue', {
        mode: 'wo',
        allocationIds: ['alloc-1'],
      });
      const res = await postIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(issueMaterials).toHaveBeenCalledWith('wo-1', ['alloc-1']);
    });

    it('returns 404 when allocation not found for WO issue', async () => {
      (prisma.materialAllocation.findUnique as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/inventory/issue', {
        mode: 'wo',
        allocationIds: ['alloc-missing'],
      });
      const res = await postIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('issues ad-hoc materials successfully', async () => {
      (issueAdHocMaterials as Mock).mockResolvedValue({ issued: true, qty: 5 });

      const req = jsonReq('http://localhost:3000/api/inventory/issue', {
        mode: 'adhoc',
        partId: 'p1',
        warehouseId: 'w1',
        quantity: 5,
        issueType: 'maintenance',
        reason: 'Machine repair',
      });
      const res = await postIssue(req, noIdCtx as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(issueAdHocMaterials).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. GET /api/warehouse-receipts
  // =========================================================================
  describe('GET /api/warehouse-receipts', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/warehouse-receipts');
      const res = await getWarehouseReceipts(req, { params: {} } as never);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('returns paginated receipts on success', async () => {
      // The withAuth from @/lib/auth/middleware checks auth differently
      // It resolves the user internally via getAuthUser which also calls auth()
      const receipts = [
        {
          id: 'rcpt-1',
          status: 'PENDING',
          quantity: 100,
          workOrder: { woNumber: 'WO-001', status: 'COMPLETED', completedQty: 100 },
          product: { id: 'prod-1', sku: 'SKU-1', name: 'Widget' },
          warehouse: { id: 'wh-1', code: 'WH1', name: 'Main' },
        },
      ];
      (prisma.productionReceipt.count as Mock).mockResolvedValue(1);
      (prisma.productionReceipt.findMany as Mock).mockResolvedValue(receipts);

      const req = new NextRequest('http://localhost:3000/api/warehouse-receipts?status=PENDING');
      const res = await getWarehouseReceipts(req, { params: {} } as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.totalItems).toBe(1);
    });

    it('filters by warehouseId when provided', async () => {
      (prisma.productionReceipt.count as Mock).mockResolvedValue(0);
      (prisma.productionReceipt.findMany as Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost:3000/api/warehouse-receipts?warehouseId=wh-2');
      const res = await getWarehouseReceipts(req, { params: {} } as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Verify warehouseId is in the where clause
      const countCall = (prisma.productionReceipt.count as Mock).mock.calls[0][0];
      expect(countCall.where.warehouseId).toBe('wh-2');
    });
  });

  // =========================================================================
  // 10. POST /api/warehouse-receipts/[id]/confirm
  // =========================================================================
  describe('POST /api/warehouse-receipts/[id]/confirm', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/confirm', {});
      const res = await postConfirm(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('confirms receipt successfully', async () => {
      const result = {
        message: 'Receipt confirmed',
        receipt: { id: 'rcpt-1', status: 'CONFIRMED', quantity: 100 },
      };
      (confirmProductionReceipt as Mock).mockResolvedValue(result);

      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/confirm', {});
      const res = await postConfirm(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(confirmProductionReceipt).toHaveBeenCalledWith('rcpt-1', 'user-1');
    });

    it('returns 500 when confirmProductionReceipt throws', async () => {
      (confirmProductionReceipt as Mock).mockRejectedValue(new Error('Confirm failed'));

      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/confirm', {});
      const res = await postConfirm(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // 11. POST /api/warehouse-receipts/[id]/reject
  // =========================================================================
  describe('POST /api/warehouse-receipts/[id]/reject', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/reject', {
        reason: 'Bad quality',
      });
      const res = await postReject(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('returns 400 when reason is missing', async () => {
      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/reject', {});
      const res = await postReject(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('returns 400 when reason is empty string', async () => {
      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/reject', {
        reason: '   ',
      });
      const res = await postReject(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(400);
    });

    it('rejects receipt successfully', async () => {
      const result = {
        message: 'Receipt rejected',
        receipt: { id: 'rcpt-1', status: 'REJECTED' },
      };
      (rejectProductionReceipt as Mock).mockResolvedValue(result);

      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/reject', {
        reason: 'Damaged goods',
      });
      const res = await postReject(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(rejectProductionReceipt).toHaveBeenCalledWith('rcpt-1', 'user-1', 'Damaged goods');
    });

    it('returns 500 when rejectProductionReceipt throws', async () => {
      (rejectProductionReceipt as Mock).mockRejectedValue(new Error('Reject failed'));

      const req = jsonReq('http://localhost:3000/api/warehouse-receipts/rcpt-1/reject', {
        reason: 'Bad batch',
      });
      const res = await postReject(req, { params: Promise.resolve({ id: 'rcpt-1' }) } as never);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
