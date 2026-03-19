"use client";

import { PageHeader } from "@/components/layout/page-header";
import { EvaluationList } from "@/components/cost-optimization/substitutes/evaluation-list";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";

export default function SubstitutesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Substitute Finder"
        description="Tìm kiếm và đánh giá linh kiện thay thế rẻ hơn"
        backHref="/cost-optimization"
        actions={<AIQuickAction context={{ type: "general" }} />}
      />
      <EvaluationList />
    </div>
  );
}
