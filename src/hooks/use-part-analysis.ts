
import useSWR from 'swr';

export interface PartAnalysisData {
    stock: {
        total: number;
        reserved: number;
        available: number;
        reorderPoint: number;
        safetyStock: number;
    };
    inbound: {
        totalIncoming: number;
        nextPoDate: string | null;
        pendingPos: number;
    };
    usage: {
        monthlyAverage: number;
        coverageDays: number;
    };
    price: {
        current: number;
        lastPay: number;
        trend: 'up' | 'down' | 'stable';
    };
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

export function usePartAnalysis(partId: string | null) {
    const { data, error, isLoading } = useSWR<{ data: PartAnalysisData }>(
        partId ? `/api/analytics/part/${partId}` : null,
        fetcher,
        {
            refreshInterval: 0, // No auto refresh for now, save bandwidth
            dedupingInterval: 5000,
        }
    );

    return {
        analysis: data?.data,
        isLoading,
        isError: error,
    };
}
