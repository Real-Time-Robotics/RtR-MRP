/**
 * MRP ATP, Pegging, Exceptions, and Multi-Site API Route Tests
 *
 * Tests for UNTESTED MRP sub-routes:
 *  - GET  /api/mrp/atp
 *  - POST /api/mrp/atp (batch ATP check)
 *  - GET  /api/mrp/pegging
 *  - POST /api/mrp/pegging
 *  - GET  /api/mrp/exceptions (withAuth version - detailed filter tests)
 *  - GET  /api/mrp/multi-site
 *  - POST /api/mrp/multi-site (createSite, updateSettings)
 *
 * Note: Basic exceptions GET/POST are in mrp-routes.test.ts but use a
 * different import pattern. This file tests the withAuth-wrapped route
 * with additional filter scenarios.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before importing route modules)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    peggingRecord: {
      findMany: vi.fn(),
    },
    site: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    inventorySite: {
      findMany: vi.fn(),
    },
    planningSettings: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
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

vi.mock('@/lib/mrp', () => ({
  calculateATP: vi.fn(),
  checkBatchATP: vi.fn(),
  updateATPRecords: vi.fn(),
  generatePegging: vi.fn(),
  savePeggingRecords: vi.fn(),
  detectExceptions: vi.fn(),
  getExceptionSummary: vi.fn(),
  getExceptions: vi.fn(),
  resolveException: vi.fn(),
  acknowledgeException: vi.fn(),
  ignoreException: vi.fn(),
  clearOldExceptions: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  calculateATP,
  checkBatchATP,
  updateATPRecords,
  generatePegging,
  savePeggingRecords,
  getExceptions,
  getExceptionSummary,
} from '@/lib/mrp';

import { GET as AtpGET, POST as AtpPOST } from '../mrp/atp/route';
import { GET as PeggingGET, POST as PeggingPOST } from '../mrp/pegging/route';
import { GET as ExceptionsGET } from '../mrp/exceptions/route';
import { GET as MultiSiteGET, POST as MultiSitePOST } from '../mrp/multi-site/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyCtx = { params: Promise.resolve({}) } as never;

function authed(overrides: Record<string, unknown> = {}) {
  (auth as Mock).mockResolvedValue({
    user: { id: 'user-1', name: 'Test', email: 'test@test.com', role: 'ADMIN', ...overrides },
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

describe('MRP ATP API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/mrp/atp
  // =========================================================================
  describe('GET /api/mrp/atp', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/atp?partId=part-1');
      const res = await AtpGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 when partId is missing', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/mrp/atp');
      const res = await AtpGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('partId is required');
    });

    it('should calculate ATP for a part successfully', async () => {
      authed();
      const mockResult = {
        partId: 'part-1',
        available: true,
        atpQuantity: 150,
        earliestDate: '2026-02-20',
        grid: [{ date: '2026-02-20', available: 150, committed: 50 }],
      };
      (calculateATP as Mock).mockResolvedValue(mockResult);

      const req = makeReq('http://localhost:3000/api/mrp/atp?partId=part-1&quantity=100');
      const res = await AtpGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.partId).toBe('part-1');
      expect(body.available).toBe(true);
      expect(body.atpQuantity).toBe(150);
      expect(calculateATP).toHaveBeenCalledWith('part-1', 100, expect.any(Date), undefined, 90);
    });

    it('should pass siteId and horizon parameters', async () => {
      authed();
      (calculateATP as Mock).mockResolvedValue({ available: false, atpQuantity: 0 });

      const req = makeReq('http://localhost:3000/api/mrp/atp?partId=part-1&siteId=site-1&horizon=30');
      const res = await AtpGET(req, emptyCtx);

      expect(res.status).toBe(200);
      expect(calculateATP).toHaveBeenCalledWith('part-1', 1, expect.any(Date), 'site-1', 30);
    });

    it('should return 500 when calculateATP throws', async () => {
      authed();
      (calculateATP as Mock).mockRejectedValue(new Error('Part not found'));

      const req = makeReq('http://localhost:3000/api/mrp/atp?partId=bad-id');
      const res = await AtpGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to calculate ATP');
    });
  });

  // =========================================================================
  // POST /api/mrp/atp (batch check)
  // =========================================================================
  describe('POST /api/mrp/atp', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/atp', {
        method: 'POST',
        body: JSON.stringify({ items: [] }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await AtpPOST(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return 400 when body validation fails', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/mrp/atp', {
        method: 'POST',
        body: JSON.stringify({ invalid: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await AtpPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid input');
    });

    it('should check batch ATP successfully', async () => {
      authed();
      const mockResults = [
        { partId: 'part-1', available: true, atpQuantity: 100 },
        { partId: 'part-2', available: false, atpQuantity: 0 },
      ];
      (checkBatchATP as Mock).mockResolvedValue(mockResults);

      const req = makeReq('http://localhost:3000/api/mrp/atp', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { partId: 'part-1', quantity: 50, requiredDate: '2026-03-01' },
            { partId: 'part-2', quantity: 200, requiredDate: '2026-03-15' },
          ],
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await AtpPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.results).toHaveLength(2);
      expect(checkBatchATP).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ partId: 'part-1', quantity: 50 }),
        ])
      );
    });

    it('should save ATP records when saveRecords is true', async () => {
      authed();
      const mockGrid = [{ date: '2026-03-01', available: 100 }];
      (checkBatchATP as Mock).mockResolvedValue([{ partId: 'part-1', available: true }]);
      (calculateATP as Mock).mockResolvedValue({ grid: mockGrid });
      (updateATPRecords as Mock).mockResolvedValue(undefined);

      const req = makeReq('http://localhost:3000/api/mrp/atp', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { partId: 'part-1', quantity: 10, requiredDate: '2026-03-01' },
          ],
          saveRecords: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await AtpPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(calculateATP).toHaveBeenCalled();
      expect(updateATPRecords).toHaveBeenCalledWith('part-1', mockGrid);
    });

    it('should return 500 when batch ATP check throws', async () => {
      authed();
      (checkBatchATP as Mock).mockRejectedValue(new Error('Batch processing error'));

      const req = makeReq('http://localhost:3000/api/mrp/atp', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ partId: 'part-1', quantity: 10, requiredDate: '2026-03-01' }],
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await AtpPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to check batch ATP');
    });
  });
});

describe('MRP Pegging API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/mrp/pegging
  // =========================================================================
  describe('GET /api/mrp/pegging', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/pegging');
      const res = await PeggingGET(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return existing pegging records when no generate flag', async () => {
      authed();
      const mockRecords = [
        { id: 'peg-1', demandPartId: 'part-1', demandDate: '2026-03-01', supplyType: 'PO' },
        { id: 'peg-2', demandPartId: 'part-1', demandDate: '2026-03-15', supplyType: 'WO' },
      ];
      (prisma.peggingRecord.findMany as Mock).mockResolvedValue(mockRecords);

      const req = makeReq('http://localhost:3000/api/mrp/pegging?partId=part-1');
      const res = await PeggingGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(prisma.peggingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { demandPartId: 'part-1' },
        })
      );
    });

    it('should generate fresh pegging when generate=true', async () => {
      authed();
      const mockResult = {
        demands: [{ partId: 'part-1', quantity: 100, date: '2026-03-01' }],
        supplies: [{ type: 'PO', quantity: 100, date: '2026-02-25' }],
      };
      (generatePegging as Mock).mockResolvedValue(mockResult);

      const req = makeReq('http://localhost:3000/api/mrp/pegging?partId=part-1&generate=true');
      const res = await PeggingGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.demands).toHaveLength(1);
      expect(generatePegging).toHaveBeenCalledWith('part-1', undefined, 90);
    });

    it('should return all records when no partId filter', async () => {
      authed();
      (prisma.peggingRecord.findMany as Mock).mockResolvedValue([]);

      const req = makeReq('http://localhost:3000/api/mrp/pegging');
      const res = await PeggingGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual([]);
      expect(prisma.peggingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });

    it('should return 500 when database query fails', async () => {
      authed();
      (prisma.peggingRecord.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/mrp/pegging');
      const res = await PeggingGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to get pegging');
    });
  });

  // =========================================================================
  // POST /api/mrp/pegging
  // =========================================================================
  describe('POST /api/mrp/pegging', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/pegging', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PeggingPOST(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return 400 when body validation fails (missing partId)', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/mrp/pegging', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PeggingPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid input');
    });

    it('should generate and save pegging successfully', async () => {
      authed();
      const mockResult = {
        demands: [{ partId: 'part-1', quantity: 50 }],
        supplies: [{ type: 'PO', quantity: 50 }],
      };
      (generatePegging as Mock).mockResolvedValue(mockResult);
      (savePeggingRecords as Mock).mockResolvedValue(undefined);

      const req = makeReq('http://localhost:3000/api/mrp/pegging', {
        method: 'POST',
        body: JSON.stringify({ partId: 'part-1', siteId: 'site-1', horizon: 60, mrpRunId: 'run-1' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PeggingPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.pegging.demands).toHaveLength(1);
      expect(generatePegging).toHaveBeenCalledWith('part-1', 'site-1', 60);
      expect(savePeggingRecords).toHaveBeenCalledWith(
        'part-1',
        mockResult.demands,
        mockResult.supplies,
        'run-1'
      );
    });

    it('should return 500 when generate pegging throws', async () => {
      authed();
      (generatePegging as Mock).mockRejectedValue(new Error('No BOM found'));

      const req = makeReq('http://localhost:3000/api/mrp/pegging', {
        method: 'POST',
        body: JSON.stringify({ partId: 'bad-part' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await PeggingPOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to generate pegging');
    });
  });
});

describe('MRP Exceptions API (withAuth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/mrp/exceptions - withAuth filter tests
  // =========================================================================
  describe('GET /api/mrp/exceptions', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/exceptions');
      const res = await ExceptionsGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should pass filter parameters to getExceptions', async () => {
      authed();
      (getExceptions as Mock).mockResolvedValue([]);

      const req = makeReq(
        'http://localhost:3000/api/mrp/exceptions?status=open&severity=critical&type=shortage&partId=part-1&siteId=site-1&limit=50'
      );
      const res = await ExceptionsGET(req, emptyCtx);

      expect(res.status).toBe(200);
      expect(getExceptions).toHaveBeenCalledWith({
        status: 'open',
        severity: 'critical',
        exceptionType: 'shortage',
        partId: 'part-1',
        siteId: 'site-1',
        limit: 50,
      });
    });

    it('should return summary when summary=true', async () => {
      authed();
      const mockSummary = { total: 15, critical: 3, high: 5, medium: 4, low: 3 };
      (getExceptionSummary as Mock).mockResolvedValue(mockSummary);

      const req = makeReq('http://localhost:3000/api/mrp/exceptions?summary=true&siteId=site-1');
      const res = await ExceptionsGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total).toBe(15);
      expect(getExceptionSummary).toHaveBeenCalledWith('site-1');
    });
  });
});

describe('MRP Multi-Site API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET /api/mrp/multi-site
  // =========================================================================
  describe('GET /api/mrp/multi-site', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/multi-site');
      const res = await MultiSiteGET(req, emptyCtx);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return sites list by default (action=sites)', async () => {
      authed();
      const mockSites = [
        { id: 'site-1', code: 'HCM', name: 'Ho Chi Minh', warehouses: [], inventorySites: [] },
        { id: 'site-2', code: 'HN', name: 'Ha Noi', warehouses: [], inventorySites: [] },
      ];
      (prisma.site.findMany as Mock).mockResolvedValue(mockSites);

      const req = makeReq('http://localhost:3000/api/mrp/multi-site');
      const res = await MultiSiteGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body[0].code).toBe('HCM');
      expect(prisma.site.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } })
      );
    });

    it('should return inventory when action=inventory', async () => {
      authed();
      const mockInventory = [
        { id: 'inv-1', siteId: 'site-1', partId: 'part-1', quantity: 500, part: {}, site: {} },
      ];
      (prisma.inventorySite.findMany as Mock).mockResolvedValue(mockInventory);

      const req = makeReq('http://localhost:3000/api/mrp/multi-site?action=inventory&siteId=site-1');
      const res = await MultiSiteGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(prisma.inventorySite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId: 'site-1' },
        })
      );
    });

    it('should return settings when action=settings', async () => {
      authed();
      const mockSettings = [
        { id: 'set-1', siteId: 'site-1', demandTimeFence: 7, planningTimeFence: 30 },
      ];
      (prisma.planningSettings.findMany as Mock).mockResolvedValue(mockSettings);

      const req = makeReq('http://localhost:3000/api/mrp/multi-site?action=settings&siteId=site-1');
      const res = await MultiSiteGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].demandTimeFence).toBe(7);
    });

    it('should return 400 for invalid action', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/mrp/multi-site?action=invalid');
      const res = await MultiSiteGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toContain('Invalid action');
    });

    it('should return 500 when database query fails', async () => {
      authed();
      (prisma.site.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const req = makeReq('http://localhost:3000/api/mrp/multi-site');
      const res = await MultiSiteGET(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to get multi-site data');
    });
  });

  // =========================================================================
  // POST /api/mrp/multi-site
  // =========================================================================
  describe('POST /api/mrp/multi-site', () => {
    it('should return 401 when not authenticated', async () => {
      unauthed();
      const req = makeReq('http://localhost:3000/api/mrp/multi-site', {
        method: 'POST',
        body: JSON.stringify({ action: 'createSite', code: 'DN', name: 'Da Nang' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await MultiSitePOST(req, emptyCtx);
      expect(res.status).toBe(401);
    });

    it('should return 400 when body validation fails', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/mrp/multi-site', {
        method: 'POST',
        body: JSON.stringify({ action: 'badAction' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await MultiSitePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid input');
    });

    it('should create a site successfully', async () => {
      authed();
      const mockSite = { id: 'site-new', code: 'DN', name: 'Da Nang', siteType: 'WAREHOUSE', isActive: true };
      (prisma.site.create as Mock).mockResolvedValue(mockSite);

      const req = makeReq('http://localhost:3000/api/mrp/multi-site', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createSite',
          code: 'DN',
          name: 'Da Nang',
          siteType: 'MANUFACTURING',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await MultiSitePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.site.code).toBe('DN');
      expect(prisma.site.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'DN', name: 'Da Nang', siteType: 'MANUFACTURING' }),
        })
      );
    });

    it('should return 400 when createSite is missing code or name', async () => {
      authed();
      const req = makeReq('http://localhost:3000/api/mrp/multi-site', {
        method: 'POST',
        body: JSON.stringify({ action: 'createSite', code: 'DN' }), // missing name
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await MultiSitePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('code and name are required');
    });

    it('should update planning settings successfully', async () => {
      authed();
      const mockSettings = {
        id: 'set-1',
        siteId: 'site-1',
        demandTimeFence: 14,
        planningTimeFence: 60,
        frozenZone: 5,
      };
      (prisma.planningSettings.upsert as Mock).mockResolvedValue(mockSettings);

      const req = makeReq('http://localhost:3000/api/mrp/multi-site', {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateSettings',
          siteId: 'site-1',
          demandTimeFence: 14,
          planningTimeFence: 60,
          frozenZone: 5,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await MultiSitePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.settings.demandTimeFence).toBe(14);
      expect(prisma.planningSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { siteId: 'site-1' },
        })
      );
    });

    it('should return 500 when site creation fails', async () => {
      authed();
      (prisma.site.create as Mock).mockRejectedValue(new Error('Unique constraint violation'));

      const req = makeReq('http://localhost:3000/api/mrp/multi-site', {
        method: 'POST',
        body: JSON.stringify({ action: 'createSite', code: 'DUP', name: 'Duplicate' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await MultiSitePOST(req, emptyCtx);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to process multi-site action');
    });
  });
});
