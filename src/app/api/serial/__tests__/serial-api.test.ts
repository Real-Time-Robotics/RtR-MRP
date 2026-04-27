/**
 * Sprint 27 TIP-S27-02 — Serial API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    moduleDesign: {
      findUnique: vi.fn(),
    },
    serialUnit: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    serialNumberingRule: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock auth
vi.mock('@/lib/api/with-auth', () => ({
  withAuth: vi.fn((handler) => {
    return async (request: Request, context: Record<string, unknown>) => {
      const authHeader = request.headers.get('x-test-user-id');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      const session = {
        user: {
          id: authHeader,
          email: `${authHeader}@rtr.vn`,
          name: 'Test User',
        },
      };
      return handler(request, context, session);
    };
  }),
}));

// Mock RBAC
vi.mock('@/lib/auth/rbac', () => ({
  hasRole: vi.fn(),
}));

// Mock serial generator
vi.mock('@/lib/serial/numbering', () => ({
  generateSerial: vi.fn(),
  SerialNumberingRuleNotFoundError: class extends Error {
    constructor(id: string) { super(`Rule not found: ${id}`); this.name = 'SerialNumberingRuleNotFoundError'; }
  },
}));

import prisma from '@/lib/prisma';
import { hasRole } from '@/lib/auth/rbac';
import { generateSerial } from '@/lib/serial/numbering';

describe('Serial API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/serial/generate', () => {
    it('should return 401 without auth', async () => {
      const { POST } = await import('@/app/api/serial/generate/route');
      const request = new Request('http://localhost/api/serial/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleDesignId: 'md-1' }),
      });
      const response = await POST(request as unknown as NextRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(401);
    });

    it('should return 403 for viewer role', async () => {
      (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const { POST } = await import('@/app/api/serial/generate/route');
      const request = new Request('http://localhost/api/serial/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user-viewer',
        },
        body: JSON.stringify({ moduleDesignId: 'md-1' }),
      });
      const response = await POST(request as unknown as NextRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(403);
    });

    it('should return 201 with valid engineer role', async () => {
      (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.moduleDesign.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'md-1', code: 'IO1' });
      (generateSerial as ReturnType<typeof vi.fn>).mockResolvedValue('IO1-V15-091025-001');
      (prisma.serialUnit.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'su-1',
        serial: 'IO1-V15-091025-001',
      });

      const { POST } = await import('@/app/api/serial/generate/route');
      const request = new Request('http://localhost/api/serial/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user-engineer',
        },
        body: JSON.stringify({ moduleDesignId: 'md-1' }),
      });
      const response = await POST(request as unknown as NextRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.serial).toBe('IO1-V15-091025-001');
      expect(body.serialUnitId).toBe('su-1');
    });
  });

  describe('GET /api/serial/:serial', () => {
    it('should return 200 with full serial data', async () => {
      (prisma.serialUnit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'su-1',
        serial: 'IO1-V15-091025-001',
        status: 'IN_STOCK',
        moduleDesign: { id: 'md-1', code: 'IO1', name: 'Hera IO1', version: 'V15', prefix: 'IO1' },
        createdByUser: { id: 'u-1', name: 'Test', email: 'test@rtr.vn' },
        parentLinks: [],
        childLinks: [],
      });

      const { GET } = await import('@/app/api/serial/[serial]/route');
      const request = new Request('http://localhost/api/serial/IO1-V15-091025-001', {
        headers: { 'x-test-user-id': 'user-1' },
      });
      const response = await GET(request as unknown as NextRequest, { params: Promise.resolve({ serial: 'IO1-V15-091025-001' }) });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.serial).toBe('IO1-V15-091025-001');
      expect(body.moduleDesign.code).toBe('IO1');
    });

    it('should return 404 for unknown serial', async () => {
      (prisma.serialUnit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { GET } = await import('@/app/api/serial/[serial]/route');
      const request = new Request('http://localhost/api/serial/UNKNOWN', {
        headers: { 'x-test-user-id': 'user-1' },
      });
      const response = await GET(request as unknown as NextRequest, { params: Promise.resolve({ serial: 'UNKNOWN' }) });
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/serial/:serial/status', () => {
    it('should return 422 for invalid transition', async () => {
      (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.serialUnit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'su-1',
        serial: 'IO1-V15-091025-001',
        status: 'SHIPPED',
        notes: null,
        meta: null,
      });

      const { POST } = await import('@/app/api/serial/[serial]/status/route');
      const request = new Request('http://localhost/api/serial/IO1/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'user-wh',
        },
        body: JSON.stringify({ status: 'IN_STOCK' }),
      });
      const response = await POST(request as unknown as NextRequest, { params: Promise.resolve({ serial: 'IO1-V15-091025-001' }) });
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain('Invalid transition');
    });
  });
});
