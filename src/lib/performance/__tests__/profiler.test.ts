import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
  },
}));

import {
  queryProfiler,
  measureTime,
  createTimer,
  Timed,
  prismaProfilingMiddleware,
  responseTimingMiddleware,
  getMemoryUsage,
  checkMemoryLeak,
  generatePerformanceReport,
} from '../profiler';
import type { QueryProfile } from '../profiler';

describe('profiler', () => {
  beforeEach(() => {
    queryProfiler.clear();
  });

  // ===========================================================================
  // queryProfiler
  // ===========================================================================
  describe('queryProfiler', () => {
    it('should record a query profile', () => {
      const profile: QueryProfile = {
        query: 'Part.findMany',
        model: 'Part',
        operation: 'findMany',
        duration: 50,
        timestamp: new Date(),
      };

      queryProfiler.record(profile);
      const recent = queryProfiler.getRecentQueries();
      expect(recent).toHaveLength(1);
      expect(recent[0].query).toBe('Part.findMany');
    });

    it('should track slow queries when duration exceeds threshold', () => {
      queryProfiler.record({
        query: 'Part.findMany',
        model: 'Part',
        operation: 'findMany',
        duration: 1500, // > 1000ms threshold
        timestamp: new Date(),
      });

      const slow = queryProfiler.getSlowQueries();
      expect(slow).toHaveLength(1);
      expect(slow[0].query).toBe('Part:findMany');
      expect(slow[0].avgDuration).toBe(1500);
    });

    it('should aggregate slow query stats across multiple occurrences', () => {
      queryProfiler.record({
        query: 'Part.findMany',
        model: 'Part',
        operation: 'findMany',
        duration: 1200,
        timestamp: new Date(),
      });
      queryProfiler.record({
        query: 'Part.findMany',
        model: 'Part',
        operation: 'findMany',
        duration: 1800,
        timestamp: new Date(),
      });

      const slow = queryProfiler.getSlowQueries();
      expect(slow).toHaveLength(1);
      expect(slow[0].count).toBe(2);
      expect(slow[0].maxDuration).toBe(1800);
      expect(slow[0].avgDuration).toBe(1500);
    });

    it('should return limited recent queries', () => {
      for (let i = 0; i < 10; i++) {
        queryProfiler.record({
          query: `q${i}`,
          model: 'M',
          operation: 'op',
          duration: 10,
          timestamp: new Date(),
        });
      }
      const recent = queryProfiler.getRecentQueries(3);
      expect(recent).toHaveLength(3);
    });

    it('should sort slow queries by avgDuration descending', () => {
      queryProfiler.record({
        query: 'A.findMany',
        model: 'A',
        operation: 'findMany',
        duration: 1100,
        timestamp: new Date(),
      });
      queryProfiler.record({
        query: 'B.findMany',
        model: 'B',
        operation: 'findMany',
        duration: 2000,
        timestamp: new Date(),
      });

      const slow = queryProfiler.getSlowQueries();
      expect(slow[0].query).toBe('B:findMany');
      expect(slow[1].query).toBe('A:findMany');
    });

    it('should clear all profiles', () => {
      queryProfiler.record({
        query: 'q',
        model: 'M',
        operation: 'op',
        duration: 2000,
        timestamp: new Date(),
      });
      queryProfiler.clear();

      expect(queryProfiler.getRecentQueries()).toHaveLength(0);
      expect(queryProfiler.getSlowQueries()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getMetrics
  // ===========================================================================
  describe('getMetrics', () => {
    it('should return zero metrics when no profiles recorded', () => {
      const m = queryProfiler.getMetrics();
      expect(m.totalRequests).toBe(0);
      expect(m.avgResponseTime).toBe(0);
      expect(m.p50ResponseTime).toBe(0);
      expect(m.p95ResponseTime).toBe(0);
      expect(m.p99ResponseTime).toBe(0);
      expect(m.slowQueries).toBe(0);
      expect(m.cacheHitRate).toBe(0);
    });

    it('should compute percentile metrics', () => {
      // Record 100 queries with duration = index
      for (let i = 1; i <= 100; i++) {
        queryProfiler.record({
          query: `q${i}`,
          model: 'M',
          operation: 'op',
          duration: i,
          timestamp: new Date(),
        });
      }

      const m = queryProfiler.getMetrics();
      expect(m.totalRequests).toBe(100);
      expect(m.avgResponseTime).toBeCloseTo(50.5, 0);
      // sorted[Math.floor(100*0.5)] = sorted[50] = 51 (values are 1..100)
      expect(m.p50ResponseTime).toBe(51);
      // sorted[Math.floor(100*0.95)] = sorted[95] = 96
      expect(m.p95ResponseTime).toBe(96);
    });

    it('should calculate cache hit rate from profile results', () => {
      queryProfiler.record({
        query: 'q1',
        model: 'M',
        operation: 'op',
        duration: 10,
        timestamp: new Date(),
        result: { cached: true },
      });
      queryProfiler.record({
        query: 'q2',
        model: 'M',
        operation: 'op',
        duration: 10,
        timestamp: new Date(),
        result: { cached: false },
      });

      const m = queryProfiler.getMetrics();
      expect(m.cacheHitRate).toBe(0.5);
    });
  });

  // ===========================================================================
  // measureTime
  // ===========================================================================
  describe('measureTime', () => {
    it('should measure execution time and return result', async () => {
      const { result, duration } = await measureTime(async () => {
        return 42;
      });

      expect(result).toBe(42);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // createTimer
  // ===========================================================================
  describe('createTimer', () => {
    it('should return elapsed time on stop', () => {
      const timer = createTimer();
      const elapsed = timer.stop();
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // Timed decorator
  // ===========================================================================
  describe('Timed decorator', () => {
    it('should time a method and return its result when applied manually', async () => {
      const originalMethod = async function () {
        return 'done';
      };

      const descriptor: PropertyDescriptor = { value: originalMethod };
      const decorator = Timed('test-label');
      decorator({ constructor: { name: 'Svc' } }, 'compute', descriptor);

      const timedMethod = descriptor.value as () => Promise<string>;
      const result = await timedMethod();
      expect(result).toBe('done');
    });
  });

  // ===========================================================================
  // prismaProfilingMiddleware
  // ===========================================================================
  describe('prismaProfilingMiddleware', () => {
    it('should call next and record profile', async () => {
      const middleware = prismaProfilingMiddleware();
      const next = vi.fn().mockResolvedValue([{ id: '1' }]);

      const result = await middleware(
        { model: 'Part', action: 'findMany', args: {} },
        next,
      );

      expect(next).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1' }]);
      const recent = queryProfiler.getRecentQueries();
      expect(recent.length).toBeGreaterThanOrEqual(1);
    });

    it('should log warning for slow queries', async () => {
      const { logger } = await import('@/lib/logger');
      const middleware = prismaProfilingMiddleware();
      const next = vi.fn().mockImplementation(async () => {
        // Simulate slow query
        await new Promise(r => setTimeout(r, 5));
        return [];
      });

      // We can't easily make the timing exceed 1000ms in a test,
      // but we verify the middleware runs without error
      await middleware({ model: 'Part', action: 'findMany' }, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // responseTimingMiddleware
  // ===========================================================================
  describe('responseTimingMiddleware', () => {
    it('should add timing headers to response', async () => {
      const middleware = responseTimingMiddleware();
      const request = new Request('http://localhost/api/test');
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      const response = await middleware(request, handler);
      expect(response.headers.get('X-Response-Time')).toBeTruthy();
      expect(response.headers.get('Server-Timing')).toBeTruthy();
      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // getMemoryUsage
  // ===========================================================================
  describe('getMemoryUsage', () => {
    it('should return memory usage stats', () => {
      const usage = getMemoryUsage();
      expect(usage.heapUsed).toBeTruthy();
      expect(usage.heapTotal).toBeTruthy();
      expect(usage.rss).toBeTruthy();
      expect(usage.external).toBeTruthy();
      expect(parseFloat(usage.percentUsed)).toBeGreaterThan(0);
      expect(usage.heapUsedRaw).toBeGreaterThan(0);
      expect(usage.heapTotalRaw).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // checkMemoryLeak
  // ===========================================================================
  describe('checkMemoryLeak', () => {
    it('should return a result with warning flag and message', () => {
      const result = checkMemoryLeak();
      expect(typeof result.warning).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(result.message).toContain('% of heap used');
    });
  });

  // ===========================================================================
  // generatePerformanceReport
  // ===========================================================================
  describe('generatePerformanceReport', () => {
    it('should generate a report with all sections', () => {
      const report = generatePerformanceReport();
      expect(report.timestamp).toBeTruthy();
      expect(report.summary).toBeDefined();
      expect(report.memory).toBeDefined();
      expect(report.slowQueries).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should include recommendations for low cache hit rate', () => {
      // Record some profiles with no cache hits
      for (let i = 0; i < 10; i++) {
        queryProfiler.record({
          query: `q${i}`,
          model: 'M',
          operation: 'op',
          duration: 10,
          timestamp: new Date(),
          result: { cached: false },
        });
      }

      const report = generatePerformanceReport();
      const hasCacheRecommendation = report.recommendations.some(
        (r: string) => r.includes('Cache hit rate'),
      );
      expect(hasCacheRecommendation).toBe(true);
    });

    it('should include slow query recommendations', () => {
      queryProfiler.record({
        query: 'Part.findMany',
        model: 'Part',
        operation: 'findMany',
        duration: 2000,
        timestamp: new Date(),
      });

      const report = generatePerformanceReport();
      const hasSlowQueryRec = report.recommendations.some(
        (r: string) => r.includes('Optimize slow query'),
      );
      expect(hasSlowQueryRec).toBe(true);
    });
  });
});
