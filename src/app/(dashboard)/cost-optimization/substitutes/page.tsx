"use client";

import { PageHeader } from "@/components/layout/page-header";
import { EvaluationList } from "@/components/cost-optimization/substitutes/evaluation-list";

export default function SubstitutesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Substitute Finder"
        description="Tim kiem va danh gia linh kien thay the re hon"
        backHref="/cost-optimization"
      />
      <EvaluationList />
    </div>
  );
}
