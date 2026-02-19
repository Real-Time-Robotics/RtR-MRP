/**
 * Dashboard Stats API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../dashboard/stats/route';
import { dataService } from '@/lib/data/data-service';
import { auth } from '@/lib/auth';

// Mock the data service
vi.mock('@/lib/data/data-service', () => ({
  dataService: {
    getDashboardStats: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
}));

describe('Dashboard Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard stats successfully', async () => {
      const mockStats = {
        revenue: {
          current: 1500000,
          previous: 1200000,
          growth: 25,
          currency: 'VND',
        },
        orders: {
          total: 150,
          pending: 25,
          processing: 30,
          completed: 90,
          cancelled: 5,
          growth: 10,
        },
        inventory: {
          totalItems: 500,
          totalValue: 2500000,
          lowStock: 15,
          outOfStock: 3,
          healthy: 482,
        },
        production: {
          efficiency: 85,
          running: 25,
          waiting: 10,
          completed: 100,
          onHold: 5,
        },
        quality: {
          passRate: 98,
          openNCRs: 5,
          inspectionsToday: 20,
          criticalNCRs: 1,
        },
        purchasing: {
          pendingPOs: 12,
          pendingValue: 500000,
          overdueDeliveries: 2,
        },
      };

      vi.mocked(dataService.getDashboardStats).mockResolvedValue(mockStats as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
      const mockContext = { params: Promise.resolve({}) };
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(data.timestamp).toBeDefined();
    });

    it('should return 500 when data service throws error', async () => {
      vi.mocked(dataService.getDashboardStats).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
      const mockContext = { params: Promise.resolve({}) };
      const response = await GET(request, mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch dashboard stats');
    });
  });
});
