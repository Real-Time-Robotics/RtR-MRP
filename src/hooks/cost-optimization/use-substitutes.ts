import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export interface SubstituteEvaluation {
  id: string;
  originalPartId: string;
  originalPart: { id: string; partNumber: string; name: string; category: string; unitCost: number };
  substitutePartId: string;
  substitutePart: { id: string; partNumber: string; name: string; category: string; unitCost: number; ndaaCompliant: boolean };
  originalPrice: number;
  substitutePrice: number;
  savingsPercent: number;
  compatibilityScore: number;
  specsComparisonJson: Record<string, unknown> | null;
  ndaaCompliant: boolean;
  itarCompliant: boolean;
  riskLevel: string;
  riskFactors: string[];
  sampleOrdered: boolean;
  sampleOrderDate: string | null;
  testStatus: string;
  testResults: string | null;
  testDate: string | null;
  status: string;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  implementedAt: string | null;
  actualSavings: number | null;
  createdAt: string;
  createdBy: { id: string; name: string | null };
}

export interface SubstituteListResponse {
  data: SubstituteEvaluation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SubstituteSearchResult {
  id: string;
  partNumber: string;
  name: string;
  category: string | null;
  price: number;
  savingsPercent: number;
  compatibilityScore: number;
  ndaaCompliant: boolean;
  leadTimeDays: number;
  supplier: { id: string; name: string; rating: number | null } | null;
}

export interface SubstituteSearchResponse {
  originalPart: {
    id: string;
    partNumber: string;
    name: string;
    price: number;
    category: string | null;
  };
  substitutes: SubstituteSearchResult[];
  count: number;
}

export function useSubstituteList(params?: {
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
  const url = `/api/cost-optimization/substitutes${qs ? `?${qs}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<SubstituteListResponse>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}

export function useSubstituteDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SubstituteEvaluation>(
    id ? `/api/cost-optimization/substitutes/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}

export function useSubstituteSearch(
  originalPartId: string | null,
  options?: { maxPrice?: number; ndaaOnly?: boolean }
) {
  const searchParams = new URLSearchParams();
  if (originalPartId) searchParams.set("originalPartId", originalPartId);
  if (options?.maxPrice) searchParams.set("maxPrice", String(options.maxPrice));
  if (options?.ndaaOnly) searchParams.set("ndaaOnly", "true");

  const url = originalPartId
    ? `/api/cost-optimization/substitutes/search?${searchParams.toString()}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<SubstituteSearchResponse>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}
