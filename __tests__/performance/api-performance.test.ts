/**
 * API Performance Tests
 * Test hiệu năng của các API endpoints
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

describe('API Performance', () => {
  const endpoints = [
    { path: '/api/v2/parts', maxTime: 1000 },
    { path: '/api/v2/inventory', maxTime: 1000 },
    { path: '/api/v2/orders', maxTime: 1000 },
    { path: '/api/v2/customers', maxTime: 500 },
    { path: '/api/v2/suppliers', maxTime: 500 },
    { path: '/api/v2/bom', maxTime: 1000 },
    { path: '/api/v2/work-orders', maxTime: 1000 },
    { path: '/api/v2/purchasing', maxTime: 1000 },
  ];

  describe('Response Time', () => {
    endpoints.forEach(({ path, maxTime }) => {
      it(`${path} should respond within ${maxTime}ms`, async () => {
        const start = Date.now();
        await fetch(`${BASE_URL}${path}?pageSize=20`);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(maxTime);
      });
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle 100 items request (or require auth)', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/api/v2/parts?pageSize=100`);
      const duration = Date.now() - start;

      // Response should be quick regardless of auth status
      expect([200, 401, 403, 429]).toContain(response.status);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle 10 concurrent requests (or require auth)', async () => {
      const requests = Array(10).fill(null).map(() =>
        fetch(`${BASE_URL}/api/v2/parts?pageSize=10`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All responses should be valid (success or auth required)
      expect(responses.every(r => [200, 401, 403, 429].includes(r.status))).toBe(true);
      expect(duration).toBeLessThan(5000);
    });

    it('should handle mixed endpoint concurrent requests (or require auth)', async () => {
      const requests = [
        fetch(`${BASE_URL}/api/v2/parts?pageSize=10`),
        fetch(`${BASE_URL}/api/v2/inventory?pageSize=10`),
        fetch(`${BASE_URL}/api/v2/orders?pageSize=10`),
        fetch(`${BASE_URL}/api/v2/customers?pageSize=10`),
        fetch(`${BASE_URL}/api/v2/suppliers?pageSize=10`),
      ];

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      // All responses should be valid (success or auth required)
      expect(responses.every(r => [200, 401, 403, 429].includes(r.status))).toBe(true);
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Pagination Performance', () => {
    it('should handle pagination efficiently', async () => {
      const pages = [1, 2, 3];
      const times: number[] = [];

      for (const page of pages) {
        const start = Date.now();
        await fetch(`${BASE_URL}/api/v2/parts?page=${page}&pageSize=20`);
        times.push(Date.now() - start);
      }

      // All pages should respond within reasonable time (allow variation due to auth/rate limiting)
      times.forEach(time => {
        expect(time).toBeLessThan(2000); // Each page should respond within 2s
      });
    });
  });

  describe('Search Performance', () => {
    it('should search quickly', async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/api/v2/parts?search=test`);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1500);
    });
  });
});
