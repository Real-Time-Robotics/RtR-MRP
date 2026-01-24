"use client";

import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
} from "lucide-react";
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
  yieldTrend = 0,
  pendingInspections,
  openNCRs,
  openCAPAs,
}: QualityStatsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("quality.firstPassYield")}</p>
            <p className="text-2xl font-bold text-green-600">{firstPassYield}%</p>
            {yieldTrend !== 0 && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  yieldTrend > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {yieldTrend > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {yieldTrend > 0 ? "+" : ""}
                {yieldTrend.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-700" />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("quality.pendingInspections")}</p>
            <p className="text-2xl font-bold">{pendingInspections}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <ClipboardCheck className="h-6 w-6 text-blue-700" />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("quality.openNCRs")}</p>
            <p className="text-2xl font-bold text-amber-600">{openNCRs}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-700" />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("quality.openCAPAs")}</p>
            <p className="text-2xl font-bold text-purple-600">{openCAPAs}</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <Wrench className="h-6 w-6 text-purple-700" />
          </div>
        </div>
      </Card>
    </div>
  );
}
