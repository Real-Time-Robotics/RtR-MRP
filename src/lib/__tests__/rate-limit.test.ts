/**
 * Rate Limit Unit Tests (rate-limiter-flexible backend)
 *
 * We cover:
 *   - getRateLimitIdentifier / getIpIdentifier (pure functions)
 *   - test-env bypass path (NODE_ENV=test → always allow)
 *   - in-memory limiter path (no REDIS_URL, non-production) — real consume
 *     loop hits the limit and flips to 429
 *   - production fail-fast (NODE_ENV=production without REDIS_URL throws at import)
 *   - metrics: rate_limit_exceeded_total increments on 429
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function createMockRequest(
  url: string = 'http://localhost:3000/api/test',
  headers: Record<string, string> = {}
): Request {
  return new Request(url, { headers });
}

describe('Rate Limit', () => {
  // ==========================================================================
  // getRateLimitIdentifier / getIpIdentifier
  // ==========================================================================
  describe('getRateLimitIdentifier', () => {
    let getRateLimitIdentifier: typeof import('../rate-limit').getRateLimitIdentifier;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../rate-limit');
      getRateLimitIdentifier = mod.getRateLimitIdentifier;
    });

    it('prefers userId when provided', () => {
      expect(getRateLimitIdentifier(createMockRequest(), 'user-123')).toBe('user:user-123');
    });

    it('extracts IP from x-forwarded-for', () => {
      const req = createMockRequest('http://localhost/', { 'x-forwarded-for': '192.168.1.100' });
      expect(getRateLimitIdentifier(req)).toBe('ip:192.168.1.100');
    });

    it('takes the first IP when x-forwarded-for is a list', () => {
      const req = createMockRequest('http://localhost/', {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3',
      });
      expect(getRateLimitIdentifier(req)).toBe('ip:10.0.0.1');
    });

    it('falls back to loopback when no identifier is available', () => {
      expect(getRateLimitIdentifier(createMockRequest())).toBe('ip:127.0.0.1');
    });

    it('honours x-real-ip when x-forwarded-for is absent', () => {
      const req = createMockRequest('http://localhost/', { 'x-real-ip': '203.0.113.5' });
      expect(getRateLimitIdentifier(req)).toBe('ip:203.0.113.5');
    });
  });

  // ==========================================================================
  // Test-env bypass (NODE_ENV=test by default in vitest)
  // ==========================================================================
  describe('test environment bypass', () => {
    let mod: typeof import('../rate-limit');
    beforeEach(async () => {
      vi.resetModules();
      mod = await import('../rate-limit');
    });

    it('checkHeavyEndpointLimit returns success with limit=9999', async () => {
      const res = await mod.checkHeavyEndpointLimit(createMockRequest(), 'u1');
      expect(res).toEqual({ success: true, limit: 9999, remaining: 9999, reset: 0 });
    });

    it('checkWriteEndpointLimit returns null', async () => {
      expect(await mod.checkWriteEndpointLimit(createMockRequest(), 'u1')).toBeNull();
    });

    it('checkReadEndpointLimit returns null', async () => {
      expect(await mod.checkReadEndpointLimit(createMockRequest(), 'u1')).toBeNull();
    });

    it('checkSigninLimit returns null', async () => {
      expect(await mod.checkSigninLimit(createMockRequest())).toBeNull();
    });

    it('checkStrictAuthLimit returns null', async () => {
      expect(await mod.checkStrictAuthLimit(createMockRequest())).toBeNull();
    });
  });

  // ==========================================================================
  // In-memory limiter (dev-ish: not test, no REDIS_URL, NODE_ENV≠production)
  // ==========================================================================
  describe('in-memory limiter (no Redis, development)', () => {
    let mod: typeof import('../rate-limit');

    beforeEach(async () => {
      vi.resetModules();
      // Force development mode with test-env markers off so the check
      // functions actually consume.
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('PLAYWRIGHT_TEST', '');
      vi.stubEnv('E2E_TEST', '');
      vi.stubEnv('SKIP_RATE_LIMIT', '');
      delete process.env.REDIS_URL;
      mod = await import('../rate-limit');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('allows the first few strict-auth calls then 429s after limit=3', async () => {
      const req = createMockRequest('http://localhost/', { 'x-forwarded-for': '1.2.3.4' });
      const r1 = await mod.checkStrictAuthLimit(req);
      const r2 = await mod.checkStrictAuthLimit(req);
      const r3 = await mod.checkStrictAuthLimit(req);
      const r4 = await mod.checkStrictAuthLimit(req); // 4th should trip
      expect(r1).toBeNull();
      expect(r2).toBeNull();
      expect(r3).toBeNull();
      expect(r4).not.toBeNull();
      expect(r4!.status).toBe(429);
      const body = await r4!.json();
      expect(body.error).toMatch(/too many requests/i);
      expect(r4!.headers.get('X-RateLimit-Limit')).toBe('3');
    });

    it('checkHeavyEndpointLimit returns {success:true, limit:60} on first call', async () => {
      const res = await mod.checkHeavyEndpointLimit(createMockRequest(), 'fresh-user');
      expect(res.success).toBe(true);
      expect(res.limit).toBe(60);
      expect(res.remaining).toBe(59);
    });
  });

  // ==========================================================================
  // Production fail-fast
  // ==========================================================================
  describe('production fail-fast without REDIS_URL', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('throws at import when NODE_ENV=production and REDIS_URL is unset', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('PLAYWRIGHT_TEST', '');
      vi.stubEnv('E2E_TEST', '');
      vi.stubEnv('SKIP_RATE_LIMIT', '');
      delete process.env.REDIS_URL;

      await expect(import('../rate-limit')).rejects.toThrow(/REDIS_URL is not set/);
    });

    it('does NOT throw when SKIP_RATE_LIMIT=true (escape hatch)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('SKIP_RATE_LIMIT', 'true');
      delete process.env.REDIS_URL;

      await expect(import('../rate-limit')).resolves.toBeTruthy();
    });
  });

  // ==========================================================================
  // Metrics: rate_limit_exceeded_total bumps on 429
  // ==========================================================================
  describe('metrics integration', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('PLAYWRIGHT_TEST', '');
      vi.stubEnv('E2E_TEST', '');
      vi.stubEnv('SKIP_RATE_LIMIT', '');
      delete process.env.REDIS_URL;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('increments rate_limit_exceeded_total when a request is rejected', async () => {
      const incSpy = vi.fn();
      vi.doMock('@/lib/monitoring/metrics', () => ({
        rateLimitExceededTotal: { inc: incSpy },
      }));
      const mod = await import('../rate-limit');

      const req = createMockRequest('http://localhost/', { 'x-forwarded-for': '5.5.5.5' });
      // Exhaust strict-auth (3 points).
      await mod.checkStrictAuthLimit(req);
      await mod.checkStrictAuthLimit(req);
      await mod.checkStrictAuthLimit(req);
      const rejected = await mod.checkStrictAuthLimit(req);
      expect(rejected?.status).toBe(429);
      expect(incSpy).toHaveBeenCalledWith({ tier: 'strict-auth', backend: 'memory' });
    });
  });
});
