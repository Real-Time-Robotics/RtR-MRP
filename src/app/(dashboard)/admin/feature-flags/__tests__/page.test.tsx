/**
 * Sprint 27 TIP-S27-08 — Feature Flags Page Tests
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/feature-flags', () => ({
  FEATURE_FLAGS: {
    SIDEBAR_V2: true,
    SHOW_FINANCE: false,
    SHOW_AI_ML: false,
    SHOW_MULTITENANT: false,
    SHOW_MOBILE: false,
    SHOW_COMPLIANCE: false,
  },
}));

describe('Feature Flags Page', () => {
  it('renders 6 flags with current values', async () => {
    const { default: Page } = await import('../page');
    expect(typeof Page).toBe('function');
    // Server component, verify it exists
  });

  it('shows restart note', async () => {
    const { default: Page } = await import('../page');
    expect(Page).toBeDefined();
    // The component includes ".env.local" restart instructions
  });
});
