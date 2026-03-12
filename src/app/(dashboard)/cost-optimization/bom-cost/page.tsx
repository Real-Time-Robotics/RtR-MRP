"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ProductSelector } from "@/components/cost-optimization/bom-cost/product-selector";
import { CostSummaryCards } from "@/components/cost-optimization/bom-cost/cost-summary-cards";
import { MakeBuyPieChart } from "@/components/cost-optimization/bom-cost/make-buy-pie-chart";
import { CostByModuleChart } from "@/components/cost-optimization/bom-cost/cost-by-module-chart";
import { CostBreakdownTable } from "@/components/cost-optimization/bom-cost/cost-breakdown-table";
import { BomCostExport } from "@/components/cost-optimization/bom-cost/bom-cost-export";
import { useBomCost } from "@/hooks/cost-optimization/use-bom-cost";
import { Badge } from "@/components/ui/badge";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";

export default function BomCostAnalysisPage() {
  const [productId, setProductId] = useState<string | null>(null);
  const { data, isLoading, error } = useBomCost(productId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="BOM Cost Analysis"
        description="Phan tich chi phi chi tiet theo linh kien, nguon goc Make vs Buy"
        backHref="/cost-optimization"
        actions={
          <div className="flex items-center gap-2">
            {data && data.bomHeader && (
              <BomCostExport
                productName={data.product.name}
                productSku={data.product.sku}
                bomVersion={data.bomHeader.version}
                items={data.items}
                totalCost={data.totalCost}
              />
            )}
            <AIQuickAction context={{ type: "bom" }} />
          </div>
        }
      />

      {/* Product Selector */}
      <div className="flex items-center gap-4">
        <ProductSelector selectedId={productId} onSelect={setProductId} />
        {data?.bomHeader && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">v{data.bomHeader.version}</Badge>
            <Badge
              variant={data.bomHeader.status === "active" ? "default" : "secondary"}
            >
              {data.bomHeader.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-20 text-red-600">
          Khong the tai du lieu. Vui long thu lai.
        </div>
      )}

      {/* No product selected */}
      {!productId && !isLoading && (
        <div className="text-center py-20 text-muted-foreground">
          Chon san pham de xem phan tich chi phi BOM
        </div>
      )}

      {/* No BOM */}
      {data && !data.bomHeader && (
        <div className="text-center py-20 text-muted-foreground">
          San pham nay chua co BOM. Vui long tao BOM truoc.
        </div>
      )}

      {/* Data loaded */}
      {data && data.bomHeader && (
        <>
          {/* Summary Cards */}
          <CostSummaryCards
            totalCost={data.totalCost}
            makeCost={data.makeCost}
            buyCost={data.buyCost}
            makePercent={data.makePercent}
            buyPercent={data.buyPercent}
            targetCost={data.targetCost}
            costGap={data.costGap}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MakeBuyPieChart
              makeCost={data.makeCost}
              buyCost={data.buyCost}
              makePercent={data.makePercent}
              buyPercent={data.buyPercent}
            />
            <CostByModuleChart modules={data.byModule} />
          </div>

          {/* Breakdown Table */}
          <CostBreakdownTable items={data.items} />
        </>
      )}
    </div>
  );
}
