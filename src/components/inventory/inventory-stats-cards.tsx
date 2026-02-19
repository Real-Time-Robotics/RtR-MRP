'use client';

// src/components/inventory/inventory-stats-cards.tsx
// Stats Cards component for Inventory page

import { Card, CardContent } from '@/components/ui/card';
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
    // COMPACT: gap-4 -> gap-2, mb-6 -> mb-3
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 shrink-0">
      <Card className="border-gray-200 dark:border-mrp-border">
        {/* COMPACT: pt-4 -> p-3 */}
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{summary.total}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.totalSKU')}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-red-600">{summary.critical}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.criticalOutOfStock')}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-amber-600">{summary.reorder}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.reorderNeeded')}</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-green-600">{summary.ok}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">{t('inv.inStock')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
