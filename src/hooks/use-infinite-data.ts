// src/hooks/use-infinite-data.ts
// React hook for infinite scroll pagination with cursor-based loading

import { useState, useCallback, useEffect, useRef } from "react";
import { CursorPaginatedResponse } from "@/lib/pagination";

interface UseInfiniteDataOptions {
  endpoint: string;
  pageSize?: number;
  initialFilters?: Record<string, string>;
  autoFetch?: boolean;
}

interface UseInfiniteDataResult<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalLoaded: number;

  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: Record<string, string>) => void;
  setSearch: (search: string) => void;
}

export function useInfiniteData<T extends { id: string }>(
  options: UseInfiniteDataOptions
): UseInfiniteDataResult<T> {
  const { endpoint, pageSize = 50, initialFilters = {}, autoFetch = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [search, setSearch] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const buildUrl = useCallback(
    (cursorValue: string | null) => {
      const params = new URLSearchParams();
      params.set("pageSize", String(pageSize));

      if (cursorValue) params.set("cursor", cursorValue);
      if (search) params.set("search", search);

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const separator = endpoint.includes("?") ? "&" : "?";
      return `${endpoint}${separator}${params.toString()}`;
    },
    [endpoint, pageSize, search, filters]
  );

  const fetchData = useCallback(
    async (cursorValue: string | null, isLoadMore: boolean = false) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(buildUrl(cursorValue), {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: CursorPaginatedResponse<T> = await response.json();

        if (isLoadMore) {
          setData((prev) => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }

        setHasMore(result.pagination.hasMore);
        setCursor(result.pagination.nextCursor);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Request was cancelled
        }
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildUrl]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    await fetchData(cursor, true);
  }, [cursor, hasMore, loadingMore, fetchData]);

  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(true);
    await fetchData(null, false);
  }, [fetchData]);

  const handleSetFilters = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setCursor(null);
    setHasMore(true);
    setData([]);
  }, []);

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setCursor(null);
    setHasMore(true);
    setData([]);
  }, []);

  // Initial fetch and refetch on filter/search change
  useEffect(() => {
    if (autoFetch) {
      fetchData(null, false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, fetchData]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    totalLoaded: data.length,
    loadMore,
    refresh,
    setFilters: handleSetFilters,
    setSearch: handleSetSearch,
  };
}

export default useInfiniteData;
