'use client';

import { CompactStatsBar } from '@/components/ui/compact-stats-bar';
import { useLanguage } from '@/lib/i18n/language-context';

interface StatsCardsSummary {
  total: number;
  critical: number;
  reorder: number;
  ok: number;
}

interface StatsCardsProps {
  summary: StatsCardsSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
  const { t } = useLanguage();
  return (
    <div className="mb-3 shrink-0">
      <CompactStatsBar stats={[
        { label: t('inv.totalSKU'), value: summary.total },
        { label: t('inv.criticalOutOfStock'), value: summary.critical, color: 'text-red-600' },
        { label: t('inv.reorderNeeded'), value: summary.reorder, color: 'text-amber-600' },
        { label: t('inv.inStock'), value: summary.ok, color: 'text-green-600' },
      ]} />
    </div>
  );
}
