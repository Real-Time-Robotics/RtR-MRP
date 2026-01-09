/**
 * System Health Test
 * Kiểm tra sức khỏe hệ thống RTR-MRP
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

describe('System Health Check', () => {
  describe('API Endpoints Availability', () => {
    const criticalEndpoints = [
      { path: '/api/v2/parts', method: 'GET' },
      { path: '/api/v2/inventory', method: 'GET' },
      { path: '/api/v2/orders', method: 'GET' },
      { path: '/api/v2/customers', method: 'GET' },
      { path: '/api/v2/suppliers', method: 'GET' },
      { path: '/api/v2/bom', method: 'GET' },
      { path: '/api/v2/work-orders', method: 'GET' },
      { path: '/api/v2/purchasing', method: 'GET' },
      { path: '/api/change-impact', method: 'POST' },
    ];

    criticalEndpoints.forEach(({ path, method }) => {
      it(`${method} ${path} should respond (not 5xx)`, async () => {
        const response = await fetch(`${BASE_URL}${path}`, {
          method: method === 'POST' ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          body: method === 'POST' ? JSON.stringify({
            entity: 'part',
            entityId: 'test',
            changes: [{
              field: 'test',
              fieldLabel: 'Test',
              oldValue: 1,
              newValue: 2,
              valueType: 'number'
            }]
          }) : undefined,
        });

        expect(response.status).not.toBe(500);
        expect(response.status).not.toBe(502);
        expect(response.status).not.toBe(503);
      });
    });
  });

  describe('Database Connectivity', () => {
    it('should connect to database via Parts API (or require auth/rate limit)', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/parts?pageSize=1`);
      const data = await response.json();

      // API should either succeed, require auth, or be rate limited (not server error)
      if (response.ok) {
        expect(data.success).toBe(true);
      } else {
        // 401/403 means auth required, 429 means rate limited - both indicate API is up
        expect([401, 403, 429]).toContain(response.status);
      }
    });

    it('should connect to database via Customers API (or require auth/rate limit)', async () => {
      const response = await fetch(`${BASE_URL}/api/v2/customers?pageSize=1`);
      const data = await response.json();

      // API should either succeed, require auth, or be rate limited (not server error)
      if (response.ok) {
        expect(data.success).toBe(true);
      } else {
        // 401/403 means auth required, 429 means rate limited - both indicate API is up
        expect([401, 403, 429]).toContain(response.status);
      }
    });
  });

  describe('Response Time', () => {
    it('Parts API should respond within 2 seconds', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/v2/parts?pageSize=10`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it('Inventory API should respond within 2 seconds', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/v2/inventory?pageSize=10`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });

    it('Orders API should respond within 2 seconds', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/v2/orders?pageSize=10`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
