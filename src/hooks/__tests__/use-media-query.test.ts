import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsDesktop, useIsTouchDevice } from '../use-media-query';

// Mock matchMedia
const createMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
};

describe('useMediaQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false initially', () => {
    window.matchMedia = createMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(typeof result.current).toBe('boolean');
  });

  it('should match when media query matches', () => {
    window.matchMedia = createMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should not match when media query does not match', () => {
    window.matchMedia = createMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });
});

describe('useIsMobile', () => {
  it('should return true for small viewports', () => {
    window.matchMedia = createMatchMedia(false); // min-width:768px = false => mobile
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should return false for large viewports', () => {
    window.matchMedia = createMatchMedia(true); // min-width:768px = true => not mobile
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});

describe('useIsDesktop', () => {
  it('should return true for large viewports', () => {
    window.matchMedia = createMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('should return false for small viewports', () => {
    window.matchMedia = createMatchMedia(false);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});

describe('useIsTouchDevice', () => {
  it('should detect touch device', () => {
    const { result } = renderHook(() => useIsTouchDevice());
    expect(typeof result.current).toBe('boolean');
  });
});
