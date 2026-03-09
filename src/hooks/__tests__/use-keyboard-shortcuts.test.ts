import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, useGlobalShortcuts, formatShortcut } from '../use-keyboard-shortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call handler for matching key combo', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'Escape': handler }));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should call handler for modifier+key combo', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'Control+s': handler }));

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should not call handler for non-matching key', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ 'Escape': handler }));

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    const handler = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardShortcuts({ 'Escape': handler }));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});

describe('useGlobalShortcuts', () => {
  it('should return shortcuts array', () => {
    const action = vi.fn();
    const shortcuts = [{ key: 'k', meta: true, description: 'Test', action }];
    const { result } = renderHook(() => useGlobalShortcuts({ shortcuts }));
    expect(result.current.shortcuts).toHaveLength(1);
  });

  it('should not trigger when disabled', () => {
    const action = vi.fn();
    const shortcuts = [{ key: 'k', description: 'Test', action }];
    renderHook(() => useGlobalShortcuts({ shortcuts, enabled: false }));

    const event = new KeyboardEvent('keydown', { key: 'k' });
    document.dispatchEvent(event);

    expect(action).not.toHaveBeenCalled();
  });
});

describe('formatShortcut', () => {
  it('should format simple key', () => {
    const result = formatShortcut({ key: 'k' });
    expect(result).toContain('K');
  });

  it('should format with ctrl modifier', () => {
    const result = formatShortcut({ key: 'k', ctrl: true });
    // Result depends on platform, but should contain the key
    expect(result).toContain('K');
  });

  it('should format with shift modifier', () => {
    const result = formatShortcut({ key: 'p', shift: true });
    expect(result).toContain('P');
  });

  it('should format Escape as Esc', () => {
    const result = formatShortcut({ key: 'Escape' });
    expect(result).toContain('ESC');
  });

  it('should format space key', () => {
    const result = formatShortcut({ key: ' ' });
    expect(result).toContain('SPACE');
  });
});
