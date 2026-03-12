"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";
import {
  useSupplierSpend,
  useSupplierOpportunities,
} from "@/hooks/cost-optimization/use-supplier-opportunities";
import { SpendSummaryCards } from "@/components/cost-optimization/suppliers/spend-summary-cards";
import { SpendBySupplierChart } from "@/components/cost-optimization/suppliers/spend-by-supplier-chart";
import { OpportunitiesList } from "@/components/cost-optimization/suppliers/opportunities-list";

export default function SupplierOptimizationPage() {
  const { data: spendData, isLoading: loadingSpend } = useSupplierSpend();
  const { data: oppData, isLoading: loadingOpp } = useSupplierOpportunities();

  const isLoading = loadingSpend || loadingOpp;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Supplier Optimization"
        description="Phan tich va toi uu chi phi tu nha cung cap"
        backHref="/cost-optimization"
        actions={<AIQuickAction context={{ type: "supplier" }} />}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <SpendSummaryCards
            totalSpend={spendData?.summary.totalSpend || 0}
            supplierCount={spendData?.summary.supplierCount || 0}
            potentialSavings={oppData?.summary.totalPotentialSavings || 0}
            pendingActions={oppData?.summary.totalOpportunities || 0}
          />

          {/* Chart + Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SpendBySupplierChart data={spendData?.topSuppliers || []} />
            <div>
              <OpportunitiesList
                opportunities={oppData?.opportunities || []}
                totalSavings={oppData?.summary.totalPotentialSavings || 0}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
