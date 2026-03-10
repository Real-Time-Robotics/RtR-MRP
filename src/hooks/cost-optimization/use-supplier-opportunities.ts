import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export interface SupplierOpportunity {
  id: string;
  type: string;
  supplierId?: string;
  supplierName?: string;
  title: string;
  description: string;
  affectedParts: { partId: string; partNumber: string }[];
  currentSpend: number;
  potentialSavings: number;
  savingsPercent: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  actionSteps: string[];
}

export interface OpportunitiesSummary {
  totalOpportunities: number;
  totalPotentialSavings: number;
  byType: {
    consolidate: number;
    switchSupplier: number;
    negotiate: number;
    localSource: number;
  };
}

export interface OpportunitiesResponse {
  opportunities: SupplierOpportunity[];
  summary: OpportunitiesSummary;
}

export interface SupplierSpendItem {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  orderCount: number;
  partCount: number;
  percent?: number;
}

export interface SupplierSpendResponse {
  summary: {
    totalSpend: number;
    supplierCount: number;
    totalSuppliers: number;
  };
  topSuppliers: SupplierSpendItem[];
  allSuppliers: SupplierSpendItem[];
}

export function useSupplierSpend() {
  const { data, error, isLoading, mutate } = useSWR<SupplierSpendResponse>(
    "/api/cost-optimization/suppliers",
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}

export function useSupplierOpportunities() {
  const { data, error, isLoading, mutate } = useSWR<OpportunitiesResponse>(
    "/api/cost-optimization/suppliers/opportunities",
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}
