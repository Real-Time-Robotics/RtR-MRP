import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  hasCache,
  getCacheTTL,
  cacheAside,
  refreshCache,
  checkRateLimit,
  acquireLock,
  releaseLock,
  withLock,
  cache,
  cacheKeys,
  cacheTTL,
  cachePatterns,
  redis,
  getRedis,
} from '../memory-cache';

describe('Memory Cache', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await deleteCachePattern('*');
    cache.resetStats();
  });

  describe('basic operations', () => {
    it('should set and get value', async () => {
      await setCache('test-key', { data: 'hello' }, 60);
      const result = await getCache<{ data: string }>('test-key');
      expect(result).toEqual({ data: 'hello' });
    });

    it('should return null for missing key', async () => {
      const result = await getCache('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      await setCache('to-delete', 'value', 60);
      const deleted = await deleteCache('to-delete');
      expect(deleted).toBe(true);
      expect(await getCache('to-delete')).toBeNull();
    });

    it('should check if key exists', async () => {
      await setCache('exists', 'yes', 60);
      expect(await hasCache('exists')).toBe(true);
      expect(await hasCache('not-exists')).toBe(false);
    });

    it('should get TTL', async () => {
      await setCache('ttl-test', 'value', 60);
      const ttl = await getCacheTTL('ttl-test');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should return -2 for nonexistent TTL', async () => {
      const ttl = await getCacheTTL('nonexistent');
      expect(ttl).toBe(-2);
    });
  });

  describe('pattern deletion', () => {
    it('should delete matching keys', async () => {
      await setCache('prefix:a', '1', 60);
      await setCache('prefix:b', '2', 60);
      await setCache('other:c', '3', 60);
      const deleted = await deleteCachePattern('prefix:*');
      expect(deleted).toBe(2);
      expect(await getCache('other:c')).toBe('3');
    });
  });

  describe('cacheAside', () => {
    it('should fetch and cache on miss', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });
      const result = await cacheAside('aside-key', fetchFn, 60);
      expect(result).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cacheAside('aside-key', fetchFn, 60);
      expect(result2).toEqual({ data: 'fresh' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshCache', () => {
    it('should always fetch fresh data', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'refreshed' });
      await refreshCache('refresh-key', fetchFn, 60);
      const cached = await getCache('refresh-key');
      expect(cached).toEqual({ data: 'refreshed' });
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within limit', async () => {
      const result = await checkRateLimit('rate-test', 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should block after limit exceeded', async () => {
      for (let i = 0; i < 5; i++) {
        await checkRateLimit('rate-block', 5, 60);
      }
      const result = await checkRateLimit('rate-block', 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('locking', () => {
    it('should acquire and release lock', async () => {
      const acquired = await acquireLock('lock-test', 10);
      expect(acquired).toBe(true);
      const released = await releaseLock('lock-test');
      expect(released).toBe(true);
    });

    it('should prevent double acquire', async () => {
      await acquireLock('double-lock', 10);
      const second = await acquireLock('double-lock', 10);
      expect(second).toBe(false);
      await releaseLock('double-lock');
    });

    it('should execute with lock', async () => {
      const result = await withLock('with-lock', async () => 42, 10);
      expect(result).toBe(42);
    });

    it('should return null if lock unavailable', async () => {
      await acquireLock('busy-lock', 10);
      const result = await withLock('busy-lock', async () => 42, 10);
      expect(result).toBeNull();
      await releaseLock('busy-lock');
    });
  });

  describe('cacheKeys', () => {
    it('should generate tenant keys', () => {
      expect(cacheKeys.tenant.info('t1')).toBe('tenant:t1:info');
      expect(cacheKeys.tenant.parts.list('t1')).toBe('tenant:t1:parts:list');
      expect(cacheKeys.tenant.parts.item('t1', 'p1')).toBe('tenant:t1:parts:p1');
    });

    it('should generate user keys', () => {
      expect(cacheKeys.user.session('u1')).toBe('user:u1:session');
    });

    it('should generate legacy keys', () => {
      expect(cacheKeys.dashboardStats()).toBe('dashboard:stats');
      expect(cacheKeys.workOrder('wo1')).toBe('workorder:wo1');
    });
  });

  describe('cacheTTL', () => {
    it('should have correct values', () => {
      expect(cacheTTL.short).toBe(60);
      expect(cacheTTL.medium).toBe(300);
      expect(cacheTTL.long).toBe(600);
      expect(cacheTTL.hour).toBe(3600);
      expect(cacheTTL.day).toBe(86400);
    });
  });

  describe('cachePatterns', () => {
    it('should generate patterns', () => {
      expect(cachePatterns.dashboard('t1')).toBe('tenant:t1:dashboard:*');
      expect(cachePatterns.all('t1')).toBe('tenant:t1:*');
    });
  });

  describe('cache object', () => {
    it('should have all methods', () => {
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.del).toBe('function');
      expect(typeof cache.has).toBe('function');
      expect(typeof cache.aside).toBe('function');
    });

    it('should return stats', () => {
      const stats = cache.getStats();
      expect(stats.type).toBe('memory');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('redis compatibility', () => {
    it('should have ping', async () => {
      expect(await redis.ping()).toBe('PONG');
    });

    it('should report connected', () => {
      expect(redis.isConnected()).toBe(true);
    });

    it('should export getRedis', () => {
      expect(getRedis()).toBe(redis);
    });
  });
});
