// =============================================================================
// RTR-MRP - K6 LOAD TEST SUITE
// Main load testing script for API endpoints
// Run: k6 run load-tests/k6/main.js
// =============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api'; // RTR-MRP uses /api without version prefix

// Test user credentials
const TEST_USERS = [
  { email: 'admin@demo.rtr-mrp.com', password: 'Admin@Demo2026!', role: 'admin' },
  { email: 'manager@demo.rtr-mrp.com', password: 'Manager@Demo2026!', role: 'manager' },
  { email: 'operator@demo.rtr-mrp.com', password: 'Operator@Demo2026!', role: 'operator' },
  { email: 'viewer@demo.rtr-mrp.com', password: 'Viewer@Demo2026!', role: 'viewer' },
];

// =============================================================================
// CUSTOM METRICS
// =============================================================================

// Error rates
const errorRate = new Rate('errors');
const authErrorRate = new Rate('auth_errors');

// Response time trends
const loginTrend = new Trend('login_duration');
const dashboardTrend = new Trend('dashboard_duration');
const partsTrend = new Trend('parts_duration');
const inventoryTrend = new Trend('inventory_duration');
const productionTrend = new Trend('production_duration');
const salesTrend = new Trend('sales_duration');

// Counters
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');
const apiCalls = new Counter('api_calls');

// =============================================================================
// TEST OPTIONS - LOAD PROFILES
// =============================================================================

export const options = {
  // Test scenarios
  scenarios: {
    // Smoke test - Quick validation
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },

    // Load test - Normal load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '35s', // Start after smoke test
    },

    // Stress test - Beyond normal load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '17m', // Start after load test
    },

    // Spike test - Sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 500 },  // Spike!
        { duration: '30s', target: 50 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '37m', // Start after stress test
    },
  },

  // Thresholds - Pass/Fail criteria
  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    
    // Error rate threshold
    errors: ['rate<0.1'],           // Less than 10% error rate
    auth_errors: ['rate<0.05'],     // Less than 5% auth errors
    
    // Specific endpoint thresholds
    login_duration: ['p(95)<1000'],
    dashboard_duration: ['p(95)<500'],
    parts_duration: ['p(95)<300'],
    inventory_duration: ['p(95)<300'],
    production_duration: ['p(95)<500'],
    
    // Request throughput
    http_reqs: ['rate>10'],         // At least 10 requests per second
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function login(user) {
  const startTime = Date.now();
  
  const res = http.post(`${BASE_URL}/api/auth/callback/credentials`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });

  const duration = Date.now() - startTime;
  loginTrend.add(duration);

  const success = check(res, {
    'login successful': (r) => r.status === 200 || r.status === 302,
  });

  if (success) {
    successfulLogins.add(1);
    // Extract session token from cookies
    const cookies = res.cookies;
    return cookies['next-auth.session-token'] ? cookies['next-auth.session-token'][0].value : null;
  } else {
    failedLogins.add(1);
    authErrorRate.add(1);
    return null;
  }
}

function apiGet(endpoint, token, trendMetric, name) {
  const startTime = Date.now();
  
  const res = http.get(`${BASE_URL}${API_VERSION}${endpoint}`, {
    headers: getAuthHeaders(token),
    tags: { name: name || endpoint },
  });

  const duration = Date.now() - startTime;
  if (trendMetric) trendMetric.add(duration);
  apiCalls.add(1);

  const success = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} has data`]: (r) => r.json('success') === true || r.json('data') !== undefined,
  });

  errorRate.add(!success);
  return res;
}

function apiPost(endpoint, payload, token, name) {
  const res = http.post(`${BASE_URL}${API_VERSION}${endpoint}`, JSON.stringify(payload), {
    headers: getAuthHeaders(token),
    tags: { name: name || endpoint },
  });

  apiCalls.add(1);

  const success = check(res, {
    [`${name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  errorRate.add(!success);
  return res;
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

// Smoke Test - Basic functionality validation
export function smokeTest() {
  group('Smoke Test', function() {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      'health check passed': (r) => r.status === 200,
    });

    // Login
    const user = TEST_USERS[0]; // Admin
    const token = login(user);
    
    if (token) {
      // Quick API checks
      apiGet('/home', token, dashboardTrend, 'dashboard');
      sleep(1);
      apiGet('/parts?page=1&limit=10', token, partsTrend, 'parts-list');
    }

    sleep(2);
  });
}

