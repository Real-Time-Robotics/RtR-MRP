import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSavingsDashboard(year?: number) {
  const params = new URLSearchParams();
  if (year) params.set("year", year.toString());
  const query = params.toString();

  return useSWR(
    `/api/cost-optimization/dashboard${query ? `?${query}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useSavingsRecords(filters?: {
  actionId?: string;
  source?: string;
  verified?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.actionId) params.set("actionId", filters.actionId);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.verified !== undefined) params.set("verified", String(filters.verified));
  const query = params.toString();

  return useSWR(
    `/api/cost-optimization/dashboard/savings${query ? `?${query}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}
