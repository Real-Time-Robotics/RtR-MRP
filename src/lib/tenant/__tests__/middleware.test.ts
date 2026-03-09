import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth, mockPrismaDefault, mockCreateTenantPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrismaDefault: {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  mockCreateTenantPrisma: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ default: mockPrismaDefault }));
vi.mock('./prisma-tenant', () => ({
  createTenantPrisma: mockCreateTenantPrisma,
}));
vi.mock('../prisma-tenant', () => ({
  createTenantPrisma: mockCreateTenantPrisma,
}));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { NextRequest, NextResponse } from 'next/server';
import {
  hasFeature,
  checkLimit,
  getTenantContext,
  getTenantByDomain,
  withTenant,
} from '../middleware';
import type { TenantInfo } from '../middleware';

function makeTenantInfo(overrides: Partial<TenantInfo> = {}): TenantInfo {
  return {
    id: 't-1',
    code: 'ACME',
    name: 'Acme Corp',
    plan: 'PROFESSIONAL',
    status: 'ACTIVE',
    features: {},
    limits: { maxUsers: 50, maxStorage: 1000, maxApiCalls: 10000, maxParts: 5000, maxOrders: 10000 },
    usage: { currentUsers: 10, currentStorage: 100, currentParts: 500 },
    ...overrides,
  };
}

describe('hasFeature', () => {
  it('should return true for any feature on ENTERPRISE plan', () => {
    const tenant = makeTenantInfo({ plan: 'ENTERPRISE' });

    expect(hasFeature(tenant, 'mrp')).toBe(true);
    expect(hasFeature(tenant, 'custom-feature')).toBe(true);
  });

  it('should return true for professional features on PROFESSIONAL plan', () => {
    const tenant = makeTenantInfo({ plan: 'PROFESSIONAL' });

    expect(hasFeature(tenant, 'mrp')).toBe(true);
    expect(hasFeature(tenant, 'quality')).toBe(true);
    expect(hasFeature(tenant, 'analytics')).toBe(true);
  });

  it('should return false for non-professional features on PROFESSIONAL plan', () => {
    const tenant = makeTenantInfo({ plan: 'PROFESSIONAL' });

    expect(hasFeature(tenant, 'custom-only-enterprise')).toBe(false);
  });

  it('should return true for starter features on STARTER plan', () => {
    const tenant = makeTenantInfo({ plan: 'STARTER' });

    expect(hasFeature(tenant, 'inventory')).toBe(true);
    expect(hasFeature(tenant, 'sales')).toBe(true);
    expect(hasFeature(tenant, 'purchasing')).toBe(true);
  });

  it('should return false for pro features on STARTER plan', () => {
    const tenant = makeTenantInfo({ plan: 'STARTER' });

    expect(hasFeature(tenant, 'mrp')).toBe(false);
    expect(hasFeature(tenant, 'quality')).toBe(false);
  });

  it('should check custom features map', () => {
    const tenant = makeTenantInfo({
      plan: 'STARTER',
      features: { 'custom-addon': true },
    });

    expect(hasFeature(tenant, 'custom-addon')).toBe(true);
    expect(hasFeature(tenant, 'not-enabled')).toBe(false);
  });
});

describe('checkLimit', () => {
  it('should check users limit', () => {
    const tenant = makeTenantInfo({ limits: { maxUsers: 50, maxStorage: 1000, maxApiCalls: 10000, maxParts: 5000, maxOrders: 10000 }, usage: { currentUsers: 10, currentStorage: 100, currentParts: 500 } });

    const result = checkLimit(tenant, 'users');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(10);
    expect(result.max).toBe(50);
    expect(result.remaining).toBe(40);
  });

  it('should return not allowed when at limit', () => {
    const tenant = makeTenantInfo({ limits: { maxUsers: 10, maxStorage: 1000, maxApiCalls: 10000, maxParts: 5000, maxOrders: 10000 }, usage: { currentUsers: 10, currentStorage: 100, currentParts: 500 } });

    const result = checkLimit(tenant, 'users');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should check storage limit', () => {
    const tenant = makeTenantInfo();

    const result = checkLimit(tenant, 'storage');

    expect(result.current).toBe(100);
    expect(result.max).toBe(1000);
  });

  it('should check parts limit', () => {
    const tenant = makeTenantInfo();

    const result = checkLimit(tenant, 'parts');

    expect(result.current).toBe(500);
    expect(result.max).toBe(5000);
  });

  it('should check apiCalls limit', () => {
    const tenant = makeTenantInfo();

    const result = checkLimit(tenant, 'apiCalls');

    expect(result.current).toBe(0);
    expect(result.max).toBe(10000);
    expect(result.allowed).toBe(true);
  });
});

