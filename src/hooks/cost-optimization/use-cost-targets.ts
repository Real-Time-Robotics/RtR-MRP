import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCostTargets(productId?: string) {
  const params = new URLSearchParams();
  if (productId) params.set("productId", productId);
  const query = params.toString();

  return useSWR(
    `/api/cost-optimization/roadmap/targets${query ? `?${query}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );
}

export function useCostTargetDetail(id: string | null) {
  return useSWR(
    id ? `/api/cost-optimization/roadmap/targets/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}
