"use client";

import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import { AutonomySummary } from "@/hooks/cost-optimization/use-autonomy";

interface AutonomySummaryCardsProps {
  summary: AutonomySummary;
}

export function AutonomySummaryCards({ summary }: AutonomySummaryCardsProps) {
  return (
    <CompactStatsBar stats={[
      { label: 'Tự sản xuất', value: summary.byStatus.MAKE, color: 'text-green-600' },
      { label: 'Đang phát triển', value: summary.byStatus.IN_DEVELOPMENT, color: 'text-blue-600' },
      { label: 'Đang đánh giá', value: summary.byStatus.EVALUATE, color: 'text-yellow-600' },
      { label: 'Mua chiến lược', value: summary.byStatus.BUY_STRATEGIC, color: 'text-orange-600' },
      { label: 'Phải mua', value: summary.byStatus.BUY_REQUIRED, color: 'text-red-600' },
      { label: 'NDAA Compliant', value: `${summary.ndaaCompliantPercent}%`, color: 'text-emerald-600' },
    ]} />
  );
}
