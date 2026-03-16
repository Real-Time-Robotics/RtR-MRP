"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSavingsDashboard } from "@/hooks/cost-optimization/use-savings-dashboard";
import { SavingsKPICards } from "@/components/cost-optimization/dashboard/savings-kpi-cards";
import { SavingsBySourceChart } from "@/components/cost-optimization/dashboard/savings-by-source-chart";
import { SavingsTrendChart } from "@/components/cost-optimization/dashboard/savings-trend-chart";
import { TopContributorsTable } from "@/components/cost-optimization/dashboard/top-contributors-table";
import { InProgressActions } from "@/components/cost-optimization/dashboard/in-progress-actions";
import { ActualVsPlanChart } from "@/components/cost-optimization/dashboard/actual-vs-plan-chart";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";
import { ExportButton } from "@/components/cost-optimization/shared/export-button";

export default function SavingsDashboardPage() {
  const { data, isLoading } = useSavingsDashboard();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Savings Dashboard"
        description="Theo doi savings da dat duoc va dang tien hanh"
        backHref="/cost-optimization"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="text-xs">
              <Link href="/cost-optimization/analyze">
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Run Analysis
              </Link>
            </Button>
            <ExportButton type="savings" label="Export Savings" />
            <AIQuickAction context={{ type: "general" }} />
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <SavingsKPICards kpis={data.kpis} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SavingsBySourceChart data={data.savingsBySource} />
            <SavingsTrendChart data={data.monthlyTrend} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopContributorsTable contributors={data.topContributors} />
            <InProgressActions actions={data.inProgress} />
          </div>

          {data.actualVsPlan && (
            <ActualVsPlanChart
              data={data.actualVsPlan.data}
              totalActual={data.actualVsPlan.totalActual}
              totalPlan={data.actualVsPlan.totalPlan}
            />
          )}
        </>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          Khong the tai du lieu
        </div>
      )}
    </div>
  );
}
