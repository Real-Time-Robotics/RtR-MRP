/**
 * Quality NCR API Route Tests
 * Tests for /api/quality/ncr (GET, POST) and /api/quality/ncr/[id] (GET, PATCH)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    nCR: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    nCRHistory: {
      create: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
    inspection: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/quality/ncr-workflow', () => ({
  generateNCRNumber: vi.fn().mockResolvedValue('NCR-2026-0001'),
  transitionNCR: vi.fn(),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({ page: 1, pageSize: 20 }),
  buildSearchQuery: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
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

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { transitionNCR } from '@/lib/quality/ncr-workflow';
import { GET as getNCRList, POST as createNCR } from '../quality/ncr/route';
import { GET as getNCRById, PATCH as updateNCR } from '../quality/ncr/[id]/route';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('Quality NCR API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/quality/ncr - List NCRs
  // ===========================================================================
  describe('GET /api/quality/ncr', () => {
    it('should return paginated NCR list successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const mockNCRs = [
        {
          id: 'ncr-1',
          ncrNumber: 'NCR-2026-0001',
          title: 'Defective bolts',
          status: 'open',
          source: 'receiving',
          priority: 'high',
          part: { partNumber: 'PN-001', name: 'Bolt M8' },
          product: null,
          workOrder: null,
          inspection: null,
        },
      ];

      (prisma.nCR.findMany as Mock).mockResolvedValue(mockNCRs);
      (prisma.nCR.count as Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr');
      const response = await getNCRList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].ncrNumber).toBe('NCR-2026-0001');
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('should filter NCRs by status', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.nCR.findMany as Mock).mockResolvedValue([]);
      (prisma.nCR.count as Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr?status=open');
      const response = await getNCRList(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.nCR.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where.status).toBe('open');
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.nCR.findMany as Mock).mockRejectedValue(new Error('DB error'));
      (prisma.nCR.count as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/quality/ncr');
      const response = await getNCRList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/quality/ncr - Create NCR
  // ===========================================================================
  describe('POST /api/quality/ncr', () => {
    const validBody = {
      source: 'receiving',
      quantityAffected: 5,
      title: 'Defective bolts received',
      description: 'Bolts do not meet specifications',
      priority: 'high',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createNCR(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when validation fails (missing required fields)', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/quality/ncr', {
        method: 'POST',
        body: JSON.stringify({ source: 'receiving' }), // missing title, description, quantityAffected
      });
      const response = await createNCR(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.details).toBeDefined();
    });

    it('should return 400 when invalid source type is provided', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/quality/ncr', {
        method: 'POST',
        body: JSON.stringify({
          ...validBody,
          source: 'invalid_source',
        }),
      });
      const response = await createNCR(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeDefined();
    });

    it('should create NCR successfully with valid data', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-2026-0001',
        ...validBody,
        status: 'open',
        createdBy: 'user-1',
      };

      (prisma.nCR.create as Mock).mockResolvedValue(mockNCR);
      (prisma.nCRHistory.create as Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/quality/ncr', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createNCR(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.ncrNumber).toBe('NCR-2026-0001');
      expect(data.status).toBe('open');
      expect(prisma.nCRHistory.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when referenced partId does not exist', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr', {
        method: 'POST',
        body: JSON.stringify({
          ...validBody,
          partId: 'nonexistent-part',
        }),
      });
      const response = await createNCR(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 500 when database create fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.nCR.create as Mock).mockRejectedValue(new Error('DB create failed'));

      const request = new NextRequest('http://localhost:3000/api/quality/ncr', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createNCR(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // GET /api/quality/ncr/[id] - Get NCR by ID
  // ===========================================================================
  describe('GET /api/quality/ncr/[id]', () => {
    it('should return NCR detail successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-2026-0001',
        title: 'Defective bolts',
        status: 'open',
        part: { partNumber: 'PN-001', name: 'Bolt M8' },
        product: null,
        workOrder: null,
        inspection: null,
        capa: null,
        history: [],
      };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(mockNCR);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/ncr-1');
      const response = await getNCRById(request, { params: Promise.resolve({ id: 'ncr-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ncrNumber).toBe('NCR-2026-0001');
      expect(data.history).toEqual([]);
    });

    it('should return 404 when NCR is not found', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.nCR.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/nonexistent');
      const response = await getNCRById(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('NCR not found');
    });

    it('should return 500 when database fetch fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.nCR.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/ncr-1');
      const response = await getNCRById(request, { params: Promise.resolve({ id: 'ncr-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch NCR');
    });
  });

  // ===========================================================================
  // PATCH /api/quality/ncr/[id] - Update NCR
  // ===========================================================================
  describe('PATCH /api/quality/ncr/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/ncr-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated title' }),
      });
      const response = await updateNCR(request, { params: Promise.resolve({ id: 'ncr-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return 404 when NCR does not exist', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.nCR.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated title' }),
      });
      const response = await updateNCR(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it('should update NCR fields successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existingNCR = { id: 'ncr-1', status: 'open', title: 'Old title' };
      const updatedNCR = { id: 'ncr-1', status: 'open', title: 'Updated title' };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(existingNCR);
      (prisma.nCR.update as Mock).mockResolvedValue(updatedNCR);

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/ncr-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated title' }),
      });
      const response = await updateNCR(request, { params: Promise.resolve({ id: 'ncr-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated title');
      expect(prisma.nCR.update).toHaveBeenCalledWith({
        where: { id: 'ncr-1' },
        data: { title: 'Updated title' },
      });
    });

    it('should trigger workflow transition when action is provided', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existingNCR = { id: 'ncr-1', status: 'open' };
      const updatedNCR = { id: 'ncr-1', status: 'under_review' };

      (prisma.nCR.findUnique as Mock)
        .mockResolvedValueOnce(existingNCR) // first call: check existence
        .mockResolvedValueOnce(updatedNCR); // second call: after transition
      (transitionNCR as Mock).mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/ncr-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'review' }),
      });
      const response = await updateNCR(request, { params: Promise.resolve({ id: 'ncr-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(transitionNCR).toHaveBeenCalledWith('ncr-1', 'review', 'user-1', {});
      expect(data.status).toBe('under_review');
    });

    it('should return 400 when workflow transition fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existingNCR = { id: 'ncr-1', status: 'open' };

      (prisma.nCR.findUnique as Mock).mockResolvedValue(existingNCR);
      (transitionNCR as Mock).mockResolvedValue({ success: false, error: 'Invalid transition' });

      const request = new NextRequest('http://localhost:3000/api/quality/ncr/ncr-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'close' }),
      });
      const response = await updateNCR(request, { params: Promise.resolve({ id: 'ncr-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid transition');
    });
  });
});
