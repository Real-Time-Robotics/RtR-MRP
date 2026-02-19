/**
 * Parts API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../parts/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    part: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    partSupplier: {
      create: vi.fn(),
      createMany: vi.fn(),
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

vi.mock('@/lib/audit/audit-logger', () => ({
  logApi: vi.fn(),
}));

vi.mock('@/lib/audit/route-audit', () => ({
  auditCreate: vi.fn(),
}));

// Mock context for withAuth wrapper (Next.js 15 async params)
const mockContext = { params: Promise.resolve({}) };

describe('Parts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/parts
  // ===========================================================================
  describe('GET /api/parts', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/parts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated parts list successfully', async () => {
      const mockParts = [
        {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Bolt M8',
          category: 'COMPONENT',
          partSuppliers: [],
          planning: null,
          costs: null,
        },
        {
          id: 'part-2',
          partNumber: 'PN-002',
          name: 'Nut M8',
          category: 'COMPONENT',
          partSuppliers: [],
          planning: null,
          costs: null,
        },
      ];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockResolvedValue(2);
      (prisma.part.findMany as Mock).mockResolvedValue(mockParts);

      const request = new NextRequest('http://localhost:3000/api/parts?page=1&pageSize=50');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
      expect(data.pagination.page).toBe(1);
    });

    it('should apply category filter', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockResolvedValue(0);
      (prisma.part.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/parts?category=COMPONENT');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.part.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('category', 'COMPONENT');
    });

    it('should apply lifecycleStatus filter', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockResolvedValue(0);
      (prisma.part.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/parts?lifecycleStatus=ACTIVE');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.part.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('lifecycleStatus', 'ACTIVE');
    });

    it('should apply makeOrBuy filter', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockResolvedValue(0);
      (prisma.part.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/parts?makeOrBuy=BUY');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.part.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('makeOrBuy', 'BUY');
    });

    it('should apply search across multiple fields', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockResolvedValue(0);
      (prisma.part.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/parts?search=bolt');
      const response = await GET(request, mockContext);

      expect(response.status).toBe(200);
      const findManyCall = (prisma.part.findMany as Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('OR');
      // Should search across partNumber, name, description, manufacturerPn, manufacturer
      expect(findManyCall.where.OR.length).toBe(5);
    });

    it('should handle pagination parameters correctly', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockResolvedValue(150);
      (prisma.part.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/parts?page=3&pageSize=25');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.pageSize).toBe(25);
      expect(data.pagination.totalItems).toBe(150);
      expect(data.pagination.totalPages).toBe(6);
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.hasPrevPage).toBe(true);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.part.count as Mock).mockRejectedValue(new Error('Database connection error'));

      const request = new NextRequest('http://localhost:3000/api/parts');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch parts');
    });
  });

  // ===========================================================================
  // POST /api/parts
  // ===========================================================================
  describe('POST /api/parts', () => {
    const validPartBody = {
      partNumber: 'PN-NEW-001',
      name: 'New Test Part',
      category: 'COMPONENT',
      unit: 'EA',
    };

    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify(validPartBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when partNumber is missing', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', category: 'COMPONENT' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 when name is missing', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify({ partNumber: 'PN-001', category: 'COMPONENT' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 when category is missing', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify({ partNumber: 'PN-001', name: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should create a part successfully', async () => {
      const mockCreatedPart = {
        id: 'PRT-123',
        partNumber: 'PN-NEW-001',
        name: 'New Test Part',
        category: 'COMPONENT',
        unit: 'EA',
        status: 'active',
        costs: { unitCost: 0 },
        planning: { minStockLevel: 0, reorderPoint: 0 },
        specs: {},
        compliance: {},
        partSuppliers: [],
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      (prisma.part.create as Mock).mockResolvedValue(mockCreatedPart);

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify(validPartBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.partNumber).toBe('PN-NEW-001');
      expect(data.name).toBe('New Test Part');
      expect(data.category).toBe('COMPONENT');
    });

    it('should create part with supplier when primarySupplierId is provided', async () => {
      const mockCreatedPart = {
        id: 'PRT-123',
        partNumber: 'PN-NEW-001',
        name: 'New Test Part',
        category: 'COMPONENT',
        unit: 'EA',
        status: 'active',
        costs: { unitCost: 0 },
        planning: {},
        specs: {},
        compliance: {},
        partSuppliers: [],
      };

      const mockPartWithSupplier = {
        ...mockCreatedPart,
        partSuppliers: [{ supplierId: 'sup-1', isPreferred: true }],
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      (prisma.part.create as Mock).mockResolvedValue(mockCreatedPart);
      (prisma.partSupplier.create as Mock).mockResolvedValue({});
      (prisma.part.findUnique as Mock).mockResolvedValue(mockPartWithSupplier);

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify({
          ...validPartBody,
          primarySupplierId: 'sup-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(prisma.partSupplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partId: 'PRT-123',
            supplierId: 'sup-1',
            isPreferred: true,
          }),
        })
      );
    });

    it('should use default values for optional fields', async () => {
      const mockCreatedPart = {
        id: 'PRT-123',
        partNumber: 'PN-NEW-001',
        name: 'New Test Part',
        category: 'COMPONENT',
        unit: 'EA',
        status: 'active',
        revision: 'A',
        makeOrBuy: 'BUY',
        ndaaCompliant: true,
        itarControlled: false,
        costs: {},
        planning: {},
        specs: {},
        compliance: {},
        partSuppliers: [],
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      (prisma.part.create as Mock).mockResolvedValue(mockCreatedPart);

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify(validPartBody),
        headers: { 'Content-Type': 'application/json' },
      });
      await POST(request, mockContext);

      const createCall = (prisma.part.create as Mock).mock.calls[0][0];
      // Verify defaults are applied
      expect(createCall.data.makeOrBuy).toBe('BUY');
      expect(createCall.data.revision).toBe('A');
      expect(createCall.data.ndaaCompliant).toBe(true);
      expect(createCall.data.itarControlled).toBe(false);
      expect(createCall.data.status).toBe('active');
    });

    it('should return 500 when part creation fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      (prisma.part.create as Mock).mockRejectedValue(new Error('Unique constraint violation'));

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify(validPartBody),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create part');
    });

    it('should return 400 when category is an invalid enum value', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify({
          ...validPartBody,
          category: 'INVALID_CATEGORY',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should set createdBy from session user email', async () => {
      const mockCreatedPart = {
        id: 'PRT-123',
        partNumber: 'PN-NEW-001',
        name: 'New Test Part',
        category: 'COMPONENT',
        createdBy: 'admin@rtr.com',
        costs: {},
        planning: {},
        specs: {},
        compliance: {},
        partSuppliers: [],
      };

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1', email: 'admin@rtr.com' } });
      (prisma.part.create as Mock).mockResolvedValue(mockCreatedPart);

      const request = new NextRequest('http://localhost:3000/api/parts', {
        method: 'POST',
        body: JSON.stringify(validPartBody),
        headers: { 'Content-Type': 'application/json' },
      });
      await POST(request, mockContext);

      const createCall = (prisma.part.create as Mock).mock.calls[0][0];
      expect(createCall.data.createdBy).toBe('admin@rtr.com');
    });
  });
});
