import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useSalesOrdersForMRP,
  useMRPCalculation,
  useInventoryData,
  formatCurrency,
  formatDate,
  getPriorityLabel,
  getStatusLabel,
} from '../use-mrp-data';

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('formatCurrency', () => {
  it('formats values >= 1 billion with "ty"', () => {
    const result = formatCurrency(1000000000);
    expect(result).toContain('1.00');
    expect(result).toContain('t');
    const result2 = formatCurrency(2500000000);
    expect(result2).toContain('2.50');
  });

  it('formats values >= 1 million with "trieu"', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.0');
    const result2 = formatCurrency(15500000);
    expect(result2).toContain('15.5');
  });

  it('formats values < 1 million with vi-VN locale', () => {
    const result = formatCurrency(500000);
    // vi-VN locale uses dot separator
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toBeTruthy();
  });
});

describe('formatDate', () => {
  it('formats date string to vi-VN format', () => {
    const result = formatDate('2025-01-15');
    // vi-VN format: dd/mm/yyyy
    expect(result).toContain('15');
    expect(result).toContain('01');
    expect(result).toContain('2025');
  });

  it('formats another date correctly', () => {
    const result = formatDate('2025-12-25');
    expect(result).toContain('25');
    expect(result).toContain('12');
    expect(result).toContain('2025');
  });
});

describe('getPriorityLabel', () => {
  it('returns Vietnamese label for URGENT', () => {
    expect(getPriorityLabel('URGENT')).toBe('Kh\u1EA9n c\u1EA5p');
  });

  it('returns Vietnamese label for HIGH', () => {
    expect(getPriorityLabel('HIGH')).toBe('Cao');
  });

  it('returns Vietnamese label for NORMAL', () => {
    expect(getPriorityLabel('NORMAL')).toBe('B\u00ECnh th\u01B0\u1EDDng');
  });

  it('returns the input for unknown priority', () => {
    expect(getPriorityLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('getStatusLabel', () => {
  it('returns Vietnamese label for CRITICAL', () => {
    expect(getStatusLabel('CRITICAL')).toBe('Thi\u1EBFu nghi\u00EAm tr\u1ECDng');
  });

  it('returns Vietnamese label for LOW', () => {
    expect(getStatusLabel('LOW')).toBe('S\u1EAFp h\u1EBFt');
  });

  it('returns Vietnamese label for OK', () => {
    expect(getStatusLabel('OK')).toBe('\u0110\u1EE7 h\u00E0ng');
  });

  it('returns the input for unknown status', () => {
    expect(getStatusLabel('RANDOM')).toBe('RANDOM');
  });
});

// =============================================================================
// HOOK TESTS
// =============================================================================

describe('useSalesOrdersForMRP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with loading state', () => {
    const { result } = renderHook(() => useSalesOrdersForMRP());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.orders).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('loads mock sales orders after delay', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSalesOrdersForMRP());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.orders.length).toBe(3);
    expect(result.current.orders[0].orderNumber).toBe('SO-2025-001');
    expect(result.current.orders[1].orderNumber).toBe('SO-2025-002');
    expect(result.current.orders[2].orderNumber).toBe('SO-2025-003');
    expect(result.current.error).toBeNull();
  });

  it('provides a refetch function', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useSalesOrdersForMRP());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useInventoryData', () => {
  it('starts with loading state', () => {
    const { result } = renderHook(() => useInventoryData());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.inventory).toEqual([]);
  });

  it('loads mock inventory after delay', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useInventoryData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.inventory.length).toBe(6);
    expect(result.current.inventory[0].partNumber).toBe('CMP-BRG-002');
  });
});

describe('useMRPCalculation', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it('starts with initial state', () => {
    const { result } = renderHook(() => useMRPCalculation());

    expect(result.current.result).toBeNull();
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('handles direct result (no background job)', async () => {
    const mockResult = {
      runId: 'MRP_123',
      runDate: '2025-01-01',
      salesOrders: ['SO-001'],
      totalRequirements: 1,
      criticalItems: 0,
      lowItems: 0,
      okItems: 1,
      totalPurchaseValue: 0,
      requirements: [],
      suggestions: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockResult }),
    });

    const { result } = renderHook(() => useMRPCalculation());

    let returnedResult: unknown;
    await act(async () => {
      returnedResult = await result.current.runMRP(['1']);
    });

    expect(returnedResult).toEqual(mockResult);
    expect(result.current.result).toEqual(mockResult);
    expect(result.current.isCalculating).toBe(false);
  });

  it('handles API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useMRPCalculation());

    await act(async () => {
      await expect(result.current.runMRP(['1'])).rejects.toThrow('Server error');
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.isCalculating).toBe(false);
  });

  it('handles unexpected response format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // no backgroundJobId and no data
    });

    const { result } = renderHook(() => useMRPCalculation());

    await act(async () => {
      await expect(result.current.runMRP(['1'])).rejects.toThrow('Unexpected response format');
    });

    expect(result.current.error).toBe('Unexpected response format');
  });

  it('handles network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useMRPCalculation());

    await act(async () => {
      await expect(result.current.runMRP(['1'])).rejects.toThrow('Network failure');
    });

    expect(result.current.error).toBe('Network failure');
  });

  it('polls background job until completed', async () => {
    const mockMRPResult = {
      runId: 'MRP_456',
      runDate: '2025-01-01',
      salesOrders: ['SO-001'],
      totalRequirements: 2,
      criticalItems: 1,
      lowItems: 0,
      okItems: 1,
      totalPurchaseValue: 100000,
      requirements: [],
      suggestions: [],
    };

    // First call: submit returns backgroundJobId
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backgroundJobId: 'job-123' }),
    });

    // Second call: job status - processing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'processing', progress: 50 }),
    });

    // Third call: job status - completed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed', progress: 100, result: mockMRPResult }),
    });

    vi.useFakeTimers();
    const { result } = renderHook(() => useMRPCalculation());

    let runPromise: Promise<unknown>;
    act(() => {
      runPromise = result.current.runMRP(['1']);
    });

    // Advance past first poll delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Advance past second poll delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    const runResult = await runPromise!;
    expect(runResult).toEqual(mockMRPResult);
    expect(result.current.result).toEqual(mockMRPResult);

    vi.useRealTimers();
  });

  it('handles background job failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backgroundJobId: 'job-fail' }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'failed', error: 'Calculation error' }),
    });

    vi.useFakeTimers();
    const { result } = renderHook(() => useMRPCalculation());

    // Start runMRP and immediately attach a catch handler to prevent unhandled rejection
    let caughtError: Error | null = null;
    let runPromise: Promise<unknown>;

    act(() => {
      runPromise = result.current.runMRP(['1']).catch((err: Error) => {
        caughtError = err;
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await act(async () => {
      await runPromise;
    });

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe('Calculation error');
    expect(result.current.error).toBe('Calculation error');

    vi.useRealTimers();
  });

  it('resets state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { runId: 'test' } }),
    });

    const { result } = renderHook(() => useMRPCalculation());

    await act(async () => {
      await result.current.runMRP(['1']);
    });

    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBe(0);
  });
});
