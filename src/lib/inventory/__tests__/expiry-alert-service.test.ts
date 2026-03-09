import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    inventory: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { getExpiryAlerts, getLotExpiryStatus } from '../expiry-alert-service';

describe('getExpiryAlerts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should categorize expired, critical, and warning items', async () => {
    const now = new Date();
    const expiredDate = new Date(now);
    expiredDate.setDate(expiredDate.getDate() - 5);

    const criticalDate = new Date(now);
    criticalDate.setDate(criticalDate.getDate() + 3);

    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + 15);

    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        partId: 'p-1',
        quantity: 100,
        lotNumber: 'LOT-1',
        expiryDate: expiredDate,
        part: { partNumber: 'P001', name: 'Part Expired' },
        warehouse: { code: 'WH-1' },
      },
      {
        id: 'inv-2',
        partId: 'p-2',
        quantity: 50,
        lotNumber: 'LOT-2',
        expiryDate: criticalDate,
        part: { partNumber: 'P002', name: 'Part Critical' },
        warehouse: { code: 'WH-1' },
      },
      {
        id: 'inv-3',
        partId: 'p-3',
        quantity: 200,
        lotNumber: 'LOT-3',
        expiryDate: warningDate,
        part: { partNumber: 'P003', name: 'Part Warning' },
        warehouse: { code: 'WH-1' },
      },
    ]);

    const result = await getExpiryAlerts();

    expect(result.expired).toHaveLength(1);
    expect(result.critical).toHaveLength(1);
    expect(result.warning).toHaveLength(1);
    expect(result.totalExpiredQty).toBe(100);
    expect(result.totalAtRiskQty).toBe(50);
  });

  it('should skip items without expiryDate', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        partId: 'p-1',
        quantity: 100,
        lotNumber: 'LOT-1',
        expiryDate: null,
        part: { partNumber: 'P001', name: 'Part' },
        warehouse: { code: 'WH-1' },
      },
    ]);

    const result = await getExpiryAlerts();

    expect(result.expired).toHaveLength(0);
    expect(result.critical).toHaveLength(0);
    expect(result.warning).toHaveLength(0);
  });

  it('should use custom warning and critical days', async () => {
    const now = new Date();
    const date = new Date(now);
    date.setDate(date.getDate() + 50);

    mockPrisma.inventory.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        partId: 'p-1',
        quantity: 10,
        lotNumber: 'LOT-1',
        expiryDate: date,
        part: { partNumber: 'P001', name: 'Part' },
        warehouse: { code: 'WH-1' },
      },
    ]);

    // With 60 day warning window, 50 days out should be "warning"
    const result = await getExpiryAlerts(60, 14);

    expect(result.warning).toHaveLength(1);
  });

  it('should return empty arrays when no inventory matches', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]);

    const result = await getExpiryAlerts();

    expect(result.expired).toHaveLength(0);
    expect(result.critical).toHaveLength(0);
    expect(result.warning).toHaveLength(0);
    expect(result.totalExpiredQty).toBe(0);
    expect(result.totalAtRiskQty).toBe(0);
  });
});

describe('getLotExpiryStatus', () => {
  it('should return "no_expiry" for null date', () => {
    const result = getLotExpiryStatus(null);

    expect(result.status).toBe('no_expiry');
    expect(result.daysLeft).toBeNull();
  });

  it('should return "expired" for past dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const result = getLotExpiryStatus(pastDate);

    expect(result.status).toBe('expired');
    expect(result.daysLeft).toBeLessThan(0);
  });

  it('should return "critical" for dates within critical window', () => {
    const criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() + 3);

    const result = getLotExpiryStatus(criticalDate);

    expect(result.status).toBe('critical');
    expect(result.daysLeft).toBeLessThanOrEqual(7);
  });

  it('should return "warning" for dates within warning window', () => {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 15);

    const result = getLotExpiryStatus(warningDate);

    expect(result.status).toBe('warning');
    expect(result.daysLeft).toBeLessThanOrEqual(30);
  });

  it('should return "ok" for dates beyond warning window', () => {
    const okDate = new Date();
    okDate.setDate(okDate.getDate() + 60);

    const result = getLotExpiryStatus(okDate);

    expect(result.status).toBe('ok');
    expect(result.daysLeft).toBeGreaterThan(30);
  });

  it('should use custom thresholds', () => {
    const date = new Date();
    date.setDate(date.getDate() + 50);

    const result = getLotExpiryStatus(date, 60, 14);

    expect(result.status).toBe('warning');
  });
});
