"use client";

import { use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import { useCostTargetDetail } from "@/hooks/cost-optimization/use-cost-targets";
import { PhaseForm } from "@/components/cost-optimization/roadmap/phase-form";

export default function NewPhasePage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = use(params);
  const { data: target, isLoading } = useCostTargetDetail(targetId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Them Phase"
        description={target?.name || ""}
        backHref={`/cost-optimization/roadmap/${targetId}`}
      />
      <PhaseForm targetId={targetId} targetName={target?.name || ""} />
    </div>
  );
}