describe('getTenantContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return null when no session', async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getTenantContext();

    expect(result).toBeNull();
  });

  it('should return null when user has no tenantId', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });

    const result = await getTenantContext();

    expect(result).toBeNull();
  });

  it('should return null when tenant not found', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', tenantId: 't-1' } });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue(null);

    const result = await getTenantContext();

    expect(result).toBeNull();
  });

  it('should return null when tenant is not ACTIVE', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', tenantId: 't-1' } });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'STARTER',
      status: 'SUSPENDED',
      features: {},
      maxUsers: 10,
      maxStorage: 100,
      maxApiCalls: 1000,
      maxParts: 100,
      maxOrders: 100,
      currentUsers: 1,
      currentStorage: 0,
      currentParts: 0,
    });

    const result = await getTenantContext();

    expect(result).toBeNull();
  });

  it('should return tenant context for valid session', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', tenantId: 't-1' } });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: 1000,
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: 100,
      currentParts: 500,
    });

    const result = await getTenantContext();

    expect(result).not.toBeNull();
    expect(result!.tenantId).toBe('t-1');
    expect(result!.tenant.code).toBe('ACME');
  });

  it('should handle errors gracefully', async () => {
    mockAuth.mockRejectedValue(new Error('Auth error'));

    const result = await getTenantContext();

    expect(result).toBeNull();
  });
});

describe('getTenantByDomain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return tenant info for valid domain', async () => {
    mockPrismaDefault.tenant.findFirst.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: BigInt(1000),
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: BigInt(100),
      currentParts: 500,
    });

    const result = await getTenantByDomain('acme.example.com');

    expect(result).not.toBeNull();
    expect(result!.code).toBe('ACME');
  });

  it('should return null when no tenant found', async () => {
    mockPrismaDefault.tenant.findFirst.mockResolvedValue(null);

    const result = await getTenantByDomain('unknown.example.com');

    expect(result).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    mockPrismaDefault.tenant.findFirst.mockRejectedValue(new Error('DB error'));

    const result = await getTenantByDomain('error.example.com');

    expect(result).toBeNull();
  });
});

describe('withTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when no session', async () => {
    mockAuth.mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should return 403 when tenant not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'test@test.com', tenantId: 't-1' } });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(403);
  });

  it('should call handler with context for valid user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u-1', email: 'test@test.com', name: 'Test', role: 'admin', tenantId: 't-1' },
    });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: 1000,
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: 100,
      currentParts: 500,
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withTenant(handler);
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('should return 403 for missing permission', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u-1', email: 'test@test.com', name: 'Test', role: 'viewer', tenantId: 't-1' },
    });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: 1000,
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: 100,
      currentParts: 500,
    });

    const handler = vi.fn();
    const wrapped = withTenant(handler, { permission: 'parts:delete' });
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Missing permission');
  });

  it('should return 403 for insufficient role', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u-1', email: 'test@test.com', name: 'Test', role: 'viewer', tenantId: 't-1' },
    });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: 1000,
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: 100,
      currentParts: 500,
    });

    const handler = vi.fn();
    const wrapped = withTenant(handler, { role: 'admin' });
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Required role');
  });

  it('should return 403 for unavailable feature', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'u-1', email: 'test@test.com', name: 'Test', role: 'admin', tenantId: 't-1' },
    });
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'STARTER',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: 1000,
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: 100,
      currentParts: 500,
    });

    const handler = vi.fn();
    const wrapped = withTenant(handler, { feature: 'mrp' });
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('not available');
  });

  it('should allow public access with tenant header', async () => {
    mockAuth.mockResolvedValue(null);
    mockPrismaDefault.tenant.findUnique.mockResolvedValue({
      id: 't-1',
      code: 'ACME',
      name: 'Acme',
      plan: 'STARTER',
      status: 'ACTIVE',
      features: {},
      maxUsers: 50,
      maxStorage: 1000,
      maxApiCalls: 10000,
      maxParts: 5000,
      maxOrders: 10000,
      currentUsers: 10,
      currentStorage: 100,
      currentParts: 500,
    });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withTenant(handler, { allowPublic: true });
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-tenant-code': 'ACME' },
    });
    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it('should return 400 for public access without tenant header', async () => {
    mockAuth.mockResolvedValue(null);

    const handler = vi.fn();
    const wrapped = withTenant(handler, { allowPublic: true });
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(400);
  });

  it('should return 500 on unexpected error', async () => {
    mockAuth.mockRejectedValue(new Error('Unexpected'));

    const handler = vi.fn();
    const wrapped = withTenant(handler);
    const request = new NextRequest('http://localhost/api/test');
    const response = await wrapped(request);

    expect(response.status).toBe(500);
  });
});
