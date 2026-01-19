// =============================================================================
// RTR-MRP CHAOS TESTING SUITE
// Test system resilience, failure recovery, and fault tolerance
// =============================================================================

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_V1 = `${BASE_URL}/api`;

// =============================================================================
// CUSTOM METRICS
// =============================================================================

const metrics = {
  // Recovery metrics
  recoveryTime: new Trend('recovery_time_ms'),
  failedRecovery: new Rate('failed_recovery_rate'),

  // Resilience metrics
  timeoutRecovery: new Rate('timeout_recovery_rate'),
  errorRecovery: new Rate('error_recovery_rate'),
  overloadRecovery: new Rate('overload_recovery_rate'),

  // Chaos metrics
  chaosRequestsTotal: new Counter('chaos_requests_total'),
  chaosSuccessful: new Counter('chaos_requests_successful'),
  chaosFailed: new Counter('chaos_requests_failed'),

  // Circuit breaker simulation
  circuitBreakerTrips: new Counter('circuit_breaker_trips'),

  // Graceful degradation
  degradedResponses: new Counter('degraded_responses'),
};

// =============================================================================
// TEST OPTIONS
// =============================================================================

export const options = {
  scenarios: {
    // =======================================================================
    // CHAOS SCENARIO 1: TIMEOUT RESILIENCE
    // Test how system handles slow responses and timeouts
    // =======================================================================
    timeout_resilience: {
      executor: 'constant-vus',
      vus: 20,
      duration: '3m',
      tags: { scenario: 'timeout_resilience' },
      exec: 'timeoutResilienceTest',
    },

    // =======================================================================
    // CHAOS SCENARIO 2: ERROR INJECTION
    // Send malformed requests and test error handling
    // =======================================================================
    error_injection: {
      executor: 'constant-vus',
      vus: 15,
      duration: '3m',
      tags: { scenario: 'error_injection' },
      exec: 'errorInjectionTest',
      startTime: '3m',
    },

    // =======================================================================
    // CHAOS SCENARIO 3: OVERLOAD RECOVERY
    // Push system past limits and verify recovery
    // =======================================================================
    overload_recovery: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Normal
        { duration: '30s', target: 300 },  // OVERLOAD
        { duration: '1m', target: 300 },   // Sustain overload
        { duration: '30s', target: 50 },   // Verify recovery
        { duration: '1m', target: 50 },    // Stable recovery
      ],
      tags: { scenario: 'overload_recovery' },
      exec: 'overloadRecoveryTest',
      startTime: '6m',
    },

    // =======================================================================
    // CHAOS SCENARIO 4: CONCURRENT WRITE CONFLICTS
    // Test database locks and concurrent updates
    // =======================================================================
    concurrent_conflicts: {
      executor: 'constant-vus',
      vus: 30,
      duration: '2m',
      tags: { scenario: 'concurrent_conflicts' },
      exec: 'concurrentConflictsTest',
      startTime: '10m',
    },

    // =======================================================================
    // CHAOS SCENARIO 5: RAPID RECONNECTION
    // Simulate connection drops and reconnects
    // =======================================================================
    rapid_reconnection: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 20,
      tags: { scenario: 'rapid_reconnection' },
      exec: 'rapidReconnectionTest',
      startTime: '12m',
    },

    // =======================================================================
    // CHAOS SCENARIO 6: AI SERVICE DEGRADATION
    // Test system behavior when AI services are slow/unavailable
    // =======================================================================
    ai_degradation: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      tags: { scenario: 'ai_degradation' },
      exec: 'aiDegradationTest',
      startTime: '14m',
    },

    // =======================================================================
    // CHAOS SCENARIO 7: CACHE MISS STORM
    // Test behavior with empty cache (cold start)
    // =======================================================================
    cache_miss_storm: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'cache_miss' },
      exec: 'cacheMissStormTest',
      startTime: '17m',
    },

    // =======================================================================
    // CHAOS SCENARIO 8: MEMORY PRESSURE
    // Large payload requests to test memory handling
    // =======================================================================
    memory_pressure: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { scenario: 'memory_pressure' },
      exec: 'memoryPressureTest',
      startTime: '20m',
    },
  },

  thresholds: {
    // Recovery thresholds
    recovery_time_ms: ['p(95)<5000'],
    failed_recovery_rate: ['rate<0.1'],

    // Error handling
    timeout_recovery_rate: ['rate>0.8'],
    error_recovery_rate: ['rate>0.9'],
    overload_recovery_rate: ['rate>0.7'],

    // Overall success
    http_req_failed: ['rate<0.3'],  // Allow higher failure rate during chaos
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

function measureRecovery(testFn) {
  const startTime = Date.now();
  metrics.chaosRequestsTotal.add(1);

  try {
    const result = testFn();
    const recoveryTime = Date.now() - startTime;

    if (result.success) {
      metrics.recoveryTime.add(recoveryTime);
      metrics.chaosSuccessful.add(1);
      return { success: true, recoveryTime };
    } else {
      metrics.chaosFailed.add(1);
      metrics.failedRecovery.add(1);
      return { success: false, recoveryTime, error: result.error };
    }
  } catch (e) {
    metrics.chaosFailed.add(1);
    metrics.failedRecovery.add(1);
    return { success: false, error: e.message };
  }
}

// =============================================================================
// CHAOS SCENARIOS
// =============================================================================

// Scenario 1: Timeout Resilience
export function timeoutResilienceTest() {
  group('Timeout Resilience', () => {
    // Test with very short timeout
    const params = {
      headers: getHeaders(),
      timeout: '500ms',  // Very short timeout
    };

    const result = measureRecovery(() => {
      const res = http.get(`${API_V1}/dashboard`, params);
      return {
        success: res.status === 200 || res.status === 504,
        status: res.status
      };
    });

    if (result.success) {
      metrics.timeoutRecovery.add(1);
    } else {
      metrics.timeoutRecovery.add(0);
    }

    // Follow-up with normal timeout to verify recovery
    sleep(0.5);

    const recoveryCheck = http.get(`${API_V1}/health`, {
      headers: getHeaders(),
      timeout: '5s'
    });

    check(recoveryCheck, {
      'system recovered after timeout': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 2));
}

// Scenario 2: Error Injection
export function errorInjectionTest() {
  group('Error Injection', () => {
    const errorType = randomIntBetween(1, 6);
    let result;

    switch (errorType) {
      case 1:
        // Invalid JSON body
        result = http.post(`${API_V1}/parts`, 'not valid json{{{', {
          headers: getHeaders()
        });
        check(result, {
          'handles invalid JSON gracefully': (r) => r.status === 400 || r.status === 422,
        });
        break;

      case 2:
        // Non-existent endpoint
        result = http.get(`${API_V1}/nonexistent-endpoint-12345`);
        check(result, {
          'handles 404 gracefully': (r) => r.status === 404,
        });
        break;

      case 3:
        // Invalid ID format
        result = http.get(`${API_V1}/parts/invalid-id-format-!!!`);
        check(result, {
          'handles invalid ID gracefully': (r) => r.status >= 400 && r.status < 500,
        });
        break;

      case 4:
        // Oversized payload
        const hugePayload = {
          partNumber: 'TEST-' + 'x'.repeat(10000),
          name: 'y'.repeat(50000),
          description: 'z'.repeat(100000),
        };
        result = http.post(`${API_V1}/parts`, JSON.stringify(hugePayload), {
          headers: getHeaders()
        });
        check(result, {
          'handles oversized payload': (r) => r.status === 413 || r.status === 400 || r.status === 422,
        });
        break;

      case 5:
        // SQL injection attempt (should be sanitized)
        result = http.get(`${API_V1}/parts?search=' OR '1'='1`);
        check(result, {
          'handles SQL injection safely': (r) => r.status !== 500,
        });
        break;

      case 6:
        // XSS attempt (should be sanitized)
        const xssPayload = {
          partNumber: 'TEST-XSS',
          name: '<script>alert("xss")</script>',
          description: '<img onerror="alert(1)" src=x>',
        };
        result = http.post(`${API_V1}/parts`, JSON.stringify(xssPayload), {
          headers: getHeaders()
        });
        check(result, {
          'handles XSS attempt': (r) => r.status !== 500,
        });
        break;
    }

    // Verify system still responds after error
    const healthCheck = http.get(`${API_V1}/health`);
    const recovered = check(healthCheck, {
      'system healthy after error injection': (r) => r.status === 200,
    });

    if (recovered) {
      metrics.errorRecovery.add(1);
    } else {
      metrics.errorRecovery.add(0);
    }
  });

  sleep(randomIntBetween(0.5, 1.5));
}

// Scenario 3: Overload Recovery
export function overloadRecoveryTest() {
  group('Overload Recovery', () => {
    // Burst of rapid requests
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${API_V1}/parts?page=${randomIntBetween(1, 100)}`, {
        headers: getHeaders(),
        timeout: '10s',
      });

      // Accept rate limiting (429) as valid behavior under overload
      const isOk = check(res, {
        'responds under load': (r) => r.status === 200 || r.status === 429 || r.status === 503,
      });

      if (res.status === 429 || res.status === 503) {
        metrics.circuitBreakerTrips.add(1);
        metrics.degradedResponses.add(1);
      }
    }

    // Wait a bit then verify recovery
    sleep(2);

    const recoveryCheck = http.get(`${API_V1}/health`);
    const recovered = check(recoveryCheck, {
      'recovered from overload': (r) => r.status === 200,
    });

    if (recovered) {
      metrics.overloadRecovery.add(1);
    } else {
      metrics.overloadRecovery.add(0);
    }
  });

  sleep(0.1);
}

// Scenario 4: Concurrent Conflicts
export function concurrentConflictsTest() {
  group('Concurrent Conflicts', () => {
    // All VUs try to update the same resource
    const sharedPartId = 'conflict-test-part-001';

    // Try to create if not exists
    const createRes = http.post(`${API_V1}/parts`, JSON.stringify({
      partNumber: sharedPartId,
      name: `Concurrent Test Part ${Date.now()}`,
      category: 'COMPONENT',
      unit: 'pcs',
    }), { headers: getHeaders() });

    // Now all VUs try to update concurrently
    const updateRes = http.put(`${API_V1}/parts/${sharedPartId}`, JSON.stringify({
      name: `Updated by VU ${__VU} at ${Date.now()}`,
      unitCost: randomIntBetween(10, 1000),
    }), { headers: getHeaders() });

    // Accept 409 Conflict or 404 as valid responses
    check(updateRes, {
      'handles concurrent update': (r) =>
        r.status === 200 || r.status === 409 || r.status === 404 || r.status === 400,
    });
  });

  sleep(randomIntBetween(0.1, 0.5));
}

// Scenario 5: Rapid Reconnection
export function rapidReconnectionTest() {
  group('Rapid Reconnection', () => {
    // Simulate connection drop/reconnect pattern
    for (let i = 0; i < 5; i++) {
      const start = Date.now();

      // Quick request
      const res = http.get(`${API_V1}/health`, {
        headers: getHeaders(),
        timeout: '2s',
      });

      const recovered = check(res, {
        'reconnects successfully': (r) => r.status === 200,
      });

      if (recovered) {
        metrics.recoveryTime.add(Date.now() - start);
      }

      // Brief pause then reconnect
      sleep(0.1);
    }
  });
}

// Scenario 6: AI Service Degradation
export function aiDegradationTest() {
  group('AI Degradation', () => {
    // Test AI-dependent endpoints
    const aiEndpoints = [
      `${API_V1}/ai/alerts`,
      `${API_V1}/ai/auto-po`,
      `${API_V1}/ai/auto-schedule`,
      `${API_V1}/ai/alerts/counts`,
    ];

    const endpoint = randomItem(aiEndpoints);
    const res = http.get(endpoint, {
      headers: getHeaders(),
      timeout: '15s',  // Longer timeout for AI operations
    });

    // AI endpoints should gracefully degrade (return cached/fallback data)
    // or return appropriate error codes
    const handled = check(res, {
      'AI endpoint responds': (r) =>
        r.status === 200 || r.status === 503 || r.status === 504 || r.status === 401,
    });

    if (res.status === 503 || res.status === 504) {
      metrics.degradedResponses.add(1);
    }

    // Verify core system still works
    const coreCheck = http.get(`${API_V1}/parts?page=1&pageSize=10`, {
      headers: getHeaders(),
    });

    check(coreCheck, {
      'core system unaffected by AI degradation': (r) => r.status === 200,
    });
  });

  sleep(randomIntBetween(1, 3));
}

// Scenario 7: Cache Miss Storm
export function cacheMissStormTest() {
  group('Cache Miss Storm', () => {
    // Request unique resources to force cache misses
    const uniqueId = `${Date.now()}-${__VU}-${randomIntBetween(1, 99999)}`;

    // These should all miss cache
    const requests = [
      `${API_V1}/parts?search=unique-${uniqueId}`,
      `${API_V1}/inventory?lotNumber=LOT-${uniqueId}`,
      `${API_V1}/parts?page=${randomIntBetween(100, 10000)}`,
    ];

    for (const url of requests) {
      const res = http.get(url, { headers: getHeaders() });

      // Should still respond reasonably even without cache
      check(res, {
        'handles cache miss': (r) => r.status === 200 && r.timings.duration < 5000,
      });
    }
  });

  sleep(0.1);
}

// Scenario 8: Memory Pressure
export function memoryPressureTest() {
  group('Memory Pressure', () => {
    // Request large datasets
    const largeRequests = [
      `${API_V1}/parts?pageSize=500`,
      `${API_V1}/inventory?pageSize=500`,
      `${API_V1}/export?entity=parts&limit=1000`,
    ];

    const url = randomItem(largeRequests);
    const res = http.get(url, {
      headers: getHeaders(),
      timeout: '30s',
    });

    check(res, {
      'handles large response': (r) => r.status === 200 || r.status === 413,
    });

    // Also try creating large payload
    const largePart = {
      partNumber: `LARGE-${Date.now()}`,
      name: 'Large Part Test',
      description: 'A'.repeat(10000),  // Large description
      specifications: {
        items: Array.from({ length: 100 }, (_, i) => ({
          key: `spec_${i}`,
          value: 'B'.repeat(100),
        })),
      },
    };

    const createRes = http.post(`${API_V1}/parts`, JSON.stringify(largePart), {
      headers: getHeaders(),
    });

    check(createRes, {
      'handles large payload creation': (r) =>
        r.status === 200 || r.status === 201 || r.status === 400 || r.status === 413,
    });
  });

  sleep(randomIntBetween(2, 5));
}

// =============================================================================
// DEFAULT & LIFECYCLE
// =============================================================================

export default function() {
  errorInjectionTest();
}

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     RTR-MRP CHAOS TESTING SUITE                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Testing system resilience, failure recovery, and fault tolerance          ║
║  Target: ${BASE_URL.padEnd(64)}║
║                                                                            ║
║  Scenarios:                                                                ║
║  1. Timeout Resilience     - Short timeouts, recovery verification         ║
║  2. Error Injection        - Malformed requests, SQL/XSS injection         ║
║  3. Overload Recovery      - Push past limits, verify recovery             ║
║  4. Concurrent Conflicts   - Database locks, concurrent updates            ║
║  5. Rapid Reconnection     - Connection drop/reconnect patterns            ║
║  6. AI Service Degradation - Test graceful degradation of AI features      ║
║  7. Cache Miss Storm       - Cold start, cache bypass scenarios            ║
║  8. Memory Pressure        - Large payloads, memory stress                 ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  // Verify system is healthy before chaos testing
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    console.log('⚠️  Warning: System health check failed before chaos test');
  } else {
    console.log('✅ System healthy - starting chaos tests...\n');
  }

  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;

  // Final health check after all chaos
  const finalHealth = http.get(`${BASE_URL}/api/health`);

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                      CHAOS TEST COMPLETE                                    ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Duration: ${(duration / 60).toFixed(1)} minutes                                                   ║
║  Final Health: ${finalHealth.status === 200 ? '✅ HEALTHY' : '⚠️  DEGRADED'}                                                ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
}

// =============================================================================
// SUMMARY HANDLER
// =============================================================================

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    'stdout': generateChaosReport(data),
    [`enterprise/capacity-test/results/chaos-${timestamp}.json`]: JSON.stringify(data, null, 2),
  };
}

function generateChaosReport(data) {
  const m = data.metrics;

  return `
╔════════════════════════════════════════════════════════════════════════════╗
║                     RTR-MRP CHAOS TEST REPORT                              ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 OVERALL METRICS
────────────────────────────────────────────────────────────────────────────────
Total Chaos Requests:    ${m.chaos_requests_total?.values?.count || 0}
Successful:              ${m.chaos_requests_successful?.values?.count || 0}
Failed:                  ${m.chaos_requests_failed?.values?.count || 0}
Success Rate:            ${((m.chaos_requests_successful?.values?.count || 0) /
                           (m.chaos_requests_total?.values?.count || 1) * 100).toFixed(1)}%

⏱️  RECOVERY METRICS
────────────────────────────────────────────────────────────────────────────────
Recovery Time P50:       ${(m.recovery_time_ms?.values?.['p(50)'] || 0).toFixed(0)}ms
Recovery Time P95:       ${(m.recovery_time_ms?.values?.['p(95)'] || 0).toFixed(0)}ms
Recovery Time P99:       ${(m.recovery_time_ms?.values?.['p(99)'] || 0).toFixed(0)}ms
Failed Recovery Rate:    ${((m.failed_recovery_rate?.values?.rate || 0) * 100).toFixed(1)}%

🛡️  RESILIENCE SCORES
────────────────────────────────────────────────────────────────────────────────
Timeout Recovery:        ${((m.timeout_recovery_rate?.values?.rate || 0) * 100).toFixed(1)}%
Error Recovery:          ${((m.error_recovery_rate?.values?.rate || 0) * 100).toFixed(1)}%
Overload Recovery:       ${((m.overload_recovery_rate?.values?.rate || 0) * 100).toFixed(1)}%

⚡ CIRCUIT BREAKER & DEGRADATION
────────────────────────────────────────────────────────────────────────────────
Circuit Breaker Trips:   ${m.circuit_breaker_trips?.values?.count || 0}
Degraded Responses:      ${m.degraded_responses?.values?.count || 0}

✅ THRESHOLD RESULTS
────────────────────────────────────────────────────────────────────────────────
${Object.entries(data.thresholds || {}).map(([name, result]) =>
  `${result.ok ? '✓' : '✗'} ${name}: ${result.ok ? 'PASS' : 'FAIL'}`
).join('\n')}

🎯 VERDICT
────────────────────────────────────────────────────────────────────────────────
${getVerdict(data)}
`;
}

function getVerdict(data) {
  const failedThresholds = Object.values(data.thresholds || {})
    .filter(t => !t.ok).length;
  const totalThresholds = Object.keys(data.thresholds || {}).length;

  if (failedThresholds === 0) {
    return '🏆 EXCELLENT - System demonstrated strong resilience against all chaos scenarios';
  } else if (failedThresholds <= 2) {
    return '✅ GOOD - System handled most chaos scenarios well with minor issues';
  } else if (failedThresholds <= 4) {
    return '⚠️  FAIR - System showed some resilience issues that should be addressed';
  } else {
    return '❌ POOR - System needs significant improvements in fault tolerance';
  }
}
