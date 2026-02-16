import useSWR from 'swr';

interface DashboardStats {
  salesOrders: { total: number; pending: number };
  inventory: { total: number; lowStock: number };
  production: { total: number; inProgress: number };
  quality: { total: number; pending: number };
}

export function useDashboardData() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/dashboard',
    {
      refreshInterval: 60000,
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
    {
      refreshInterval: 60000,
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
