#!/usr/bin/env node
// =============================================================================
// RTR-MRP STRESS & CHAOS TEST (Node.js Version)
// No external dependencies required - runs with Node.js
// =============================================================================

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const isHttps = BASE_URL.startsWith('https');
const httpModule = isHttps ? https : http;

// =============================================================================
// METRICS
// =============================================================================

const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: Date.now(),
  scenarioResults: {},
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, BASE_URL);

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: options.timeout || 10000,
    };

    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        metrics.totalRequests++;
        metrics.responseTimes.push(duration);

        if (res.statusCode >= 200 && res.statusCode < 400) {
          metrics.successfulRequests++;
          resolve({ status: res.statusCode, data, duration, success: true });
        } else if (res.statusCode === 429 || res.statusCode === 503) {
          // Rate limited or overloaded - count as handled
          metrics.successfulRequests++;
          resolve({ status: res.statusCode, data, duration, success: true, degraded: true });
        } else {
          metrics.failedRequests++;
          resolve({ status: res.statusCode, data, duration, success: false });
        }
      });
    });

    req.on('error', (err) => {
      metrics.failedRequests++;
      metrics.totalRequests++;
      metrics.errors.push(err.message);
      resolve({ status: 0, error: err.message, duration: Date.now() - start, success: false });
    });

    req.on('timeout', () => {
      req.destroy();
      metrics.failedRequests++;
      metrics.totalRequests++;
      resolve({ status: 0, error: 'timeout', duration: Date.now() - start, success: false });
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(arr.length * (p / 100)) - 1;
  return sorted[Math.max(0, index)];
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

async function runStressScenario(name, fn, duration, concurrency) {
  console.log(`\n🔄 Starting: ${name}`);
  console.log(`   Duration: ${duration / 1000}s, Concurrency: ${concurrency}`);

  const scenarioStart = Date.now();
  const scenarioMetrics = {
    requests: 0,
    successes: 0,
    failures: 0,
    responseTimes: [],
  };

  const workers = [];
  let running = true;

  // Stop after duration
  setTimeout(() => { running = false; }, duration);

  for (let i = 0; i < concurrency; i++) {
    workers.push((async () => {
      while (running) {
        const result = await fn();
        scenarioMetrics.requests++;
        scenarioMetrics.responseTimes.push(result.duration);
        if (result.success) {
          scenarioMetrics.successes++;
        } else {
          scenarioMetrics.failures++;
        }
        await sleep(Math.random() * 100);
      }
    })());
  }

  await Promise.all(workers);

  const elapsed = (Date.now() - scenarioStart) / 1000;
  const successRate = ((scenarioMetrics.successes / scenarioMetrics.requests) * 100).toFixed(1);
  const p95 = percentile(scenarioMetrics.responseTimes, 95);
  const rps = (scenarioMetrics.requests / elapsed).toFixed(1);

  console.log(`   ✓ Completed: ${scenarioMetrics.requests} requests`);
  console.log(`   ✓ Success Rate: ${successRate}%`);
  console.log(`   ✓ P95 Response Time: ${p95}ms`);
  console.log(`   ✓ Throughput: ${rps} req/s`);

  metrics.scenarioResults[name] = {
    requests: scenarioMetrics.requests,
    successRate: parseFloat(successRate),
    p95,
    rps: parseFloat(rps),
  };

  return scenarioMetrics;
}

// =============================================================================
// STRESS TEST SCENARIOS
// =============================================================================

async function stressTests() {
  console.log('\n📊 STRESS TESTS');
  console.log('═'.repeat(60));

  // Scenario 1: Basic Load Test
  await runStressScenario('Basic API Load', async () => {
    const endpoints = ['/api/health', '/api/parts?page=1&pageSize=10'];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    return makeRequest(endpoint);
  }, 30000, 20);

  // Scenario 2: Dashboard Load
  await runStressScenario('Dashboard Load', async () => {
    return makeRequest('/api/dashboard');
  }, 30000, 15);

  // Scenario 3: Search Operations
  await runStressScenario('Search Operations', async () => {
    const terms = ['bolt', 'nut', 'screw', 'motor', 'gear'];
    const term = terms[Math.floor(Math.random() * terms.length)];
    return makeRequest(`/api/parts?search=${term}`);
  }, 30000, 20);

  // Scenario 4: Concurrent Users Simulation
  await runStressScenario('Concurrent Users', async () => {
    const actions = [
      () => makeRequest('/api/parts?page=1'),
      () => makeRequest('/api/inventory?page=1'),
      () => makeRequest('/api/dashboard'),
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];
    return action();
  }, 45000, 50);

  // Scenario 5: Spike Test
  await runStressScenario('Spike Test (100 VUs)', async () => {
    return makeRequest('/api/parts?page=' + Math.floor(Math.random() * 100));
  }, 20000, 100);
}

// =============================================================================
// CHAOS TEST SCENARIOS
// =============================================================================

async function chaosTests() {
  console.log('\n💥 CHAOS TESTS');
  console.log('═'.repeat(60));

  // Chaos 1: Error Injection
  console.log('\n🔄 Starting: Error Injection');
  let errorHandled = 0;
  let errorTotal = 0;

  // Invalid JSON
  const res1 = await makeRequest('/api/parts', {
    method: 'POST',
    body: 'invalid{{{json',
  });
  errorTotal++;
  if (res1.status === 400 || res1.status === 422) errorHandled++;

  // Non-existent endpoint
  const res2 = await makeRequest('/api/nonexistent-12345');
  errorTotal++;
  if (res2.status === 404) errorHandled++;

  // SQL injection attempt
  const res3 = await makeRequest('/api/parts?search=\' OR \'1\'=\'1');
  errorTotal++;
  if (res3.status !== 500) errorHandled++;

  console.log(`   ✓ Error Handling: ${errorHandled}/${errorTotal} correctly handled`);
  metrics.scenarioResults['Error Injection'] = { handled: errorHandled, total: errorTotal };

  // Chaos 2: Timeout Recovery
  console.log('\n🔄 Starting: Timeout Recovery');
  const timeoutResults = [];
  for (let i = 0; i < 5; i++) {
    const result = await makeRequest('/api/dashboard', { timeout: 500 });
    timeoutResults.push(result.success || result.status === 504);
    await sleep(500);
    // Verify recovery
    const recoveryCheck = await makeRequest('/api/health');
    timeoutResults.push(recoveryCheck.success);
  }
  const timeoutRecovery = timeoutResults.filter(r => r).length / timeoutResults.length;
  console.log(`   ✓ Timeout Recovery Rate: ${(timeoutRecovery * 100).toFixed(1)}%`);
  metrics.scenarioResults['Timeout Recovery'] = { rate: timeoutRecovery };

  // Chaos 3: Overload Recovery
  console.log('\n🔄 Starting: Overload Recovery');
  // Burst of requests
  const overloadPromises = [];
  for (let i = 0; i < 50; i++) {
    overloadPromises.push(makeRequest('/api/parts?page=' + i));
  }
  const overloadResults = await Promise.all(overloadPromises);
  const overloadSuccess = overloadResults.filter(r => r.success).length;

  await sleep(2000); // Wait for recovery

  // Verify recovery
  const recoveryCheck = await makeRequest('/api/health');
  console.log(`   ✓ Overload Handling: ${overloadSuccess}/50 requests succeeded`);
  console.log(`   ✓ Post-Overload Recovery: ${recoveryCheck.success ? 'PASSED' : 'FAILED'}`);
  metrics.scenarioResults['Overload Recovery'] = {
    successDuringOverload: overloadSuccess,
    recovered: recoveryCheck.success,
  };

  // Chaos 4: AI Service Degradation
  console.log('\n🔄 Starting: AI Service Degradation Test');
  const aiEndpoints = [
    '/api/ai/alerts',
    '/api/ai/alerts/counts',
    '/api/ai/auto-po',
  ];

  let aiResponses = 0;
  let coreStillWorks = true;

  for (const endpoint of aiEndpoints) {
    const res = await makeRequest(endpoint, { timeout: 15000 });
    // AI endpoints should respond (even with error codes like 401/503)
    if (res.status > 0) aiResponses++;

    // Verify core still works
    const coreCheck = await makeRequest('/api/parts?page=1&pageSize=5');
    if (!coreCheck.success) coreStillWorks = false;
  }

  console.log(`   ✓ AI Endpoints Responded: ${aiResponses}/${aiEndpoints.length}`);
  console.log(`   ✓ Core System Unaffected: ${coreStillWorks ? 'YES' : 'NO'}`);
  metrics.scenarioResults['AI Degradation'] = {
    aiResponses,
    coreUnaffected: coreStillWorks,
  };
}

// =============================================================================
// RECOVERY TEST
// =============================================================================

async function recoveryTest() {
  console.log('\n🔄 RECOVERY TEST');
  console.log('═'.repeat(60));

  // Heavy load phase
  console.log('\n   Phase 1: Heavy Load (30 seconds)...');
  const loadStart = Date.now();
  let loadRequests = 0;
  let loadRunning = true;

  setTimeout(() => { loadRunning = false; }, 30000);

  const workers = Array(80).fill(0).map(async () => {
    while (loadRunning) {
      await makeRequest('/api/parts?page=' + Math.floor(Math.random() * 100));
      loadRequests++;
    }
  });

  await Promise.all(workers);
  const loadRps = loadRequests / 30;
  console.log(`   ✓ Load Phase: ${loadRequests} requests (${loadRps.toFixed(1)} req/s)`);

  // Recovery phase
  console.log('\n   Phase 2: Recovery Verification...');
  await sleep(3000);

  const recoveryChecks = [];
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    const res = await makeRequest('/api/health');
    recoveryChecks.push({
      success: res.success,
      time: Date.now() - start,
    });
    await sleep(500);
  }

  const recoverySuccess = recoveryChecks.filter(r => r.success).length;
  const avgRecoveryTime = recoveryChecks.reduce((a, b) => a + b.time, 0) / recoveryChecks.length;

  console.log(`   ✓ Recovery Success: ${recoverySuccess}/10 health checks passed`);
  console.log(`   ✓ Average Recovery Time: ${avgRecoveryTime.toFixed(0)}ms`);

  metrics.scenarioResults['Recovery Test'] = {
    loadRequests,
    loadRps,
    recoverySuccess,
    avgRecoveryTime,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               RTR-MRP STRESS & CHAOS TEST SUITE                            ║');
  console.log('║                      (Node.js Version)                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${BASE_URL}`);
  console.log('Starting at:', new Date().toISOString());

  // Initial health check
  console.log('\n🏥 Initial Health Check...');
  const healthCheck = await makeRequest('/api/health');
  if (!healthCheck.success) {
    console.error('❌ Server is not healthy. Aborting tests.');
    console.error(`   Status: ${healthCheck.status}`);
    process.exit(1);
  }
  console.log('✅ Server is healthy\n');

  try {
    // Run stress tests
    await stressTests();

    // Run chaos tests
    await chaosTests();

    // Run recovery test
    await recoveryTest();

  } catch (err) {
    console.error('Test error:', err);
  }

  // Final report
  const totalDuration = (Date.now() - metrics.startTime) / 1000;
  const successRate = ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1);
  const p95 = percentile(metrics.responseTimes, 95);
  const p99 = percentile(metrics.responseTimes, 99);

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           FINAL REPORT                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(`
📊 OVERALL METRICS
────────────────────────────────────────────────────────────────────────────────
Total Duration:          ${totalDuration.toFixed(1)} seconds
Total Requests:          ${metrics.totalRequests.toLocaleString()}
Successful:              ${metrics.successfulRequests.toLocaleString()}
Failed:                  ${metrics.failedRequests.toLocaleString()}
Success Rate:            ${successRate}%

⏱️  RESPONSE TIMES
────────────────────────────────────────────────────────────────────────────────
P50 (Median):            ${percentile(metrics.responseTimes, 50)}ms
P95:                     ${p95}ms
P99:                     ${p99}ms
Max:                     ${metrics.responseTimes.reduce((a, b) => Math.max(a, b), 0)}ms

📋 SCENARIO RESULTS
────────────────────────────────────────────────────────────────────────────────`);

  for (const [name, result] of Object.entries(metrics.scenarioResults)) {
    console.log(`${name}:`);
    for (const [key, value] of Object.entries(result)) {
      console.log(`   ${key}: ${typeof value === 'number' ? value.toFixed(1) : value}`);
    }
  }

  console.log(`
🎯 VERDICT
────────────────────────────────────────────────────────────────────────────────`);

  const recoveryResult = metrics.scenarioResults['Recovery Test'];
  const overloadResult = metrics.scenarioResults['Overload Recovery'];
  const aiResult = metrics.scenarioResults['AI Degradation'];

  let score = 0;
  if (parseFloat(successRate) >= 90) score += 2;
  else if (parseFloat(successRate) >= 80) score += 1;

  if (p95 < 1000) score += 2;
  else if (p95 < 2000) score += 1;

  if (recoveryResult?.recoverySuccess >= 9) score += 2;
  else if (recoveryResult?.recoverySuccess >= 7) score += 1;

  if (overloadResult?.recovered) score += 1;
  if (aiResult?.coreUnaffected) score += 1;

  if (score >= 7) {
    console.log('🏆 EXCELLENT - System demonstrated strong resilience');
  } else if (score >= 5) {
    console.log('✅ GOOD - System handled most scenarios well');
  } else if (score >= 3) {
    console.log('⚠️  FAIR - Some resilience issues detected');
  } else {
    console.log('❌ POOR - Significant improvements needed');
  }

  console.log(`\nScore: ${score}/9`);

  // Final health check
  console.log('\n🏥 Final Health Check...');
  const finalHealth = await makeRequest('/api/health');
  console.log(`   Status: ${finalHealth.success ? '✅ HEALTHY' : '⚠️  DEGRADED'}`);

  console.log('\n✨ Tests completed at:', new Date().toISOString());
}

main().catch(console.error);
