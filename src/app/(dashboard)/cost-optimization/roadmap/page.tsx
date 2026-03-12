"use client";

import { PageHeader } from "@/components/layout/page-header";
import { TargetList } from "@/components/cost-optimization/roadmap/target-list";
import { AIQuickAction } from "@/components/cost-optimization/shared/ai-quick-action";
import { ExportButton } from "@/components/cost-optimization/shared/export-button";

export default function CostRoadmapPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Cost Target Roadmap"
        description="Lo trinh giam chi phi voi phases va actions"
        backHref="/cost-optimization"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton type="roadmap" label="Export Roadmap" />
            <AIQuickAction context={{ type: "general" }} />
          </div>
        }
      />
      <TargetList />
    </div>
  );
}
