"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AnalysisList } from "@/components/cost-optimization/make-vs-buy/analysis-list";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";

export default function MakeVsBuyPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Make vs Buy Analysis"
        description="Phan tich quyet dinh tu san xuat hay mua ngoai"
        backHref="/cost-optimization"
        actions={<AIQuickAction context={{ type: "general" }} />}
      />
      <AnalysisList />
    </div>
  );
}
