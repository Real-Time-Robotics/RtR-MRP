/**
 * BOM API Route Tests
 *
 * Covers:
 *   1. GET /api/bom            - List BOM headers (paginated, filterable)
 *   2. POST /api/bom           - Create BOM header (+ optional lines)
 *   3. GET /api/bom/[id]       - Get single BOM by ID
 *   4. PUT /api/bom/[id]       - Update BOM header and lines
 *   5. DELETE /api/bom/[id]    - Delete draft BOM
 *   6. GET /api/bom/[id]/lines - List lines for a BOM
 *   7. POST /api/bom/[id]/lines - Add line to a BOM
 *   8. GET /api/bom/versions   - Get BOM version history
 *   9. POST /api/bom/versions  - BOM version actions (submit/approve/reject/new_version)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks (must be declared before imports that reference them)
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bomHeader: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bomLine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    part: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue(null),
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

vi.mock('@/lib/bom/bom-version-service', () => ({
  submitBomForApproval: vi.fn(),
  approveBom: vi.fn(),
  rejectBom: vi.fn(),
  createNewBomVersion: vi.fn(),
  getBomVersionHistory: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import {
  submitBomForApproval,
  approveBom,
  rejectBom,
  createNewBomVersion,
  getBomVersionHistory,
} from '@/lib/bom/bom-version-service';
import { GET as getBomList, POST as createBom } from '../bom/route';
import { GET as getBomById, PUT as updateBom, DELETE as deleteBom } from '../bom/[id]/route';
import { GET as getBomLines, POST as createBomLine } from '../bom/[id]/lines/route';
import { GET as getBomVersions, POST as postBomVersionAction } from '../bom/versions/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'ADMIN' },
};
const mockContext = { params: Promise.resolve({}) };
const mockContextWithId = (id: string) => ({ params: Promise.resolve({ id }) });

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

function jsonRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: NextRequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BOM API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockSession);
  });

  // =========================================================================
  // 1. GET /api/bom — List BOMs
  // =========================================================================
  describe('GET /api/bom', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom');
      const res = await getBomList(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated BOM list successfully', async () => {
      const mockBoms = [
        {
          id: 'bom-1',
          version: '1.0',
          status: 'draft',
          product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
          bomLines: [],
        },
      ];

      (prisma.bomHeader.findMany as Mock).mockResolvedValue(mockBoms);
      (prisma.bomHeader.count as Mock).mockResolvedValue(1);

      const req = new NextRequest('http://localhost:3000/api/bom');
      const res = await getBomList(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].version).toBe('1.0');
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('should filter by productId and status', async () => {
      (prisma.bomHeader.findMany as Mock).mockResolvedValue([]);
      (prisma.bomHeader.count as Mock).mockResolvedValue(0);

      const req = new NextRequest('http://localhost:3000/api/bom?productId=prod-1&status=active');
      const res = await getBomList(req, mockContext);

      expect(res.status).toBe(200);
      const findManyCall = (prisma.bomHeader.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where.productId).toBe('prod-1');
      expect(findManyCall.where.status).toBe('active');
    });

    it('should return 500 when database query fails', async () => {
      (prisma.bomHeader.findMany as Mock).mockRejectedValue(new Error('DB error'));
      (prisma.bomHeader.count as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/bom');
      const res = await getBomList(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch BOMs');
    });
  });

  // =========================================================================
  // 2. POST /api/bom — Create BOM
  // =========================================================================
  describe('POST /api/bom', () => {
    const validBody = {
      productId: 'prod-1',
      version: '1.0',
      status: 'draft',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', validBody);
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when validation fails (missing productId)', async () => {
      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', { version: '1.0' });
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should return 400 when product does not exist', async () => {
      (prisma.product.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', validBody);
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('không tồn tại');
    });

    it('should return 400 when BOM version already exists for the product', async () => {
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-existing' });

      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', validBody);
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('đã tồn tại');
    });

    it('should create BOM header successfully without lines', async () => {
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

      const mockCreated = {
        id: 'bom-1',
        productId: 'prod-1',
        version: '1.0',
        status: 'draft',
        product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
        bomLines: [],
      };
      (prisma.bomHeader.create as Mock).mockResolvedValue(mockCreated);

      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', validBody);
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('bom-1');
      expect(data.data.version).toBe('1.0');
      expect(data.data.bomLines).toEqual([]);
    });

    it('should return 400 when referenced parts do not exist', async () => {
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);
      (prisma.part.findMany as Mock).mockResolvedValue([]); // no parts found

      const bodyWithLines = {
        ...validBody,
        lines: [{ partId: 'part-missing', quantity: 5 }],
      };

      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', bodyWithLines);
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Parts không tồn tại');
    });

    it('should return 500 when database create fails', async () => {
      (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'prod-1' });
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);
      (prisma.bomHeader.create as Mock).mockRejectedValue(new Error('DB create failed'));

      const req = jsonRequest('http://localhost:3000/api/bom', 'POST', validBody);
      const res = await createBom(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  // =========================================================================
  // 3. GET /api/bom/[id] — Get BOM by ID
  // =========================================================================
  describe('GET /api/bom/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1');
      const res = await getBomById(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when BOM is not found', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom/nonexistent');
      const res = await getBomById(req, mockContextWithId('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('không tồn tại');
    });

    it('should return BOM detail successfully', async () => {
      const mockBom = {
        id: 'bom-1',
        version: '1.0',
        status: 'draft',
        product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
        bomLines: [
          {
            id: 'line-1',
            partId: 'part-1',
            quantity: 10,
            part: { id: 'part-1', partNumber: 'PN-001', name: 'Bolt M8', unitCost: 1.5, unit: 'EA' },
          },
        ],
      };
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(mockBom);

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1');
      const res = await getBomById(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('bom-1');
      expect(data.bomLines).toHaveLength(1);
      expect(data.bomLines[0].part.partNumber).toBe('PN-001');
    });

    it('should return 500 when database query fails', async () => {
      (prisma.bomHeader.findUnique as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1');
      const res = await getBomById(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch BOM');
    });
  });

  // =========================================================================
  // 4. PUT /api/bom/[id] — Update BOM
  // =========================================================================
  describe('PUT /api/bom/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1', 'PUT', { status: 'active' });
      const res = await updateBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when BOM does not exist', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom/nonexistent', 'PUT', { status: 'active' });
      const res = await updateBom(req, mockContextWithId('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('không tồn tại');
    });

    it('should return 400 when trying to edit an obsolete BOM', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({
        id: 'bom-1',
        status: 'obsolete',
        bomLines: [],
      });

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1', 'PUT', { status: 'active' });
      const res = await updateBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('lỗi thời');
    });

    it('should update BOM header successfully', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({
        id: 'bom-1',
        status: 'draft',
        version: '1.0',
        productId: 'prod-1',
        bomLines: [],
      });

      const mockUpdated = {
        id: 'bom-1',
        version: '1.0',
        status: 'active',
        product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
        bomLines: [],
      };
      (prisma.bomHeader.update as Mock).mockResolvedValue(mockUpdated);

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1', 'PUT', { status: 'active' });
      const res = await updateBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('active');
    });

    it('should return 500 when database update fails', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({
        id: 'bom-1',
        status: 'draft',
        version: '1.0',
        productId: 'prod-1',
        bomLines: [],
      });
      (prisma.bomHeader.update as Mock).mockRejectedValue(new Error('DB error'));

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1', 'PUT', { status: 'active' });
      const res = await updateBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to update BOM');
    });
  });

  // =========================================================================
  // 5. DELETE /api/bom/[id] — Delete BOM
  // =========================================================================
  describe('DELETE /api/bom/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1', { method: 'DELETE' });
      const res = await deleteBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 when BOM does not exist', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom/nonexistent', { method: 'DELETE' });
      const res = await deleteBom(req, mockContextWithId('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('không tồn tại');
    });

    it('should return 400 when trying to delete a non-draft BOM', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({
        id: 'bom-1',
        status: 'active',
      });

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1', { method: 'DELETE' });
      const res = await deleteBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('draft');
    });

    it('should delete draft BOM successfully', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({
        id: 'bom-1',
        status: 'draft',
      });
      (prisma.bomLine.deleteMany as Mock).mockResolvedValue({ count: 2 });
      (prisma.bomHeader.delete as Mock).mockResolvedValue({ id: 'bom-1' });

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1', { method: 'DELETE' });
      const res = await deleteBom(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('xóa thành công');
      expect(prisma.bomLine.deleteMany).toHaveBeenCalledWith({ where: { bomId: 'bom-1' } });
      expect(prisma.bomHeader.delete).toHaveBeenCalledWith({ where: { id: 'bom-1' } });
    });
  });

  // =========================================================================
  // 6. GET /api/bom/[id]/lines — List BOM lines
  // =========================================================================
  describe('GET /api/bom/[id]/lines', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1/lines');
      const res = await getBomLines(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return BOM lines successfully', async () => {
      const mockLines = [
        {
          id: 'line-1',
          bomId: 'bom-1',
          lineNumber: 1,
          quantity: 10,
          part: { id: 'part-1', partNumber: 'PN-001', name: 'Bolt M8' },
        },
        {
          id: 'line-2',
          bomId: 'bom-1',
          lineNumber: 2,
          quantity: 5,
          part: { id: 'part-2', partNumber: 'PN-002', name: 'Nut M8' },
        },
      ];
      (prisma.bomLine.findMany as Mock).mockResolvedValue(mockLines);

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1/lines');
      const res = await getBomLines(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].part.partNumber).toBe('PN-001');
    });

    it('should return 500 when database query fails', async () => {
      (prisma.bomLine.findMany as Mock).mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost:3000/api/bom/bom-1/lines');
      const res = await getBomLines(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch BOM lines');
    });
  });

  // =========================================================================
  // 7. POST /api/bom/[id]/lines — Add BOM line
  // =========================================================================
  describe('POST /api/bom/[id]/lines', () => {
    const validLineBody = {
      partId: 'part-1',
      quantity: 10,
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1/lines', 'POST', validLineBody);
      const res = await createBomLine(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when validation fails (missing partId)', async () => {
      const req = jsonRequest('http://localhost:3000/api/bom/bom-1/lines', 'POST', { quantity: 10 });
      const res = await createBomLine(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 404 when BOM header does not exist', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom/nonexistent/lines', 'POST', validLineBody);
      const res = await createBomLine(req, mockContextWithId('nonexistent'));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should create BOM line successfully', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1' });
      (prisma.bomLine.findFirst as Mock).mockResolvedValue({ lineNumber: 10 });

      const mockLine = {
        id: 'line-new',
        bomId: 'bom-1',
        partId: 'part-1',
        quantity: 10,
        lineNumber: 20,
        part: { id: 'part-1', partNumber: 'PN-001', name: 'Bolt M8' },
      };
      (prisma.bomLine.create as Mock).mockResolvedValue(mockLine);

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1/lines', 'POST', validLineBody);
      const res = await createBomLine(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.partId).toBe('part-1');
      expect(data.quantity).toBe(10);
    });

    it('should return 500 when database create fails', async () => {
      (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1' });
      (prisma.bomLine.findFirst as Mock).mockResolvedValue(null);
      (prisma.bomLine.create as Mock).mockRejectedValue(new Error('DB error'));

      const req = jsonRequest('http://localhost:3000/api/bom/bom-1/lines', 'POST', validLineBody);
      const res = await createBomLine(req, mockContextWithId('bom-1'));
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to create BOM line');
    });
  });

  // =========================================================================
  // 8. GET /api/bom/versions — Get BOM version history
  // =========================================================================
  describe('GET /api/bom/versions', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/bom/versions?productId=prod-1');
      const res = await getBomVersions(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when productId is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/bom/versions');
      const res = await getBomVersions(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('productId required');
    });

    it('should return version history successfully', async () => {
      const mockHistory = [
        { id: 'bom-1', version: '1.0', status: 'obsolete' },
        { id: 'bom-2', version: '2.0', status: 'active' },
      ];
      (getBomVersionHistory as Mock).mockResolvedValue(mockHistory);

      const req = new NextRequest('http://localhost:3000/api/bom/versions?productId=prod-1');
      const res = await getBomVersions(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(getBomVersionHistory).toHaveBeenCalledWith('prod-1');
    });

    it('should return 500 when service throws', async () => {
      (getBomVersionHistory as Mock).mockRejectedValue(new Error('Service error'));

      const req = new NextRequest('http://localhost:3000/api/bom/versions?productId=prod-1');
      const res = await getBomVersions(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to fetch BOM versions');
    });
  });

  // =========================================================================
  // 9. POST /api/bom/versions — BOM version actions
  // =========================================================================
  describe('POST /api/bom/versions', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'submit',
        bomId: 'bom-1',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid action', async () => {
      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'invalid_action',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should submit BOM for approval successfully', async () => {
      const mockResult = { id: 'bom-1', status: 'pending_approval' };
      (submitBomForApproval as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'submit',
        bomId: 'bom-1',
        notes: 'Ready for review',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('pending_approval');
      expect(submitBomForApproval).toHaveBeenCalledWith('bom-1', 'user-1', 'Ready for review');
    });

    it('should return 400 when bomId is missing for submit', async () => {
      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'submit',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('bomId is required');
    });

    it('should approve BOM successfully', async () => {
      const mockResult = { id: 'bom-1', status: 'active' };
      (approveBom as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'approve',
        bomId: 'bom-1',
        activateImmediately: true,
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('active');
      expect(approveBom).toHaveBeenCalledWith('bom-1', 'user-1', true, undefined);
    });

    it('should reject BOM requiring a reason', async () => {
      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'reject',
        bomId: 'bom-1',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('reason is required');
    });

    it('should reject BOM successfully with reason', async () => {
      const mockResult = { id: 'bom-1', status: 'rejected' };
      (rejectBom as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'reject',
        bomId: 'bom-1',
        reason: 'Incorrect parts',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('rejected');
      expect(rejectBom).toHaveBeenCalledWith('bom-1', 'user-1', 'Incorrect parts');
    });

    it('should create new BOM version successfully', async () => {
      const mockResult = { id: 'bom-new', version: '2.0', status: 'draft' };
      (createNewBomVersion as Mock).mockResolvedValue(mockResult);

      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'new_version',
        productId: 'prod-1',
        notes: 'Design revision',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.version).toBe('2.0');
      expect(createNewBomVersion).toHaveBeenCalledWith('prod-1', 'user-1', 'Design revision');
    });

    it('should return 400 when productId is missing for new_version', async () => {
      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'new_version',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('productId is required');
    });

    it('should return 500 when version service throws', async () => {
      (submitBomForApproval as Mock).mockRejectedValue(new Error('Service error'));

      const req = jsonRequest('http://localhost:3000/api/bom/versions', 'POST', {
        action: 'submit',
        bomId: 'bom-1',
      });
      const res = await postBomVersionAction(req, mockContext);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to process BOM version action');
    });
  });
});
