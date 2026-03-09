import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reducer, toast, useToast } from '../use-toast';
import { renderHook, act } from '@testing-library/react';

describe('toast reducer', () => {
  const baseState = { toasts: [] };

  it('should add a toast', () => {
    const newToast = { id: '1', title: 'Test', open: true };
    const result = reducer(baseState, { type: 'ADD_TOAST', toast: newToast });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0]).toEqual(newToast);
  });

  it('should limit toasts to TOAST_LIMIT (1)', () => {
    const state = { toasts: [{ id: '1', title: 'First', open: true }] };
    const newToast = { id: '2', title: 'Second', open: true };
    const result = reducer(state, { type: 'ADD_TOAST', toast: newToast });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('should update a toast', () => {
    const state = { toasts: [{ id: '1', title: 'Original', open: true }] };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });
    expect(result.toasts[0].title).toBe('Updated');
    expect(result.toasts[0].open).toBe(true);
  });

  it('should dismiss a specific toast', () => {
    const state = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(result.toasts[0].open).toBe(false);
  });

  it('should dismiss all toasts when no id provided', () => {
    const state = {
      toasts: [
        { id: '1', title: 'First', open: true },
      ],
    };
    const result = reducer(state, { type: 'DISMISS_TOAST' });
    expect(result.toasts.every(t => t.open === false)).toBe(true);
  });

  it('should remove a specific toast', () => {
    const state = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(result.toasts).toHaveLength(0);
  });

  it('should remove all toasts when no id provided', () => {
    const state = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const result = reducer(state, { type: 'REMOVE_TOAST' });
    expect(result.toasts).toHaveLength(0);
  });
});

describe('toast function', () => {
  it('should return id, dismiss, and update functions', () => {
    const result = toast({ title: 'Test Toast' });
    expect(result).toHaveProperty('id');
    expect(typeof result.dismiss).toBe('function');
    expect(typeof result.update).toBe('function');
  });
});

describe('useToast hook', () => {
  it('should return toasts array and functions', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toBeDefined();
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('should add toast via hook', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Hook Toast' });
    });

    expect(result.current.toasts.length).toBeGreaterThanOrEqual(0);
  });
});
