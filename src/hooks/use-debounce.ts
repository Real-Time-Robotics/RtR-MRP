/**
 * useDebounce Hook
 * Debounces a value with specified delay
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Track if a value is currently debouncing
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);
  const isDebouncing = value !== debouncedValue;

  return [value, debouncedValue, setValue, isDebouncing];
}
