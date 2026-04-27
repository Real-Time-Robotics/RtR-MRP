/**
 * Sprint 27 TIP-S27-03 — Assembly API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const mockPrisma = {
  product: { findUnique: vi.fn() },
  bomHeader: { findFirst: vi.fn() },
  assemblyOrder: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  serialUnit: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  serialLink: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));

// Mock auth — x-test-user-id header provides session
vi.mock('@/lib/api/with-auth', () => ({
  withAuth: vi.fn((handler) => {
    return async (request: Request, context: Record<string, unknown>) => {
      const userId = request.headers.get('x-test-user-id');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      const session = { user: { id: userId, email: `${userId}@rtr.vn`, name: 'Test' } };
      return handler(request, context, session);
    };
  }),
}));

// Mock RBAC
vi.mock('@/lib/auth/rbac', () => ({
  hasRole: vi.fn(),
}));

// Mock assembly service
vi.mock('@/lib/assembly/service', () => ({
  generateAoNumber: vi.fn().mockResolvedValue('AO-2026-0001'),
  validateChildSerial: vi.fn(),
  completeAssemblyOrder: vi.fn(),
  IncompleteAssemblyError: class extends Error {
    missingByBomLine: unknown[];
    constructor(missing: unknown[]) {
      super('Incomplete');
      this.name = 'IncompleteAssemblyError';
      this.missingByBomLine = missing;
    }
  },
  NoModuleDesignForProductError: class extends Error {
    constructor() { super('No module design'); this.name = 'NoModuleDesignForProductError'; }
  },
  AssemblyOrderNotFoundError: class extends Error {
    constructor() { super('Not found'); this.name = 'AssemblyOrderNotFoundError'; }
  },
  InvalidAssemblyStateError: class extends Error {
    constructor(msg: string) { super(msg); this.name = 'InvalidAssemblyStateError'; }
  },
}));

vi.mock('@/lib/serial/numbering', () => ({
  SerialNumberingRuleNotFoundError: class extends Error {
    constructor() { super('No rule'); this.name = 'SerialNumberingRuleNotFoundError'; }
  },
}));

import { hasRole } from '@/lib/auth/rbac';
import { completeAssemblyOrder, IncompleteAssemblyError } from '@/lib/assembly/service';

const mockedHasRole = vi.mocked(hasRole);
const mockedComplete = vi.mocked(completeAssemblyOrder);

function makeRequest(url: string, opts?: RequestInit): Request {
  return new Request(`http://localhost${url}`, opts);
}

describe('Assembly API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasRole.mockResolvedValue(true);
  });

  // =========================================================================
  // POST /api/assembly
  // =========================================================================

  describe('POST /api/assembly', () => {
    it('returns 401 without auth', async () => {
      const { POST } = await import('../route');
      const req = makeRequest('/api/assembly', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: 'p1' }),
      });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(401);
    });

    it('returns 403 for viewer role', async () => {
      mockedHasRole.mockResolvedValue(false);
      const { POST } = await import('../route');
      const req = makeRequest('/api/assembly', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test-user-id': 'user-viewer' },
        body: JSON.stringify({ productId: 'p1' }),
      });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(403);
    });

    it('returns 201 on happy path', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'EBOX' });
      mockPrisma.bomHeader.findFirst.mockResolvedValue({ id: 'bh-1' });
      mockPrisma.assemblyOrder.count.mockResolvedValue(0);
      mockPrisma.assemblyOrder.create.mockResolvedValue({
        id: 'ao-new',
        aoNumber: 'AO-2026-0001',
        status: 'DRAFT',
        productId: 'p1',
      });

      const { POST } = await import('../route');
      const req = makeRequest('/api/assembly', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test-user-id': 'user-prod' },
        body: JSON.stringify({ productId: 'p1', bomHeaderId: 'bh-1' }),
      });
      const res = await POST(req as any, {} as any);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ao.aoNumber).toMatch(/^AO-\d{4}-\d{4}$/);
    });
  });

  // =========================================================================
  // POST /api/assembly/:id/scan-child
  // =========================================================================

  describe('POST /api/assembly/:id/scan-child', () => {
    it('returns 400 for NOT_IN_STOCK serial', async () => {
      const { validateChildSerial } = await import('@/lib/assembly/service');
      vi.mocked(validateChildSerial).mockResolvedValue({ ok: false, reason: 'NOT_IN_STOCK' });

      mockPrisma.assemblyOrder.findUnique.mockResolvedValue({
        id: 'ao-1', status: 'IN_PROGRESS',
        bomHeader: { bomLines: [] },
      });

      const { POST } = await import('../[id]/scan-child/route');
      const req = makeRequest('/api/assembly/ao-1/scan-child', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test-user-id': 'user-prod' },
        body: JSON.stringify({ childSerial: 'S-001' }),
      });
      const res = await POST(req as any, { params: Promise.resolve({ id: 'ao-1' }) } as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.reason).toBe('NOT_IN_STOCK');
    });
  });

  // =========================================================================
  // POST /api/assembly/:id/complete
  // =========================================================================

  describe('POST /api/assembly/:id/complete', () => {
    it('returns 422 when children missing', async () => {
      const missing = [{ bomLineId: 'bl-1', partId: 'p-A', expected: 3, actual: 1 }];
      const err = new (IncompleteAssemblyError as any)(missing);
      mockedComplete.mockRejectedValue(err);

      const { POST } = await import('../[id]/complete/route');
      const req = makeRequest('/api/assembly/ao-1/complete', {
        method: 'POST',
        headers: { 'x-test-user-id': 'user-prod' },
      });
      const res = await POST(req as any, { params: Promise.resolve({ id: 'ao-1' }) } as any);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.missingByBomLine).toHaveLength(1);
    });

    it('returns 200 on successful completion', async () => {
      mockedComplete.mockResolvedValue({ parentSerial: 'EBOX-V10-270426-001', aoId: 'ao-1' });

      const { POST } = await import('../[id]/complete/route');
      const req = makeRequest('/api/assembly/ao-1/complete', {
        method: 'POST',
        headers: { 'x-test-user-id': 'user-prod' },
      });
      const res = await POST(req as any, { params: Promise.resolve({ id: 'ao-1' }) } as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.parentSerial).toBe('EBOX-V10-270426-001');
      expect(data.status).toBe('COMPLETED');
    });
  });
});
