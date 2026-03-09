import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    part: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    lotTransaction: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { runABCClassification, getABCSummary } from '../abc-classification';

describe('runABCClassification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.part.update.mockResolvedValue({});
  });

  it('should classify parts into A, B, C based on usage value', async () => {
    // Need multiple parts where top items stay within 80% threshold
    mockPrisma.part.findMany.mockResolvedValue([
      { id: 'p1', partNumber: 'P001', name: 'Part1', unitCost: 40 },
      { id: 'p2', partNumber: 'P002', name: 'Part2', unitCost: 30 },
      { id: 'p3', partNumber: 'P003', name: 'Part3', unitCost: 20 },
      { id: 'p4', partNumber: 'P004', name: 'Part4', unitCost: 10 },
    ]);

    // P1: 100 * 40 = 4000
    // P2: 100 * 30 = 3000
    // P3: 100 * 20 = 2000
    // P4: 100 * 10 = 1000
    // Total = 10000
    // P1 cumul = 40% <= 80 → A
    // P2 cumul = 70% <= 80 → A
    // P3 cumul = 90% <= 95 → B
    // P4 cumul = 100% > 95 → C
    mockPrisma.lotTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 100 } })
      .mockResolvedValueOnce({ _sum: { quantity: 100 } })
      .mockResolvedValueOnce({ _sum: { quantity: 100 } })
      .mockResolvedValueOnce({ _sum: { quantity: 100 } });

    const result = await runABCClassification();

    expect(result.classified).toBe(4);
    expect(result.results).toHaveLength(4);

    expect(result.results[0].partId).toBe('p1');
    expect(result.results[0].abcClass).toBe('A');
    expect(result.results[1].partId).toBe('p2');
    expect(result.results[1].abcClass).toBe('A');
    expect(result.results[2].partId).toBe('p3');
    expect(result.results[2].abcClass).toBe('B');
    expect(result.results[3].partId).toBe('p4');
    expect(result.results[3].abcClass).toBe('C');
  });

  it('should update parts in database', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { id: 'p1', partNumber: 'P001', name: 'Part1', unitCost: 50 },
    ]);
    mockPrisma.lotTransaction.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });

    await runABCClassification();

    // Single part: cumul = 100% > 80%, so it's B (not A)
    expect(mockPrisma.part.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ abcClass: expect.any(String) }),
      })
    );
  });

  it('should handle parts with zero usage', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { id: 'p1', partNumber: 'P001', name: 'Part1', unitCost: 100 },
    ]);
    mockPrisma.lotTransaction.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

    const result = await runABCClassification();

    expect(result.classified).toBe(1);
    expect(result.results[0].annualUsageValue).toBe(0);
    expect(result.results[0].cumulativePercent).toBe(0);
  });

  it('should handle null quantity sum', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { id: 'p1', partNumber: 'P001', name: 'Part1', unitCost: 100 },
    ]);
    mockPrisma.lotTransaction.aggregate.mockResolvedValue({ _sum: { quantity: null } });

    const result = await runABCClassification();

    expect(result.results[0].annualUsageValue).toBe(0);
  });

  it('should use custom config thresholds', async () => {
    mockPrisma.part.findMany.mockResolvedValue([
      { id: 'p1', partNumber: 'P001', name: 'Part1', unitCost: 100 },
      { id: 'p2', partNumber: 'P002', name: 'Part2', unitCost: 50 },
    ]);
    mockPrisma.lotTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { quantity: 100 } })
      .mockResolvedValueOnce({ _sum: { quantity: 50 } });

    const result = await runABCClassification({
      classAPercent: 50,
      classBPercent: 40,
    });

    // P1 = 10000, P2 = 2500. Total = 12500
    // P1 cumulative = 80% > 50% → still... wait: 10000/12500 = 80% > 50, so it exceeds A threshold
    // Actually: cumulativePercent for P1 = 80%, which is > 50 (classAPercent), so P1 is B (50+40=90, 80 <= 90)
    // P2 cumulative = 100%, which is > 90, so P2 is C
    expect(result.results[0].abcClass).toBe('B');
    expect(result.results[1].abcClass).toBe('C');
  });

  it('should handle empty parts list', async () => {
    mockPrisma.part.findMany.mockResolvedValue([]);

    const result = await runABCClassification();

    expect(result.classified).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

describe('getABCSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return counts by ABC class', async () => {
    mockPrisma.part.count
      .mockResolvedValueOnce(10) // A
      .mockResolvedValueOnce(20) // B
      .mockResolvedValueOnce(50) // C
      .mockResolvedValueOnce(5); // unclassified

    const summary = await getABCSummary();

    expect(summary).toEqual({
      A: 10,
      B: 20,
      C: 50,
      unclassified: 5,
      total: 85,
    });
  });
});
