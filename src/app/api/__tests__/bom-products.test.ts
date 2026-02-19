/**
 * BOM & Products API Route Tests
 *
 * Covers:
 *   /api/bom           (GET, POST)
 *   /api/bom/[id]      (GET, PUT, DELETE)
 *   /api/bom/[id]/lines (GET, POST, PUT, DELETE)
 *   /api/bom/[id]/create-pos (POST)
 *   /api/bom/products  (GET)
 *   /api/bom/versions  (GET, POST)
 *   /api/products      (GET, POST)
 *   /api/products/[id] (GET, PUT)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    part: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
    },
    partSupplier: {
      findMany: vi.fn(),
    },
    purchaseOrder: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    logError: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/bom/bom-version-service', () => ({
  submitBomForApproval: vi.fn(),
  approveBom: vi.fn(),
  rejectBom: vi.fn(),
  createNewBomVersion: vi.fn(),
  getBomVersionHistory: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Lazy imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/prisma';
import {
  submitBomForApproval,
  approveBom,
  rejectBom,
  createNewBomVersion,
  getBomVersionHistory,
} from '@/lib/bom/bom-version-service';

// Route imports
import { GET as bomListGET, POST as bomListPOST } from '../bom/route';
import { GET as bomIdGET, PUT as bomIdPUT, DELETE as bomIdDELETE } from '../bom/[id]/route';
import { GET as bomLinesGET, POST as bomLinesPOST, PUT as bomLinesPUT, DELETE as bomLinesDELETE } from '../bom/[id]/lines/route';
import { POST as createPosPOST } from '../bom/[id]/create-pos/route';
import { GET as bomProductsGET } from '../bom/products/route';
import { GET as bomVersionsGET, POST as bomVersionsPOST } from '../bom/versions/route';
import { GET as productsGET, POST as productsPOST } from '../products/route';
import { GET as productIdGET, PUT as productIdPUT } from '../products/[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

function makeRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const init: NextRequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

function idContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@rtr.vn', role: 'admin' },
};

function authenticateAs(role = 'admin') {
  (auth as Mock).mockResolvedValue({
    user: { id: 'user-1', name: 'Test User', email: 'test@rtr.vn', role },
  });
}

function unauthenticated() {
  (auth as Mock).mockResolvedValue(null);
}

// ===========================================================================
// TESTS
// ===========================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. /api/bom  (GET, POST)
// ---------------------------------------------------------------------------

describe('GET /api/bom', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomListGET(makeRequest('http://localhost:3000/api/bom'), idContext(''));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns paginated BOM list', async () => {
    authenticateAs();
    const mockBoms = [{ id: 'bom-1', version: '1.0', product: { id: 'p1', sku: 'S1', name: 'P1' }, bomLines: [] }];
    (prisma.bomHeader.findMany as Mock).mockResolvedValue(mockBoms);
    (prisma.bomHeader.count as Mock).mockResolvedValue(1);

    const res = await bomListGET(makeRequest('http://localhost:3000/api/bom?page=1&pageSize=20'), idContext(''));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data).toEqual(mockBoms);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBe(1);
  });

  it('returns 500 when database fails', async () => {
    authenticateAs();
    (prisma.bomHeader.findMany as Mock).mockRejectedValue(new Error('DB down'));

    const res = await bomListGET(makeRequest('http://localhost:3000/api/bom'), idContext(''));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch BOMs');
  });
});

describe('POST /api/bom', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', { productId: 'p1' }),
      idContext(''),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for validation errors (missing productId)', async () => {
    authenticateAs();
    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', { version: '1.0' }),
      idContext(''),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when product does not exist', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue(null);

    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', { productId: 'nonexistent', version: '1.0' }),
      idContext(''),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('không tồn tại');
  });

  it('returns 400 when BOM version already exists', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'p1' });
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'existing-bom' });

    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', { productId: 'p1', version: '1.0' }),
      idContext(''),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('đã tồn tại');
  });

  it('creates BOM successfully with lines', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'p1' });
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null); // no existing version
    (prisma.part.findMany as Mock).mockResolvedValue([{ id: 'part-1' }]);
    const createdBom = {
      id: 'bom-new',
      productId: 'p1',
      version: '1.0',
      status: 'draft',
      product: { id: 'p1', sku: 'SKU-1', name: 'Prod 1' },
      bomLines: [{ id: 'line-1', partId: 'part-1', quantity: 5 }],
    };
    (prisma.bomHeader.create as Mock).mockResolvedValue(createdBom);

    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', {
        productId: 'p1',
        version: '1.0',
        lines: [{ partId: 'part-1', quantity: 5 }],
      }),
      idContext(''),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('bom-new');
  });

  it('returns 400 when referenced parts do not exist', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'p1' });
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);
    (prisma.part.findMany as Mock).mockResolvedValue([]); // no parts found

    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', {
        productId: 'p1',
        version: '1.0',
        lines: [{ partId: 'missing-part', quantity: 1 }],
      }),
      idContext(''),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Parts không tồn tại');
  });

  it('returns 500 on unexpected error', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'p1' });
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);
    (prisma.bomHeader.create as Mock).mockRejectedValue(new Error('DB error'));

    const res = await bomListPOST(
      makeRequest('http://localhost:3000/api/bom', 'POST', { productId: 'p1', version: '1.0' }),
      idContext(''),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. /api/bom/[id]  (GET, PUT, DELETE)
// ---------------------------------------------------------------------------

describe('GET /api/bom/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomIdGET(makeRequest('http://localhost:3000/api/bom/bom-1'), idContext('bom-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when BOM not found', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

    const res = await bomIdGET(makeRequest('http://localhost:3000/api/bom/bom-x'), idContext('bom-x'));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('không tồn tại');
  });

  it('returns BOM by id successfully', async () => {
    authenticateAs();
    const mockBom = { id: 'bom-1', version: '1.0', product: { id: 'p1' }, bomLines: [] };
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(mockBom);

    const res = await bomIdGET(makeRequest('http://localhost:3000/api/bom/bom-1'), idContext('bom-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('bom-1');
  });
});

describe('PUT /api/bom/[id]', () => {
  it('returns 404 when BOM not found', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

    const res = await bomIdPUT(
      makeRequest('http://localhost:3000/api/bom/bom-x', 'PUT', { status: 'active' }),
      idContext('bom-x'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when editing an obsolete BOM', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1', status: 'obsolete', bomLines: [] });

    const res = await bomIdPUT(
      makeRequest('http://localhost:3000/api/bom/bom-1', 'PUT', { status: 'active' }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('lỗi thời');
  });

  it('updates BOM header successfully', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1', status: 'draft', version: '1.0', productId: 'p1', bomLines: [] });
    const updatedBom = { id: 'bom-1', status: 'active', version: '1.0', product: { id: 'p1' }, bomLines: [] };
    (prisma.bomHeader.update as Mock).mockResolvedValue(updatedBom);

    const res = await bomIdPUT(
      makeRequest('http://localhost:3000/api/bom/bom-1', 'PUT', { status: 'active' }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('active');
  });
});

describe('DELETE /api/bom/[id]', () => {
  it('returns 404 when BOM not found', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

    const res = await bomIdDELETE(makeRequest('http://localhost:3000/api/bom/bom-x', 'DELETE'), idContext('bom-x'));
    expect(res.status).toBe(404);
  });

  it('returns 400 when deleting non-draft BOM', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1', status: 'active' });

    const res = await bomIdDELETE(makeRequest('http://localhost:3000/api/bom/bom-1', 'DELETE'), idContext('bom-1'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('draft');
  });

  it('deletes draft BOM successfully', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1', status: 'draft' });
    (prisma.bomLine.deleteMany as Mock).mockResolvedValue({ count: 2 });
    (prisma.bomHeader.delete as Mock).mockResolvedValue({ id: 'bom-1' });

    const res = await bomIdDELETE(makeRequest('http://localhost:3000/api/bom/bom-1', 'DELETE'), idContext('bom-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain('xóa thành công');
  });
});

// ---------------------------------------------------------------------------
// 3. /api/bom/[id]/lines  (GET, POST, PUT, DELETE)
// ---------------------------------------------------------------------------

describe('GET /api/bom/[id]/lines', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomLinesGET(makeRequest('http://localhost:3000/api/bom/bom-1/lines'), idContext('bom-1'));
    expect(res.status).toBe(401);
  });

  it('returns lines for a BOM', async () => {
    authenticateAs();
    const mockLines = [{ id: 'line-1', partId: 'part-1', quantity: 10, part: { id: 'part-1' } }];
    (prisma.bomLine.findMany as Mock).mockResolvedValue(mockLines);

    const res = await bomLinesGET(makeRequest('http://localhost:3000/api/bom/bom-1/lines'), idContext('bom-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('line-1');
  });
});

describe('POST /api/bom/[id]/lines', () => {
  it('returns 400 for invalid data (missing partId)', async () => {
    authenticateAs();
    const res = await bomLinesPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/lines', 'POST', { quantity: 5 }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when BOM header does not exist', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue(null);

    const res = await bomLinesPOST(
      makeRequest('http://localhost:3000/api/bom/bom-x/lines', 'POST', { partId: 'part-1', quantity: 5 }),
      idContext('bom-x'),
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('BOM header not found');
  });

  it('creates a BOM line successfully', async () => {
    authenticateAs();
    (prisma.bomHeader.findUnique as Mock).mockResolvedValue({ id: 'bom-1' });
    (prisma.bomLine.findFirst as Mock).mockResolvedValue(null); // no existing lines
    const createdLine = { id: 'line-new', bomId: 'bom-1', partId: 'part-1', quantity: 5, part: { id: 'part-1' } };
    (prisma.bomLine.create as Mock).mockResolvedValue(createdLine);

    const res = await bomLinesPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/lines', 'POST', { partId: 'part-1', quantity: 5 }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.partId).toBe('part-1');
  });
});

describe('PUT /api/bom/[id]/lines', () => {
  it('returns 400 when lines array is missing', async () => {
    authenticateAs();
    const res = await bomLinesPUT(
      makeRequest('http://localhost:3000/api/bom/bom-1/lines', 'PUT', { notLines: true }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('lines array is required');
  });

  it('batch-updates lines successfully', async () => {
    authenticateAs();
    const updatedLine = { id: 'line-1', quantity: 20 };
    (prisma.bomLine.update as Mock).mockResolvedValue(updatedLine);

    const res = await bomLinesPUT(
      makeRequest('http://localhost:3000/api/bom/bom-1/lines', 'PUT', {
        lines: [{ id: 'line-1', quantity: 20, unit: 'pcs' }],
      }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

describe('DELETE /api/bom/[id]/lines', () => {
  it('returns 400 when lineId is missing', async () => {
    authenticateAs();
    const res = await bomLinesDELETE(
      makeRequest('http://localhost:3000/api/bom/bom-1/lines', 'DELETE', {}),
      idContext('bom-1'),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('lineId is required');
  });

  it('deletes a BOM line successfully', async () => {
    authenticateAs();
    (prisma.bomLine.delete as Mock).mockResolvedValue({ id: 'line-1' });

    const res = await bomLinesDELETE(
      makeRequest('http://localhost:3000/api/bom/bom-1/lines', 'DELETE', { lineId: 'line-1' }),
      idContext('bom-1'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe('Line deleted successfully');
  });
});

// ---------------------------------------------------------------------------
// 4. /api/bom/[id]/create-pos (POST) — withPermission
// ---------------------------------------------------------------------------

describe('POST /api/bom/[id]/create-pos', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await createPosPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/create-pos', 'POST', {
        shortageItems: [{ partId: 'part-1', quantity: 10 }],
      }),
      idContext('bom-1') as any,
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role (no purchasing:create permission)', async () => {
    authenticateAs('viewer');
    const res = await createPosPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/create-pos', 'POST', {
        shortageItems: [{ partId: 'part-1', quantity: 10 }],
      }),
      idContext('bom-1') as any,
    );
    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid body (empty shortageItems)', async () => {
    authenticateAs('admin');
    const res = await createPosPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/create-pos', 'POST', {
        shortageItems: [],
      }),
      idContext('bom-1') as any,
    );
    expect(res.status).toBe(422);
  });

  it('returns 400 when no suppliers found for any shortage items', async () => {
    authenticateAs('admin');
    (prisma.partSupplier.findMany as Mock).mockResolvedValue([]);
    (prisma.part.findUnique as Mock).mockResolvedValue({ id: 'part-1', partNumber: 'PN-1', name: 'Part 1' });

    const res = await createPosPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/create-pos', 'POST', {
        shortageItems: [{ partId: 'part-1', quantity: 10 }],
      }),
      idContext('bom-1') as any,
    );
    expect(res.status).toBe(400);
  });

  it('creates POs successfully', async () => {
    authenticateAs('admin');
    (prisma.partSupplier.findMany as Mock).mockResolvedValue([
      {
        partId: 'part-1',
        supplierId: 'sup-1',
        isPreferred: true,
        unitPrice: 10,
        leadTimeDays: 7,
        status: 'active',
        supplier: { id: 'sup-1', code: 'SUP1', name: 'Supplier 1' },
        part: { id: 'part-1', partNumber: 'PN1', name: 'Part 1' },
      },
    ]);
    (prisma.purchaseOrder.findFirst as Mock).mockResolvedValue(null);
    const createdPO = {
      id: 'po-1',
      poNumber: `PO-${new Date().getFullYear()}-001`,
      totalAmount: 100,
      lines: [{ id: 'pol-1', partId: 'part-1', quantity: 10 }],
      supplier: { id: 'sup-1', code: 'SUP1', name: 'Supplier 1' },
    };
    (prisma.purchaseOrder.create as Mock).mockResolvedValue(createdPO);

    const res = await createPosPOST(
      makeRequest('http://localhost:3000/api/bom/bom-1/create-pos', 'POST', {
        shortageItems: [{ partId: 'part-1', quantity: 10 }],
      }),
      idContext('bom-1') as any,
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.created).toHaveLength(1);
    expect(data.data.summary.totalPOs).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. /api/bom/products (GET)
// ---------------------------------------------------------------------------

describe('GET /api/bom/products', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomProductsGET(makeRequest('http://localhost:3000/api/bom/products'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(401);
  });

  it('returns products with BOM summary', async () => {
    authenticateAs();
    (prisma.product.count as Mock).mockResolvedValue(1);
    (prisma.product.findMany as Mock).mockResolvedValue([
      {
        id: 'p1',
        sku: 'SKU-1',
        name: 'Product 1',
        basePrice: 100,
        status: 'active',
        bomHeaders: [
          { version: '1.0', bomLines: [{ id: 'l1' }, { id: 'l2' }] },
        ],
      },
    ]);

    const res = await bomProductsGET(makeRequest('http://localhost:3000/api/bom/products'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].hasBom).toBe(true);
    expect(data.data[0].totalParts).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 6. /api/bom/versions (GET, POST)
// ---------------------------------------------------------------------------

describe('GET /api/bom/versions', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomVersionsGET(makeRequest('http://localhost:3000/api/bom/versions'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(401);
  });

  it('returns 400 when productId is missing', async () => {
    authenticateAs();
    const res = await bomVersionsGET(makeRequest('http://localhost:3000/api/bom/versions'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('productId required');
  });

  it('returns version history', async () => {
    authenticateAs();
    const mockHistory = [{ bomId: 'bom-1', version: '1.0', status: 'active' }];
    (getBomVersionHistory as Mock).mockResolvedValue(mockHistory);

    const res = await bomVersionsGET(
      makeRequest('http://localhost:3000/api/bom/versions?productId=p1'),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toEqual(mockHistory);
  });
});

describe('POST /api/bom/versions', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await bomVersionsPOST(
      makeRequest('http://localhost:3000/api/bom/versions', 'POST', { action: 'submit', bomId: 'bom-1' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(401);
  });

  it('handles submit action', async () => {
    authenticateAs();
    const result = { success: true, bomId: 'bom-1', newStatus: 'pending_approval' };
    (submitBomForApproval as Mock).mockResolvedValue(result);

    const res = await bomVersionsPOST(
      makeRequest('http://localhost:3000/api/bom/versions', 'POST', { action: 'submit', bomId: 'bom-1' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('handles approve action', async () => {
    authenticateAs();
    (approveBom as Mock).mockResolvedValue({ success: true });

    const res = await bomVersionsPOST(
      makeRequest('http://localhost:3000/api/bom/versions', 'POST', { action: 'approve', bomId: 'bom-1', activateImmediately: true }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid action', async () => {
    authenticateAs();
    const res = await bomVersionsPOST(
      makeRequest('http://localhost:3000/api/bom/versions', 'POST', { action: 'invalid-action' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid action|Invalid input/);
  });

  it('returns 500 on service error', async () => {
    authenticateAs();
    (submitBomForApproval as Mock).mockRejectedValue(new Error('Service failed'));

    const res = await bomVersionsPOST(
      makeRequest('http://localhost:3000/api/bom/versions', 'POST', { action: 'submit', bomId: 'bom-1' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to process BOM version action');
  });
});

// ---------------------------------------------------------------------------
// 7. /api/products (GET, POST)
// ---------------------------------------------------------------------------

describe('GET /api/products', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await productsGET(makeRequest('http://localhost:3000/api/products'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(401);
  });

  it('returns paginated products', async () => {
    authenticateAs();
    const mockProducts = [
      { id: 'p1', sku: 'SKU-1', name: 'Product 1', status: 'active', defaultWorkCenter: null, _count: { bomHeaders: 1 } },
    ];
    (prisma.product.findMany as Mock).mockResolvedValue(mockProducts);
    (prisma.product.count as Mock).mockResolvedValue(1);

    const res = await productsGET(makeRequest('http://localhost:3000/api/products'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });

  it('returns 500 on database error', async () => {
    authenticateAs();
    (prisma.product.findMany as Mock).mockRejectedValue(new Error('DB crash'));

    const res = await productsGET(makeRequest('http://localhost:3000/api/products'), { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/products', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await productsPOST(
      makeRequest('http://localhost:3000/api/products', 'POST', { sku: 'SKU-1', name: 'P1' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for validation errors (missing sku)', async () => {
    authenticateAs();
    const res = await productsPOST(
      makeRequest('http://localhost:3000/api/products', 'POST', { name: 'Product 1' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when SKU already exists', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'existing' });

    const res = await productsPOST(
      makeRequest('http://localhost:3000/api/products', 'POST', { sku: 'SKU-DUP', name: 'Product 1' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('SKU');
    expect(data.error).toContain('da ton tai');
  });

  it('creates product successfully', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue(null); // no existing SKU
    const createdProduct = {
      id: 'p-new',
      sku: 'SKU-NEW',
      name: 'New Product',
      status: 'active',
      defaultWorkCenter: null,
    };
    (prisma.product.create as Mock).mockResolvedValue(createdProduct);

    const res = await productsPOST(
      makeRequest('http://localhost:3000/api/products', 'POST', { sku: 'SKU-NEW', name: 'New Product' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.sku).toBe('SKU-NEW');
  });

  it('returns 400 when work center does not exist', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue(null); // no existing SKU
    (prisma.workCenter.findUnique as Mock).mockResolvedValue(null);

    const res = await productsPOST(
      makeRequest('http://localhost:3000/api/products', 'POST', {
        sku: 'SKU-WC',
        name: 'Product WC',
        defaultWorkCenterId: 'wc-nonexistent',
      }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Work center');
  });

  it('returns 500 on unexpected error', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue(null);
    (prisma.product.create as Mock).mockRejectedValue(new Error('DB error'));

    const res = await productsPOST(
      makeRequest('http://localhost:3000/api/products', 'POST', { sku: 'SKU-ERR', name: 'Err' }),
      { params: Promise.resolve({}) } as any,
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to create product');
  });
});

// ---------------------------------------------------------------------------
// 8. /api/products/[id] (GET, PUT)
// ---------------------------------------------------------------------------

describe('GET /api/products/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await productIdGET(makeRequest('http://localhost:3000/api/products/p1'), idContext('p1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when product not found', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue(null);

    const res = await productIdGET(makeRequest('http://localhost:3000/api/products/p-x'), idContext('p-x'));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Product not found');
  });

  it('returns product by id', async () => {
    authenticateAs();
    const mockProduct = { id: 'p1', sku: 'SKU-1', name: 'Product 1', defaultWorkCenter: null, _count: { bomHeaders: 0 } };
    (prisma.product.findUnique as Mock).mockResolvedValue(mockProduct);

    const res = await productIdGET(makeRequest('http://localhost:3000/api/products/p1'), idContext('p1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('p1');
  });

  it('returns 500 on database error', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockRejectedValue(new Error('DB fail'));

    const res = await productIdGET(makeRequest('http://localhost:3000/api/products/p1'), idContext('p1'));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch product');
  });
});

describe('PUT /api/products/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    unauthenticated();
    const res = await productIdPUT(
      makeRequest('http://localhost:3000/api/products/p1', 'PUT', { name: 'Updated' }),
      idContext('p1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when product not found', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue(null);

    const res = await productIdPUT(
      makeRequest('http://localhost:3000/api/products/p-x', 'PUT', { name: 'Updated' }),
      idContext('p-x'),
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Product not found');
  });

  it('returns 400 for validation errors', async () => {
    authenticateAs();
    const res = await productIdPUT(
      makeRequest('http://localhost:3000/api/products/p1', 'PUT', { status: 'INVALID_STATUS' }),
      idContext('p1'),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
  });

  it('returns 400 when changing SKU to one that already exists', async () => {
    authenticateAs();
    // First call: findUnique with id -> existing product
    // Second call: findUnique with sku -> conflict
    (prisma.product.findUnique as Mock)
      .mockResolvedValueOnce({ id: 'p1', sku: 'SKU-OLD' }) // existing product
      .mockResolvedValueOnce({ id: 'p-other', sku: 'SKU-DUP' }); // SKU conflict

    const res = await productIdPUT(
      makeRequest('http://localhost:3000/api/products/p1', 'PUT', { sku: 'SKU-DUP' }),
      idContext('p1'),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('SKU');
    expect(data.error).toContain('da ton tai');
  });

  it('updates product successfully', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'p1', sku: 'SKU-1', name: 'Old Name' });
    const updatedProduct = { id: 'p1', sku: 'SKU-1', name: 'New Name' };
    (prisma.product.update as Mock).mockResolvedValue(updatedProduct);

    const res = await productIdPUT(
      makeRequest('http://localhost:3000/api/products/p1', 'PUT', { name: 'New Name' }),
      idContext('p1'),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('New Name');
  });

  it('returns 500 on unexpected error', async () => {
    authenticateAs();
    (prisma.product.findUnique as Mock).mockResolvedValue({ id: 'p1', sku: 'SKU-1' });
    (prisma.product.update as Mock).mockRejectedValue(new Error('DB error'));

    const res = await productIdPUT(
      makeRequest('http://localhost:3000/api/products/p1', 'PUT', { name: 'Updated' }),
      idContext('p1'),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to update product');
  });
});
