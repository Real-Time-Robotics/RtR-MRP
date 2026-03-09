import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInventoryData, useInventoryItem } from '../use-inventory-data';

const mockInventory = {
  data: [
    { id: 'inv-1', partId: 'p1', partNumber: 'PN-001', partName: 'Part 1', quantity: 100, reservedQuantity: 10, availableQuantity: 90, reorderPoint: 50, unitCost: 25, warehouseId: 'w1', warehouseName: 'Main', lastUpdated: '2026-01-14' },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

vi.mock('swr', () => ({
  default: vi.fn((key: string | null) => {
    if (!key) return { data: null, error: null, isLoading: false, mutate: vi.fn() };
    if (key.includes('/api/inventory/inv-1')) {
      return { data: { data: mockInventory.data[0] }, error: null, isLoading: false, mutate: vi.fn() };
    }
    return { data: mockInventory, error: null, isLoading: false, mutate: vi.fn() };
  }),
}));

describe('useInventoryData', () => {
  it('should return inventory items', () => {
    const { result } = renderHook(() => useInventoryData());

    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('should pass search params', () => {
    const { result } = renderHook(() =>
      useInventoryData({ search: 'test', page: 2, pageSize: 50 })
    );

    expect(result.current.items).toBeDefined();
  });

  it('should pass warehouse filter', () => {
    const { result } = renderHook(() =>
      useInventoryData({ warehouseId: 'w1' })
    );

    expect(result.current.items).toBeDefined();
  });

  it('should pass lowStockOnly filter', () => {
    const { result } = renderHook(() =>
      useInventoryData({ lowStockOnly: true })
    );

    expect(result.current.items).toBeDefined();
  });
});

describe('useInventoryItem', () => {
  it('should return single item', () => {
    const { result } = renderHook(() => useInventoryItem('inv-1'));

    expect(result.current.item).toBeDefined();
    expect(result.current.item?.partNumber).toBe('PN-001');
  });

  it('should return null for null id', () => {
    const { result } = renderHook(() => useInventoryItem(null));

    expect(result.current.item).toBeNull();
  });
});
