import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMentions } from '../use-mentions';

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('useMentions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('should initialize with inactive state', () => {
    const { result } = renderHook(() => useMentions());
    expect(result.current.isActive).toBe(false);
    expect(result.current.searchTerm).toBe('');
    expect(result.current.users).toEqual([]);
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('should activate on @ detection', () => {
    const { result } = renderHook(() => useMentions());

    act(() => {
      result.current.handleInputChange('@john', 5);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.searchTerm).toBe('john');
  });

  it('should activate when @ is after whitespace', () => {
    const { result } = renderHook(() => useMentions());

    act(() => {
      result.current.handleInputChange('hello @jane', 11);
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.searchTerm).toBe('jane');
  });

  it('should not activate when @ is inside a word', () => {
    const { result } = renderHook(() => useMentions());

    act(() => {
      result.current.handleInputChange('email@test', 10);
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should deactivate when no @ is found', () => {
    const { result } = renderHook(() => useMentions());

    act(() => {
      result.current.handleInputChange('hello world', 11);
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should deactivate when search term contains space', () => {
    const { result } = renderHook(() => useMentions());

    act(() => {
      result.current.handleInputChange('@john doe', 9);
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should close dropdown', () => {
    const { result } = renderHook(() => useMentions());

    act(() => {
      result.current.handleInputChange('@john', 5);
    });
    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isActive).toBe(false);
  });

  it('should select a user and close', () => {
    const { result } = renderHook(() => useMentions());
    const user = { id: '1', name: 'John', email: 'john@test.com' };

    act(() => {
      const selected = result.current.selectUser(user);
      expect(selected).toEqual(user);
    });

    expect(result.current.isActive).toBe(false);
  });

  it('should handle keyboard navigation returning false when inactive', () => {
    const { result } = renderHook(() => useMentions());

    const event = { key: 'ArrowDown', preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
    let handled: unknown;

    act(() => {
      handled = result.current.handleKeyDown(event);
    });

    expect(handled).toBe(false);
  });
});
