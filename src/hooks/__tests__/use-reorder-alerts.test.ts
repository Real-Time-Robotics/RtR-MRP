import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReorderAlerts } from '../use-reorder-alerts';

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockSummary = {
  critical: 3,
  low: 5,
  warning: 2,
  totalValue: 50000,
  items: [],
  suggestions: [
    { partId: 'p1', partNumber: 'PN-001', partName: 'Part 1', quantity: 100, supplier: null, unitCost: 10, totalCost: 1000, priority: 'URGENT' as const, reason: 'Critical stock' },
    { partId: 'p2', partNumber: 'PN-002', partName: 'Part 2', quantity: 50, supplier: null, unitCost: 20, totalCost: 1000, priority: 'HIGH' as const, reason: 'Low stock' },
  ],
  lastChecked: '2026-01-14T10:00:00Z',
};

describe('useReorderAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('should fetch summary on mount', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockSummary }),
    });

    const { result } = renderHook(() => useReorderAlerts({ autoRefresh: false }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.summary).toBeDefined();
    expect(result.current.totalAlerts).toBe(10);
    expect(result.current.hasCritical).toBe(true);
    expect(result.current.urgentSuggestions).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useReorderAlerts({ autoRefresh: false }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('should handle API error response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Permission denied' }),
    });

    const { result } = renderHook(() => useReorderAlerts({ autoRefresh: false }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.error).toBe('Permission denied');
  });

  it('should trigger check', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockSummary }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockSummary }),
      });

    const { result } = renderHook(() => useReorderAlerts({ autoRefresh: false }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.triggerCheck();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/alerts/reorder', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'check' }),
    }));
  });

  it('should return computed values when no summary', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: null }),
    });

    const { result } = renderHook(() => useReorderAlerts({ autoRefresh: false }));

    expect(result.current.totalAlerts).toBe(0);
    expect(result.current.hasCritical).toBe(false);
    expect(result.current.urgentSuggestions).toEqual([]);
  });
});
