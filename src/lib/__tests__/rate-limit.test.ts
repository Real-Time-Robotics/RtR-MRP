/**
 * Rate Limit Unit Tests
 * Tests for getRateLimitIdentifier, checkHeavyEndpointLimit,
 * checkWriteEndpointLimit, checkReadEndpointLimit, and related behavior.
 *
 * Strategy:
 * - getRateLimitIdentifier is a pure function tested directly.
 * - The check* functions have three code paths:
 *     1. isTestEnvironment() => bypass (always allows)
 *     2. limiter is null (Upstash not configured) => fallback allow
 *     3. limiter is configured => delegates to Upstash
 *   We test paths 1 & 2 with a fresh import, and path 3 by dynamically
 *   importing the module after setting env vars and mocking Upstash.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Request object. */
function createMockRequest(
  url: string = 'http://localhost:3000/api/test',
  headers: Record<string, string> = {}
): Request {
  return new Request(url, { headers });
}

// ---------------------------------------------------------------------------
// TESTS: getRateLimitIdentifier (no env dependency)
// ---------------------------------------------------------------------------

describe('Rate Limit', () => {
  describe('getRateLimitIdentifier', () => {
    // Import the function directly -- it has no env or Upstash dependency
    let getRateLimitIdentifier: typeof import('../rate-limit').getRateLimitIdentifier;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../rate-limit');
      getRateLimitIdentifier = mod.getRateLimitIdentifier;
    });

    it('should return user-based identifier when userId is provided', () => {
      const req = createMockRequest();
      const id = getRateLimitIdentifier(req, 'user-123');
      expect(id).toBe('user:user-123');
    });

    it('should extract IP from x-forwarded-for header', () => {
      const req = createMockRequest('http://localhost/api/test', {
        'x-forwarded-for': '192.168.1.100',
      });
      const id = getRateLimitIdentifier(req);
      expect(id).toBe('ip:192.168.1.100');
    });

    it('should take the first IP when x-forwarded-for contains multiple IPs', () => {
      const req = createMockRequest('http://localhost/api/test', {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3',
      });
      const id = getRateLimitIdentifier(req);
      expect(id).toBe('ip:10.0.0.1');
    });

    it('should return ip:unknown when no userId and no forwarded-for', () => {
      const req = createMockRequest();
      const id = getRateLimitIdentifier(req);
      expect(id).toBe('ip:unknown');
    });

    it('should prefer userId over IP when both are available', () => {
      const req = createMockRequest('http://localhost/api/test', {
        'x-forwarded-for': '10.0.0.1',
      });
      const id = getRateLimitIdentifier(req, 'user-abc');
      expect(id).toBe('user:user-abc');
    });
  });

  // =========================================================================
  // Test environment bypass path
  // =========================================================================

  describe('test environment bypass', () => {
    // By default NODE_ENV === 'test' in vitest, so the check functions
    // should return the bypass values.

    let checkHeavyEndpointLimit: typeof import('../rate-limit').checkHeavyEndpointLimit;
    let checkWriteEndpointLimit: typeof import('../rate-limit').checkWriteEndpointLimit;
    let checkReadEndpointLimit: typeof import('../rate-limit').checkReadEndpointLimit;

    beforeEach(async () => {
      vi.resetModules();
      const mod = await import('../rate-limit');
      checkHeavyEndpointLimit = mod.checkHeavyEndpointLimit;
      checkWriteEndpointLimit = mod.checkWriteEndpointLimit;
      checkReadEndpointLimit = mod.checkReadEndpointLimit;
    });

    it('checkHeavyEndpointLimit should bypass with limit=9999 in test env', async () => {
      const req = createMockRequest();
      const result = await checkHeavyEndpointLimit(req, 'user-1');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(9999);
      expect(result.remaining).toBe(9999);
      expect(result.reset).toBe(0);
    });

    it('checkWriteEndpointLimit should return null (allow) in test env', async () => {
      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');
      expect(response).toBeNull();
    });

    it('checkReadEndpointLimit should return null (allow) in test env', async () => {
      const req = createMockRequest();
      const response = await checkReadEndpointLimit(req, 'user-1');
      expect(response).toBeNull();
    });
  });

  // =========================================================================
  // Upstash not configured path (no Redis env vars, non-test env)
  // =========================================================================

  describe('Upstash not configured fallback', () => {
    let checkHeavyEndpointLimit: typeof import('../rate-limit').checkHeavyEndpointLimit;
    let checkWriteEndpointLimit: typeof import('../rate-limit').checkWriteEndpointLimit;
    let checkReadEndpointLimit: typeof import('../rate-limit').checkReadEndpointLimit;

    beforeEach(async () => {
      vi.resetModules();

      // Remove Upstash env vars and test env markers
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('PLAYWRIGHT_TEST', '');
      vi.stubEnv('E2E_TEST', '');
      vi.stubEnv('SKIP_RATE_LIMIT', '');
      // Ensure Upstash vars are absent
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      // Mock the Upstash modules to prevent real connection attempts
      vi.doMock('@upstash/ratelimit', () => {
        class FakeRatelimit {
          limit = vi.fn();
          static slidingWindow = vi.fn().mockReturnValue('sliding-window-config');
        }
        return { Ratelimit: FakeRatelimit };
      });
      vi.doMock('@upstash/redis', () => {
        class FakeRedis {}
        return { Redis: FakeRedis };
      });

      const mod = await import('../rate-limit');
      checkHeavyEndpointLimit = mod.checkHeavyEndpointLimit;
      checkWriteEndpointLimit = mod.checkWriteEndpointLimit;
      checkReadEndpointLimit = mod.checkReadEndpointLimit;

      // Restore env for test assertions
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.doUnmock('@upstash/ratelimit');
      vi.doUnmock('@upstash/redis');
    });

    it('checkHeavyEndpointLimit should allow all with limit=60 when Upstash is not configured', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const req = createMockRequest();
      const result = await checkHeavyEndpointLimit(req, 'user-1');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBe(60);
      vi.unstubAllEnvs();
    });

    it('checkWriteEndpointLimit should return null when Upstash is not configured', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');
      expect(response).toBeNull();
      vi.unstubAllEnvs();
    });

    it('checkReadEndpointLimit should return null when Upstash is not configured', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const req = createMockRequest();
      const response = await checkReadEndpointLimit(req, 'user-1');
      expect(response).toBeNull();
      vi.unstubAllEnvs();
    });
  });

  // =========================================================================
  // Upstash configured -- limiter engaged
  // =========================================================================

  describe('Upstash configured (limiter engaged)', () => {
    const mockLimit = vi.fn();

    let checkHeavyEndpointLimit: typeof import('../rate-limit').checkHeavyEndpointLimit;
    let checkWriteEndpointLimit: typeof import('../rate-limit').checkWriteEndpointLimit;
    let checkReadEndpointLimit: typeof import('../rate-limit').checkReadEndpointLimit;

    beforeEach(async () => {
      vi.resetModules();
      mockLimit.mockReset();

      // Mock the Upstash modules -- ensure the limiter is created
      vi.doMock('@upstash/ratelimit', () => {
        class FakeRatelimit {
          limit = mockLimit;
          static slidingWindow = vi.fn().mockReturnValue('sliding-window-config');
        }
        return { Ratelimit: FakeRatelimit };
      });
      vi.doMock('@upstash/redis', () => {
        class FakeRedis {}
        return { Redis: FakeRedis };
      });

      // Set Upstash env vars BEFORE importing so the module-level code creates limiters
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');
      // Set production so isTestEnvironment() returns false
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('PLAYWRIGHT_TEST', '');
      vi.stubEnv('E2E_TEST', '');
      vi.stubEnv('SKIP_RATE_LIMIT', '');

      const mod = await import('../rate-limit');
      checkHeavyEndpointLimit = mod.checkHeavyEndpointLimit;
      checkWriteEndpointLimit = mod.checkWriteEndpointLimit;
      checkReadEndpointLimit = mod.checkReadEndpointLimit;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.doUnmock('@upstash/ratelimit');
      vi.doUnmock('@upstash/redis');
    });

    // --- checkHeavyEndpointLimit ---

    it('should return success when heavy limiter allows the request', async () => {
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 60, remaining: 55, reset: Date.now() + 60_000,
      });

      const req = createMockRequest();
      const result = await checkHeavyEndpointLimit(req, 'user-1');

      expect(result.success).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBe(55);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should return failure with retryAfter when heavy limit exceeded', async () => {
      const resetTime = Date.now() + 30_000;
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 60, remaining: 0, reset: resetTime,
      });

      const req = createMockRequest();
      const result = await checkHeavyEndpointLimit(req, 'user-1');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should pass the correct identifier to the heavy limiter', async () => {
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000,
      });

      const req = createMockRequest('http://localhost/api/ai/chat', {
        'x-forwarded-for': '1.2.3.4',
      });
      await checkHeavyEndpointLimit(req, 'user-xyz');

      expect(mockLimit).toHaveBeenCalledWith('user:user-xyz');
    });

    it('should use IP identifier for heavy limiter when no userId is provided', async () => {
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000,
      });

      const req = createMockRequest('http://localhost/api/ai/chat', {
        'x-forwarded-for': '5.6.7.8',
      });
      await checkHeavyEndpointLimit(req);

      expect(mockLimit).toHaveBeenCalledWith('ip:5.6.7.8');
    });

    // --- checkWriteEndpointLimit ---

    it('should return null when write limiter allows the request', async () => {
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 120, remaining: 100, reset: Date.now() + 60_000,
      });

      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');

      expect(response).toBeNull();
    });

    it('should return a 429 Response when write limit is exceeded', async () => {
      const resetTime = Date.now() + 45_000;
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 120, remaining: 0, reset: resetTime,
      });

      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');

      expect(response).not.toBeNull();
      expect(response).toBeInstanceOf(Response);
      expect(response!.status).toBe(429);
    });

    it('should include rate-limit headers in the write 429 response', async () => {
      const resetTime = Date.now() + 45_000;
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 120, remaining: 0, reset: resetTime,
      });

      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');

      expect(response!.headers.get('Content-Type')).toBe('application/json');
      expect(response!.headers.get('Retry-After')).toBeDefined();
      expect(response!.headers.get('X-RateLimit-Limit')).toBe('120');
      expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response!.headers.get('X-RateLimit-Reset')).toBe(String(resetTime));
    });

    it('should include error message in the write 429 response body', async () => {
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 120, remaining: 0, reset: Date.now() + 60_000,
      });

      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');
      const body = await response!.json();

      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/too many requests/i);
    });

    // --- checkReadEndpointLimit ---

    it('should return null when read limiter allows the request', async () => {
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 300, remaining: 250, reset: Date.now() + 60_000,
      });

      const req = createMockRequest();
      const response = await checkReadEndpointLimit(req, 'user-1');

      expect(response).toBeNull();
    });

    it('should return a 429 Response when read limit is exceeded', async () => {
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 300, remaining: 0, reset: Date.now() + 60_000,
      });

      const req = createMockRequest();
      const response = await checkReadEndpointLimit(req, 'user-1');

      expect(response).not.toBeNull();
      expect(response!.status).toBe(429);
    });

    it('should include rate-limit headers in the read 429 response', async () => {
      const resetTime = Date.now() + 30_000;
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 300, remaining: 0, reset: resetTime,
      });

      const req = createMockRequest();
      const response = await checkReadEndpointLimit(req, 'user-1');

      expect(response!.headers.get('X-RateLimit-Limit')).toBe('300');
      expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response!.headers.get('X-RateLimit-Reset')).toBe(String(resetTime));
      expect(Number(response!.headers.get('Retry-After'))).toBeGreaterThan(0);
    });

    // --- Retry-After edge case ---

    it('should default Retry-After to 60 when retryAfter computes to zero', async () => {
      // When reset === Date.now(), Math.ceil(0/1000) = 0, and String(0 || 60) = '60'
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 120, remaining: 0,
        reset: Date.now(), // exactly now => retryAfter = 0
      });

      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');

      // retryAfter = Math.ceil(0) = 0, then String(0 || 60) = '60'
      expect(response!.headers.get('Retry-After')).toBe('60');
    });

    it('should produce a negative Retry-After when reset is in the past', async () => {
      // When reset is in the past, retryAfter is negative (truthy), so no fallback to 60
      mockLimit.mockResolvedValueOnce({
        success: false, limit: 120, remaining: 0,
        reset: Date.now() - 1000, // 1 second in the past
      });

      const req = createMockRequest();
      const response = await checkWriteEndpointLimit(req, 'user-1');

      // Math.ceil(-1000/1000) = -1, String(-1 || 60) = '-1' (since -1 is truthy)
      const retryAfter = Number(response!.headers.get('Retry-After'));
      expect(retryAfter).toBeLessThan(0);
    });

    // --- Different limits per endpoint type ---

    it('heavy=60, write=120, read=300 limits from the Upstash limiter', async () => {
      // Heavy
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 60, remaining: 59, reset: Date.now() + 60_000,
      });
      const heavyResult = await checkHeavyEndpointLimit(createMockRequest(), 'u1');
      expect(heavyResult.limit).toBe(60);

      // Write -- success returns null
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 120, remaining: 119, reset: Date.now() + 60_000,
      });
      const writeResponse = await checkWriteEndpointLimit(createMockRequest(), 'u1');
      expect(writeResponse).toBeNull();

      // Read -- success returns null
      mockLimit.mockResolvedValueOnce({
        success: true, limit: 300, remaining: 299, reset: Date.now() + 60_000,
      });
      const readResponse = await checkReadEndpointLimit(createMockRequest(), 'u1');
      expect(readResponse).toBeNull();
    });
  });
});
