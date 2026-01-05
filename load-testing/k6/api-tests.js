// =============================================================================
// RTR-MRP - K6 API ENDPOINT TESTS
// Individual endpoint performance tests
// Run: k6 run load-tests/k6/api-tests.js
// =============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`; // RTR-MRP uses /api without version prefix

// =============================================================================
// METRICS
// =============================================================================

const errorRate = new Rate('errors');
const trends = {
  health: new Trend('health_duration'),
  parts: new Trend('parts_duration'),
  partsDetail: new Trend('parts_detail_duration'),
  partsSearch: new Trend('parts_search_duration'),
  inventory: new Trend('inventory_duration'),
  production: new Trend('production_duration'),
  productionCreate: new Trend('production_create_duration'),
  sales: new Trend('sales_duration'),
  dashboard: new Trend('dashboard_duration'),
  mrp: new Trend('mrp_duration'),
};

// =============================================================================
// OPTIONS
// =============================================================================

export const options = {
  scenarios: {
    // Per-endpoint tests
    api_tests: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 50,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.1'],
    health_duration: ['p(95)<100'],
    parts_duration: ['p(95)<300'],
    parts_search_duration: ['p(95)<500'],
    inventory_duration: ['p(95)<300'],
    production_duration: ['p(95)<500'],
    dashboard_duration: ['p(95)<1000'],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function makeRequest(method, url, body, trend, name) {
  const start = Date.now();
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name },
  };
  
  let res;
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
    [`${name} status ok`]: (r) => r.status >= 200 && r.status < 400,
    [`${name} response time ok`]: () => duration < 1000,
  });
  
  errorRate.add(!success);
  
  return { res, duration, success };
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

export default function() {
  // -------------------------------------------------------------------------
  // HEALTH CHECK
  // -------------------------------------------------------------------------
  group('Health Endpoints', function() {
    makeRequest('GET', `${BASE_URL}/api/health`, null, trends.health, 'health-basic');
    makeRequest('GET', `${BASE_URL}/api/health/live`, null, trends.health, 'health-live');
    makeRequest('GET', `${BASE_URL}/api/health/ready`, null, trends.health, 'health-ready');
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // PARTS API
  // -------------------------------------------------------------------------
  group('Parts API', function() {
    // List parts
    makeRequest('GET', `${API_URL}/parts?page=1&limit=20`, null, trends.parts, 'parts-list');
    sleep(0.3);

    // Paginate
    makeRequest('GET', `${API_URL}/parts?page=2&limit=20`, null, trends.parts, 'parts-page2');
    sleep(0.3);

    // Search
    makeRequest('GET', `${API_URL}/parts?search=component`, null, trends.partsSearch, 'parts-search');
    sleep(0.3);

    // Filter by category
    makeRequest('GET', `${API_URL}/parts?category=Component`, null, trends.parts, 'parts-filter-category');
    sleep(0.3);

    // Combined filters
    makeRequest('GET', `${API_URL}/parts?category=Component&search=bolt&page=1`, null, trends.partsSearch, 'parts-combined');
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // INVENTORY API
  // -------------------------------------------------------------------------
  group('Inventory API', function() {
    // List inventory
    makeRequest('GET', `${API_URL}/inventory`, null, trends.inventory, 'inventory-list');
    sleep(0.3);

    // Low stock (critical status)
    makeRequest('GET', `${API_URL}/inventory?status=critical`, null, trends.inventory, 'inventory-lowstock');
    sleep(0.3);

    // By warehouse
    makeRequest('GET', `${API_URL}/inventory?warehouseId=wh-01`, null, trends.inventory, 'inventory-warehouse');
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // PRODUCTION API
  // -------------------------------------------------------------------------
  group('Production API', function() {
    // List work orders
    makeRequest('GET', `${API_URL}/production/work-orders?page=1&limit=20`, null, trends.production, 'production-list');
    sleep(0.3);

    // Filter by status
    makeRequest('GET', `${API_URL}/production/work-orders?status=in_progress`, null, trends.production, 'production-inprogress');
    sleep(0.3);

    makeRequest('GET', `${API_URL}/production/work-orders?status=completed`, null, trends.production, 'production-completed');
    sleep(0.3);

    // All work orders
    makeRequest('GET', `${API_URL}/production/work-orders`, null, trends.production, 'production-all');
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // SALES API
  // -------------------------------------------------------------------------
  group('Sales API', function() {
    // List sales orders
    makeRequest('GET', `${API_URL}/sales-orders?page=1&limit=20`, null, trends.sales, 'sales-list');
    sleep(0.3);

    // Filter by status
    makeRequest('GET', `${API_URL}/sales-orders?status=confirmed`, null, trends.sales, 'sales-confirmed');
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // DASHBOARD API
  // -------------------------------------------------------------------------
  group('Dashboard API', function() {
    // Main dashboard/home
    makeRequest('GET', `${API_URL}/home`, null, trends.dashboard, 'dashboard-main');
    sleep(0.3);

    // Analytics
    makeRequest('GET', `${API_URL}/analytics/dashboard`, null, trends.dashboard, 'analytics');
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // OTHER APIs
  // -------------------------------------------------------------------------
  group('Other APIs', function() {
    // Suppliers
    makeRequest('GET', `${API_URL}/suppliers`, null, trends.dashboard, 'suppliers-list');
    sleep(0.3);

    // Customers
    makeRequest('GET', `${API_URL}/customers`, null, trends.dashboard, 'customers-list');
    sleep(0.3);

    // Purchase Orders
    makeRequest('GET', `${API_URL}/purchase-orders?page=1&limit=10`, null, trends.dashboard, 'purchase-orders');
    sleep(0.5);
  });

  sleep(1);
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

export function setup() {
  console.log('🧪 Starting API Endpoint Tests');
  console.log(`📍 Testing: ${BASE_URL}`);
  
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    throw new Error('Health check failed');
  }
  
  return {};
}

export function teardown(data) {
  console.log('✅ API Endpoint Tests completed');
}
