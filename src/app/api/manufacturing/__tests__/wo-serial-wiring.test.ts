/**
 * Sprint 27 TIP-S27-03 — WO→Serial wiring tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockGenerateSerial, mockLogger } = vi.hoisted(() => {
  const mockPrisma = {
    workOrder: { update: vi.fn() },
    moduleDesign: { findFirst: vi.fn() },
    serialUnit: { create: vi.fn() },
    productionReceipt: { update: vi.fn() },
  };
  const mockGenerateSerial = vi.fn();
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    logError: vi.fn(),
  };
  return { mockPrisma, mockGenerateSerial, mockLogger };
});

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('../../../lib/prisma', () => ({ default: mockPrisma }));

vi.mock('@/lib/workflow/workflow-triggers', () => ({
  triggerWorkOrderWorkflow: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({ logger: mockLogger }));

vi.mock('@/lib/serial/numbering', () => ({
  generateSerial: (...args: unknown[]) => mockGenerateSerial(...args),
  SerialNumberingRuleNotFoundError: class extends Error {
    constructor(id: string) { super(`Rule not found: ${id}`); this.name = 'SerialNumberingRuleNotFoundError'; }
  },
}));

import { updateWorkOrderStatus } from '@/lib/mrp-engine/work-order';

describe('WO → Serial wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.workOrder.update.mockResolvedValue({
      id: 'wo-1',
      productId: 'prod-1',
      completedQty: 5,
      productionReceipt: { id: 'pr-1' },
      product: { id: 'prod-1' },
      allocations: [],
    });
  });

  it('generates 0 serial units when product has no ModuleDesign', async () => {
    mockPrisma.moduleDesign.findFirst.mockResolvedValue(null);

    await updateWorkOrderStatus('wo-1', 'COMPLETED', 5);

    expect(mockGenerateSerial).not.toHaveBeenCalled();
    expect(mockPrisma.serialUnit.create).not.toHaveBeenCalled();
  });

  it('generates N serial units when product has ModuleDesign + numbering rule', async () => {
    mockPrisma.moduleDesign.findFirst.mockResolvedValue({ id: 'md-1', code: 'MOD_A' });
    let counter = 0;
    mockGenerateSerial.mockImplementation(async () => {
      counter++;
      return `MOD-V10-270426-${String(counter).padStart(3, '0')}`;
    });
    mockPrisma.serialUnit.create.mockImplementation(async ({ data }: any) => ({
      id: `su-${data.serial}`,
      ...data,
    }));

    await updateWorkOrderStatus('wo-1', 'COMPLETED', 5);

    expect(mockGenerateSerial).toHaveBeenCalledTimes(5);
    expect(mockPrisma.serialUnit.create).toHaveBeenCalledTimes(5);
    const firstCall = mockPrisma.serialUnit.create.mock.calls[0][0].data;
    expect(firstCall.productId).toBe('prod-1');
    expect(firstCall.moduleDesignId).toBe('md-1');
    expect(firstCall.status).toBe('IN_STOCK');
    expect(firstCall.source).toBe('MANUFACTURED');
    expect(firstCall.productionReceiptId).toBe('pr-1');
  });

  it('skips serial generation with warning when no numbering rule exists', async () => {
    mockPrisma.moduleDesign.findFirst.mockResolvedValue({ id: 'md-1', code: 'MOD_A' });
    const { SerialNumberingRuleNotFoundError } = await import('@/lib/serial/numbering');
    mockGenerateSerial.mockRejectedValue(new SerialNumberingRuleNotFoundError('md-1'));

    await updateWorkOrderStatus('wo-1', 'COMPLETED', 3);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Serial'),
      expect.objectContaining({ workOrderId: 'wo-1' })
    );
    expect(mockPrisma.serialUnit.create).not.toHaveBeenCalled();
  });
});
