import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedViews } from '../use-saved-views';

describe('useSavedViews', () => {
  const mockViews = [
    {
      id: 'v1', name: 'Default View', entityType: 'parts',
      filters: {}, sort: null, columns: null,
      isDefault: true, isShared: false, userId: 'u1',
      createdAt: '2026-01-01', updatedAt: '2026-01-01',
    },
    {
      id: 'v2', name: 'Custom View', entityType: 'parts',
      filters: { status: 'ACTIVE' }, sort: null, columns: null,
      isDefault: false, isShared: false, userId: 'u1',
      createdAt: '2026-01-02', updatedAt: '2026-01-02',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('should fetch views on mount', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockViews }),
    });

    const { result } = renderHook(() =>
      useSavedViews({ entityType: 'parts' })
    );

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.views).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('should auto-apply default view', async () => {
    const onApplyView = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockViews }),
    });

    const { result } = renderHook(() =>
      useSavedViews({ entityType: 'parts', onApplyView })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(onApplyView).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    expect(result.current.currentView?.id).toBe('v1');
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useSavedViews({ entityType: 'parts' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('should apply a view', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    const onApplyView = vi.fn();
    const { result } = renderHook(() =>
      useSavedViews({ entityType: 'parts', onApplyView })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    act(() => {
      result.current.applyView(mockViews[1] as any);
    });

    expect(result.current.currentView?.id).toBe('v2');
    expect(onApplyView).toHaveBeenCalledWith(expect.objectContaining({ id: 'v2' }));
  });

  it('should save a new view', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { id: 'v3', name: 'New View' } }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

    const { result } = renderHook(() =>
      useSavedViews({ entityType: 'parts' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    let saved: any;
    await act(async () => {
      saved = await result.current.saveCurrentView('New View', { filters: { x: '1' } });
    });

    expect(saved).toEqual(expect.objectContaining({ id: 'v3' }));
  });

  it('should delete a view', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockViews }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [mockViews[1]] }),
      });

    const { result } = renderHook(() =>
      useSavedViews({ entityType: 'parts' })
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    let deleted: boolean = false;
    await act(async () => {
      deleted = await result.current.deleteView('v1');
    });

    expect(deleted).toBe(true);
  });
});
