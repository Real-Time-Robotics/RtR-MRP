// src/lib/monitoring/performance-tracker.ts
// Performance monitoring utility for tracking API response times and database queries

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  endpoint: string;
  method: string;
  samples: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  errorRate: number;
}

class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();
  private errors: Map<string, number> = new Map();
  private enabled: boolean = true;

  // Start timing a operation
  startTimer(): () => number {
    const start = performance.now();
    return () => performance.now() - start;
  }

  // Record a metric
  record(name: string, duration: number): void {
    if (!this.enabled) return;

    const existing = this.metrics.get(name) || [];
    existing.push(duration);

    // Keep only last 1000 samples
    if (existing.length > 1000) {
      existing.shift();
    }

    this.metrics.set(name, existing);
  }

  // Record an error
  recordError(name: string): void {
    if (!this.enabled) return;
    const count = this.errors.get(name) || 0;
    this.errors.set(name, count + 1);
  }

  // Calculate percentile
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Get report for a specific metric
  getReport(name: string): PerformanceReport | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const errorCount = this.errors.get(name) || 0;
    const totalCalls = samples.length + errorCount;

    return {
      endpoint: name,
      method: 'GET',
      samples: samples.length,
      p50: Math.round(this.percentile(samples, 50) * 100) / 100,
      p95: Math.round(this.percentile(samples, 95) * 100) / 100,
      p99: Math.round(this.percentile(samples, 99) * 100) / 100,
      min: Math.round(Math.min(...samples) * 100) / 100,
      max: Math.round(Math.max(...samples) * 100) / 100,
      avg: Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 100) / 100,
      errorRate: Math.round((errorCount / totalCalls) * 10000) / 100,
    };
  }

  // Get all reports
  getAllReports(): PerformanceReport[] {
    const reports: PerformanceReport[] = [];
    for (const name of Array.from(this.metrics.keys())) {
      const report = this.getReport(name);
      if (report) reports.push(report);
    }
    return reports.sort((a, b) => b.p95 - a.p95);
  }

  // Get baseline snapshot
  getBaseline(): {
    timestamp: string;
    reports: PerformanceReport[];
    summary: {
      totalEndpoints: number;
      avgP95: number;
      avgP50: number;
      slowestEndpoint: string;
      fastestEndpoint: string;
    };
  } {
    const reports = this.getAllReports();
    const p95Values = reports.map(r => r.p95);
    const p50Values = reports.map(r => r.p50);

    return {
      timestamp: new Date().toISOString(),
      reports,
      summary: {
        totalEndpoints: reports.length,
        avgP95: p95Values.length > 0
          ? Math.round((p95Values.reduce((a, b) => a + b, 0) / p95Values.length) * 100) / 100
          : 0,
        avgP50: p50Values.length > 0
          ? Math.round((p50Values.reduce((a, b) => a + b, 0) / p50Values.length) * 100) / 100
          : 0,
        slowestEndpoint: reports[0]?.endpoint || 'N/A',
        fastestEndpoint: reports[reports.length - 1]?.endpoint || 'N/A',
      },
    };
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
    this.errors.clear();
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker();

// Middleware helper for API routes
export function withPerformanceTracking<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const endTimer = performanceTracker.startTimer();

  return fn()
    .then((result) => {
      performanceTracker.record(name, endTimer());
      return result;
    })
    .catch((error) => {
      performanceTracker.record(name, endTimer());
      performanceTracker.recordError(name);
      throw error;
    });
}

// Database query tracking
export function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return withPerformanceTracking(`db:${queryName}`, queryFn);
}
