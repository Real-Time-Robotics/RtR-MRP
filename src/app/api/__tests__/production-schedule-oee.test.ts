/**
 * Production Scheduler, Shop Floor, Reschedule & Capacity RCCP API Tests
 *
 * Tests for production sub-routes NOT covered in production-sub-routes.test.ts:
 *  - GET  /api/production/scheduler       (scheduling-engine)
 *  - GET  /api/production/shop-floor      (prisma + capacity-engine)
 *  - POST /api/production/reschedule      (schedule-conflict)
 *  - GET  /api/production/capacity/rccp   (capacity-engine RCCP)
 *
 * Note: production/schedule/route.ts (Gantt) and production/oee/route.ts are
 * already covered in production-sub-routes.test.ts.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing route modules)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  default: {
    workCenter: { findMany: vi.fn() },
    workOrderOperation: { count: vi.fn(), aggregate: vi.fn() },
  },
  prisma: {
    workCenter: { findMany: vi.fn() },
    workOrderOperation: { count: vi.fn(), aggregate: vi.fn() },
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
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/production/scheduling-engine', () => ({
  getSchedule: vi.fn(),
}));

vi.mock('@/lib/production/capacity-engine', () => ({
  getWorkCenterUtilization: vi.fn(),
  calculateRCCP: vi.fn(),
}));

vi.mock('@/lib/production/schedule-conflict', () => ({
  checkRescheduleConflicts: vi.fn(),
  rescheduleWorkOrder: vi.fn(),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({
    page: 1,
    pageSize: 50,
    sortBy: undefined,
    sortOrder: 'desc',
  }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSchedule } from '@/lib/production/scheduling-engine';
import { getWorkCenterUtilization, calculateRCCP } from '@/lib/production/capacity-engine';
import { checkRescheduleConflicts, rescheduleWorkOrder } from '@/lib/production/schedule-conflict';

import { GET as SchedulerGET } from '../production/scheduler/route';
import { GET as ShopFloorGET } from '../production/shop-floor/route';
import { POST as ReschedulePOST } from '../production/reschedule/route';
import { GET as RccpGET } from '../production/capacity/rccp/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

describe('Production Scheduler, Shop Floor, Reschedule & RCCP API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/production/scheduler
  // =========================================================================
  describe('GET /api/production/scheduler', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/scheduler');
      const res = await SchedulerGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return schedule with default date range', async () => {
      authed();
      const mockSchedule = {
        slots: [{ workCenterId: 'wc-1', start: '2026-03-01', end: '2026-03-02' }],
      };
      (getSchedule as Mock).mockResolvedValue(mockSchedule);

      const req = makeReq('http://localhost:3000/api/production/scheduler');
      const res = await SchedulerGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.slots).toHaveLength(1);
      expect(getSchedule).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined
      );
    });

    it('should forward custom date range and workCenterIds', async () => {
      authed();
      (getSchedule as Mock).mockResolvedValue({ slots: [] });

      const req = makeReq(
        'http://localhost:3000/api/production/scheduler?startDate=2026-04-01&endDate=2026-04-07&workCenterIds=wc-1,wc-2'
      );
      const res = await SchedulerGET(req, emptyCtx);

      expect(res.status).toBe(200);
      const [start, end, wcIds] = (getSchedule as Mock).mock.calls[0];
      expect(start.toISOString()).toContain('2026-04-01');
      expect(end.toISOString()).toContain('2026-04-07');
      expect(wcIds).toEqual(['wc-1', 'wc-2']);
    });

    it('should default end date to 7 days from start', async () => {
      authed();
      (getSchedule as Mock).mockResolvedValue({ slots: [] });

      const req = makeReq('http://localhost:3000/api/production/scheduler?startDate=2026-05-01');
      await SchedulerGET(req, emptyCtx);

      const [start, end] = (getSchedule as Mock).mock.calls[0];
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it('should return 500 when scheduling engine throws', async () => {
      authed();
      (getSchedule as Mock).mockRejectedValue(new Error('timeout'));

      const req = makeReq('http://localhost:3000/api/production/scheduler');
      const res = await SchedulerGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch schedule');
    });
  });

  // =========================================================================
  // GET /api/production/shop-floor
  // =========================================================================
  describe('GET /api/production/shop-floor', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/shop-floor');
      const res = await ShopFloorGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return work center statuses and metrics', async () => {
      authed();
      const mockWorkCenters = [
        {
          id: 'wc-1',
          code: 'WC-001',
          name: 'CNC Lathe',
          type: 'machine',
          status: 'active',
          scheduledOps: [],
          downtimeRecords: [],
        },
      ];
      (prisma.workCenter.findMany as Mock).mockResolvedValue(mockWorkCenters);
      (getWorkCenterUtilization as Mock).mockResolvedValue({
        utilization: 65,
        jobs: [],
      });
      (prisma.workOrderOperation.count as Mock).mockResolvedValue(0);
      (prisma.workOrderOperation.aggregate as Mock).mockResolvedValue({
        _sum: { quantityCompleted: 0, quantityScrapped: 0 },
      });

      const req = makeReq('http://localhost:3000/api/production/shop-floor');
      const res = await ShopFloorGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.workCenters).toHaveLength(1);
      expect(body.workCenters[0].status).toBe('idle');
      expect(body.workCenters[0].utilization).toBe(65);
      expect(body.metrics).toBeDefined();
      expect(body.metrics.completedOps).toBe(0);
    });

    it('should mark work center as "down" when downtime is active', async () => {
      authed();
      const mockWorkCenters = [
        {
          id: 'wc-1',
          code: 'WC-001',
          name: 'CNC Lathe',
          type: 'machine',
          status: 'active',
          scheduledOps: [],
          downtimeRecords: [
            { reason: 'Maintenance', type: 'planned', startTime: new Date() },
          ],
        },
      ];
      (prisma.workCenter.findMany as Mock).mockResolvedValue(mockWorkCenters);
      (getWorkCenterUtilization as Mock).mockResolvedValue({
        utilization: 0,
        jobs: [],
      });
      (prisma.workOrderOperation.count as Mock).mockResolvedValue(0);
      (prisma.workOrderOperation.aggregate as Mock).mockResolvedValue({
        _sum: { quantityCompleted: 0, quantityScrapped: 0 },
      });

      const req = makeReq('http://localhost:3000/api/production/shop-floor');
      const res = await ShopFloorGET(req, emptyCtx);
      const body = await res.json();

      expect(body.workCenters[0].status).toBe('down');
      expect(body.workCenters[0].downtime).toBeDefined();
      expect(body.workCenters[0].downtime.reason).toBe('Maintenance');
    });

    it('should mark work center as "running" when it has an active operation', async () => {
      authed();
      const now = new Date();
      const pastStart = new Date(now.getTime() - 60 * 60 * 1000);
      const futureEnd = new Date(now.getTime() + 60 * 60 * 1000);

      const mockWorkCenters = [
        {
          id: 'wc-1',
          code: 'WC-001',
          name: 'CNC Lathe',
          type: 'machine',
          status: 'active',
          scheduledOps: [
            {
              scheduledStart: pastStart,
              scheduledEnd: futureEnd,
              workOrderOperation: {
                name: 'Cutting',
                workOrder: { woNumber: 'WO-001' },
              },
            },
          ],
          downtimeRecords: [],
        },
      ];
      (prisma.workCenter.findMany as Mock).mockResolvedValue(mockWorkCenters);
      (getWorkCenterUtilization as Mock).mockResolvedValue({
        utilization: 80,
        jobs: ['j1'],
      });
      (prisma.workOrderOperation.count as Mock).mockResolvedValue(0);
      (prisma.workOrderOperation.aggregate as Mock).mockResolvedValue({
        _sum: { quantityCompleted: 0, quantityScrapped: 0 },
      });

      const req = makeReq('http://localhost:3000/api/production/shop-floor');
      const res = await ShopFloorGET(req, emptyCtx);
      const body = await res.json();

      expect(body.workCenters[0].status).toBe('running');
      expect(body.workCenters[0].currentJob.woNumber).toBe('WO-001');
      expect(body.workCenters[0].queueCount).toBe(1);
    });

    it('should return 500 when prisma query fails', async () => {
      authed();
      (prisma.workCenter.findMany as Mock).mockRejectedValue(new Error('DB connection lost'));

      const req = makeReq('http://localhost:3000/api/production/shop-floor');
      const res = await ShopFloorGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch shop floor data');
    });
  });

  // =========================================================================
  // POST /api/production/reschedule
  // =========================================================================
  describe('POST /api/production/reschedule', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId: 'wo-1',
          startDate: '2026-04-01',
          endDate: '2026-04-10',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ReschedulePOST(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 when validation fails (missing fields)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/production/reschedule', {
        method: 'POST',
        body: JSON.stringify({ workOrderId: 'wo-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ReschedulePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
    });

    it('should return conflicts when not forced and conflicts exist', async () => {
      authed();
      (checkRescheduleConflicts as Mock).mockResolvedValue({
        hasConflict: true,
        conflicts: [{ type: 'overlap', message: 'Overlapping WO-002' }],
        canProceed: true,
      });

      const req = makeReq('http://localhost:3000/api/production/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId: 'wo-1',
          startDate: '2026-04-01',
          endDate: '2026-04-10',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ReschedulePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(false);
      expect(body.conflicts).toHaveLength(1);
      expect(body.canProceed).toBe(true);
      expect(rescheduleWorkOrder).not.toHaveBeenCalled();
    });

    it('should reschedule successfully when no conflicts', async () => {
      authed();
      (checkRescheduleConflicts as Mock).mockResolvedValue({
        hasConflict: false,
        conflicts: [],
        canProceed: true,
      });
      (rescheduleWorkOrder as Mock).mockResolvedValue({
        success: true,
        workOrderId: 'wo-1',
        newStart: '2026-04-01',
        newEnd: '2026-04-10',
      });

      const req = makeReq('http://localhost:3000/api/production/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId: 'wo-1',
          startDate: '2026-04-01',
          endDate: '2026-04-10',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ReschedulePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(rescheduleWorkOrder).toHaveBeenCalledWith(
        'wo-1',
        expect.any(Date),
        expect.any(Date),
        false
      );
    });

    it('should force reschedule despite conflicts when force=true', async () => {
      authed();
      (checkRescheduleConflicts as Mock).mockResolvedValue({
        hasConflict: true,
        conflicts: [{ type: 'overlap' }],
        canProceed: true,
      });
      (rescheduleWorkOrder as Mock).mockResolvedValue({
        success: true,
        workOrderId: 'wo-1',
      });

      const req = makeReq('http://localhost:3000/api/production/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId: 'wo-1',
          startDate: '2026-04-01',
          endDate: '2026-04-10',
          force: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ReschedulePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(rescheduleWorkOrder).toHaveBeenCalledWith(
        'wo-1',
        expect.any(Date),
        expect.any(Date),
        true
      );
    });

    it('should return 500 when reschedule engine throws', async () => {
      authed();
      (checkRescheduleConflicts as Mock).mockRejectedValue(new Error('DB timeout'));

      const req = makeReq('http://localhost:3000/api/production/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId: 'wo-1',
          startDate: '2026-04-01',
          endDate: '2026-04-10',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await ReschedulePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to reschedule work order');
    });
  });

  // =========================================================================
  // GET /api/production/capacity/rccp
  // =========================================================================
  describe('GET /api/production/capacity/rccp', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/capacity/rccp');
      const res = await RccpGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return RCCP data with default parameters', async () => {
      authed();
      const mockRccp = {
        periods: [{ period: 'W1', load: 120, capacity: 160 }],
        bottlenecks: [],
      };
      (calculateRCCP as Mock).mockResolvedValue(mockRccp);

      const req = makeReq('http://localhost:3000/api/production/capacity/rccp');
      const res = await RccpGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.periods).toHaveLength(1);
      expect(calculateRCCP).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        'week'
      );
    });

    it('should forward custom date range and periodType', async () => {
      authed();
      (calculateRCCP as Mock).mockResolvedValue({ periods: [] });

      const req = makeReq(
        'http://localhost:3000/api/production/capacity/rccp?startDate=2026-06-01&endDate=2026-06-30&periodType=day'
      );
      const res = await RccpGET(req, emptyCtx);

      expect(res.status).toBe(200);
      const [start, end, periodType] = (calculateRCCP as Mock).mock.calls[0];
      expect(start.toISOString()).toContain('2026-06-01');
      expect(end.toISOString()).toContain('2026-06-30');
      expect(periodType).toBe('day');
    });

    it('should use weeks param to calculate end date when endDate not given', async () => {
      authed();
      (calculateRCCP as Mock).mockResolvedValue({ periods: [] });

      const req = makeReq(
        'http://localhost:3000/api/production/capacity/rccp?startDate=2026-06-01&weeks=8'
      );
      await RccpGET(req, emptyCtx);

      const [start, end] = (calculateRCCP as Mock).mock.calls[0];
      const diffMs = end.getTime() - start.getTime();
      const diffWeeks = diffMs / (7 * 24 * 60 * 60 * 1000);
      expect(diffWeeks).toBe(8);
    });

    it('should return 500 when RCCP calculation fails', async () => {
      authed();
      (calculateRCCP as Mock).mockRejectedValue(new Error('calculation error'));

      const req = makeReq('http://localhost:3000/api/production/capacity/rccp');
      const res = await RccpGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to calculate RCCP');
    });
  });
});
