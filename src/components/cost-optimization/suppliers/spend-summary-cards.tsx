"use client";

import { CompactStatsBar } from "@/components/ui/compact-stats-bar";

interface SpendSummaryCardsProps {
  totalSpend: number;
  supplierCount: number;
  potentialSavings: number;
  pendingActions: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export function SpendSummaryCards({
  totalSpend,
  supplierCount,
  potentialSavings,
  pendingActions,
}: SpendSummaryCardsProps) {
  return (
    <CompactStatsBar stats={[
      { label: 'Tổng Spend (YTD)', value: formatCurrency(totalSpend), color: 'text-blue-600' },
      { label: 'Số NCC', value: supplierCount, color: 'text-purple-600' },
      { label: 'Tiết kiệm tiềm năng', value: formatCurrency(potentialSavings), color: 'text-green-600' },
      { label: 'Actions Pending', value: pendingActions, color: 'text-orange-600' },
    ]} />
  );
}
