// =============================================================================
// TEST SETUP & UTILITIES
// RTR-MRP Test Suite
// =============================================================================

import '@testing-library/jest-dom';

// =============================================================================
// GLOBAL MOCKS
// =============================================================================

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  })
) as jest.Mock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// =============================================================================
// PERFORMANCE HELPERS
// =============================================================================

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsed: number;
  operationsPerSecond: number;
}

export const measurePerformance = async <T>(
  fn: () => T | Promise<T>,
  iterations: number = 1
): Promise<PerformanceMetrics> => {
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  const executionTime = endTime - startTime;
  const memoryUsed = endMemory - startMemory;
  const operationsPerSecond = iterations > 0 && executionTime > 0 
    ? (iterations / executionTime) * 1000 
    : 0;

  return {
    executionTime,
    memoryUsed,
    operationsPerSecond,
  };
};

export const expectPerformance = (
  metrics: PerformanceMetrics,
  thresholds: {
    maxExecutionTime?: number;
    maxMemoryUsed?: number;
    minOpsPerSecond?: number;
  }
) => {
  if (thresholds.maxExecutionTime) {
    expect(metrics.executionTime).toBeLessThan(thresholds.maxExecutionTime);
  }
  if (thresholds.maxMemoryUsed) {
    expect(metrics.memoryUsed).toBeLessThan(thresholds.maxMemoryUsed);
  }
  if (thresholds.minOpsPerSecond) {
    expect(metrics.operationsPerSecond).toBeGreaterThan(thresholds.minOpsPerSecond);
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
