/**
 * Sprint 28 TIP-S28-04 — Operator Shift Entry API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = { user: { id: 'op-1', name: 'Operator A', email: 'op@rtr.com', role: 'production' } };

vi.mock('@/lib/api/with-auth', () => ({
  withAuth: (handler: Function) => handler,
}));

vi.mock('@/lib/auth/rbac', () => ({
  hasRole: vi.fn().mockResolvedValue(true),
}));

const mockShiftAssignmentFindFirst = vi.fn();
const mockShiftAssignmentCreate = vi.fn();
const mockShiftAssignmentUpdate = vi.fn();
const mockEmployeeFindFirst = vi.fn();
const mockEmployeeCreate = vi.fn();
const mockLaborEntryCreate = vi.fn();
const mockLaborEntryFindFirst = vi.fn();
const mockLaborEntryUpdate = vi.fn();
const mockLaborEntryFindMany = vi.fn().mockResolvedValue([]);
const mockWOFindUnique = vi.fn();
const mockWOUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    shiftAssignment: {
      findFirst: (...args: unknown[]) => mockShiftAssignmentFindFirst(...args),
      create: (...args: unknown[]) => mockShiftAssignmentCreate(...args),
      update: (...args: unknown[]) => mockShiftAssignmentUpdate(...args),
    },
    employee: {
      findFirst: (...args: unknown[]) => mockEmployeeFindFirst(...args),
      create: (...args: unknown[]) => mockEmployeeCreate(...args),
    },
    laborEntry: {
      create: (...args: unknown[]) => mockLaborEntryCreate(...args),
      findFirst: (...args: unknown[]) => mockLaborEntryFindFirst(...args),
      update: (...args: unknown[]) => mockLaborEntryUpdate(...args),
      findMany: (...args: unknown[]) => mockLaborEntryFindMany(...args),
    },
    workOrder: {
      findUnique: (...args: unknown[]) => mockWOFindUnique(...args),
      update: (...args: unknown[]) => mockWOUpdate(...args),
      findMany: vi.fn().mockResolvedValue([]),
    },
    dailyProductionPlanLine: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { hasRole } from '@/lib/auth/rbac';

describe('Shift Entry API (TIP-S28-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('POST /start — user already active → 409', async () => {
    mockShiftAssignmentFindFirst.mockResolvedValue({ id: 'sa-existing' }); // active shift found
    mockEmployeeFindFirst.mockResolvedValue({ id: 'emp-1' });

    const { POST } = await import('../start/route');
    const req = new Request('http://localhost/api/production/shift-entry/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId: 's1', workCenterId: 'wc1', date: '2026-04-29' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(409);
  });

  it('POST /start — happy → 201', async () => {
    mockShiftAssignmentFindFirst.mockResolvedValue(null); // no active
    mockEmployeeFindFirst.mockResolvedValue({ id: 'emp-1' });
    mockShiftAssignmentCreate.mockResolvedValue({ id: 'sa-new', status: 'checked_in' });
    mockLaborEntryCreate.mockResolvedValue({ id: 'le-main' });

    const { POST } = await import('../start/route');
    const req = new Request('http://localhost/api/production/shift-entry/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId: 's1', workCenterId: 'wc1', date: '2026-04-29' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(201);
  });

  it('POST /append-qty — user no active shift → 422', async () => {
    mockEmployeeFindFirst.mockResolvedValue({ id: 'emp-1' });
    mockShiftAssignmentFindFirst.mockResolvedValue(null); // no active

    const { POST } = await import('../append-qty/route');
    const req = new Request('http://localhost/api/production/shift-entry/append-qty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workOrderId: 'wo-1', quantityProduced: 10 }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(422);
  });

  it('POST /append-qty — happy → WO completedQty increases', async () => {
    mockEmployeeFindFirst.mockResolvedValue({ id: 'emp-1' });
    mockShiftAssignmentFindFirst.mockResolvedValue({ id: 'sa-1', status: 'checked_in' });
    mockLaborEntryFindFirst.mockResolvedValue({ id: 'le-main', workCenterId: 'wc1' });
    mockLaborEntryCreate.mockResolvedValue({ id: 'le-qty' });
    mockWOFindUnique.mockResolvedValue({ id: 'wo-1', quantity: 100, completedQty: 40, scrapQty: 2 });
    mockWOUpdate.mockResolvedValue({ id: 'wo-1', completedQty: 50, scrapQty: 2 });

    const { POST } = await import('../append-qty/route');
    const req = new Request('http://localhost/api/production/shift-entry/append-qty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workOrderId: 'wo-1', quantityProduced: 10, quantityScrapped: 0 }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(200);
    expect(mockWOUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completedQty: 50 }),
      })
    );
  });

  it('POST /append-qty — reaches target → WO status COMPLETED', async () => {
    mockEmployeeFindFirst.mockResolvedValue({ id: 'emp-1' });
    mockShiftAssignmentFindFirst.mockResolvedValue({ id: 'sa-1' });
    mockLaborEntryFindFirst.mockResolvedValue({ id: 'le-main', workCenterId: 'wc1' });
    mockLaborEntryCreate.mockResolvedValue({ id: 'le-qty' });
    mockWOFindUnique.mockResolvedValue({ id: 'wo-1', quantity: 100, completedQty: 90, scrapQty: 0 });
    mockWOUpdate.mockResolvedValue({ id: 'wo-1', completedQty: 100, status: 'completed' });

    const { POST } = await import('../append-qty/route');
    const req = new Request('http://localhost/api/production/shift-entry/append-qty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workOrderId: 'wo-1', quantityProduced: 10, quantityScrapped: 0 }),
    });

    await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(mockWOUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('POST /end — happy → ShiftAssignment closed + summary', async () => {
    const startTime = new Date(Date.now() - 4 * 3600000); // 4h ago
    mockEmployeeFindFirst.mockResolvedValue({ id: 'emp-1' });
    mockShiftAssignmentFindFirst.mockResolvedValue({ id: 'sa-1', actualStart: startTime, status: 'checked_in' });
    mockShiftAssignmentUpdate.mockResolvedValue({ id: 'sa-1', status: 'checked_out' });
    mockLaborEntryFindFirst.mockResolvedValue({ id: 'le-main' });
    mockLaborEntryUpdate.mockResolvedValue({});
    mockLaborEntryFindMany.mockResolvedValue([
      { quantityProduced: 50, quantityScrapped: 2 },
      { quantityProduced: 30, quantityScrapped: 1 },
    ]);

    const { POST } = await import('../end/route');
    const req = new Request('http://localhost/api/production/shift-entry/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.totalProduced).toBe(80);
    expect(data.summary.totalScrap).toBe(3);
  });
});
