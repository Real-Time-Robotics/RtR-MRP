import useSWR from 'swr';
import { useDebounce } from './use-debounce';

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const filtered = params
    ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v && v !== 'all')
      )
    : undefined;
  const qs = filtered && Object.keys(filtered).length > 0
    ? '?' + new URLSearchParams(filtered).toString()
    : '';
  return `${endpoint}${qs}`;
}

export function useApiData<T = unknown>(
  endpoint: string | null,
  params?: Record<string, string>,
  options?: {
    debounce?: number;
    transform?: (raw: Record<string, unknown>) => T[];
  }
) {
  const debounceMs = options?.debounce ?? 0;
  const rawKey = endpoint ? buildUrl(endpoint, params) : null;
  const key = useDebounce(rawKey, debounceMs);

  const { data, error, isLoading, isValidating, mutate } = useSWR(key);

  const items: T[] = data
    ? options?.transform
      ? options.transform(data)
      : (data.data ?? [])
    : [];

  return {
    data: items,
    loading: isLoading,
    validating: isValidating,
    error: error?.message ?? null,
    refresh: () => mutate(),
    mutate,
  };
}
