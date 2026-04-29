/**
 * Sprint 28 TIP-S28-05 — Equipment + Downtime API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock session
const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@rtr.com', role: 'admin' } };

// Mock withAuth
vi.mock('@/lib/api/with-auth', () => ({
  withAuth: (handler: Function) => handler,
}));

// Mock hasRole
vi.mock('@/lib/auth/rbac', () => ({
  hasRole: vi.fn().mockResolvedValue(true),
}));

// Mock Prisma
const mockEquipmentCreate = vi.fn();
const mockEquipmentFindMany = vi.fn().mockResolvedValue([]);
const mockEquipmentFindUnique = vi.fn();
const mockEquipmentUpdate = vi.fn();
const mockEquipmentUpdateMany = vi.fn();
const mockDowntimeCreate = vi.fn();
const mockDowntimeFindMany = vi.fn().mockResolvedValue([]);
const mockDowntimeFindUnique = vi.fn();
const mockDowntimeUpdate = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    equipment: {
      create: (...args: unknown[]) => mockEquipmentCreate(...args),
      findMany: (...args: unknown[]) => mockEquipmentFindMany(...args),
      findUnique: (...args: unknown[]) => mockEquipmentFindUnique(...args),
      update: (...args: unknown[]) => mockEquipmentUpdate(...args),
      updateMany: (...args: unknown[]) => mockEquipmentUpdateMany(...args),
    },
    downtimeRecord: {
      create: (...args: unknown[]) => mockDowntimeCreate(...args),
      findMany: (...args: unknown[]) => mockDowntimeFindMany(...args),
      findUnique: (...args: unknown[]) => mockDowntimeFindUnique(...args),
      update: (...args: unknown[]) => mockDowntimeUpdate(...args),
    },
  },
}));

import { hasRole } from '@/lib/auth/rbac';

describe('Equipment API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('POST /equipment — role viewer → 403', async () => {
    (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { POST } = await import('../../equipment/route');
    const req = new Request('http://localhost/api/production/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'EQ-001', name: 'CNC Mill' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(403);
  });

  it('POST /equipment — admin → 201', async () => {
    const created = { id: 'eq-1', code: 'EQ-001', name: 'CNC Mill', status: 'operational' };
    mockEquipmentCreate.mockResolvedValue(created);

    const { POST } = await import('../../equipment/route');
    const req = new Request('http://localhost/api/production/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'EQ-001', name: 'CNC Mill' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.equipment.code).toBe('EQ-001');
  });
});

describe('Downtime API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (hasRole as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it('POST /downtime — happy → 201', async () => {
    const created = { id: 'dt-1', type: 'BREAKDOWN', reason: 'Motor failure', startTime: new Date() };
    mockDowntimeCreate.mockResolvedValue(created);

    const { POST } = await import('../../downtime/route');
    const req = new Request('http://localhost/api/production/downtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workCenterId: 'wc-1',
        type: 'BREAKDOWN',
        reason: 'Motor failure',
      }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(res.status).toBe(201);
  });

  it('POST /downtime with equipmentId → equipment.status auto breakdown', async () => {
    mockDowntimeCreate.mockResolvedValue({ id: 'dt-2' });
    mockEquipmentUpdate.mockResolvedValue({ id: 'eq-1', status: 'breakdown' });

    const { POST } = await import('../../downtime/route');
    const req = new Request('http://localhost/api/production/downtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workCenterId: 'wc-1',
        type: 'BREAKDOWN',
        reason: 'Motor failure',
        equipmentId: 'eq-1',
      }),
    });

    await (POST as Function)(req, { params: Promise.resolve({}) }, mockSession);
    expect(mockEquipmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'eq-1' },
        data: { status: 'breakdown' },
      })
    );
  });

  it('POST /downtime/:id/resolve → endTime + duration calc', async () => {
    const startTime = new Date(Date.now() - 30 * 60000); // 30 min ago
    mockDowntimeFindUnique.mockResolvedValue({
      id: 'dt-1',
      startTime,
      endTime: null,
      workCenterId: 'wc-1',
    });
    mockDowntimeUpdate.mockResolvedValue({ id: 'dt-1', endTime: new Date(), durationMinutes: 30 });
    mockEquipmentFindMany.mockResolvedValue([]);

    const { POST } = await import('../../downtime/[id]/resolve/route');
    const req = new Request('http://localhost/api/production/downtime/dt-1/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution: 'Replaced motor' }),
    });

    const res = await (POST as Function)(req, { params: Promise.resolve({ id: 'dt-1' }) }, mockSession);
    expect(res.status).toBe(200);
    expect(mockDowntimeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dt-1' },
        data: expect.objectContaining({
          resolution: 'Replaced motor',
        }),
      })
    );
  });

  it('GET /maintenance-schedule?days=7 → list equipment', async () => {
    const upcoming = [
      { id: 'eq-1', code: 'EQ-001', name: 'CNC', nextMaintenanceDate: new Date() },
    ];
    mockEquipmentFindMany.mockResolvedValue(upcoming);

    const { GET } = await import('../../maintenance-schedule/route');
    const req = new Request('http://localhost/api/production/maintenance-schedule?days=7');

    const res = await (GET as Function)(req, { params: Promise.resolve({}) }, mockSession);
    const data = await res.json();
    expect(data.upcoming).toHaveLength(1);
    expect(data.upcoming[0].code).toBe('EQ-001');
  });
});
