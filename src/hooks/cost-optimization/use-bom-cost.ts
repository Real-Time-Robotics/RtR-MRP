import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export interface BomCostItem {
  partId: string;
  partNumber: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  costPercent: number;
  makeOrBuy: "MAKE" | "BUY" | "BOTH";
  ndaaCompliant: boolean;
  moduleCode: string | null;
  moduleName: string | null;
  isCritical: boolean;
  hasSubBom: boolean;
}

export interface BomCostModule {
  moduleCode: string;
  moduleName: string;
  cost: number;
  percent: number;
  partCount: number;
}

export interface BomCostCategory {
  category: string;
  cost: number;
  percent: number;
}

export interface BomCostTopDriver {
  partId: string;
  partNumber: string;
  name: string;
  totalCost: number;
  costPercent: number;
  makeOrBuy: string;
}

export interface BomCostData {
  product: { id: string; name: string; sku: string };
  bomHeader: { id: string; version: string; status: string } | null;
  totalCost: number;
  makeCost: number;
  buyCost: number;
  makePercent: number;
  buyPercent: number;
  targetCost: number | null;
  costGap: number | null;
  items: BomCostItem[];
  byModule: BomCostModule[];
  byMakeVsBuy: {
    make: { cost: number; percent: number; count: number };
    buy: { cost: number; percent: number; count: number };
    both: { cost: number; percent: number; count: number };
  };
  byCategory: BomCostCategory[];
  topCostDrivers: BomCostTopDriver[];
}

export function useBomCost(productId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BomCostData>(
    productId ? `/api/cost-optimization/bom-cost?productId=${productId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}
