// src/lib/monitoring/__tests__/metrics.test.ts
// Unit tests for Prometheus metrics helpers

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to hoist mock fn definitions
const { mockInc, mockObserve, mockDec, mockSet, mockMetrics, mockGetMetricsAsJSON } = vi.hoisted(() => ({
  mockInc: vi.fn(),
  mockObserve: vi.fn(),
  mockDec: vi.fn(),
  mockSet: vi.fn(),
  mockMetrics: vi.fn().mockResolvedValue('# HELP mock_metric\nmock_metric 1'),
  mockGetMetricsAsJSON: vi.fn().mockResolvedValue([{ name: 'mock' }]),
}));

// Mock prom-client before importing the module
vi.mock('prom-client', () => {
  class MockRegistry {
    setDefaultLabels = vi.fn();
    metrics = mockMetrics;
    getMetricsAsJSON = mockGetMetricsAsJSON;
  }
  class MockCounter {
    inc = mockInc;
    constructor() {}
  }
  class MockHistogram {
    observe = mockObserve;
    constructor() {}
  }
  class MockGauge {
    inc = mockInc;
    dec = mockDec;
    set = mockSet;
    constructor() {}
  }
  class MockSummary {
    observe = mockObserve;
    constructor() {}
  }
  return {
    Registry: MockRegistry,
    Counter: MockCounter,
    Histogram: MockHistogram,
    Gauge: MockGauge,
    Summary: MockSummary,
    collectDefaultMetrics: vi.fn(),
  };
});

import {
  measureHttpRequest,
  measureDbQuery,
  recordCacheOperation,
  recordError,
  getMetrics,
  getMetricsJson,
  metricsMiddleware,
  metricsRegistry,
} from '../metrics';

describe('Metrics Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // metricsRegistry
  // ==========================================================================
  describe('metricsRegistry', () => {
    it('should be defined', () => {
      expect(metricsRegistry).toBeDefined();
    });
  });

  // ==========================================================================
  // measureHttpRequest
  // ==========================================================================
  describe('measureHttpRequest', () => {
    it('should increment counter and observe duration with tenant', () => {
      measureHttpRequest('GET', '/api/parts', 200, 150, 'tenant-1');

      expect(mockInc).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/parts',
        status: '200',
        tenant: 'tenant-1',
      });
      expect(mockObserve).toHaveBeenCalledWith(
        { method: 'GET', path: '/api/parts', status: '200', tenant: 'tenant-1' },
        0.15
      );
    });

    it('should default tenant to "system" when not provided', () => {
      measureHttpRequest('POST', '/api/orders', 201, 50);

      expect(mockInc).toHaveBeenCalledWith(
        expect.objectContaining({ tenant: 'system' })
      );
    });

    it('should convert milliseconds to seconds for duration', () => {
      measureHttpRequest('GET', '/api/test', 200, 1000);
      expect(mockObserve).toHaveBeenCalledWith(expect.any(Object), 1);
    });
  });

  // ==========================================================================
  // measureDbQuery
  // ==========================================================================
  describe('measureDbQuery', () => {
    it('should record successful query', () => {
      measureDbQuery('findMany', 'Part', true, 25);

      expect(mockInc).toHaveBeenCalledWith({
        operation: 'findMany',
        model: 'Part',
        success: 'true',
      });
      expect(mockObserve).toHaveBeenCalledWith(
        { operation: 'findMany', model: 'Part' },
        0.025
      );
    });

    it('should record failed query', () => {
      measureDbQuery('create', 'Order', false, 100);

      expect(mockInc).toHaveBeenCalledWith({
        operation: 'create',
        model: 'Order',
        success: 'false',
      });
    });
  });

  // ==========================================================================
  // recordCacheOperation
  // ==========================================================================
  describe('recordCacheOperation', () => {
    it('should record cache hit', () => {
      recordCacheOperation('get', true);
      expect(mockInc).toHaveBeenCalledWith({ operation: 'get', result: 'hit' });
    });

    it('should record cache miss', () => {
      recordCacheOperation('get', false);
      expect(mockInc).toHaveBeenCalledWith({ operation: 'get', result: 'miss' });
    });

    it('should record set operation', () => {
      recordCacheOperation('set', true);
      expect(mockInc).toHaveBeenCalledWith({ operation: 'set', result: 'hit' });
    });

    it('should record delete operation', () => {
      recordCacheOperation('delete', false);
      expect(mockInc).toHaveBeenCalledWith({ operation: 'delete', result: 'miss' });
    });
  });

  // ==========================================================================
  // recordError
  // ==========================================================================
  describe('recordError', () => {
    it('should record error with tenant', () => {
      recordError('ValidationError', 'INVALID_INPUT', 'tenant-1');
      expect(mockInc).toHaveBeenCalledWith({
        type: 'ValidationError',
        code: 'INVALID_INPUT',
        tenant: 'tenant-1',
      });
    });

    it('should default tenant to "system" when not provided', () => {
      recordError('InternalError', 'SERVER_ERROR');
      expect(mockInc).toHaveBeenCalledWith({
        type: 'InternalError',
        code: 'SERVER_ERROR',
        tenant: 'system',
      });
    });
  });

  // ==========================================================================
  // getMetrics / getMetricsJson
  // ==========================================================================
  describe('getMetrics', () => {
    it('should return prometheus format string', async () => {
      const result = await getMetrics();
      expect(typeof result).toBe('string');
      expect(result).toContain('mock_metric');
    });
  });

  describe('getMetricsJson', () => {
    it('should return metrics as JSON object', async () => {
      const result = await getMetricsJson();
      expect(result).toEqual([{ name: 'mock' }]);
    });
  });

  // ==========================================================================
  // metricsMiddleware
  // ==========================================================================
  describe('metricsMiddleware', () => {
    it('should call next and register finish handler', async () => {
      const middleware = metricsMiddleware();
      const req = {
        method: 'GET',
        url: '/api/parts',
        path: '/api/parts',
        headers: { 'x-tenant-id': 'tenant-1' },
      };
      let finishCallback: (() => void) | undefined;
      const res = {
        statusCode: 200,
        on: vi.fn((event: string, cb: () => void) => {
          if (event === 'finish') finishCallback = cb;
        }),
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockInc).toHaveBeenCalled();

      // Simulate response finish
      expect(finishCallback).toBeDefined();
      finishCallback!();

      expect(mockDec).toHaveBeenCalled();
    });

    it('should use route.path if available', async () => {
      const middleware = metricsMiddleware();
      const req = {
        method: 'POST',
        url: '/api/orders/123',
        route: { path: '/api/orders/:id' },
        headers: {},
      };
      let finishCallback: (() => void) | undefined;
      const res = {
        statusCode: 201,
        on: vi.fn((_event: string, cb: () => void) => {
          finishCallback = cb;
        }),
      };
      const next = vi.fn();

      await middleware(req, res, next);
      finishCallback!();

      expect(mockInc).toHaveBeenCalled();
    });
  });
});
