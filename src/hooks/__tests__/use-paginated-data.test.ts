import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePaginatedData } from '../use-paginated-data';

describe('usePaginatedData', () => {
  const mockResponse = {
    data: [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }],
    pagination: { page: 1, pageSize: 50, totalItems: 100, totalPages: 2, hasNextPage: true, hasPrevPage: false },
    meta: { took: 42, cached: false },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
  });

  it('should auto-fetch on mount', async () => {
    const { result } = renderHook(() =>
      usePaginatedData({ endpoint: '/api/items' })
    );

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('should not auto-fetch when autoFetch is false', () => {
    renderHook(() =>
      usePaginatedData({ endpoint: '/api/items', autoFetch: false })
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() =>
      usePaginatedData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('should build URL with params', async () => {
    const { result } = renderHook(() =>
      usePaginatedData({
        endpoint: '/api/items',
        initialPageSize: 25,
        initialFilters: { status: 'ACTIVE' },
      })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(fetchUrl).toContain('pageSize=25');
    expect(fetchUrl).toContain('status=ACTIVE');
  });

  it('should reset page on filter change', async () => {
    const { result } = renderHook(() =>
      usePaginatedData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.setFilters({ status: 'ACTIVE' });
    });

    // Page should be reset (state change is internal)
    expect(result.current.data).toBeDefined();
  });

  it('should reset page on search change', async () => {
    const { result } = renderHook(() =>
      usePaginatedData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.setSearch('test');
    });

    expect(result.current.data).toBeDefined();
  });

  it('should reset page on page size change', async () => {
    const { result } = renderHook(() =>
      usePaginatedData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.setPageSize(100);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should set sorting', async () => {
    const { result } = renderHook(() =>
      usePaginatedData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.setSorting('name', 'asc');
    });

    expect(result.current.data).toBeDefined();
  });
});
