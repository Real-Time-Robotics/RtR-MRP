// =============================================================================
// RTR-MRP ENTERPRISE CAPACITY TESTING SUITE
// Test system capabilities with millions of records
// =============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// =============================================================================
// CONFIGURATION - Matches RTR-MRP actual API routes
// =============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_V2 = `${BASE_URL}/api/v2`;
const API_V1 = `${BASE_URL}/api`;  // Some routes are still on v1

// Test parameters
const TOTAL_PARTS = parseInt(__ENV.TOTAL_PARTS || '1000000');
const TOTAL_INVENTORY = parseInt(__ENV.TOTAL_INVENTORY || '500000');
const TOTAL_WORK_ORDERS = parseInt(__ENV.TOTAL_WORK_ORDERS || '100000');

// =============================================================================
// CUSTOM METRICS
// =============================================================================

// Response time trends by operation
const trends = {
  // Read operations
  partsList: new Trend('parts_list_duration'),
  partsSearch: new Trend('parts_search_duration'),
  partsDetail: new Trend('parts_detail_duration'),
  inventoryList: new Trend('inventory_list_duration'),
  inventoryLowStock: new Trend('inventory_low_stock_duration'),
  dashboardLoad: new Trend('dashboard_load_duration'),
  
  // Write operations
  partsCreate: new Trend('parts_create_duration'),
  partsUpdate: new Trend('parts_update_duration'),
  inventoryAdjust: new Trend('inventory_adjust_duration'),
  workOrderCreate: new Trend('work_order_create_duration'),
  
  // Complex operations
  mrpRun: new Trend('mrp_run_duration'),
  reportGenerate: new Trend('report_generate_duration'),
  bulkExport: new Trend('bulk_export_duration'),
};

// Error rates by category
const errorRates = {
  read: new Rate('read_errors'),
  write: new Rate('write_errors'),
  complex: new Rate('complex_errors'),
};

// Counters
const counters = {
  totalRequests: new Counter('total_requests'),
  successfulReads: new Counter('successful_reads'),
  successfulWrites: new Counter('successful_writes'),
  failedRequests: new Counter('failed_requests'),
};

// Gauges
const gauges = {
  activeVUs: new Gauge('active_vus'),
  dbResponseTime: new Gauge('db_response_time'),
};

// =============================================================================
// TEST OPTIONS
// =============================================================================

export const options = {
  scenarios: {
    // =======================================================================
    // SCENARIO 1: DATABASE CAPACITY TEST
    // Test how system handles queries with millions of records
    // =======================================================================
    database_capacity: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },   // Warm up
        { duration: '3m', target: 50 },   // Normal load
        { duration: '3m', target: 100 },  // Heavy load
        { duration: '3m', target: 150 },  // Stress load
        { duration: '2m', target: 200 },  // Peak load
        { duration: '2m', target: 50 },   // Recovery
        { duration: '1m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'database_capacity' },
      exec: 'databaseCapacityTest',
    },

    // =======================================================================
    // SCENARIO 2: CONCURRENT USERS TEST
    // Simulate hundreds of concurrent enterprise users
    // =======================================================================
    concurrent_users: {
      executor: 'constant-vus',
      vus: 200,
      duration: '10m',
      tags: { scenario: 'concurrent_users' },
      exec: 'concurrentUsersTest',
      startTime: '16m',
    },

    // =======================================================================
    // SCENARIO 3: WRITE HEAVY TEST
    // Test concurrent write operations
    // =======================================================================
    write_heavy: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 300,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '3m', target: 150 },
        { duration: '2m', target: 50 },
      ],
      tags: { scenario: 'write_heavy' },
      exec: 'writeHeavyTest',
      startTime: '27m',
    },

    // =======================================================================
    // SCENARIO 4: COMPLEX OPERATIONS TEST
    // MRP runs, reports, bulk exports
    // =======================================================================
    complex_operations: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 10,
      tags: { scenario: 'complex_operations' },
      exec: 'complexOperationsTest',
      startTime: '38m',
    },

    // =======================================================================
    // SCENARIO 5: SPIKE TEST
    // Sudden surge in traffic
    // =======================================================================
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '10s', target: 500 },  // SPIKE!
        { duration: '1m', target: 500 },   // Sustain spike
        { duration: '30s', target: 50 },   // Recovery
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeTest',
      startTime: '45m',
    },

    // =======================================================================
    // SCENARIO 6: ENDURANCE TEST
    // Long-running stability test
    // =======================================================================
    endurance: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30m',
      tags: { scenario: 'endurance' },
      exec: 'enduranceTest',
      startTime: '48m',
    },
  },

  // Thresholds
  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    
    // Read operations
    parts_list_duration: ['p(95)<500', 'p(99)<1000'],
    parts_search_duration: ['p(95)<800', 'p(99)<1500'],
    inventory_list_duration: ['p(95)<500', 'p(99)<1000'],
    dashboard_load_duration: ['p(95)<2000', 'p(99)<3000'],
    
    // Write operations
    parts_create_duration: ['p(95)<1000'],
    inventory_adjust_duration: ['p(95)<500'],
    work_order_create_duration: ['p(95)<1500'],
    
    // Complex operations
    mrp_run_duration: ['p(95)<30000'],
    report_generate_duration: ['p(95)<10000'],
    
    // Error rates
    read_errors: ['rate<0.05'],      // < 5%
    write_errors: ['rate<0.02'],     // < 2%
    complex_errors: ['rate<0.10'],   // < 10%
    
    // Throughput
    http_reqs: ['rate>100'],
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