// Load Test - Normal traffic simulation
export function loadTest() {
  const user = randomItem(TEST_USERS);
  
  group('User Session', function() {
    // Login
    const token = login(user);
    if (!token) {
      errorRate.add(1);
      return;
    }

    // Simulate user journey
    group('Dashboard', function() {
      apiGet('/home', token, dashboardTrend, 'dashboard');
      sleep(randomIntBetween(1, 3));
    });

    group('Browse Parts', function() {
      apiGet('/parts?page=1&limit=20', token, partsTrend, 'parts-list');
      sleep(randomIntBetween(1, 2));

      // Search
      apiGet('/parts?search=bolt&page=1', token, partsTrend, 'parts-search');
      sleep(randomIntBetween(1, 2));
    });

    group('Check Inventory', function() {
      apiGet('/inventory', token, inventoryTrend, 'inventory-list');
      sleep(randomIntBetween(1, 2));
    });

    group('View Production', function() {
      apiGet('/production/work-orders?page=1&limit=20', token, productionTrend, 'production-list');
      sleep(randomIntBetween(1, 2));

      // Filter by status
      apiGet('/production/work-orders?status=in_progress', token, productionTrend, 'production-filtered');
      sleep(randomIntBetween(1, 2));
    });

    group('Check Sales', function() {
      apiGet('/sales-orders?page=1&limit=20', token, salesTrend, 'sales-list');
      sleep(randomIntBetween(1, 2));
    });

    sleep(randomIntBetween(2, 5));
  });
}

// Stress Test - Push system limits
export function stressTest() {
  const user = randomItem(TEST_USERS);
  const token = login(user);
  
  if (!token) {
    errorRate.add(1);
    return;
  }

  group('High Load Operations', function() {
    // Rapid API calls
    for (let i = 0; i < 5; i++) {
      apiGet('/home', token, dashboardTrend, 'dashboard-stress');
      apiGet('/parts?page=1&limit=50', token, partsTrend, 'parts-stress');
      apiGet('/inventory', token, inventoryTrend, 'inventory-stress');
      sleep(0.5);
    }

    // Complex queries
    apiGet('/parts?search=component&category=Component&page=1', token, partsTrend, 'parts-complex');
    apiGet('/production/work-orders?status=in_progress', token, productionTrend, 'production-complex');

    sleep(1);
  });
}

// Spike Test - Sudden traffic burst
export function spikeTest() {
  const user = randomItem(TEST_USERS);
  const token = login(user);
  
  if (!token) {
    errorRate.add(1);
    return;
  }

  group('Spike Operations', function() {
    // Burst of requests
    apiGet('/home', token, dashboardTrend, 'dashboard-spike');
    apiGet('/parts?page=1', token, partsTrend, 'parts-spike');
    apiGet('/inventory', token, inventoryTrend, 'inventory-spike');
    apiGet('/production/work-orders?page=1', token, productionTrend, 'production-spike');
    apiGet('/sales-orders?page=1', token, salesTrend, 'sales-spike');

    sleep(0.1);
  });
}

// =============================================================================
// DEFAULT FUNCTION (for simple runs)
// =============================================================================

export default function() {
  loadTest();
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

export function setup() {
  console.log('🚀 Starting RTR-MRP Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👥 Test Users: ${TEST_USERS.length}`);
  
  // Verify system is up
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    throw new Error('System health check failed! Aborting test.');
  }
  
  console.log('✅ System health check passed');
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n🏁 Test completed in ${duration.toFixed(2)} seconds`);
}

// =============================================================================
// CUSTOM SUMMARY
// =============================================================================

export function handleSummary(data) {
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    [`load-tests/results/summary-${now}.json`]: JSON.stringify(data, null, 2),
    [`load-tests/results/summary-${now}.html`]: htmlReport(data),
  };
}

function textSummary(data, options) {
  // K6 built-in text summary
  return '';
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>RTR-MRP Load Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a365d; }
    .metric { background: #f7fafc; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .metric-name { font-weight: bold; color: #2d3748; }
    .metric-value { font-size: 24px; color: #3182ce; }
    .pass { color: #38a169; }
    .fail { color: #e53e3e; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #edf2f7; }
  </style>
</head>
<body>
  <h1>🏭 RTR-MRP Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <h2>Summary</h2>
  <div class="metric">
    <div class="metric-name">Total Requests</div>
    <div class="metric-value">${data.metrics.http_reqs?.values?.count || 0}</div>
  </div>
  
  <div class="metric">
    <div class="metric-name">Error Rate</div>
    <div class="metric-value ${(data.metrics.errors?.values?.rate || 0) < 0.1 ? 'pass' : 'fail'}">
      ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
    </div>
  </div>
  
  <div class="metric">
    <div class="metric-name">Avg Response Time</div>
    <div class="metric-value">${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms</div>
  </div>
  
  <div class="metric">
    <div class="metric-name">P95 Response Time</div>
    <div class="metric-value ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 500 ? 'pass' : 'fail'}">
      ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
    </div>
  </div>
  
  <h2>Thresholds</h2>
  <table>
    <tr><th>Metric</th><th>Threshold</th><th>Result</th></tr>
    ${Object.entries(data.thresholds || {}).map(([name, result]) => `
      <tr>
        <td>${name}</td>
        <td>${result.thresholds?.join(', ') || 'N/A'}</td>
        <td class="${result.ok ? 'pass' : 'fail'}">${result.ok ? '✅ PASS' : '❌ FAIL'}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
  `;
}
