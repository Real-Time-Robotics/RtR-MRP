"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import { useCostTargetDetail } from "@/hooks/cost-optimization/use-cost-targets";
import { ActionForm } from "@/components/cost-optimization/roadmap/action-form";

export default function NewActionPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = use(params);
  const searchParams = useSearchParams();
  const phaseId = searchParams.get("phaseId") || "";
  const { data: target, isLoading } = useCostTargetDetail(targetId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Find phase name
  const phase = target?.phases?.find(
    (p: { id: string }) => p.id === phaseId
  );

  // If no phaseId specified, pick the first phase
  const effectivePhaseId = phaseId || target?.phases?.[0]?.id || "";
  const phaseName = phase?.name || target?.phases?.[0]?.name || "Phase";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Them Action"
        description={`${target?.name || ""} — ${phaseName}`}
        backHref={`/cost-optimization/roadmap/${targetId}`}
      />
      <ActionForm
        targetId={targetId}
        phaseId={effectivePhaseId}
        phaseName={phaseName}
      />
    </div>
  );
}
