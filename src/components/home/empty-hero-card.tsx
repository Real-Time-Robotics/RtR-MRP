// Empty state hero card for home dashboard when no production data exists
'use client';

import Link from 'next/link';
import { Factory, Plus, Calendar, Wrench } from 'lucide-react';

export function EmptyHeroCard() {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 p-8 mb-6">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-4">
          <Factory className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">Chào mừng đến RTR-MRP</h2>
          <p className="text-muted-foreground mb-6">
            Tạo work center + work order đầu tiên để bắt đầu theo dõi sản xuất.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/production/work-centers/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Tạo Work Center
            </Link>
            <Link
              href="/production/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo Work Order
            </Link>
            <Link
              href="/production/daily-plan"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Tạo Daily Plan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
