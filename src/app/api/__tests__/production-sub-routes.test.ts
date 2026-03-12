/**
 * Production Sub-Routes API Tests
 *
 * Tests for:
 *  - POST /api/production/[id]/allocate
 *  - POST /api/production/[id]/issue
 *  - POST /api/production/[id]/receive
 *  - GET  /api/production/capacity
 *  - GET  /api/production/oee
 *  - GET  /api/production/schedule
 *  - GET  /api/production/routing
 *  - POST /api/production/routing
 *  - GET  /api/production/work-centers
 *  - POST /api/production/work-centers
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks  (must be declared before importing route modules)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  default: {
    materialAllocation: { count: vi.fn() },
    workOrder: { findUnique: vi.fn() },
    routing: { count: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    routingOperation: { create: vi.fn() },
    workCenter: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
  prisma: {
    materialAllocation: { count: vi.fn() },
    workOrder: { findUnique: vi.fn() },
    routing: { count: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    routingOperation: { create: vi.fn() },
    workCenter: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
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
    audit: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/mrp-engine', () => ({
  allocateMaterials: vi.fn(),
  regenerateAllocations: vi.fn(),
  issueMaterials: vi.fn(),
  receiveProductionOutput: vi.fn(),
}));

vi.mock('@/lib/production/capacity-engine', () => ({
  getCapacitySummary: vi.fn(),
}));

vi.mock('@/lib/production/oee-calculator', () => ({
  getOEEDashboard: vi.fn(),
  calculateOEE: vi.fn(),
  getOEETrend: vi.fn(),
}));

vi.mock('@/lib/production/gantt-data', () => ({
  getGanttData: vi.fn(),
}));

vi.mock('@/lib/production/routing-engine', () => ({
  generateRoutingNumber: vi.fn(),
  calculateRoutingTotals: vi.fn(),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({
    page: 1,
    pageSize: 50,
    sortBy: undefined,
    sortOrder: 'desc',
  }),
  buildOffsetPaginationQuery: vi.fn().mockReturnValue({ skip: 0, take: 50 }),
  buildPaginatedResponse: vi.fn().mockImplementation((data, total, params, startTime) => ({
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalItems: total,
      totalPages: Math.ceil(total / params.pageSize),
      hasNextPage: false,
      hasPrevPage: false,
    },
    meta: { took: Date.now() - startTime, cached: false },
  })),
  paginatedSuccess: vi.fn().mockImplementation((response) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json(response);
  }),
  paginatedError: vi.fn().mockImplementation((message, status = 500) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status });
  }),
}));

vi.mock('@/lib/error-handler', () => ({
  handleError: vi.fn().mockImplementation((error) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }),
  successResponse: vi.fn().mockImplementation((data, message, status = 200) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json({ success: true, data, message }, { status });
  }),
}));

// ---------------------------------------------------------------------------
// Imports  (after mocks)
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { prisma as namedPrisma } from '@/lib/prisma';

import { allocateMaterials, regenerateAllocations, issueMaterials, receiveProductionOutput } from '@/lib/mrp-engine';
import { getCapacitySummary } from '@/lib/production/capacity-engine';
import { getOEEDashboard, calculateOEE, getOEETrend } from '@/lib/production/oee-calculator';
import { getGanttData } from '@/lib/production/gantt-data';
import { generateRoutingNumber, calculateRoutingTotals } from '@/lib/production/routing-engine';

import { POST as AllocatePOST } from '../production/[id]/allocate/route';
import { POST as IssuePOST } from '../production/[id]/issue/route';
import { POST as ReceivePOST } from '../production/[id]/receive/route';
import { GET as CapacityGET } from '../production/capacity/route';
import { GET as OeeGET } from '../production/oee/route';
import { GET as ScheduleGET } from '../production/schedule/route';
import { GET as RoutingGET, POST as RoutingPOST } from '../production/routing/route';
import { GET as WorkCentersGET, POST as WorkCentersPOST } from '../production/work-centers/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Context with a parameterized id */
const ctxWithId = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
/** Context with no params */
const emptyCtx = { params: Promise.resolve({}) } as never;

