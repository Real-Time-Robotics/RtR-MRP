import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { CircuitBreaker, CircuitBreakerError, withRetry } from '../index';

describe('Resilience', () => {
  describe('CircuitBreaker', () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
      cb = new CircuitBreaker('test', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        resetTimeout: 200,
      });
    });

    it('should start in CLOSED state', () => {
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should execute successfully', async () => {
      const result = await cb.execute(async () => 42);
      expect(result).toBe(42);
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should count failures', async () => {
      for (let i = 0; i < 2; i++) {
        try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
      }
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should open after threshold failures', async () => {
      for (let i = 0; i < 3; i++) {
        try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
      }
      expect(cb.getState()).toBe('OPEN');
    });

    it('should throw CircuitBreakerError when open', async () => {
      for (let i = 0; i < 3; i++) {
        try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
      }
      await expect(cb.execute(async () => 42)).rejects.toThrow(CircuitBreakerError);
    });

    it('should reset', () => {
      cb.reset();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getStats().failureCount).toBe(0);
    });

    it('should get stats', () => {
      const stats = cb.getStats();
      expect(stats.state).toBe('CLOSED');
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      for (let i = 0; i < 3; i++) {
        try { await cb.execute(async () => { throw new Error('fail'); }); } catch {}
      }
      expect(cb.getState()).toBe('OPEN');
      // Wait for timeout
      await new Promise(r => setTimeout(r, 150));
      // Next execute should transition to HALF_OPEN
      try {
        await cb.execute(async () => 42);
      } catch {}
      // Should now be CLOSED or HALF_OPEN
      expect(['CLOSED', 'HALF_OPEN']).toContain(cb.getState());
    });
  });

  describe('CircuitBreakerError', () => {
    it('should have state and retryAfter', () => {
      const err = new CircuitBreakerError('test', 'OPEN', 5000);
      expect(err.state).toBe('OPEN');
      expect(err.retryAfter).toBe(5000);
      expect(err.name).toBe('CircuitBreakerError');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await withRetry(fn);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');
      const result = await withRetry(fn, { maxAttempts: 3, initialDelay: 10 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      await expect(withRetry(fn, { maxAttempts: 2, initialDelay: 10 }))
        .rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');
      await withRetry(fn, { maxAttempts: 3, initialDelay: 10, onRetry });
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying for non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('permanent'));
      await expect(withRetry(fn, {
        maxAttempts: 5,
        initialDelay: 10,
        retryableErrors: () => false,
      })).rejects.toThrow('permanent');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
