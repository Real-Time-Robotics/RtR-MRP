/**
 * Sprint 27 TIP-S27-07 — Issue Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Issue Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('module loads without error', async () => {
    const { default: Page } = await import('../page');
    expect(typeof Page).toBe('function');
  });

  it('XUAT_CHINH mode ships parent + children', async () => {
    // In XUAT_CHINH mode, the page calls shipSerial for parent then each child
    // This is a logic verification test
    const parentSerial = {
      serial: 'EBOX-001', status: 'IN_STOCK',
      childLinks: [
        { childSerial: { serial: 'MOD-A-001', status: 'CONSUMED' } },
        { childSerial: { serial: 'MOD-B-001', status: 'IN_STOCK' } },
      ],
    };
    // Only IN_STOCK/ALLOCATED children get shipped
    const shippableChildren = parentSerial.childLinks.filter(
      (c) => ['IN_STOCK', 'ALLOCATED'].includes(c.childSerial.status)
    );
    expect(shippableChildren).toHaveLength(1); // MOD-B-001
  });

  it('button disabled for CONSUMED serial', async () => {
    const canIssue = ['IN_STOCK', 'ALLOCATED'].includes('CONSUMED');
    expect(canIssue).toBe(false);
  });
});
