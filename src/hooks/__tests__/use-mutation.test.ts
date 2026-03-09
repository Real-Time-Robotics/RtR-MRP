import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMutation } from '../use-mutation';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('swr', () => ({
  mutate: vi.fn(),
  default: vi.fn(),
}));

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useMutation({ url: '/api/test' })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should make POST request by default', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: '1' } }),
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useMutation({
        url: '/api/test',
        onSuccess,
        successMessage: 'Created!',
      })
    );

    await act(async () => {
      await result.current.mutate({ name: 'test' });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(onSuccess).toHaveBeenCalledWith({ id: '1' });
    expect(result.current.isLoading).toBe(false);
  });

  it('should use specified HTTP method', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });

    const { result } = renderHook(() =>
      useMutation({ url: '/api/test/1', method: 'DELETE' })
    );

    await act(async () => {
      await result.current.mutate();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/test/1', {
      method: 'DELETE',
      headers: undefined,
      body: undefined,
    });
  });

  it('should handle server error response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Not found' }),
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useMutation({ url: '/api/test', onError })
    );

    await act(async () => {
      await result.current.mutate({ name: 'test' });
    });

    expect(result.current.error).toBe('Not found');
    expect(onError).toHaveBeenCalledWith('Not found');
  });

  it('should handle validation errors with setError', async () => {
    const setError = vi.fn();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        errors: { name: ['Name is required', 'Name too short'] },
      }),
    });

    const { result } = renderHook(() =>
      useMutation({ url: '/api/test', setError })
    );

    await act(async () => {
      await result.current.mutate({ name: '' });
    });

    expect(setError).toHaveBeenCalledWith('name', {
      type: 'server',
      message: 'Name is required, Name too short',
    });
  });

  it('should handle fetch exception', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useMutation({ url: '/api/test' })
    );

    await act(async () => {
      await result.current.mutate({ name: 'test' });
    });

    expect(result.current.error).toBe('Network error');
  });

  it('should transform data before sending', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });

    const { result } = renderHook(() =>
      useMutation({
        url: '/api/test',
        transformData: (data) => ({ ...data, extra: true }),
      })
    );

    await act(async () => {
      await result.current.mutate({ name: 'test' });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      body: JSON.stringify({ name: 'test', extra: true }),
    }));
  });

  it('should reset error and loading state', () => {
    const { result } = renderHook(() =>
      useMutation({ url: '/api/test' })
    );

    act(() => { result.current.reset(); });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
