"use client";

import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import { formatCurrency } from "@/lib/currency";

interface CostSummaryCardsProps {
  totalCost: number;
  makeCost: number;
  buyCost: number;
  makePercent: number;
  buyPercent: number;
  targetCost: number | null;
  costGap: number | null;
}

export function CostSummaryCards({
  totalCost,
  makeCost,
  makePercent,
  buyCost,
  buyPercent,
  targetCost,
  costGap,
}: CostSummaryCardsProps) {
  const gapLabel = targetCost
    ? costGap && costGap > 0 ? `Gap: -${formatCurrency(costGap)}` : 'Đạt mục tiêu'
    : '—';
  const gapColor = targetCost
    ? costGap && costGap > 0 ? 'text-red-600' : 'text-green-600'
    : undefined;

  return (
    <CompactStatsBar stats={[
      { label: 'Tổng chi phí/unit', value: formatCurrency(totalCost) },
      { label: `Make (${makePercent.toFixed(1)}%)`, value: formatCurrency(makeCost), color: 'text-blue-600' },
      { label: `Buy (${buyPercent.toFixed(1)}%)`, value: formatCurrency(buyCost) },
      { label: targetCost ? `Target: ${formatCurrency(targetCost)}` : 'Mục tiêu', value: gapLabel, color: gapColor },
    ]} />
  );
}
