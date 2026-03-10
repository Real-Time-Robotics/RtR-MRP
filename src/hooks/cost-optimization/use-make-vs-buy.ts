import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export interface MakeVsBuyPart {
  id: string;
  partNumber: string;
  name: string;
  category: string | null;
  makeOrBuy: string;
}

export interface MakeVsBuyAnalysis {
  id: string;
  partId: string;
  part: MakeVsBuyPart;
  buyPrice: number;
  buyMOQ: number;
  buyLeadTimeDays: number;
  buyRisks: string[];
  makeCostEstimate: number;
  makeInvestmentRequired: number;
  makeLeadTimeDays: number;
  makeTimelineMonths: number;
  makeCapabilityGapsJson: Record<string, unknown> | null;
  savingsPerUnit: number;
  annualVolumeEstimate: number;
  annualSavings: number;
  breakEvenUnits: number;
  breakEvenMonths: number;
  npv3Year: number;
  financialScore: number;
  capabilityScore: number;
  strategicScore: number;
  overallScore: number;
  recommendation: string;
  recommendationRationale: string;
  conditions: string[];
  status: string;
  decision: string | null;
  decisionDate: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null };
}

export interface MakeVsBuyListResponse {
  data: MakeVsBuyAnalysis[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useMakeVsBuyList(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  const url = `/api/cost-optimization/make-vs-buy${qs ? `?${qs}` : ""}`;

  const { data, error, isLoading, mutate } =
    useSWR<MakeVsBuyListResponse>(url, fetcher, {
      revalidateOnFocus: false,
    });

  return { data, error, isLoading, mutate };
}

export function useMakeVsBuyDetail(id: string | null) {
  const { data, error, isLoading, mutate } =
    useSWR<MakeVsBuyAnalysis>(
      id ? `/api/cost-optimization/make-vs-buy/${id}` : null,
      fetcher,
      { revalidateOnFocus: false }
    );

  return { data, error, isLoading, mutate };
}
