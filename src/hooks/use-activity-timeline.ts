// src/hooks/use-activity-timeline.ts
// Hook for fetching activity timeline data

'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';

interface UseActivityTimelineOptions {
  limit?: number;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TimelineActivity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  entityType: string;
  entityNumber: string;
  entityUrl: string;
  metadata?: Record<string, unknown>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useActivityTimeline(options: UseActivityTimelineOptions = {}) {
  const { limit = 20, entityType, dateFrom, dateTo } = options;
  const [offset, setOffset] = useState(0);

  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());
  if (entityType) params.set('entityType', entityType);
  if (dateFrom) params.set('dateFrom', dateFrom.toISOString());
  if (dateTo) params.set('dateTo', dateTo.toISOString());

  const { data, error, isLoading, mutate } = useSWR<{
    activities: TimelineActivity[];
    total: number;
    hasMore: boolean;
  }>(`/api/activity/timeline?${params.toString()}`, fetcher, {
    refreshInterval: 30000,
  });

  const loadMore = useCallback(() => {
    if (data?.hasMore) {
      setOffset((prev) => prev + limit);
    }
  }, [data?.hasMore, limit]);

  const refresh = useCallback(() => {
    setOffset(0);
    mutate();
  }, [mutate]);

  return {
    activities: data?.activities || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    loadMore,
    refresh,
  };
}
