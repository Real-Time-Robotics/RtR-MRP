import useSWR from 'swr';

interface InventoryItem {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  unitCost: number;
  warehouseId: string;
  warehouseName: string;
  lastUpdated: string;
}

interface InventoryResponse {
  data: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

export function useInventoryData(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  warehouseId?: string;
  lowStockOnly?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.warehouseId) searchParams.set('warehouseId', params.warehouseId);
  if (params?.lowStockOnly) searchParams.set('lowStockOnly', 'true');

  const queryString = searchParams.toString();
  const url = `/api/inventory${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<InventoryResponse>(
    url,
    {
      refreshInterval: 60000,
    }
  );

  return {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

export function useInventoryItem(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/inventory/${id}` : null,
  );

  return {
    item: data?.data ?? null,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
