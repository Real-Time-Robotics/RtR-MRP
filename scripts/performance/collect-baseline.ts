#!/usr/bin/env npx tsx
// scripts/performance/collect-baseline.ts
// Collect performance baseline metrics before optimization

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'baselines');

interface BaselineResult {
  timestamp: string;
  environment: string;
  tests: TestResult[];
  summary: Summary;
}

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  samples: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  status: 'pass' | 'fail' | 'slow';
}

interface Summary {
  totalTests: number;
  passed: number;
  failed: number;
  slow: number;
  avgResponseTime: number;
  p95ResponseTime: number;
}

// Test endpoints with timing
const ENDPOINTS = [
  { name: 'Parts List', endpoint: '/api/parts', method: 'GET', threshold: 500 },
  { name: 'Suppliers List', endpoint: '/api/suppliers', method: 'GET', threshold: 500 },
  { name: 'Customers List', endpoint: '/api/customers', method: 'GET', threshold: 500 },
  { name: 'Work Orders List', endpoint: '/api/work-orders', method: 'GET', threshold: 1000 },
  { name: 'Sales Orders List', endpoint: '/api/sales-orders', method: 'GET', threshold: 1000 },
  { name: 'Purchase Orders List', endpoint: '/api/purchase-orders', method: 'GET', threshold: 1000 },
  { name: 'Inventory List', endpoint: '/api/inventory', method: 'GET', threshold: 500 },
  { name: 'Dashboard Stats', endpoint: '/api/dashboard/stats', method: 'GET', threshold: 300 },
  { name: 'MRP Planning', endpoint: '/api/mrp/planning', method: 'GET', threshold: 2000 },
  { name: 'NCR List', endpoint: '/api/quality/ncrs', method: 'GET', threshold: 500 },
];

// Run a single test
async function runTest(
  endpoint: { name: string; endpoint: string; method: string; threshold: number },
  samples: number = 5
): Promise<TestResult> {
  const times: number[] = [];
  let errors = 0;

  console.log(`  Testing ${endpoint.name}...`);

  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}${endpoint.endpoint}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'next-auth.session-token=test', // May need real session
        },
      });

      const elapsed = Date.now() - start;

      if (response.ok || response.status === 401) {
        // 401 is OK for auth-protected endpoints, we're measuring timing
        times.push(elapsed);
      } else {
        errors++;
        times.push(elapsed);
      }
    } catch (error) {
      errors++;
      times.push(Date.now() - start);
    }

    // Small delay between samples
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const validTimes = times.filter(t => t > 0);
  const sortedTimes = [...validTimes].sort((a, b) => a - b);

  const avgMs = validTimes.length > 0
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
    : 0;

  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p95Ms = sortedTimes[p95Index] || sortedTimes[sortedTimes.length - 1] || 0;

  let status: 'pass' | 'fail' | 'slow' = 'pass';
  if (errors > samples / 2) {
    status = 'fail';
  } else if (avgMs > endpoint.threshold) {
    status = 'slow';
  }

  const statusEmoji = status === 'pass' ? '✅' : status === 'slow' ? '⚠️' : '❌';
  console.log(`    ${statusEmoji} ${avgMs}ms avg (threshold: ${endpoint.threshold}ms)`);

  return {
    name: endpoint.name,
    endpoint: endpoint.endpoint,
    method: endpoint.method,
    samples: validTimes.length,
    avgMs,
    minMs: Math.min(...validTimes) || 0,
    maxMs: Math.max(...validTimes) || 0,
    p95Ms,
    status,
  };
}

// Main function
async function collectBaseline(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RTR-MRP PERFORMANCE BASELINE COLLECTION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Server: ${BASE_URL}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results: TestResult[] = [];

  // Run all tests
  console.log('Running performance tests...\n');

  for (const endpoint of ENDPOINTS) {
    const result = await runTest(endpoint);
    results.push(result);
  }

  // Calculate summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const slow = results.filter(r => r.status === 'slow').length;
  const avgTimes = results.map(r => r.avgMs);
  const p95Times = results.map(r => r.p95Ms);

  const summary: Summary = {
    totalTests: results.length,
    passed,
    failed,
    slow,
    avgResponseTime: Math.round(avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length),
    p95ResponseTime: Math.round(p95Times.reduce((a, b) => a + b, 0) / p95Times.length),
  };

  const baseline: BaselineResult = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    tests: results,
    summary,
  };

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total Tests:     ${summary.totalTests}`);
  console.log(`  ✅ Passed:       ${summary.passed}`);
  console.log(`  ⚠️  Slow:         ${summary.slow}`);
  console.log(`  ❌ Failed:       ${summary.failed}`);
  console.log(`  Avg Response:    ${summary.avgResponseTime}ms`);
  console.log(`  P95 Response:    ${summary.p95ResponseTime}ms`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Save baseline to file
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filename = `baseline_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(baseline, null, 2));

  console.log(`  📁 Baseline saved to: ${filepath}`);

  // Also save as latest
  const latestPath = path.join(OUTPUT_DIR, 'baseline_latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(baseline, null, 2));
  console.log(`  📁 Latest baseline: ${latestPath}\n`);

  // Generate markdown report
  const mdReport = generateMarkdownReport(baseline);
  const mdPath = path.join(OUTPUT_DIR, 'BASELINE_REPORT.md');
  fs.writeFileSync(mdPath, mdReport);
  console.log(`  📄 Report saved to: ${mdPath}\n`);

  // Return exit code based on results
  if (failed > 0) {
    process.exit(1);
  }
}

// Generate markdown report
function generateMarkdownReport(baseline: BaselineResult): string {
  const { summary, tests } = baseline;

  let md = `# Performance Baseline Report

**Generated:** ${baseline.timestamp}
**Environment:** ${baseline.environment}

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.totalTests} |
| Passed | ${summary.passed} |
| Slow | ${summary.slow} |
| Failed | ${summary.failed} |
| Avg Response Time | ${summary.avgResponseTime}ms |
| P95 Response Time | ${summary.p95ResponseTime}ms |

---

## Detailed Results

| Endpoint | Method | Avg (ms) | Min (ms) | Max (ms) | P95 (ms) | Status |
|----------|--------|----------|----------|----------|----------|--------|
`;

  for (const test of tests) {
    const statusEmoji = test.status === 'pass' ? '✅' : test.status === 'slow' ? '⚠️' : '❌';
    md += `| ${test.endpoint} | ${test.method} | ${test.avgMs} | ${test.minMs} | ${test.maxMs} | ${test.p95Ms} | ${statusEmoji} ${test.status} |\n`;
  }

  md += `
---

## Slow Endpoints (Need Optimization)

`;

  const slowEndpoints = tests.filter(t => t.status === 'slow' || t.avgMs > 500);
  if (slowEndpoints.length === 0) {
    md += 'No slow endpoints detected.\n';
  } else {
    for (const test of slowEndpoints.sort((a, b) => b.avgMs - a.avgMs)) {
      md += `- **${test.endpoint}**: ${test.avgMs}ms average\n`;
    }
  }

  md += `
---

## Recommendations

1. Endpoints with response time > 500ms should be optimized
2. Consider adding database indexes for slow queries
3. Implement caching for frequently accessed data
4. Use pagination for list endpoints

---

*This baseline will be used to measure optimization improvements.*
`;

  return md;
}

// Run
collectBaseline().catch(console.error);
