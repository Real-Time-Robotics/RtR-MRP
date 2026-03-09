import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardData, useDashboardDetail } from '../use-dashboard-data';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn((key: string) => {
    if (key === '/api/dashboard') {
      return {
        data: {
          salesOrders: { total: 100, pending: 10 },
          inventory: { total: 500, lowStock: 5 },
          production: { total: 50, inProgress: 15 },
          quality: { total: 20, pending: 3 },
        },
        error: null,
        isLoading: false,
        mutate: vi.fn(),
      };
    }
    if (key === '/api/dashboard/detail') {
      return {
        data: {
          pendingOrders: 10,
          pendingOrdersValue: 50000,
          criticalStock: 5,
          activePOs: 8,
          activePOsValue: 30000,
          reorderAlerts: 3,
        },
        error: null,
        isLoading: false,
        mutate: vi.fn(),
      };
    }
    return { data: null, error: null, isLoading: true, mutate: vi.fn() };
  }),
}));

describe('useDashboardData', () => {
  it('should return dashboard stats', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats?.salesOrders.total).toBe(100);
    expect(result.current.stats?.inventory.lowStock).toBe(5);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(typeof result.current.refresh).toBe('function');
  });
});

describe('useDashboardDetail', () => {
  it('should return dashboard detail', () => {
    const { result } = renderHook(() => useDashboardDetail());

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.pendingOrders).toBe(10);
    expect(result.current.data?.criticalStock).toBe(5);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