function measureRequest(method, url, body, trend, errorRate, name) {
  const start = Date.now();
  counters.totalRequests.add(1);
  
  let res;
  const params = { headers: getHeaders(), tags: { name } };
  
  if (method === 'GET') {
    res = http.get(url, params);
  } else if (method === 'POST') {
    res = http.post(url, JSON.stringify(body), params);
  } else if (method === 'PUT') {
    res = http.put(url, JSON.stringify(body), params);
  } else if (method === 'DELETE') {
    res = http.del(url, null, params);
  }

  const duration = Date.now() - start;
  trend.add(duration);

  const success = check(res, {
    [`${name} status OK`]: (r) => r.status >= 200 && r.status < 400,
    [`${name} response time OK`]: () => duration < 5000,
  });

  if (!success) {
    errorRate.add(1);
    counters.failedRequests.add(1);
  } else {
    if (method === 'GET') {
      counters.successfulReads.add(1);
    } else {
      counters.successfulWrites.add(1);
    }
  }

  return { res, duration, success };
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

// Scenario 1: Database Capacity Test
export function databaseCapacityTest() {
  gauges.activeVUs.add(__VU);

  group('Parts Queries', () => {
    // List with pagination (testing index performance)
    const page = randomIntBetween(1, Math.ceil(TOTAL_PARTS / 50));
    measureRequest('GET', `${API_V1}/parts?page=${page}&pageSize=50`, null, 
      trends.partsList, errorRates.read, 'parts-paginated');
    sleep(0.5);

    // Search (testing full-text search)
    const searchTerms = ['bolt', 'nut', 'screw', 'washer', 'bearing', 'gear', 'motor', 'valve'];
    const term = randomItem(searchTerms);
    measureRequest('GET', `${API_V1}/parts?search=${term}&page=1&pageSize=20`, null,
      trends.partsSearch, errorRates.read, 'parts-search');
    sleep(0.5);

    // Filter by category
    const categories = ['COMPONENT', 'ASSEMBLY', 'RAW_MATERIAL', 'FINISHED_GOOD'];
    const category = randomItem(categories);
    measureRequest('GET', `${API_V1}/parts?category=${category}&page=1&pageSize=50`, null,
      trends.partsList, errorRates.read, 'parts-filtered');
    sleep(0.5);
  });

  group('Inventory Queries', () => {
    // List with filters
    measureRequest('GET', `${API_V1}/inventory?page=${randomIntBetween(1, 1000)}&pageSize=50`, null,
      trends.inventoryList, errorRates.read, 'inventory-paginated');
    sleep(0.5);

    // Low stock query (complex filter)
    measureRequest('GET', `${API_V1}/inventory?lowStock=true&page=1&pageSize=50`, null,
      trends.inventoryLowStock, errorRates.read, 'inventory-lowstock');
    sleep(0.5);
  });

  group('Dashboard', () => {
    // Dashboard aggregations
    measureRequest('GET', `${API_V1}/dashboard`, null,
      trends.dashboardLoad, errorRates.read, 'dashboard');
    sleep(1);
  });

  sleep(randomIntBetween(1, 3));
}

// Scenario 2: Concurrent Users Test
export function concurrentUsersTest() {
  // Simulate typical user session
  group('User Session', () => {
    // Login simulation
    sleep(1);

    // View dashboard
    measureRequest('GET', `${API_V1}/dashboard`, null,
      trends.dashboardLoad, errorRates.read, 'session-dashboard');
    sleep(2);

    // Browse parts (multiple pages)
    for (let i = 0; i < 3; i++) {
      measureRequest('GET', `${API_V1}/parts?page=${i + 1}&pageSize=20`, null,
        trends.partsList, errorRates.read, 'session-parts-browse');
      sleep(randomIntBetween(1, 3));
    }

    // Search
    measureRequest('GET', `${API_V1}/parts?search=test&page=1`, null,
      trends.partsSearch, errorRates.read, 'session-search');
    sleep(2);

    // Check inventory
    measureRequest('GET', `${API_V1}/inventory?page=1&pageSize=20`, null,
      trends.inventoryList, errorRates.read, 'session-inventory');
    sleep(2);

    // View production
    measureRequest('GET', `${API_V1}/production?page=1&pageSize=20`, null,
      trends.partsList, errorRates.read, 'session-production');
    sleep(randomIntBetween(2, 5));
  });
}

// Scenario 3: Write Heavy Test
export function writeHeavyTest() {
  const operation = randomIntBetween(1, 10);

  if (operation <= 4) {
    // Create new part (40%)
    const part = {
      partNumber: `TEST-${Date.now()}-${randomIntBetween(1, 99999)}`,
      partName: `Test Part ${Date.now()}`,
      category: randomItem(['COMPONENT', 'ASSEMBLY', 'RAW_MATERIAL']),
      unit: 'pcs',
      unitCost: randomIntBetween(10, 1000),
    };
    measureRequest('POST', `${API_V1}/parts`, part,
      trends.partsCreate, errorRates.write, 'create-part');
  } else if (operation <= 7) {
    // Inventory movement (30%) - use inventory transactions
    const movement = {
      partId: `part-${randomIntBetween(1, 1000)}`,
      quantity: randomIntBetween(1, 50),
      type: randomItem(['IN', 'OUT']),
      reason: 'Capacity test movement',
    };
    measureRequest('POST', `${API_V1}/inventory/movements`, movement,
      trends.inventoryAdjust, errorRates.write, 'inventory-movement');
  } else {
    // Create work order (30%)
    const workOrder = {
      productId: `product-${randomIntBetween(1, 100)}`,
      quantity: randomIntBetween(10, 100),
      priority: randomItem(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      dueDate: new Date(Date.now() + randomIntBetween(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
    };
    measureRequest('POST', `${API_V1}/production`, workOrder,
      trends.workOrderCreate, errorRates.write, 'create-workorder');
  }

  sleep(randomIntBetween(0.1, 0.5));
}

// Scenario 4: Complex Operations Test
export function complexOperationsTest() {
  group('MRP Run', () => {
    // Trigger MRP calculation (heavy database operation)
    // Uses /api/mrp/run
    measureRequest('POST', `${API_V1}/mrp/run`, { mode: 'full' },
      trends.mrpRun, errorRates.complex, 'mrp-run');
    sleep(5);
  });

  group('Report Generation', () => {
    // Generate inventory report via /api/v2/reports
    measureRequest('GET', `${API_V2}/reports?type=inventory&format=json`, null,
      trends.reportGenerate, errorRates.complex, 'report-inventory');
    sleep(3);
  });

  group('Bulk Export', () => {
    // Export via /api/export (v1 route)
    measureRequest('GET', `${API_V1}/export?entity=parts&format=csv&limit=10000`, null,
      trends.bulkExport, errorRates.complex, 'export-parts');
    sleep(5);
  });

  sleep(randomIntBetween(5, 10));
}

// Scenario 5: Spike Test
export function spikeTest() {
  // Rapid-fire requests during spike
  measureRequest('GET', `${API_V1}/dashboard`, null,
    trends.dashboardLoad, errorRates.read, 'spike-dashboard');
  measureRequest('GET', `${API_V1}/parts?page=1`, null,
    trends.partsList, errorRates.read, 'spike-parts');
  measureRequest('GET', `${API_V1}/inventory?page=1`, null,
    trends.inventoryList, errorRates.read, 'spike-inventory');
  
  sleep(0.1);
}

// Scenario 6: Endurance Test
export function enduranceTest() {
  // Mixed workload over long period
  const operation = randomIntBetween(1, 10);

  if (operation <= 5) {
    // Read operations (50%)
    measureRequest('GET', `${API_V1}/parts?page=${randomIntBetween(1, 100)}`, null,
      trends.partsList, errorRates.read, 'endurance-read');
  } else if (operation <= 8) {
    // Dashboard (30%)
    measureRequest('GET', `${API_V1}/dashboard`, null,
      trends.dashboardLoad, errorRates.read, 'endurance-dashboard');
  } else {
    // Search (20%)
    measureRequest('GET', `${API_V1}/parts?search=test`, null,
      trends.partsSearch, errorRates.read, 'endurance-search');
  }

  sleep(randomIntBetween(1, 5));
}

// =============================================================================
// DEFAULT FUNCTION
// =============================================================================

export default function() {
  databaseCapacityTest();
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  RTR-MRP ENTERPRISE CAPACITY TEST                             ║
╠════════════════════════════════════════════════════════════════╣
║  Target:       ${BASE_URL.padEnd(45)}║
║  Parts:        ${TOTAL_PARTS.toLocaleString().padEnd(45)}║
║  Inventory:    ${TOTAL_INVENTORY.toLocaleString().padEnd(45)}║
║  Work Orders:  ${TOTAL_WORK_ORDERS.toLocaleString().padEnd(45)}║
╚════════════════════════════════════════════════════════════════╝
`);

  // Health check
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    throw new Error('System health check failed');
  }

  console.log('✅ System health check passed');
  console.log('🚀 Starting capacity tests...\n');

  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n🏁 Capacity test completed in ${(duration / 60).toFixed(1)} minutes`);
}

// =============================================================================
// CUSTOM SUMMARY
// =============================================================================

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    'stdout': generateTextReport(data),
    [`enterprise/capacity-test/results/capacity-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`enterprise/capacity-test/results/capacity-${timestamp}.html`]: generateHTMLReport(data),
  };
}

function generateTextReport(data) {
  return `
╔════════════════════════════════════════════════════════════════════════════╗
║                    RTR-MRP ENTERPRISE CAPACITY TEST REPORT                 ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
────────────────────────────────────────────────────────────────────────────────
Total Requests:     ${data.metrics.http_reqs?.values?.count || 0}
Success Rate:       ${((1 - (data.metrics.http_req_failed?.values?.rate || 0)) * 100).toFixed(2)}%
Avg Response Time:  ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
P95 Response Time:  ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms
P99 Response Time:  ${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms

📈 OPERATION PERFORMANCE
────────────────────────────────────────────────────────────────────────────────
Parts List:         P95 = ${(data.metrics.parts_list_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
Parts Search:       P95 = ${(data.metrics.parts_search_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
Inventory List:     P95 = ${(data.metrics.inventory_list_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
Dashboard:          P95 = ${(data.metrics.dashboard_load_duration?.values?.['p(95)'] || 0).toFixed(0)}ms
MRP Run:            P95 = ${(data.metrics.mrp_run_duration?.values?.['p(95)'] || 0).toFixed(0)}ms

⚠️  ERROR RATES
────────────────────────────────────────────────────────────────────────────────
Read Errors:        ${((data.metrics.read_errors?.values?.rate || 0) * 100).toFixed(2)}%
Write Errors:       ${((data.metrics.write_errors?.values?.rate || 0) * 100).toFixed(2)}%
Complex Errors:     ${((data.metrics.complex_errors?.values?.rate || 0) * 100).toFixed(2)}%

✅ THRESHOLD RESULTS
────────────────────────────────────────────────────────────────────────────────
${Object.entries(data.thresholds || {}).map(([name, result]) => 
  `${result.ok ? '✓' : '✗'} ${name}: ${result.ok ? 'PASS' : 'FAIL'}`
).join('\n')}
`;
}

function generateHTMLReport(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>RTR-MRP Capacity Test Report</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1a365d; }
    .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .metric-name { font-weight: 500; }
    .metric-value { font-family: monospace; font-size: 18px; }
    .pass { color: #38a169; }
    .fail { color: #e53e3e; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
  </style>
</head>
<body>
  <h1>🏭 RTR-MRP Enterprise Capacity Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <div class="grid">
    <div class="card">
      <h3>📊 Summary</h3>
      <div class="metric">
        <span class="metric-name">Total Requests</span>
        <span class="metric-value">${(data.metrics.http_reqs?.values?.count || 0).toLocaleString()}</span>
      </div>
      <div class="metric">
        <span class="metric-name">Success Rate</span>
        <span class="metric-value">${((1 - (data.metrics.http_req_failed?.values?.rate || 0)) * 100).toFixed(2)}%</span>
      </div>
      <div class="metric">
        <span class="metric-name">P95 Response Time</span>
        <span class="metric-value">${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</span>
      </div>
    </div>
    
    <div class="card">
      <h3>⚡ Performance</h3>
      <div class="metric">
        <span class="metric-name">Parts List P95</span>
        <span class="metric-value">${(data.metrics.parts_list_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</span>
      </div>
      <div class="metric">
        <span class="metric-name">Parts Search P95</span>
        <span class="metric-value">${(data.metrics.parts_search_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</span>
      </div>
      <div class="metric">
        <span class="metric-name">Dashboard P95</span>
        <span class="metric-value">${(data.metrics.dashboard_load_duration?.values?.['p(95)'] || 0).toFixed(0)}ms</span>
      </div>
    </div>
  </div>
  
  <div class="card">
    <h3>✅ Threshold Results</h3>
    ${Object.entries(data.thresholds || {}).map(([name, result]) => `
      <div class="metric">
        <span class="metric-name">${name}</span>
        <span class="metric-value ${result.ok ? 'pass' : 'fail'}">${result.ok ? '✓ PASS' : '✗ FAIL'}</span>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}
