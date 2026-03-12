'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UseEntityTooltipOptions {
  type: string;
  id: string;
  enabled?: boolean;
}

export function useEntityTooltip({ type, id, enabled = true }: UseEntityTooltipOptions) {
  const { data, error, isLoading } = useSWR(
    enabled && type && id ? `/api/tooltips/${type}/${id}` : null,
    fetcher,
    {
      dedupingInterval: 300000, // 5 min dedup
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    data,
    isLoading,
    error: error ? 'Failed to load tooltip data' : null,
  };
}
