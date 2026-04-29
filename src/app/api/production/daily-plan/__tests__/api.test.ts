/**
 * Sprint 28 TIP-S28-03 — Daily Production Plan API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = { user: { id: 'user-1', name: 'Quản đốc', email: 'qd@rtr.com', role: 'admin' } };

vi.mock('@/lib/api/with-auth', () => ({
  withAuth: (handler: Function) => handler,
}));

vi.mock('@/lib/auth/rbac', () => ({
  hasRole: vi.fn().mockResolvedValue(true),
}));

const mockPlanCreate = vi.fn();
const mockPlanFindUnique = vi.fn();
const mockPlanFindMany = vi.fn().mockResolvedValue([]);
const mockPlanCount = vi.fn().mockResolvedValue(0);
const mockPlanUpdate = vi.fn();
const mockLineCreate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    dailyProductionPlan: {
      create: (...args: unknown[]) => mockPlanCreate(...args),
      findUnique: (...args: unknown[]) => mockPlanFindUnique(...args),
      findMany: (...args: unknown[]) => mockPlanFindMany(...args),
      count: (...args: unknown[]) => mockPlanCount(...args),
      update: (...args: unknown[]) => mockPlanUpdate(...args),
    },
    dailyProductionPlanLine: {
      create: (...args: unknown[]) => mockLineCreate(...args),
    },
    workOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { hasRole } from '@/lib/auth/rbac';

describe('Daily Plan API (TIP-S28-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('POST /daily-plan — not auth role viewer → 403', async () => {
    (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/production/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-04-29', workCenterId: 'wc-1' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(403);
  });

  it('POST /daily-plan — happy → 201 + planNumber format', async () => {
    mockPlanFindUnique.mockResolvedValue(null); // no conflict
    mockPlanCount.mockResolvedValue(0);
    const created = {
      id: 'plan-1',
      planNumber: 'DPP-20260429-01',
      date: new Date('2026-04-29'),
      status: 'DRAFT',
      lines: [],
    };
    mockPlanCreate.mockResolvedValue(created);

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/production/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-04-29', workCenterId: 'wc-1' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(201);
    expect(mockPlanCreate).toHaveBeenCalled();
  });

  it('POST /daily-plan — conflict same (date, workCenterId) → 409', async () => {
    mockPlanFindUnique.mockResolvedValue({ id: 'existing-plan' });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/production/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-04-29', workCenterId: 'wc-1' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.existingPlanId).toBe('existing-plan');
  });

  it('POST /daily-plan/:id/lines — add 3 lines → created', async () => {
    mockPlanFindUnique.mockResolvedValue({
      id: 'plan-1',
      lines: [],
    });
    mockLineCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: `line-${data.sequence}`, ...data })
    );

    const { POST } = await import('../[id]/lines/route');

    for (let i = 0; i < 3; i++) {
      const req = new Request('http://localhost/api/production/daily-plan/plan-1/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderId: `wo-${i + 1}`, plannedQty: 100 }),
      });
      const res = await (POST as Function)(req, { params: Promise.resolve({ id: 'plan-1' }) }, mockSession);
      expect(res.status).toBe(201);
    }

    expect(mockLineCreate).toHaveBeenCalledTimes(3);
  });

  it('POST /daily-plan/:id/approve — plan empty → 422', async () => {
    mockPlanFindUnique.mockResolvedValue({ id: 'plan-1', status: 'DRAFT', lines: [] });

    const { POST } = await import('../[id]/approve/route');
    const req = new Request('http://localhost/api/production/daily-plan/plan-1/approve', { method: 'POST' });

    const res = await (POST as Function)(req, { params: Promise.resolve({ id: 'plan-1' }) }, mockSession);
    expect(res.status).toBe(422);
  });

  it('POST /daily-plan/:id/approve — plan with lines → 200 APPROVED', async () => {
    mockPlanFindUnique.mockResolvedValue({ id: 'plan-1', status: 'DRAFT', lines: [{ id: 'l1' }] });
    mockPlanUpdate.mockResolvedValue({ id: 'plan-1', status: 'APPROVED' });

    const { POST } = await import('../[id]/approve/route');
    const req = new Request('http://localhost/api/production/daily-plan/plan-1/approve', { method: 'POST' });

    const res = await (POST as Function)(req, { params: Promise.resolve({ id: 'plan-1' }) }, mockSession);
    expect(res.status).toBe(200);
    expect(mockPlanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED' }),
      })
    );
  });
});
