/**
 * Suppliers API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../suppliers/route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    supplier: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  prisma: {
    supplier: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
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
  },
}));

const mockContext = { params: Promise.resolve({}) };

describe('Suppliers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // GET /api/suppliers
  // ===========================================================================
  describe('GET /api/suppliers', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/suppliers');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return paginated suppliers successfully', async () => {
      const mockSuppliers = [
        {
          id: 'sup-1',
          code: 'SUP-001',
          name: 'Steel Corp',
          country: 'VN',
          status: 'active',
          contactEmail: 'contact@steelcorp.vn',
        },
        {
          id: 'sup-2',
          code: 'SUP-002',
          name: 'Parts Ltd',
          country: 'JP',
          status: 'active',
          contactEmail: 'info@partsltd.jp',
        },
      ];

      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.supplier.count as Mock).mockResolvedValue(2);
      (prisma.supplier.findMany as Mock).mockResolvedValue(mockSuppliers);

      const request = new NextRequest('http://localhost:3000/api/suppliers');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalItems).toBe(2);
    });

    it('should filter suppliers by search query', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.supplier.count as Mock).mockResolvedValue(1);
      (prisma.supplier.findMany as Mock).mockResolvedValue([
        { id: 'sup-1', code: 'SUP-001', name: 'Steel Corp' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/suppliers?search=Steel');
      await GET(request, mockContext);

      expect(prisma.supplier.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'Steel', mode: 'insensitive' },
              }),
            ]),
          }),
        })
      );
    });

    it('should filter suppliers by status', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.supplier.count as Mock).mockResolvedValue(0);
      (prisma.supplier.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/suppliers?status=inactive');
      await GET(request, mockContext);

      expect(prisma.supplier.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'inactive' }),
        })
      );
    });

    it('should return empty data when no suppliers match', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.supplier.count as Mock).mockResolvedValue(0);
      (prisma.supplier.findMany as Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/suppliers?search=NonExistent');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.totalItems).toBe(0);
    });

    it('should return 500 when database query fails', async () => {
      (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
      (prisma.supplier.count as Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/suppliers');
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  // ===========================================================================
  // POST /api/suppliers
  // ===========================================================================
  describe('POST /api/suppliers', () => {
    it('should return 401 when not authenticated', async () => {
      (auth as Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({ code: 'SUP-NEW', name: 'New Supplier', country: 'VN' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should create a supplier successfully', async () => {
      const mockCreated = {
        id: 'sup-new-1',
        code: 'SUP-NEW',
        name: 'New Supplier',
        country: 'VN',
        ndaaCompliant: true,
        status: 'active',
        leadTimeDays: 0,
      };

      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });
      (prisma.supplier.findUnique as Mock).mockResolvedValue(null);
      (prisma.supplier.create as Mock).mockResolvedValue(mockCreated);

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          code: 'SUP-NEW',
          name: 'New Supplier',
          country: 'VN',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCreated);
    });

    it('should return 422 when required field code is missing', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({ name: 'No Code Supplier', country: 'VN' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should return 422 when required field name is missing', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({ code: 'SUP-001', country: 'VN' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return 422 when required field country is missing', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({ code: 'SUP-001', name: 'Test Supplier' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return 422 when contactEmail is invalid', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          code: 'SUP-001',
          name: 'Test Supplier',
          country: 'VN',
          contactEmail: 'not-an-email',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return 409 when supplier code already exists', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });
      (prisma.supplier.findUnique as Mock).mockResolvedValue({
        id: 'sup-existing',
        code: 'SUP-DUP',
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          code: 'SUP-DUP',
          name: 'Duplicate Supplier',
          country: 'VN',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
    });

    it('should return 422 when taxId already exists for another supplier', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });
      (prisma.supplier.findUnique as Mock).mockResolvedValue(null); // code is unique
      (prisma.supplier.findFirst as Mock).mockResolvedValue({
        id: 'sup-existing',
        code: 'SUP-OTHER',
        name: 'Other Supplier',
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          code: 'SUP-NEW',
          name: 'New Supplier',
          country: 'VN',
          taxId: '1234567890',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.errors).toBeDefined();
      expect(data.errors.taxId).toBeDefined();
    });

    it('should return 403 when user lacks permission', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'viewer@rtr.vn', name: 'Viewer', role: 'viewer' },
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          code: 'SUP-001',
          name: 'Test Supplier',
          country: 'VN',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when request body is invalid JSON', async () => {
      (auth as Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'admin@rtr.vn', name: 'Admin', role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/suppliers', {
        method: 'POST',
        body: 'not valid json{{{',
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
