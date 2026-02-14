import useSWR from 'swr';

interface DashboardStats {
  salesOrders: { total: number; pending: number };
  inventory: { total: number; lowStock: number };
  production: { total: number; inProgress: number };
  quality: { total: number; pending: number };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardData() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/dashboard',
    fetcher,
    {
      dedupingInterval: 5000,
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data ?? null,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

interface DashboardDetail {
  pendingOrders: number;
  pendingOrdersValue: number;
  criticalStock: number;
  activePOs: number;
  activePOsValue: number;
  reorderAlerts: number;
}

export function useDashboardDetail() {
  const { data, error, isLoading, mutate } = useSWR<DashboardDetail>(
    '/api/dashboard/detail',
    fetcher,
    {
      dedupingInterval: 5000,
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    data: data ?? null,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
