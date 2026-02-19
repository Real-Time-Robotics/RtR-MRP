/**
 * Quality API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../quality/route';
import { getQualityDashboardStats } from '@/lib/quality/quality-metrics';

// Mock dependencies
vi.mock('@/lib/quality/quality-metrics', () => ({
  getQualityDashboardStats: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    logError: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({
  default: vi.fn(),
}));

const { auth } = await vi.hoisted(async () => {
  return { auth: vi.fn() };
});

vi.mock('@/lib/auth', () => ({
  auth,
}));

const mockCtx = { params: Promise.resolve({}) } as never;

describe('Quality API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: 'u1', name: 'Test', email: 'test@test.com', role: 'admin' } });
  });

  // ===========================================================================
  // GET /api/quality
  // ===========================================================================
  describe('GET /api/quality', () => {
    it('should return quality dashboard stats successfully', async () => {
      const mockStats = {
        pendingReceiving: 5,
        pendingInProcess: 3,
        pendingFinal: 2,
        totalPending: 10,
        openNCRs: 4,
        openCAPAs: 1,
        firstPassYield: 95.5,
      };

      (getQualityDashboardStats as Mock).mockResolvedValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/quality');
      const response = await GET(request, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockStats);
      expect(getQualityDashboardStats).toHaveBeenCalledTimes(1);
    });

    it('should return correct pending counts breakdown', async () => {
      const mockStats = {
        pendingReceiving: 12,
        pendingInProcess: 7,
        pendingFinal: 3,
        totalPending: 22,
        openNCRs: 0,
        openCAPAs: 0,
        firstPassYield: 100,
      };

      (getQualityDashboardStats as Mock).mockResolvedValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/quality');
      const response = await GET(request, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pendingReceiving).toBe(12);
      expect(data.pendingInProcess).toBe(7);
      expect(data.pendingFinal).toBe(3);
      expect(data.totalPending).toBe(22);
    });

    it('should return zero values when no quality data exists', async () => {
      const mockStats = {
        pendingReceiving: 0,
        pendingInProcess: 0,
        pendingFinal: 0,
        totalPending: 0,
        openNCRs: 0,
        openCAPAs: 0,
        firstPassYield: 100,
      };

      (getQualityDashboardStats as Mock).mockResolvedValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/quality');
      const response = await GET(request, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalPending).toBe(0);
      expect(data.openNCRs).toBe(0);
      expect(data.openCAPAs).toBe(0);
      expect(data.firstPassYield).toBe(100);
    });

    it('should return 500 when getQualityDashboardStats throws an error', async () => {
      (getQualityDashboardStats as Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/quality');
      const response = await GET(request, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch quality stats');
    });

    it('should return 500 when an unexpected error occurs', async () => {
      (getQualityDashboardStats as Mock).mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost:3000/api/quality');
      const response = await GET(request, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch quality stats');
    });
  });
});
