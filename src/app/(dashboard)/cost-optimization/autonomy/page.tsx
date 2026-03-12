"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import { useAutonomy } from "@/hooks/cost-optimization/use-autonomy";
import { ProductSelector } from "@/components/cost-optimization/bom-cost/product-selector";
import { AutonomyGauge } from "@/components/cost-optimization/autonomy/autonomy-gauge";
import { AutonomySummaryCards } from "@/components/cost-optimization/autonomy/autonomy-summary-cards";
import { StatusBreakdown } from "@/components/cost-optimization/autonomy/status-breakdown";
import { PartsTable } from "@/components/cost-optimization/autonomy/parts-table";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";
import { ExportButton } from "@/components/cost-optimization/shared/export-button";

export default function AutonomyPage() {
  const [productId, setProductId] = useState<string | null>(null);
  const { data, isLoading } = useAutonomy(productId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Autonomy Tracker"
        description="Theo doi muc do tu chu san xuat"
        backHref="/cost-optimization"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton type="autonomy" label="Export" />
            <AIQuickAction context={{ type: "general" }} />
          </div>
        }
      />

      {/* Product filter */}
      <div className="max-w-xs">
        <ProductSelector
          selectedId={productId}
          onSelect={(val) => setProductId(val || null)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-muted-foreground">
          Khong co du lieu autonomy. Hay them Part Autonomy Status vao he thong.
        </div>
      ) : (
        <>
          {/* Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AutonomyGauge
              percent={data.summary.autonomyPercent}
              label="Tu chu san xuat"
              size="lg"
            />
            <AutonomyGauge
              percent={data.summary.costAutonomyPercent}
              label="Tu chu chi phi"
              size="lg"
            />
            <AutonomyGauge
              percent={data.summary.ndaaCompliantPercent}
              label="NDAA Compliant"
              size="lg"
            />
          </div>

          {/* Summary cards */}
          <AutonomySummaryCards summary={data.summary} />

          {/* Chart + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <StatusBreakdown summary={data.summary} />
            </div>
            <div className="lg:col-span-2">
              <PartsTable parts={data.parts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
