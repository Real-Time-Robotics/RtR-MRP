'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Listen for changes
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Tailwind breakpoint values
const BREAKPOINTS = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Hook to detect if viewport is mobile (< md breakpoint)
 * @returns boolean indicating if viewport is mobile
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${BREAKPOINTS.md})`);
}

/**
 * Hook to detect if viewport is tablet (md to lg breakpoint)
 * @returns boolean indicating if viewport is tablet
 */
export function useIsTablet(): boolean {
  const isAboveSm = useMediaQuery(`(min-width: ${BREAKPOINTS.md})`);
  const isBelowLg = !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`);
  return isAboveSm && isBelowLg;
}

/**
 * Hook to detect if viewport is desktop (>= lg breakpoint)
 * @returns boolean indicating if viewport is desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`);
}

/**
 * Hook to get current breakpoint
 * @returns Current breakpoint name
 */
export function useBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const isXs = !useMediaQuery(`(min-width: ${BREAKPOINTS.sm})`);
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm})`) && !useMediaQuery(`(min-width: ${BREAKPOINTS.md})`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md})`) && !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`) && !useMediaQuery(`(min-width: ${BREAKPOINTS.xl})`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl})`) && !useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']})`);

  if (isXs) return 'xs';
  if (isSm) return 'sm';
  if (isMd) return 'md';
  if (isLg) return 'lg';
  if (isXl) return 'xl';
  return '2xl';
}

/**
 * Hook to detect if device has touch capability
 * @returns boolean indicating if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE specific
      navigator.msMaxTouchPoints > 0;

    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}

/**
 * Hook to detect if device prefers reduced motion
 * @returns boolean indicating if reduced motion is preferred
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Hook to detect if device is in portrait orientation
 * @returns boolean indicating if device is in portrait mode
 */
export function useIsPortrait(): boolean {
  return useMediaQuery('(orientation: portrait)');
}

/**
 * Hook to detect if device is in landscape orientation
 * @returns boolean indicating if device is in landscape mode
 */
export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)');
}

export default useMediaQuery;
