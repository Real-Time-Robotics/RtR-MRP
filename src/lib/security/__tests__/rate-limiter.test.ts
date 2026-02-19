import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// We need to mock dependencies BEFORE importing the module under test.
// The rate-limiter module has a top-level setInterval for cleanup and imports
// next/server and the monitoring logger.
// ---------------------------------------------------------------------------

// Mock the monitoring logger
vi.mock('@/lib/monitoring/logger', () => ({
  logger: {
    security: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock next/server
vi.mock('next/server', () => {
  class MockNextRequest {
    headers: Map<string, string>;
    url: string;
    method: string;
    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: any, init?: any) => ({
        body,
        status: init?.status || 200,
        headers: new Map(Object.entries(init?.headers || {})),
      }),
    },
  };
});

// We must ensure NODE_ENV is NOT 'test' for the rate-limiter to actually
// enforce limits (it skips in test env). We override isTestEnvironment by
// controlling env vars.

import { rateLimit, rateLimitConfigs, rateLimitWithDegradation } from '../rate-limiter';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Make the rate limiter think we are NOT in a test env so it enforces limits
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PLAYWRIGHT_TEST', '');
    vi.stubEnv('E2E_TEST', '');
    vi.stubEnv('SKIP_RATE_LIMIT', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('should allow the first request and return correct remaining count', async () => {
    const result = await rateLimit('client-A', {
      windowMs: 60000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 1
    expect(result.limit).toBe(5);
  });

  it('should decrement remaining with each request', async () => {
    const config = { windowMs: 60000, maxRequests: 3 };
    const id = 'decrement-test';

    const r1 = await rateLimit(id, config);
    expect(r1.remaining).toBe(2);

    const r2 = await rateLimit(id, config);
    expect(r2.remaining).toBe(1);

    const r3 = await rateLimit(id, config);
    expect(r3.remaining).toBe(0);
  });

  it('should deny requests after maxRequests is exceeded', async () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    const id = 'deny-test';

    await rateLimit(id, config); // 1
    await rateLimit(id, config); // 2
    const r3 = await rateLimit(id, config); // 3 -> denied

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('should reset the window after windowMs expires (fixed window)', async () => {
    const config = { windowMs: 10000, maxRequests: 1 };
    const id = 'reset-test';

    const r1 = await rateLimit(id, config);
    expect(r1.allowed).toBe(true);

    const r2 = await rateLimit(id, config);
    expect(r2.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(11000);

    const r3 = await rateLimit(id, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0); // maxRequests(1) - 1
  });

  it('should track different clients independently', async () => {
    const config = { windowMs: 60000, maxRequests: 1 };

    const rA = await rateLimit('ip:192.168.1.1', config);
    expect(rA.allowed).toBe(true);

    const rB = await rateLimit('ip:192.168.1.2', config);
    expect(rB.allowed).toBe(true);

    // A is now rate limited, B should be too (both had 1 request)
    const rA2 = await rateLimit('ip:192.168.1.1', config);
    expect(rA2.allowed).toBe(false);

    const rB2 = await rateLimit('ip:192.168.1.2', config);
    expect(rB2.allowed).toBe(false);
  });

  it('should use keyPrefix to namespace keys', async () => {
    const config1 = { windowMs: 60000, maxRequests: 1, keyPrefix: 'api' };
    const config2 = { windowMs: 60000, maxRequests: 1, keyPrefix: 'auth' };
    const id = 'same-ip';

    const r1 = await rateLimit(id, config1);
    expect(r1.allowed).toBe(true);

    // Different prefix = different key, so still allowed
    const r2 = await rateLimit(id, config2);
    expect(r2.allowed).toBe(true);
  });

  it('should include resetTime in the future', async () => {
    const now = Date.now();
    const config = { windowMs: 30000, maxRequests: 10 };
    const result = await rateLimit('time-check', config);

    expect(result.resetTime).toBeGreaterThan(now);
    expect(result.resetTime).toBeLessThanOrEqual(now + 30000);
  });

  it('should respect default config values', () => {
    // Verify exported configs exist and have expected shapes
    expect(rateLimitConfigs.api.maxRequests).toBe(100);
    expect(rateLimitConfigs.auth.maxRequests).toBe(10);
    expect(rateLimitConfigs.login.maxRequests).toBe(5);
    expect(rateLimitConfigs.login.windowMs).toBe(300000);
    expect(rateLimitConfigs.export.maxRequests).toBe(5);
    expect(rateLimitConfigs.ai.maxRequests).toBe(20);
  });

  it('should skip rate limiting in test environment', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const config = { windowMs: 60000, maxRequests: 1 };
    // Even with maxRequests=1, multiple requests should be allowed
    const r1 = await rateLimit('test-skip', config);
    const r2 = await rateLimit('test-skip', config);
    const r3 = await rateLimit('test-skip', config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    // In test mode, remaining always equals maxRequests
    expect(r1.remaining).toBe(1);
  });

  it('should skip rate limiting when SKIP_RATE_LIMIT is true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SKIP_RATE_LIMIT', 'true');

    const config = { windowMs: 60000, maxRequests: 1 };
    const r1 = await rateLimit('skip-flag', config);
    const r2 = await rateLimit('skip-flag', config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});

// =============================================================================
// rateLimitWithDegradation
// =============================================================================

describe('rateLimitWithDegradation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PLAYWRIGHT_TEST', '');
    vi.stubEnv('E2E_TEST', '');
    vi.stubEnv('SKIP_RATE_LIMIT', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('should return "normal" degradation level when usage is low', async () => {
    const config = { windowMs: 60000, maxRequests: 100 };
    const result = await rateLimitWithDegradation('degrade-normal', config);

    expect(result.degradationLevel).toBe('normal');
  });

  it('should return "warning" degradation level at warning threshold', async () => {
    const config = { windowMs: 60000, maxRequests: 10 };
    const id = 'degrade-warning';

    // Send 7 requests to reach 70% usage
    for (let i = 0; i < 7; i++) {
      await rateLimit(id, config);
    }

    const warningAction = vi.fn();
    const criticalAction = vi.fn();

    const result = await rateLimitWithDegradation(id, config, {
      actions: { warning: warningAction, critical: criticalAction },
    });

    // 8th request => 80% usage, above 70% warning threshold
    expect(result.degradationLevel).toBe('warning');
    expect(warningAction).toHaveBeenCalled();
    expect(criticalAction).not.toHaveBeenCalled();
  });

  it('should return "critical" degradation level at critical threshold', async () => {
    const config = { windowMs: 60000, maxRequests: 10 };
    const id = 'degrade-critical';

    // Send 9 requests to reach 90%
    for (let i = 0; i < 9; i++) {
      await rateLimit(id, config);
    }

    const warningAction = vi.fn();
    const criticalAction = vi.fn();

    const result = await rateLimitWithDegradation(id, config, {
      actions: { warning: warningAction, critical: criticalAction },
    });

    // 10th request => 100% usage, above 90% critical threshold
    expect(result.degradationLevel).toBe('critical');
    expect(criticalAction).toHaveBeenCalled();
  });

  it('should not trigger degradation actions when disabled', async () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    const id = 'degrade-disabled';

    await rateLimit(id, config);

    const warningAction = vi.fn();
    const criticalAction = vi.fn();

    const result = await rateLimitWithDegradation(id, config, {
      enabled: false,
      actions: { warning: warningAction, critical: criticalAction },
    });

    expect(result.degradationLevel).toBe('normal');
    expect(warningAction).not.toHaveBeenCalled();
    expect(criticalAction).not.toHaveBeenCalled();
  });
});
