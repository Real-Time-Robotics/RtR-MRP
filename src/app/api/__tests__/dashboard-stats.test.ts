/**
 * Dashboard Stats API Route Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../dashboard/stats/route';
import { dataService } from '@/lib/data/data-service';

// Mock the data service
vi.mock('@/lib/data/data-service', () => ({
  dataService: {
    getDashboardStats: vi.fn(),
  },
}));

describe('Dashboard Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard stats successfully', async () => {
      const mockStats = {
        totalOrders: 150,
        totalRevenue: 1500000,
        openWorkOrders: 25,
        pendingPurchaseOrders: 12,
        inventoryValue: 2500000,
        openNCRs: 5,
      };

      vi.mocked(dataService.getDashboardStats).mockResolvedValue(mockStats as any);

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
      expect(data.timestamp).toBeDefined();
    });

    it('should return 500 when data service throws error', async () => {
      vi.mocked(dataService.getDashboardStats).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/dashboard/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch dashboard stats');
    });
  });
});
