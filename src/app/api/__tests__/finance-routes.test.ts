/**
 * Finance API Routes Tests
 * Tests for POST /api/finance/costing (run cost rollup)
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    partCostRollup: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

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
  },
}));

vi.mock('@/lib/finance', () => ({
  runFullCostRollup: vi.fn(),
  getRollupStatus: vi.fn(),
  rollupPartCost: vi.fn(),
  saveRollupResults: vi.fn(),
}));

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn(() => ({ page: 1, limit: 20 })),
  buildOffsetPaginationQuery: vi.fn(() => ({ skip: 0, take: 20 })),
  buildPaginatedResponse: vi.fn((data: unknown[], total: number, params: unknown, startTime: number) => ({
    data,
    total,
    page: 1,
    limit: 20,
    totalPages: Math.ceil(total / 20),
    executionTime: Date.now() - startTime,
  })),
  paginatedSuccess: vi.fn((data: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json(data);
  }),
  paginatedError: vi.fn((message: string, status: number) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status });
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkWriteEndpointLimit: vi.fn(() => Promise.resolve(null)),
  checkReadEndpointLimit: vi.fn(() => Promise.resolve(null)),
}));

import { auth } from '@/lib/auth';
import { runFullCostRollup, rollupPartCost, saveRollupResults, getRollupStatus } from '@/lib/finance';
import { prisma } from '@/lib/prisma';

const mockContext = { params: Promise.resolve({}) };

const mockAdminSession = {
  user: { id: 'user-1', email: 'admin@test.com', role: 'admin', name: 'Admin User' },
};

const mockManagerSession = {
  user: { id: 'user-2', email: 'manager@test.com', role: 'manager', name: 'Manager User' },
};

const mockUserSession = {
  user: { id: 'user-3', email: 'user@test.com', role: 'user', name: 'Regular User' },
};

function createPostRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Finance API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue(mockAdminSession);
  });

  // ===========================================================================
  // POST /api/finance/costing - Run cost rollup
  // ===========================================================================
  describe('POST /api/finance/costing', () => {
    let POST: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../finance/costing/route');
      POST = module.POST;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        partId: 'part-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for non-admin/non-manager users', async () => {
      (auth as Mock).mockResolvedValue(mockUserSession);

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        partId: 'part-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should allow manager role access', async () => {
      (auth as Mock).mockResolvedValue(mockManagerSession);
      (rollupPartCost as Mock).mockResolvedValue({
        partNumber: 'PN-001',
        costs: { material: 10, labor: 5, overhead: 3, total: 18 },
      });
      (saveRollupResults as Mock).mockResolvedValue(undefined);

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        partId: 'part-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should run costing for a single part', async () => {
      (rollupPartCost as Mock).mockResolvedValue({
        partNumber: 'PN-001',
        costs: {
          material: 10.50,
          labor: 5.25,
          overhead: 3.00,
          total: 18.75,
        },
      });
      (saveRollupResults as Mock).mockResolvedValue(undefined);

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        partId: 'part-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.partNumber).toBe('PN-001');
      expect(data.costs).toEqual({
        material: 10.50,
        labor: 5.25,
        overhead: 3.00,
        total: 18.75,
      });
      expect(rollupPartCost).toHaveBeenCalledWith('part-1');
      expect(saveRollupResults).toHaveBeenCalledOnce();
    });

    it('should run full cost rollup when runAll is true', async () => {
      (runFullCostRollup as Mock).mockResolvedValue({
        processed: 150,
        errors: [],
      });

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        runAll: true,
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(150);
      expect(data.errors).toEqual([]);
      expect(data.message).toContain('150');
      expect(runFullCostRollup).toHaveBeenCalledOnce();
    });

    it('should return 400 when neither partId nor runAll is provided', async () => {
      const request = createPostRequest('http://localhost:3000/api/finance/costing', {});
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('partId or runAll is required');
    });

    it('should handle errors from runFullCostRollup gracefully', async () => {
      (runFullCostRollup as Mock).mockResolvedValue({
        processed: 148,
        errors: ['Part PN-099 failed: missing BOM', 'Part PN-100 failed: circular reference'],
      });

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        runAll: true,
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.errors).toHaveLength(2);
    });

    it('should return 500 when rollupPartCost throws', async () => {
      (rollupPartCost as Mock).mockRejectedValue(new Error('Database connection lost'));

      const request = createPostRequest('http://localhost:3000/api/finance/costing', {
        partId: 'part-1',
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
    });
  });

  // ===========================================================================
  // GET /api/finance/costing - Get cost rollup data
  // ===========================================================================
  describe('GET /api/finance/costing', () => {
    let GET: (...args: any[]) => Promise<Response>;

    beforeEach(async () => {
      // eslint-disable-next-line @next/next/no-assign-module-variable
      const module = await import('../finance/costing/route');
      GET = module.GET;
    });

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/finance/costing');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin/non-manager users', async () => {
      (auth as Mock).mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/finance/costing');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it('should return rollup status when action=status', async () => {
      (getRollupStatus as Mock).mockResolvedValue({
        totalParts: 200,
        processedParts: 195,
        lastRunDate: '2024-01-15T10:00:00Z',
        averageCost: 25.50,
      });

      const request = new NextRequest('http://localhost:3000/api/finance/costing?action=status');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalParts).toBe(200);
      expect(data.processedParts).toBe(195);
    });

    it('should return specific part rollup when partId provided', async () => {
      (prisma.partCostRollup.findUnique as Mock).mockResolvedValue({
        id: 'rollup-1',
        partId: 'part-1',
        materialCost: 10.50,
        laborCost: 5.25,
        overheadCost: 3.00,
        totalCost: 18.75,
        part: { partNumber: 'PN-001', name: 'Bolt M8' },
      });

      const request = new NextRequest('http://localhost:3000/api/finance/costing?partId=part-1');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.partId).toBe('part-1');
      expect(data.totalCost).toBe(18.75);
    });

    it('should return 404 when part rollup not found', async () => {
      (prisma.partCostRollup.findUnique as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/finance/costing?partId=nonexistent');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return paginated rollups when no filters', async () => {
      (prisma.partCostRollup.count as Mock).mockResolvedValue(50);
      (prisma.partCostRollup.findMany as Mock).mockResolvedValue([
        {
          id: 'rollup-1',
          partId: 'part-1',
          totalCost: 18.75,
          part: { partNumber: 'PN-001', name: 'Bolt M8', category: 'COMPONENT' },
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/finance/costing');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.partCostRollup.count).toHaveBeenCalledOnce();
      expect(prisma.partCostRollup.findMany).toHaveBeenCalledOnce();
    });
  });
});
