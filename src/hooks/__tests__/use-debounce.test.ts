import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedState } from '../use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 300 });
    expect(result.current).toBe('initial');

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'd' });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('d');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });

  it('should work with number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe(42);
  });

  it('should work with object values', () => {
    const obj1 = { name: 'test' };
    const obj2 = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: obj1 } }
    );

    rerender({ value: obj2 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toEqual({ name: 'updated' });
  });
});

describe('useDebouncedState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return initial value, debounced value, setter, and debouncing flag', () => {
    const { result } = renderHook(() => useDebouncedState('initial', 300));

    const [value, debouncedValue, , isDebouncing] = result.current;
    expect(value).toBe('initial');
    expect(debouncedValue).toBe('initial');
    expect(isDebouncing).toBe(false);
  });

  it('should track debouncing state', () => {
    const { result } = renderHook(() => useDebouncedState('initial', 300));

    act(() => { result.current[2]('updated'); });

    expect(result.current[0]).toBe('updated');
    expect(result.current[3]).toBe(true); // isDebouncing

    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current[1]).toBe('updated');
    expect(result.current[3]).toBe(false); // not debouncing
  });
});
