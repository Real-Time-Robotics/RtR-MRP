import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataEntry } from '../use-data-entry';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

// Mock client-logger
vi.mock('@/lib/client-logger', () => ({
  clientLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useDataEntry', () => {
  const mockOnSubmit = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockReset();
    mockOnSuccess.mockReset();
  });

  it('should initialize with closed state', () => {
    const { result } = renderHook(() =>
      useDataEntry({ onSubmit: mockOnSubmit })
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should open modal', () => {
    const { result } = renderHook(() =>
      useDataEntry({ onSubmit: mockOnSubmit })
    );

    act(() => { result.current.open(); });
    expect(result.current.isOpen).toBe(true);
  });

  it('should close modal', () => {
    const { result } = renderHook(() =>
      useDataEntry({ onSubmit: mockOnSubmit })
    );

    act(() => { result.current.open(); });
    act(() => { result.current.close(); });
    expect(result.current.isOpen).toBe(false);
  });

  it('should toggle modal', () => {
    const { result } = renderHook(() =>
      useDataEntry({ onSubmit: mockOnSubmit })
    );

    act(() => { result.current.toggle(); });
    expect(result.current.isOpen).toBe(true);

    act(() => { result.current.toggle(); });
    expect(result.current.isOpen).toBe(false);
  });

  it('should clear error on open', () => {
    const { result } = renderHook(() =>
      useDataEntry({ onSubmit: mockOnSubmit })
    );

    act(() => { result.current.open(); });
    expect(result.current.error).toBeNull();
  });

  it('should submit data successfully', async () => {
    mockOnSubmit.mockResolvedValue({ id: '1' });

    const { result } = renderHook(() =>
      useDataEntry({
        onSubmit: mockOnSubmit,
        onSuccess: mockOnSuccess,
        successMessage: 'Saved!',
      })
    );

    act(() => { result.current.open(); });

    let submitResult: boolean | undefined;
    await act(async () => {
      submitResult = await result.current.submit({ name: 'test' });
    });

    expect(submitResult).toBe(true);
    expect(mockOnSubmit).toHaveBeenCalledWith({ name: 'test' });
    expect(mockOnSuccess).toHaveBeenCalledWith({ id: '1' });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle submit error', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() =>
      useDataEntry({
        onSubmit: mockOnSubmit,
        errorMessage: 'Custom error',
      })
    );

    act(() => { result.current.open(); });

    let submitResult: boolean | undefined;
    await act(async () => {
      submitResult = await result.current.submit({ name: 'test' });
    });

    expect(submitResult).toBe(false);
    expect(result.current.error).toBe('Server error');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should use default error message for non-Error throws', async () => {
    mockOnSubmit.mockRejectedValue('string error');

    const { result } = renderHook(() =>
      useDataEntry({
        onSubmit: mockOnSubmit,
        errorMessage: 'Failed to save data',
      })
    );

    await act(async () => {
      await result.current.submit({ name: 'test' });
    });

    expect(result.current.error).toBe('Failed to save data');
  });
});
