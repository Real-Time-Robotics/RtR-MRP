/**
 * Sprint 27 TIP-S27-06 — Feature flag test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('FEATURE_FLAGS.SIDEBAR_V2', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('defaults to true when NEXT_PUBLIC_SIDEBAR_V2 is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SIDEBAR_V2', '');
    const { FEATURE_FLAGS } = await import('@/lib/feature-flags');
    // Empty string is not 'false', so flag is true
    expect(FEATURE_FLAGS.SIDEBAR_V2).toBe(true);
  });

  it('is false when NEXT_PUBLIC_SIDEBAR_V2 is "false"', async () => {
    vi.stubEnv('NEXT_PUBLIC_SIDEBAR_V2', 'false');
    const { FEATURE_FLAGS } = await import('@/lib/feature-flags');
    expect(FEATURE_FLAGS.SIDEBAR_V2).toBe(false);
  });

  it('is true when NEXT_PUBLIC_SIDEBAR_V2 is "true"', async () => {
    vi.stubEnv('NEXT_PUBLIC_SIDEBAR_V2', 'true');
    const { FEATURE_FLAGS } = await import('@/lib/feature-flags');
    expect(FEATURE_FLAGS.SIDEBAR_V2).toBe(true);
  });
});
