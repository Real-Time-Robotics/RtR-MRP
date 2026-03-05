// src/hooks/use-paginated-data.ts
// React hook for consuming paginated API responses

import { useState, useCallback, useEffect, useRef } from "react";
import { PaginatedResponse, PaginationParams } from "@/lib/pagination";

interface UsePaginatedDataOptions {
  endpoint: string;
  initialPageSize?: number;
  initialFilters?: Record<string, string>;
  autoFetch?: boolean;
}

interface UsePaginatedDataResult<T> {
  data: T[];
  pagination: PaginatedResponse<T>["pagination"] | null;
  meta: PaginatedResponse<T>["meta"] | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  setPageSize: (size: number) => void;
  setFilters: (filters: Record<string, string>) => void;
  setSearch: (search: string) => void;
  setSorting: (sortBy: string, sortOrder: "asc" | "desc") => void;
  refresh: () => Promise<void>;
}

export function usePaginatedData<T extends { id: string }>(
  options: UsePaginatedDataOptions
): UsePaginatedDataResult<T> {
  const { endpoint, initialPageSize = 50, initialFilters = {}, autoFetch = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<T>["pagination"] | null>(null);
  const [meta, setMeta] = useState<PaginatedResponse<T>["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const abortControllerRef = useRef<AbortController | null>(null);

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("pageSize", String(pageSize));

      if (search) params.set("search", search);
      if (sortBy) {
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const separator = endpoint.includes("?") ? "&" : "?";
      return `${endpoint}${separator}${params.toString()}`;
    },
    [endpoint, pageSize, search, sortBy, sortOrder, filters]
  );

  const fetchPage = useCallback(
    async (pageNum: number) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildUrl(pageNum), {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: PaginatedResponse<T> = await response.json();

        setData(result.data);
        setPagination(result.pagination);
        setMeta(result.meta);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Request was cancelled
        }
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    },
    [buildUrl]
  );

  const nextPage = useCallback(async () => {
    if (pagination?.hasNextPage) {
      await fetchPage(page + 1);
    }
  }, [pagination, page, fetchPage]);

  const prevPage = useCallback(async () => {
    if (pagination?.hasPrevPage) {
      await fetchPage(page - 1);
    }
  }, [pagination, page, fetchPage]);

  const refresh = useCallback(async () => {
    await fetchPage(page);
  }, [page, fetchPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page
  }, []);

  const handleSetFilters = useCallback((newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page
  }, []);

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset to first page
  }, []);

  const handleSetSorting = useCallback((newSortBy: string, newSortOrder: "asc" | "desc") => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page
  }, []);

  // Auto-fetch on mount and when dependencies change
  // Note: No cleanup abort — fetchPage() already cancels stale requests via
  // its own AbortController logic. Aborting in cleanup causes a race condition
  // in React Strict Mode (dev) where the initial fetch is always cancelled.
  // React 18+ safely ignores setState on unmounted components.
  useEffect(() => {
    if (autoFetch) {
      fetchPage(page);
    }
  }, [autoFetch, fetchPage, page, pageSize, filters, search, sortBy, sortOrder]);

  return {
    data,
    pagination,
    meta,
    loading,
    error,
    fetchPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
    setFilters: handleSetFilters,
    setSearch: handleSetSearch,
    setSorting: handleSetSorting,
    refresh,
  };
}

export default usePaginatedData;
