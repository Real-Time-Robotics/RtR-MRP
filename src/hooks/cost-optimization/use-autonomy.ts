import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export interface AutonomyPart {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  category: string | null;
  status: string;
  currentSource: string;
  currentCost: number;
  currentLeadTimeDays: number;
  makeCapabilityPercent: number;
  makeTargetDate: string | null;
  makeCostEstimate: number | null;
  rdProgressPercent: number | null;
  rdBlockers: string[];
  ndaaCompliant: boolean;
  itarControlled: boolean;
  updatedAt: string;
}

export interface AutonomySummary {
  totalParts: number;
  autonomyPercent: number;
  costAutonomyPercent: number;
  ndaaCompliantPercent: number;
  byStatus: {
    MAKE: number;
    IN_DEVELOPMENT: number;
    EVALUATE: number;
    BUY_STRATEGIC: number;
    BUY_REQUIRED: number;
  };
}

export interface AutonomyData {
  summary: AutonomySummary;
  parts: AutonomyPart[];
}

export function useAutonomy(productId?: string | null) {
  const url = productId
    ? `/api/cost-optimization/autonomy?productId=${productId}`
    : `/api/cost-optimization/autonomy`;

  const { data, error, isLoading, mutate } = useSWR<AutonomyData>(
    url,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}
