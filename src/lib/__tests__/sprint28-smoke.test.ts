/**
 * Sprint 28 TIP-S28-10 — Smoke Test 5 Personas
 * Validates the end-to-end flow for each persona type.
 * NOTE: These are integration-style tests using mocked Prisma.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock all external dependencies
vi.mock('@/lib/api/with-auth', () => ({
  withAuth: (handler: Function) => handler,
}));

vi.mock('@/lib/auth/rbac', () => ({
  hasRole: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    dailyProductionPlan: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'plan-1', planNumber: 'DPP-20260429-01', status: 'DRAFT', ...data, lines: [] })
      ),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'plan-1', ...data })
      ),
    },
    dailyProductionPlanLine: {
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'line-1', ...data })
      ),
    },
    shiftAssignment: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'sa-1', status: 'checked_in' }),
      update: vi.fn().mockResolvedValue({ id: 'sa-1', status: 'checked_out' }),
    },
    employee: {
      findFirst: vi.fn().mockResolvedValue({ id: 'emp-1' }),
      create: vi.fn().mockResolvedValue({ id: 'emp-1' }),
    },
    laborEntry: {
      create: vi.fn().mockResolvedValue({ id: 'le-1' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'le-main', workCenterId: 'wc-1' }),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([
        { quantityProduced: 50, quantityScrapped: 2, durationMinutes: 120 },
      ]),
    },
    workOrder: {
      findUnique: vi.fn().mockResolvedValue({ id: 'wo-1', quantity: 100, completedQty: 40, scrapQty: 0 }),
      update: vi.fn().mockResolvedValue({ id: 'wo-1', completedQty: 50 }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(5),
    },
    equipment: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'eq-1', code: 'SMT-01', name: 'Oven', status: 'operational', nextMaintenanceDate: new Date() },
      ]),
      create: vi.fn().mockResolvedValue({ id: 'eq-new' }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    downtimeRecord: {
      create: vi.fn().mockResolvedValue({ id: 'dt-1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'dt-1', startTime: new Date(Date.now() - 30 * 60000), endTime: null, workCenterId: 'wc-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'dt-1', durationMinutes: 30 }),
    },
    shiftReport: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 'sr-1', totalOutput: 50 }),
    },
    dataSource: {
      create: vi.fn().mockResolvedValue({ id: 'ds-1', code: 'TEST' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'ds-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    mappingRule: {
      create: vi.fn().mockResolvedValue({ id: 'mr-1', version: 1 }),
      findFirst: vi.fn().mockResolvedValue({ id: 'mr-1', version: 1, targetEntity: 'Part', columnMappings: { 'Mã': 'partNumber' } }),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    syncJob: {
      create: vi.fn().mockResolvedValue({ id: 'sj-1' }),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    part: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'pt-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    supplier: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'sup-1' }),
    },
    bomHeader: { findFirst: vi.fn().mockResolvedValue(null) },
    materialAllocation: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

const session = (role: string) => ({
  user: { id: `user-${role}`, name: `Test ${role}`, email: `${role}@rtr.local`, role },
});

describe('Sprint 28 Smoke — 5 Personas', () => {
  it('Persona 1: Quản đốc — create daily plan + add line + approve', async () => {
    const { POST: createPlan } = await import('@/app/api/production/daily-plan/route');
    const { POST: addLine } = await import('@/app/api/production/daily-plan/[id]/lines/route');
    const { POST: approve } = await import('@/app/api/production/daily-plan/[id]/approve/route');

    // Create plan
    let req = new Request('http://localhost/api/production/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-04-29', workCenterId: 'wc-1' }),
    });
    let res = await (createPlan as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(201);

    // Add line (mock plan exists with empty lines for findUnique)
    const prismaForLine = (await import('@/lib/prisma')).default;
    (prismaForLine.dailyProductionPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'plan-1', status: 'DRAFT', lines: [],
    });

    req = new Request('http://localhost/api/production/daily-plan/plan-1/lines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workOrderId: 'wo-1', plannedQty: 50 }),
    });
    res = await (addLine as Function)(req, { params: Promise.resolve({ id: 'plan-1' }) }, session('production'));
    expect(res.status).toBe(201);

    // Approve (mock plan with lines)
    const prisma = (await import('@/lib/prisma')).default;
    (prisma.dailyProductionPlan.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'plan-1', status: 'DRAFT', lines: [{ id: 'l1' }],
    });
    (prisma.dailyProductionPlan.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'plan-1', status: 'APPROVED',
    });

    req = new Request('http://localhost/api/production/daily-plan/plan-1/approve', { method: 'POST' });
    res = await (approve as Function)(req, { params: Promise.resolve({ id: 'plan-1' }) }, session('production'));
    expect(res.status).toBe(200);
  });

  it('Persona 2: Operator — clock in → qty entry → clock out', async () => {
    const { POST: start } = await import('@/app/api/production/shift-entry/start/route');
    const { POST: appendQty } = await import('@/app/api/production/shift-entry/append-qty/route');
    const { POST: end } = await import('@/app/api/production/shift-entry/end/route');

    // Clock in
    let req = new Request('http://localhost/api/production/shift-entry/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId: 's1', workCenterId: 'wc-1', date: '2026-04-29' }),
    });
    let res = await (start as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(201);

    // Append qty (mock active shift)
    const prisma = (await import('@/lib/prisma')).default;
    (prisma.shiftAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'sa-1', status: 'checked_in' });

    req = new Request('http://localhost/api/production/shift-entry/append-qty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workOrderId: 'wo-1', quantityProduced: 10, quantityScrapped: 1 }),
    });
    res = await (appendQty as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(200);

    // Clock out
    (prisma.shiftAssignment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'sa-1', status: 'checked_in', actualStart: new Date(Date.now() - 4 * 3600000),
    });

    req = new Request('http://localhost/api/production/shift-entry/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    res = await (end as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.totalProduced).toBeDefined();
  });

  it('Persona 3: Bảo trì — report downtime + resolve', async () => {
    const { POST: createDt } = await import('@/app/api/production/downtime/route');
    const { POST: resolve } = await import('@/app/api/production/downtime/[id]/resolve/route');

    // Report downtime
    let req = new Request('http://localhost/api/production/downtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workCenterId: 'wc-1', type: 'BREAKDOWN', reason: 'Motor failure' }),
    });
    let res = await (createDt as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(201);

    // Resolve
    req = new Request('http://localhost/api/production/downtime/dt-1/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: 'Replaced motor bearing' }),
    });
    res = await (resolve as Function)(req, { params: Promise.resolve({ id: 'dt-1' }) }, session('production'));
    expect(res.status).toBe(200);
  });

  it('Persona 4: Supervisor — view shift report', async () => {
    const { GET } = await import('@/app/api/production/shift-report/route');

    const req = new Request('http://localhost/api/production/shift-report?date=2026-04-29');
    const res = await (GET as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reports).toBeDefined();
  });

  it('Persona 5: Trưởng phòng — view production dashboard', async () => {
    const { GET } = await import('@/app/api/production/dashboard/route');

    const req = new Request('http://localhost/api/production/dashboard?from=2026-04-29&to=2026-04-30');
    const res = await (GET as Function)(req, { params: Promise.resolve({}) }, session('production'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kpi).toBeDefined();
    expect(data.kpi.totalOutput).toBeDefined();
    expect(data.workCenterBreakdown).toBeDefined();
  });
});