function authed(overrides: Record<string, unknown> = {}) {
  (auth as Mock).mockResolvedValue({
    user: { id: 'user-1', name: 'Test', email: 'test@test.com', role: 'admin', ...overrides },
  });
}

function unauthed() {
  (auth as Mock).mockResolvedValue(null);
}

function makeReq(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

// ===========================================================================
// TEST SUITES
// ===========================================================================

describe('Production Sub-Routes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // POST /api/production/[id]/allocate
  // =========================================================================
  describe('POST /api/production/[id]/allocate', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/wo-1/allocate', { method: 'POST' });
      const res = await AllocatePOST(req, ctxWithId('wo-1'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should regenerate allocations and allocate when none exist', async () => {
      authed();
      (prisma.materialAllocation.count as Mock).mockResolvedValue(0);
      (regenerateAllocations as Mock).mockResolvedValue({ regenerated: true });
      (allocateMaterials as Mock).mockResolvedValue({
        allocations: [{ id: 'alloc-1' }],
        fullyAllocated: true,
      });

      const req = makeReq('http://localhost:3000/api/production/wo-1/allocate', { method: 'POST' });
      const res = await AllocatePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(regenerateAllocations).toHaveBeenCalledWith('wo-1');
      expect(allocateMaterials).toHaveBeenCalledWith('wo-1');
      expect(body.fullyAllocated).toBe(true);
    });

    it('should return 400 when BOM regeneration fails', async () => {
      authed();
      (prisma.materialAllocation.count as Mock).mockResolvedValue(0);
      (regenerateAllocations as Mock).mockResolvedValue({
        regenerated: false,
        reason: 'No active BOM found',
      });

      const req = makeReq('http://localhost:3000/api/production/wo-1/allocate', { method: 'POST' });
      const res = await AllocatePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('No active BOM found');
      expect(allocateMaterials).not.toHaveBeenCalled();
    });

    it('should skip regeneration when allocations already exist', async () => {
      authed();
      (prisma.materialAllocation.count as Mock).mockResolvedValue(3);
      (allocateMaterials as Mock).mockResolvedValue({
        allocations: [{ id: 'alloc-1' }],
        fullyAllocated: false,
      });

      const req = makeReq('http://localhost:3000/api/production/wo-1/allocate', { method: 'POST' });
      const res = await AllocatePOST(req, ctxWithId('wo-1'));

      expect(res.status).toBe(200);
      expect(regenerateAllocations).not.toHaveBeenCalled();
      expect(allocateMaterials).toHaveBeenCalledWith('wo-1');
    });

    it('should return 500 when allocateMaterials throws', async () => {
      authed();
      (prisma.materialAllocation.count as Mock).mockResolvedValue(5);
      (allocateMaterials as Mock).mockRejectedValue(new Error('DB failure'));

      const req = makeReq('http://localhost:3000/api/production/wo-1/allocate', { method: 'POST' });
      const res = await AllocatePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to allocate materials');
    });
  });

  // =========================================================================
  // POST /api/production/[id]/issue
  // =========================================================================
  describe('POST /api/production/[id]/issue', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', { method: 'POST' });
      const res = await IssuePOST(req, ctxWithId('wo-1'));
      expect(res.status).toBe(401);
    });

    it('should return 404 when work order not found', async () => {
      authed();
      (prisma.workOrder.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', { method: 'POST' });
      const res = await IssuePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Work order not found');
    });

    it('should return 400 when work order status is invalid', async () => {
      authed();
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ status: 'PLANNED' });

      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', { method: 'POST' });
      const res = await IssuePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('must be released');
    });

    it('should return 400 when no allocated materials exist', async () => {
      authed();
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ status: 'RELEASED' });
      (prisma.materialAllocation.count as Mock).mockResolvedValue(0);

      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', { method: 'POST' });
      const res = await IssuePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('No allocated materials');
    });

    it('should issue all materials successfully', async () => {
      authed();
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ status: 'IN_PROGRESS' });
      (prisma.materialAllocation.count as Mock).mockResolvedValue(2);
      (issueMaterials as Mock).mockResolvedValue({ issued: 2, failed: 0 });

      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', { method: 'POST' });
      const res = await IssuePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(issueMaterials).toHaveBeenCalledWith('wo-1', undefined);
      expect(body.issued).toBe(2);
    });

    it('should pass allocationIds from body when provided', async () => {
      authed();
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ status: 'RELEASED' });
      (prisma.materialAllocation.count as Mock).mockResolvedValue(1);
      (issueMaterials as Mock).mockResolvedValue({ issued: 1 });

      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', {
        method: 'POST',
        body: JSON.stringify({ allocationIds: ['alloc-1', 'alloc-2'] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await IssuePOST(req, ctxWithId('wo-1'));

      expect(res.status).toBe(200);
      expect(issueMaterials).toHaveBeenCalledWith('wo-1', ['alloc-1', 'alloc-2']);
    });

    it('should return 500 when issueMaterials throws', async () => {
      authed();
      (prisma.workOrder.findUnique as Mock).mockResolvedValue({ status: 'RELEASED' });
      (prisma.materialAllocation.count as Mock).mockResolvedValue(1);
      (issueMaterials as Mock).mockRejectedValue(new Error('Inventory lock'));

      const req = makeReq('http://localhost:3000/api/production/wo-1/issue', { method: 'POST' });
      const res = await IssuePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to issue materials');
    });
  });

  // =========================================================================
  // POST /api/production/[id]/receive
  // =========================================================================
  describe('POST /api/production/[id]/receive', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/wo-1/receive', { method: 'POST' });
      const res = await ReceivePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it('should create a production receipt successfully', async () => {
      authed();
      const mockReceipt = { id: 'rcpt-1', quantity: 100, createdAt: new Date().toISOString() };
      (receiveProductionOutput as Mock).mockResolvedValue({
        status: 'PENDING',
        message: 'Receipt created',
        receipt: mockReceipt,
      });

      const req = makeReq('http://localhost:3000/api/production/wo-1/receive', { method: 'POST' });
      const res = await ReceivePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.receipt.id).toBe('rcpt-1');
    });

    it('should return 409 when receipt already confirmed', async () => {
      authed();
      (receiveProductionOutput as Mock).mockResolvedValue({
        status: 'CONFIRMED',
        message: 'Already received',
        receipt: { id: 'rcpt-1' },
      });

      const req = makeReq('http://localhost:3000/api/production/wo-1/receive', { method: 'POST' });
      const res = await ReceivePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.success).toBe(false);
    });

    it('should return 409 when a PENDING receipt already exists', async () => {
      authed();
      const oldDate = new Date(Date.now() - 60000).toISOString(); // 60s ago
      (receiveProductionOutput as Mock).mockResolvedValue({
        status: 'PENDING',
        message: 'Waiting for warehouse confirmation',
        receipt: { id: 'rcpt-2', createdAt: oldDate },
      });

      const req = makeReq('http://localhost:3000/api/production/wo-1/receive', { method: 'POST' });
      const res = await ReceivePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.success).toBe(false);
    });

    it('should return 500 when engine throws', async () => {
      authed();
      (receiveProductionOutput as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/production/wo-1/receive', { method: 'POST' });
      const res = await ReceivePOST(req, ctxWithId('wo-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/production/capacity
  // =========================================================================
  describe('GET /api/production/capacity', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/capacity');
      const res = await CapacityGET(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return capacity summary with default date range', async () => {
      authed();
      const mockSummary = {
        overallUtilization: 72,
        workCenters: [{ id: 'wc-1', utilization: 80 }],
      };
      (getCapacitySummary as Mock).mockResolvedValue(mockSummary);

      const req = makeReq('http://localhost:3000/api/production/capacity');
      const res = await CapacityGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.overallUtilization).toBe(72);
      expect(getCapacitySummary).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
    });

    it('should pass custom date range', async () => {
      authed();
      (getCapacitySummary as Mock).mockResolvedValue({ workCenters: [] });

      const req = makeReq(
        'http://localhost:3000/api/production/capacity?startDate=2026-03-01&endDate=2026-03-07'
      );
      const res = await CapacityGET(req, emptyCtx);

      expect(res.status).toBe(200);
      const [start, end] = (getCapacitySummary as Mock).mock.calls[0];
      expect(start.toISOString()).toContain('2026-03-01');
      expect(end.toISOString()).toContain('2026-03-07');
    });

    it('should return 500 when engine throws', async () => {
      authed();
      (getCapacitySummary as Mock).mockRejectedValue(new Error('timeout'));

      const req = makeReq('http://localhost:3000/api/production/capacity');
      const res = await CapacityGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch capacity');
    });
  });

  // =========================================================================
  // GET /api/production/oee
  // =========================================================================
  describe('GET /api/production/oee', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/oee');
      const res = await OeeGET(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return OEE dashboard when no workCenterId given', async () => {
      authed();
      const mockDashboard = { overall: 85, workCenters: [] };
      (getOEEDashboard as Mock).mockResolvedValue(mockDashboard);

      const req = makeReq('http://localhost:3000/api/production/oee');
      const res = await OeeGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.overall).toBe(85);
      expect(getOEEDashboard).toHaveBeenCalled();
    });

    it('should return OEE for a specific work center', async () => {
      authed();
      const mockOee = { availability: 90, performance: 85, quality: 98, oee: 75 };
      (calculateOEE as Mock).mockResolvedValue(mockOee);

      const req = makeReq('http://localhost:3000/api/production/oee?workCenterId=wc-1');
      const res = await OeeGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.oee).toBe(75);
      expect(calculateOEE).toHaveBeenCalledWith('wc-1', expect.any(Date), expect.any(Date));
    });

    it('should return OEE trend when trend=true', async () => {
      authed();
      const mockTrend = [{ period: 'Week 1', oee: 70 }, { period: 'Week 2', oee: 75 }];
      (getOEETrend as Mock).mockResolvedValue(mockTrend);

      const req = makeReq(
        'http://localhost:3000/api/production/oee?workCenterId=wc-1&trend=true&periods=6&periodType=month'
      );
      const res = await OeeGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getOEETrend).toHaveBeenCalledWith('wc-1', 6, 'month');
      expect(body).toHaveLength(2);
    });

    it('should return 500 when OEE engine throws', async () => {
      authed();
      (getOEEDashboard as Mock).mockRejectedValue(new Error('calc error'));

      const req = makeReq('http://localhost:3000/api/production/oee');
      const res = await OeeGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch OEE data');
    });
  });

  // =========================================================================
  // GET /api/production/schedule
  // =========================================================================
  describe('GET /api/production/schedule', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/schedule');
      const res = await ScheduleGET(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return Gantt data with default params', async () => {
      authed();
      const mockData = { tasks: [{ id: 'task-1', name: 'WO-001' }], links: [] };
      (getGanttData as Mock).mockResolvedValue(mockData);

      const req = makeReq('http://localhost:3000/api/production/schedule');
      const res = await ScheduleGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.tasks).toHaveLength(1);
      expect(getGanttData).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should forward startDate, endDate, and status filters', async () => {
      authed();
      (getGanttData as Mock).mockResolvedValue({ tasks: [], links: [] });

      const req = makeReq(
        'http://localhost:3000/api/production/schedule?startDate=2026-03-01&endDate=2026-03-31&status=PLANNED,IN_PROGRESS'
      );
      const res = await ScheduleGET(req, emptyCtx);

      expect(res.status).toBe(200);
      const call = (getGanttData as Mock).mock.calls[0];
      expect(call[0]).toBeInstanceOf(Date);
      expect(call[1]).toBeInstanceOf(Date);
      expect(call[2]).toEqual(['PLANNED', 'IN_PROGRESS']);
    });

    it('should return 500 when getGanttData throws', async () => {
      authed();
      (getGanttData as Mock).mockRejectedValue(new Error('query timeout'));

      const req = makeReq('http://localhost:3000/api/production/schedule');
      const res = await ScheduleGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to load schedule');
    });
  });

  // =========================================================================
  // GET /api/production/routing
  // =========================================================================
  describe('GET /api/production/routing', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/routing');
      const res = await RoutingGET(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return paginated routings', async () => {
      authed();
      const mockRoutings = [
        { id: 'rt-1', routingNumber: 'RT-001', product: { sku: 'S1', name: 'P1' }, _count: { operations: 3 } },
      ];
      (namedPrisma.routing.count as Mock).mockResolvedValue(1);
      (namedPrisma.routing.findMany as Mock).mockResolvedValue(mockRoutings);

      const req = makeReq('http://localhost:3000/api/production/routing');
      const res = await RoutingGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('should return 500 when database fails', async () => {
      authed();
      (namedPrisma.routing.count as Mock).mockRejectedValue(new Error('conn reset'));

      const req = makeReq('http://localhost:3000/api/production/routing');
      const res = await RoutingGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toContain('Failed to fetch routings');
    });
  });

  // =========================================================================
  // POST /api/production/routing
  // =========================================================================
  describe('POST /api/production/routing', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/routing', {
        method: 'POST',
        body: JSON.stringify({ name: 'R1', productId: 'p1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingPOST(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return 400 when validation fails', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/production/routing', {
        method: 'POST',
        body: JSON.stringify({ name: '' }), // missing productId, empty name
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should create a routing successfully', async () => {
      authed();
      const mockRouting = { id: 'rt-new', routingNumber: 'RT-002', name: 'New Routing' };
      (generateRoutingNumber as Mock).mockResolvedValue('RT-002');
      (namedPrisma.routing.create as Mock).mockResolvedValue(mockRouting);

      const req = makeReq('http://localhost:3000/api/production/routing', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Routing', productId: 'prod-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.routingNumber).toBe('RT-002');
    });

    it('should return 500 when database throws on create', async () => {
      authed();
      (generateRoutingNumber as Mock).mockResolvedValue('RT-003');
      (namedPrisma.routing.create as Mock).mockRejectedValue(new Error('FK violation'));

      const req = makeReq('http://localhost:3000/api/production/routing', {
        method: 'POST',
        body: JSON.stringify({ name: 'R', productId: 'bad-id' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to create routing');
    });
  });

  // =========================================================================
  // GET /api/production/work-centers
  // =========================================================================
  describe('GET /api/production/work-centers', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/work-centers');
      const res = await WorkCentersGET(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return paginated work centers', async () => {
      authed();
      const mockWCs = [
        { id: 'wc-1', code: 'WC-001', name: 'Lathe A', type: 'machine' },
      ];
      (namedPrisma.workCenter.count as Mock).mockResolvedValue(1);
      (namedPrisma.workCenter.findMany as Mock).mockResolvedValue(mockWCs);

      const req = makeReq('http://localhost:3000/api/production/work-centers');
      const res = await WorkCentersGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('should return 500 when database fails', async () => {
      authed();
      (namedPrisma.workCenter.count as Mock).mockRejectedValue(new Error('timeout'));

      const req = makeReq('http://localhost:3000/api/production/work-centers');
      const res = await WorkCentersGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toContain('Failed to fetch work centers');
    });
  });

  // =========================================================================
  // POST /api/production/work-centers
  // =========================================================================
  describe('POST /api/production/work-centers', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/work-centers', {
        method: 'POST',
        body: JSON.stringify({ code: 'WC', name: 'Test', type: 'machine' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCentersPOST(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return 400 when validation fails', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/production/work-centers', {
        method: 'POST',
        body: JSON.stringify({ code: '' }), // missing name and type
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCentersPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should create a work center successfully', async () => {
      authed();
      const mockWC = { id: 'wc-new', code: 'WC-010', name: 'Press B', type: 'machine' };
      (namedPrisma.workCenter.create as Mock).mockResolvedValue(mockWC);

      const req = makeReq('http://localhost:3000/api/production/work-centers', {
        method: 'POST',
        body: JSON.stringify({
          code: 'WC-010',
          name: 'Press B',
          type: 'machine',
          runTimePerUnit: 5,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCentersPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.code).toBe('WC-010');
    });

    it('should return 500 when database throws on create', async () => {
      authed();
      (namedPrisma.workCenter.create as Mock).mockRejectedValue(new Error('unique constraint'));

      const req = makeReq('http://localhost:3000/api/production/work-centers', {
        method: 'POST',
        body: JSON.stringify({ code: 'WC-DUP', name: 'Dup', type: 'machine' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCentersPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to create work center');
    });
  });
});
