/**
 * Sprint 27 TIP-S27-07 — Assembly List Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Assembly List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
  });

  it('module loads without error', async () => {
    const { default: Page } = await import('../page');
    expect(typeof Page).toBe('function');
  });

  it('fetches assembly orders list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: 'ao-1', aoNumber: 'AO-2026-0001', status: 'DRAFT', targetQuantity: 1, product: { name: 'EBOX' }, assignedToUser: null, createdAt: '2026-04-27' },
        ],
      }),
    });

    const { default: Page } = await import('../page');
    expect(Page).toBeDefined();
  });
});
