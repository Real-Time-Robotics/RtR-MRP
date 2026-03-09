import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteData } from '../use-infinite-data';

describe('useInfiniteData', () => {
  const mockResponse = {
    data: [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }],
    pagination: { hasMore: true, nextCursor: 'cursor-2', totalCount: 100 },
  };

  const mockPage2 = {
    data: [{ id: '3', name: 'Item 3' }],
    pagination: { hasMore: false, nextCursor: null, totalCount: 100 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });
  });

  it('should fetch initial data on mount', async () => {
    const { result } = renderHook(() =>
      useInfiniteData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalLoaded).toBe(2);
    expect(result.current.loading).toBe(false);
  });

  it('should not fetch when autoFetch is false', () => {
    renderHook(() =>
      useInfiniteData({ endpoint: '/api/items', autoFetch: false })
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should load more data', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPage2),
      });

    const { result } = renderHook(() =>
      useInfiniteData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.data).toHaveLength(2);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      useInfiniteData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.error).toBeDefined();
  });

  it('should reset on filter change', async () => {
    const { result } = renderHook(() =>
      useInfiniteData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.setFilters({ category: 'COMPONENT' });
    });

    // Data should be cleared for new filter
    expect(result.current.data).toEqual([]);
    expect(result.current.hasMore).toBe(true);
  });

  it('should reset on search change', async () => {
    const { result } = renderHook(() =>
      useInfiniteData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.setSearch('test');
    });

    expect(result.current.data).toEqual([]);
  });

  it('should refresh data', async () => {
    const { result } = renderHook(() =>
      useInfiniteData({ endpoint: '/api/items' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2); // initial + refresh
  });

  it('should build URL with filters', async () => {
    renderHook(() =>
      useInfiniteData({
        endpoint: '/api/items',
        pageSize: 25,
        initialFilters: { status: 'ACTIVE' },
      })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toContain('pageSize=25');
    expect(url).toContain('status=ACTIVE');
  });
});
