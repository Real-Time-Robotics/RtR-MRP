/**
 * Production Capacity, Routing [id], and Work Centers [id] API Route Tests
 *
 * Tests for UNTESTED production sub-routes:
 *  - GET  /api/production/routing/[id]
 *  - PUT  /api/production/routing/[id]
 *  - POST /api/production/routing/[id] (actions: activate, copy, validate)
 *  - DELETE /api/production/routing/[id]
 *  - GET  /api/production/work-centers/[id]
 *  - PUT  /api/production/work-centers/[id]
 *  - DELETE /api/production/work-centers/[id]
 *
 * Note: capacity/route.ts GET, oee/route.ts GET, routing/route.ts GET/POST,
 * and work-centers/route.ts GET/POST are already covered in production-sub-routes.test.ts.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing route modules)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  default: {
    routing: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  prisma: {
    routing: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

vi.mock('@/lib/production/routing-engine', () => ({
  activateRouting: vi.fn(),
  validateRouting: vi.fn(),
  copyRouting: vi.fn(),
}));

vi.mock('@/lib/production/capacity-engine', () => ({
  getWorkCenterUtilization: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { activateRouting, validateRouting, copyRouting } from '@/lib/production/routing-engine';
import { getWorkCenterUtilization } from '@/lib/production/capacity-engine';

import {
  GET as RoutingIdGET,
  PUT as RoutingIdPUT,
  POST as RoutingIdPOST,
  DELETE as RoutingIdDELETE,
} from '../production/routing/[id]/route';

import {
  GET as WorkCenterIdGET,
  PUT as WorkCenterIdPUT,
  DELETE as WorkCenterIdDELETE,
} from '../production/work-centers/[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ctxWithId = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

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

describe('Production Routing [id] & Work Centers [id] API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/production/routing/[id]
  // =========================================================================
  describe('GET /api/production/routing/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/routing/rt-1');
      const res = await RoutingIdGET(req, ctxWithId('rt-1'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return routing with operations when found', async () => {
      authed();
      const mockRouting = {
        id: 'rt-1',
        routingNumber: 'RT-001',
        name: 'Assembly Routing',
        product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
        operations: [
          {
            id: 'op-1',
            operationNumber: 10,
            name: 'Cut',
            workCenter: { id: 'wc-1', code: 'WC-001', name: 'CNC Lathe' },
          },
          {
            id: 'op-2',
            operationNumber: 20,
            name: 'Assemble',
            workCenter: { id: 'wc-2', code: 'WC-002', name: 'Assembly Line' },
          },
        ],
      };
      (prisma.routing.findUnique as Mock).mockResolvedValue(mockRouting);

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1');
      const res = await RoutingIdGET(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe('rt-1');
      expect(body.operations).toHaveLength(2);
      expect(body.operations[0].workCenter.code).toBe('WC-001');
      expect(prisma.routing.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } })
      );
    });

    it('should return 404 when routing not found', async () => {
      authed();
      (prisma.routing.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/production/routing/nonexistent');
      const res = await RoutingIdGET(req, ctxWithId('nonexistent'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Routing not found');
    });

    it('should return 500 when database query fails', async () => {
      authed();
      (prisma.routing.findUnique as Mock).mockRejectedValue(new Error('DB connection lost'));

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1');
      const res = await RoutingIdGET(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch routing');
    });
  });

  // =========================================================================
  // PUT /api/production/routing/[id]
  // =========================================================================
  describe('PUT /api/production/routing/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Routing' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPUT(req, ctxWithId('rt-1'));
      expect(res.status).toBe(401);
    });

    it('should update routing name successfully', async () => {
      authed();
      const mockUpdated = { id: 'rt-1', routingNumber: 'RT-001', name: 'Updated Routing', description: null };
      (prisma.routing.update as Mock).mockResolvedValue(mockUpdated);

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Routing' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPUT(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe('Updated Routing');
      expect(prisma.routing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: expect.objectContaining({ name: 'Updated Routing' }),
        })
      );
    });

    it('should return 400 when validation fails (empty name)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPUT(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 500 when update fails', async () => {
      authed();
      (prisma.routing.update as Mock).mockRejectedValue(new Error('Record not found'));

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPUT(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to update routing');
    });
  });

  // =========================================================================
  // POST /api/production/routing/[id] (actions)
  // =========================================================================
  describe('POST /api/production/routing/[id] (actions)', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      expect(res.status).toBe(401);
    });

    it('should validate a routing successfully', async () => {
      authed();
      const mockValidation = { valid: true, errors: [] };
      (validateRouting as Mock).mockResolvedValue(mockValidation);

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.valid).toBe(true);
      expect(validateRouting).toHaveBeenCalledWith('rt-1');
    });

    it('should activate a routing when validation passes', async () => {
      authed();
      (validateRouting as Mock).mockResolvedValue({ valid: true, errors: [] });
      (activateRouting as Mock).mockResolvedValue(undefined);

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'activate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(validateRouting).toHaveBeenCalledWith('rt-1');
      expect(activateRouting).toHaveBeenCalledWith('rt-1');
    });

    it('should return 400 when activation validation fails', async () => {
      authed();
      (validateRouting as Mock).mockResolvedValue({
        valid: false,
        errors: ['No operations defined'],
      });

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'activate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Routing validation failed');
      expect(body.errors).toContain('No operations defined');
      expect(activateRouting).not.toHaveBeenCalled();
    });

    it('should copy a routing successfully', async () => {
      authed();
      (copyRouting as Mock).mockResolvedValue('rt-copy-1');

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'copy' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe('rt-copy-1');
      expect(copyRouting).toHaveBeenCalledWith('rt-1');
    });

    it('should return 400 when action is invalid (Zod validation)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid_action' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 500 when engine throws on action', async () => {
      authed();
      (validateRouting as Mock).mockRejectedValue(new Error('Engine error'));

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await RoutingIdPOST(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to perform routing action');
    });
  });

  // =========================================================================
  // DELETE /api/production/routing/[id]
  // =========================================================================
  describe('DELETE /api/production/routing/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', { method: 'DELETE' });
      const res = await RoutingIdDELETE(req, ctxWithId('rt-1'));
      expect(res.status).toBe(401);
    });

    it('should delete a routing successfully', async () => {
      authed();
      (prisma.routing.delete as Mock).mockResolvedValue({ id: 'rt-1' });

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', { method: 'DELETE' });
      const res = await RoutingIdDELETE(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.routing.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
    });

    it('should return 500 when delete fails', async () => {
      authed();
      (prisma.routing.delete as Mock).mockRejectedValue(new Error('FK constraint'));

      const req = makeReq('http://localhost:3000/api/production/routing/rt-1', { method: 'DELETE' });
      const res = await RoutingIdDELETE(req, ctxWithId('rt-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to delete routing');
    });
  });

  // =========================================================================
  // GET /api/production/work-centers/[id]
  // =========================================================================
  describe('GET /api/production/work-centers/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1');
      const res = await WorkCenterIdGET(req, ctxWithId('wc-1'));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return work center with utilization when found', async () => {
      authed();
      const mockWorkCenter = {
        id: 'wc-1',
        code: 'WC-001',
        name: 'CNC Lathe',
        type: 'machine',
        status: 'active',
        scheduledOps: [
          {
            id: 'sop-1',
            workOrderOperation: { id: 'woo-1', workOrder: { id: 'wo-1', woNumber: 'WO-001' } },
          },
        ],
        downtimeRecords: [],
      };
      (prisma.workCenter.findUnique as Mock).mockResolvedValue(mockWorkCenter);
      (getWorkCenterUtilization as Mock).mockResolvedValue(72.5);

      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1');
      const res = await WorkCenterIdGET(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe('wc-1');
      expect(body.code).toBe('WC-001');
      expect(body.todayUtilization).toBe(72.5);
      expect(body.scheduledOps).toHaveLength(1);
      expect(getWorkCenterUtilization).toHaveBeenCalledWith('wc-1', expect.any(Date));
    });

    it('should return 404 when work center not found', async () => {
      authed();
      (prisma.workCenter.findUnique as Mock).mockResolvedValue(null);

      const req = makeReq('http://localhost:3000/api/production/work-centers/nonexistent');
      const res = await WorkCenterIdGET(req, ctxWithId('nonexistent'));
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Work center not found');
    });

    it('should return 500 when database query fails', async () => {
      authed();
      (prisma.workCenter.findUnique as Mock).mockRejectedValue(new Error('Connection timeout'));

      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1');
      const res = await WorkCenterIdGET(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch work center');
    });
  });

  // =========================================================================
  // PUT /api/production/work-centers/[id]
  // =========================================================================
  describe('PUT /api/production/work-centers/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated WC' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCenterIdPUT(req, ctxWithId('wc-1'));
      expect(res.status).toBe(401);
    });

    it('should update work center successfully', async () => {
      authed();
      const mockUpdated = {
        id: 'wc-1',
        code: 'WC-001',
        name: 'Updated Lathe',
        type: 'machine',
        efficiency: 95,
      };
      (prisma.workCenter.update as Mock).mockResolvedValue(mockUpdated);

      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Lathe', efficiency: 95 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCenterIdPUT(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe('Updated Lathe');
      expect(body.efficiency).toBe(95);
      expect(prisma.workCenter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wc-1' },
          data: expect.objectContaining({ name: 'Updated Lathe', efficiency: 95 }),
        })
      );
    });

    it('should return 400 when efficiency exceeds max (200)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', {
        method: 'PUT',
        body: JSON.stringify({ efficiency: 250 }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCenterIdPUT(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Validation failed');
    });

    it('should return 500 when update fails', async () => {
      authed();
      (prisma.workCenter.update as Mock).mockRejectedValue(new Error('Record not found'));

      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await WorkCenterIdPUT(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to update work center');
    });
  });

  // =========================================================================
  // DELETE /api/production/work-centers/[id]
  // =========================================================================
  describe('DELETE /api/production/work-centers/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', { method: 'DELETE' });
      const res = await WorkCenterIdDELETE(req, ctxWithId('wc-1'));
      expect(res.status).toBe(401);
    });

    it('should delete a work center successfully', async () => {
      authed();
      (prisma.workCenter.delete as Mock).mockResolvedValue({ id: 'wc-1' });

      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', { method: 'DELETE' });
      const res = await WorkCenterIdDELETE(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.workCenter.delete).toHaveBeenCalledWith({ where: { id: 'wc-1' } });
    });

    it('should return 500 when delete fails', async () => {
      authed();
      (prisma.workCenter.delete as Mock).mockRejectedValue(new Error('FK constraint on scheduledOps'));

      const req = makeReq('http://localhost:3000/api/production/work-centers/wc-1', { method: 'DELETE' });
      const res = await WorkCenterIdDELETE(req, ctxWithId('wc-1'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to delete work center');
    });
  });
});
