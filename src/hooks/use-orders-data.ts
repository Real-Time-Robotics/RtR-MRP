import useSWR from 'swr';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  dueDate: string;
  itemCount: number;
}

interface OrdersResponse {
  data: SalesOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export function useOrdersData(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();
  const url = `/api/sales-orders${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    url,
    {
      refreshInterval: 60000,
    }
  );

  return {
    orders: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}

export function useOrderDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/sales-orders/${id}` : null,
  );

  return {
    order: data?.data ?? null,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  };
}
