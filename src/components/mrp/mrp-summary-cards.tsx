"use client";

import { CompactStatsBar } from "@/components/ui/compact-stats-bar";

interface MrpSummaryProps {
  totalParts: number;
  purchaseSuggestions: number;
  expediteAlerts: number;
  deferSuggestions: number;
}

export function MrpSummaryCards({
  totalParts,
  purchaseSuggestions,
  expediteAlerts,
  deferSuggestions,
}: MrpSummaryProps) {
  return (
    <CompactStatsBar stats={[
      { label: 'Parts Analyzed', value: totalParts, color: 'text-blue-600' },
      { label: 'Purchase Needed', value: purchaseSuggestions, color: 'text-red-600' },
      { label: 'Expedite Alerts', value: expediteAlerts, color: 'text-amber-600' },
      { label: 'Defer Suggested', value: deferSuggestions, color: 'text-green-600' },
    ]} />
  );
}
