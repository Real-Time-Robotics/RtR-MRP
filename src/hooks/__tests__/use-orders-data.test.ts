import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrdersData, useOrderDetail } from '../use-orders-data';

const mockOrders = {
  data: [
    { id: 'so-1', orderNumber: 'SO-001', customerName: 'Acme Corp', status: 'CONFIRMED', totalAmount: 10000, currency: 'USD', orderDate: '2026-01-14', dueDate: '2026-02-14', itemCount: 3 },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

vi.mock('swr', () => ({
  default: vi.fn((key: string | null) => {
    if (!key) return { data: null, error: null, isLoading: false, mutate: vi.fn() };
    if (key.includes('/api/sales-orders/so-1')) {
      return { data: { data: mockOrders.data[0] }, error: null, isLoading: false, mutate: vi.fn() };
    }
    return { data: mockOrders, error: null, isLoading: false, mutate: vi.fn() };
  }),
}));

describe('useOrdersData', () => {
  it('should return orders list', () => {
    const { result } = renderHook(() => useOrdersData());

    expect(result.current.orders).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass pagination params', () => {
    const { result } = renderHook(() =>
      useOrdersData({ page: 2, pageSize: 50 })
    );
    expect(result.current.orders).toBeDefined();
  });

  it('should pass search and status', () => {
    const { result } = renderHook(() =>
      useOrdersData({ search: 'Acme', status: 'CONFIRMED' })
    );
    expect(result.current.orders).toBeDefined();
  });

  it('should pass sorting params', () => {
    const { result } = renderHook(() =>
      useOrdersData({ sortBy: 'orderDate', sortOrder: 'desc' })
    );
    expect(result.current.orders).toBeDefined();
  });
});

describe('useOrderDetail', () => {
  it('should return single order', () => {
    const { result } = renderHook(() => useOrderDetail('so-1'));

    expect(result.current.order).toBeDefined();
    expect(result.current.order?.orderNumber).toBe('SO-001');
  });

  it('should return null for null id', () => {
    const { result } = renderHook(() => useOrderDetail(null));
    expect(result.current.order).toBeNull();
  });
});
