/**
 * Quality CAPA & Inspections API Route Tests
 * Tests for /api/quality/capa (GET, POST), /api/quality/capa/[id] (GET, PATCH)
 * Tests for /api/quality/inspections (GET, POST), /api/quality/inspections/[id] (GET, PUT)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cAPA: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cAPAHistory: {
      create: vi.fn(),
    },
    nCR: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    inspection: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    inspectionPlan: {
      findUnique: vi.fn(),
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
    warehouse: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    purchaseOrderLine: {
      findUnique: vi.fn(),
    },
    inventory: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lotTransaction: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/quality/capa-workflow', () => ({
  generateCAPANumber: vi.fn().mockResolvedValue('CAPA-2026-0001'),
  transitionCAPA: vi.fn(),
}));

vi.mock('@/lib/quality/inspection-engine', () => ({
  generateInspectionNumber: vi.fn().mockResolvedValue('INS-RCV-2026-0001'),
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
import { transitionCAPA } from '@/lib/quality/capa-workflow';
import { GET as getCAPAList, POST as createCAPA } from '../quality/capa/route';
import { GET as getCAPAById, PATCH as updateCAPA } from '../quality/capa/[id]/route';
import { GET as getInspectionList, POST as createInspection } from '../quality/inspections/route';
import { GET as getInspectionById, PUT as updateInspection } from '../quality/inspections/[id]/route';

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('Quality CAPA API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/quality/capa - List CAPAs
  // ===========================================================================
  describe('GET /api/quality/capa', () => {
    it('should return paginated CAPA list successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const mockCAPAs = [
        {
          id: 'capa-1',
          capaNumber: 'CAPA-2026-0001',
          title: 'Corrective action for bolt defects',
          type: 'corrective',
          status: 'open',
          ncrs: [{ ncrNumber: 'NCR-2026-0001' }],
          _count: { actions: 2 },
        },
      ];

      (prisma.cAPA.findMany as Mock).mockResolvedValue(mockCAPAs);
      (prisma.cAPA.count as Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/quality/capa');
      const response = await getCAPAList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].capaNumber).toBe('CAPA-2026-0001');
      expect(data.pagination.total).toBe(1);
    });

    it('should filter CAPAs by type', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.cAPA.findMany as Mock).mockResolvedValue([]);
      (prisma.cAPA.count as Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/quality/capa?type=corrective');
      const response = await getCAPAList(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.cAPA.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where.type).toBe('corrective');
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.cAPA.findMany as Mock).mockRejectedValue(new Error('DB error'));
      (prisma.cAPA.count as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/quality/capa');
      const response = await getCAPAList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/quality/capa - Create CAPA
  // ===========================================================================
  describe('POST /api/quality/capa', () => {
    const validBody = {
      type: 'corrective',
      source: 'ncr',
      title: 'Corrective action for bolt issue',
      description: 'Implement new receiving inspection process',
      priority: 'high',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/capa', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createCAPA(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when validation fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/quality/capa', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid_type' }), // invalid type and missing fields
      });
      const response = await createCAPA(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeDefined();
    });

    it('should create CAPA successfully with valid data', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const mockCAPA = {
        id: 'capa-1',
        capaNumber: 'CAPA-2026-0001',
        ...validBody,
        status: 'open',
        createdBy: 'user-1',
      };

      (prisma.cAPA.create as Mock).mockResolvedValue(mockCAPA);
      (prisma.cAPAHistory.create as Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/quality/capa', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createCAPA(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.capaNumber).toBe('CAPA-2026-0001');
      expect(data.status).toBe('open');
      expect(prisma.cAPAHistory.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when referenced ownerId does not exist', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.user.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/capa', {
        method: 'POST',
        body: JSON.stringify({
          ...validBody,
          ownerId: 'nonexistent-user',
        }),
      });
      const response = await createCAPA(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // GET /api/quality/capa/[id] - Get CAPA by ID
  // ===========================================================================
  describe('GET /api/quality/capa/[id]', () => {
    it('should return CAPA detail successfully', async () => {
      const mockCAPA = {
        id: 'capa-1',
        capaNumber: 'CAPA-2026-0001',
        title: 'Corrective action',
        status: 'open',
        ncrs: [],
        actions: [],
        history: [],
      };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(mockCAPA);

      const request = new NextRequest('http://localhost:3000/api/quality/capa/capa-1');
      const response = await getCAPAById(request, { params: Promise.resolve({ id: 'capa-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.capaNumber).toBe('CAPA-2026-0001');
    });

    it('should return 404 when CAPA is not found', async () => {
      (prisma.cAPA.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/capa/nonexistent');
      const response = await getCAPAById(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // PATCH /api/quality/capa/[id] - Update CAPA
  // ===========================================================================
  describe('PATCH /api/quality/capa/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/capa/capa-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await updateCAPA(request, { params: Promise.resolve({ id: 'capa-1' }) });

      expect(response.status).toBe(401);
    });

    it('should update CAPA fields successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existingCAPA = { id: 'capa-1', status: 'open' };
      const updatedCAPA = { id: 'capa-1', status: 'open', title: 'Updated title' };

      (prisma.cAPA.findUnique as Mock).mockResolvedValue(existingCAPA);
      (prisma.cAPA.update as Mock).mockResolvedValue(updatedCAPA);

      const request = new NextRequest('http://localhost:3000/api/quality/capa/capa-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated title' }),
      });
      const response = await updateCAPA(request, { params: Promise.resolve({ id: 'capa-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated title');
    });

    it('should trigger workflow transition when action is provided', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existingCAPA = { id: 'capa-1', status: 'open' };
      const updatedCAPA = { id: 'capa-1', status: 'investigation' };

      (prisma.cAPA.findUnique as Mock)
        .mockResolvedValueOnce(existingCAPA)
        .mockResolvedValueOnce(updatedCAPA);
      (transitionCAPA as Mock).mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/quality/capa/capa-1', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start_investigation' }),
      });
      const response = await updateCAPA(request, { params: Promise.resolve({ id: 'capa-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(transitionCAPA).toHaveBeenCalledWith('capa-1', 'start_investigation', 'user-1', { action: 'start_investigation' });
    });
  });
});

describe('Quality Inspections API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/quality/inspections - List Inspections
  // ===========================================================================
  describe('GET /api/quality/inspections', () => {
    it('should return paginated inspection list successfully', async () => {
      const mockInspections = [
        {
          id: 'ins-1',
          inspectionNumber: 'INS-RCV-2026-0001',
          type: 'RECEIVING',
          status: 'pending',
          plan: null,
          part: { partNumber: 'PN-001', name: 'Bolt M8' },
          product: null,
          workOrder: null,
        },
      ];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inspection.findMany as Mock).mockResolvedValue(mockInspections);
      (prisma.inspection.count as Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections');
      const response = await getInspectionList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].inspectionNumber).toBe('INS-RCV-2026-0001');
      expect(data.pagination.total).toBe(1);
    });

    it('should filter inspections by type and status', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inspection.findMany as Mock).mockResolvedValue([]);
      (prisma.inspection.count as Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections?type=RECEIVING&status=pending');
      const response = await getInspectionList(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.inspection.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where.type).toBe('RECEIVING');
      expect(findManyCall.where.status).toBe('pending');
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inspection.findMany as Mock).mockRejectedValue(new Error('DB error'));
      (prisma.inspection.count as Mock).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/quality/inspections');
      const response = await getInspectionList(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/quality/inspections - Create Inspection
  // ===========================================================================
  describe('POST /api/quality/inspections', () => {
    const validBody = {
      type: 'RECEIVING',
      sourceType: 'NON_PO',
      partId: 'part-1',
      quantityReceived: 100,
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createInspection(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return 400 when validation fails (invalid type)', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/quality/inspections', {
        method: 'POST',
        body: JSON.stringify({ type: 'INVALID_TYPE' }),
      });
      const response = await createInspection(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toBeDefined();
    });

    it('should create inspection successfully for NON_PO receiving', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.findUnique as Mock).mockResolvedValue({ id: 'part-1', name: 'Bolt' });

      const mockInspection = {
        id: 'ins-1',
        inspectionNumber: 'INS-RCV-2026-0001',
        type: 'RECEIVING',
        status: 'pending',
        sourceType: 'NON_PO',
      };

      (prisma.inspection.create as Mock).mockResolvedValue(mockInspection);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections', {
        method: 'POST',
        body: JSON.stringify(validBody),
      });
      const response = await createInspection(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.inspectionNumber).toBe('INS-RCV-2026-0001');
      expect(data.status).toBe('pending');
    });

    it('should return 400 when NON_PO receiving is missing partId', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const request = new NextRequest('http://localhost:3000/api/quality/inspections', {
        method: 'POST',
        body: JSON.stringify({
          type: 'RECEIVING',
          sourceType: 'NON_PO',
          quantityReceived: 100,
          // missing partId
        }),
      });
      const response = await createInspection(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // GET /api/quality/inspections/[id] - Get Inspection by ID
  // ===========================================================================
  describe('GET /api/quality/inspections/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/ins-1');
      const response = await getInspectionById(request, { params: Promise.resolve({ id: 'ins-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return inspection detail successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });

      const mockInspection = {
        id: 'ins-1',
        inspectionNumber: 'INS-RCV-2026-0001',
        type: 'RECEIVING',
        status: 'pending',
        part: { id: 'part-1', partNumber: 'PN-001', name: 'Bolt M8', unit: 'EA' },
        product: null,
        plan: null,
        workOrder: null,
        results: [],
      };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(mockInspection);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/ins-1');
      const response = await getInspectionById(request, { params: Promise.resolve({ id: 'ins-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.inspectionNumber).toBe('INS-RCV-2026-0001');
      expect(data.results).toEqual([]);
    });

    it('should return 404 when inspection is not found', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inspection.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/nonexistent');
      const response = await getInspectionById(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Inspection not found');
    });
  });

  // ===========================================================================
  // PUT /api/quality/inspections/[id] - Update Inspection
  // ===========================================================================
  describe('PUT /api/quality/inspections/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/ins-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const response = await updateInspection(request, { params: Promise.resolve({ id: 'ins-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 when inspection does not exist', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.inspection.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const response = await updateInspection(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Inspection not found');
    });

    it('should return 409 when trying to complete an already completed inspection', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existing = { id: 'ins-1', status: 'completed', type: 'RECEIVING', part: null };
      (prisma.inspection.findUnique as Mock).mockResolvedValue(existing);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/ins-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });
      const response = await updateInspection(request, { params: Promise.resolve({ id: 'ins-1' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBeDefined();
    });

    it('should update inspection status successfully', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      const existing = { id: 'ins-1', status: 'pending', type: 'IN_PROCESS', partId: null, part: null };
      const updated = { id: 'ins-1', status: 'in_progress', part: null, results: [] };

      (prisma.inspection.findUnique as Mock).mockResolvedValue(existing);
      (prisma.inspection.update as Mock).mockResolvedValue(updated);

      const request = new NextRequest('http://localhost:3000/api/quality/inspections/ins-1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const response = await updateInspection(request, { params: Promise.resolve({ id: 'ins-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('in_progress');
    });
  });
});
