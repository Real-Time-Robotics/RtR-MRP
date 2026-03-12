import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRoadmapAction(id: string | null) {
  return useSWR(
    id ? `/api/cost-optimization/roadmap/actions/${id}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );
}
