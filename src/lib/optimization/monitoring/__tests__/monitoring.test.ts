import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), logError: vi.fn() },
}));

import { metrics, performanceTracker, alertManager } from '../index';

describe('Monitoring Module', () => {
  beforeEach(() => {
    metrics.reset();
  });

  describe('MetricsCollector', () => {
    it('should increment counter', () => {
      metrics.increment('requests');
      metrics.increment('requests');
      const summary = metrics.getSummary();
      expect(summary.counters.requests).toBe(2);
    });

    it('should set gauge', () => {
      metrics.setGauge('memory', 500);
      const summary = metrics.getSummary();
      expect(summary.gauges.memory).toBe(500);
    });

    it('should record histogram', () => {
      metrics.recordHistogram('latency', 100);
      metrics.recordHistogram('latency', 200);
      metrics.recordHistogram('latency', 300);
      const percentiles = metrics.getPercentiles('latency', [50, 95, 99]);
      expect(percentiles.p50).toBeDefined();
      expect(percentiles.p95).toBeDefined();
    });

    it('should handle timer', () => {
      const end = metrics.startTimer('operation');
      const duration = end();
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should return empty percentiles for missing histogram', () => {
      const p = metrics.getPercentiles('nonexistent', [50]);
      expect(p.p50).toBe(0);
    });

    it('should get metrics map', () => {
      metrics.increment('test');
      const m = metrics.getMetrics();
      expect(m instanceof Map).toBe(true);
    });

    it('should handle tags', () => {
      metrics.increment('req', 1, { method: 'GET' });
      const summary = metrics.getSummary();
      expect(summary.counters['req{method=GET}']).toBe(1);
    });

    it('should reset all metrics', () => {
      metrics.increment('test');
      metrics.setGauge('gauge', 10);
      metrics.reset();
      const summary = metrics.getSummary();
      expect(Object.keys(summary.counters)).toHaveLength(0);
    });
  });

  describe('PerformanceTracker', () => {
    it('should track operation', async () => {
      const result = await performanceTracker.track('test-op', async () => 42);
      expect(result).toBe(42);
    });

    it('should track failed operation', async () => {
      await expect(
        performanceTracker.track('fail-op', async () => { throw new Error('fail'); })
      ).rejects.toThrow('fail');
    });

    it('should set slow threshold', () => {
      performanceTracker.setSlowThreshold('db', 500);
      // No throw means success
    });

    it('should get stats', async () => {
      await performanceTracker.track('stat-op', async () => 'ok');
      const stats = performanceTracker.getStats('stat-op');
      expect(stats.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AlertManager', () => {
    it('should exist', () => {
      expect(alertManager).toBeDefined();
    });
  });
});
