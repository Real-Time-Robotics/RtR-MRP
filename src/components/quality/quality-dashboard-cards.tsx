"use client";

import { CompactStatsBar } from "@/components/ui/compact-stats-bar";
import { useLanguage } from "@/lib/i18n/language-context";

interface QualityStatsProps {
  firstPassYield: number;
  yieldTrend?: number;
  pendingInspections: number;
  openNCRs: number;
  openCAPAs: number;
}

export function QualityDashboardCards({
  firstPassYield,
  pendingInspections,
  openNCRs,
  openCAPAs,
}: QualityStatsProps) {
  const { t } = useLanguage();

  return (
    <CompactStatsBar stats={[
      { label: t("quality.firstPassYield"), value: `${firstPassYield}%`, color: 'text-green-600' },
      { label: t("quality.pendingInspections"), value: pendingInspections, color: 'text-blue-600' },
      { label: t("quality.openNCRs"), value: openNCRs, color: 'text-amber-600' },
      { label: t("quality.openCAPAs"), value: openCAPAs, color: 'text-purple-600' },
    ]} />
  );
}
