"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import { useCostTargetDetail } from "@/hooks/cost-optimization/use-cost-targets";
import { TargetHeader } from "@/components/cost-optimization/roadmap/target-header";
import { PhasesTimeline } from "@/components/cost-optimization/roadmap/phases-timeline";
import { ActionsTable } from "@/components/cost-optimization/roadmap/actions-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TargetDetailPage({
  params,
}: {
  params: Promise<{ targetId: string }>;
}) {
  const { targetId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: target, isLoading } = useCostTargetDetail(targetId);

  const selectedPhaseId = searchParams.get("phase") || "all";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Khong tim thay muc tieu
      </div>
    );
  }

  // Collect all actions, optionally filtered by phase
  const allActions =
    selectedPhaseId === "all"
      ? target.phases.flatMap(
          (p: { actions: unknown[] }) => p.actions
        )
      : target.phases
          .filter((p: { id: string }) => p.id === selectedPhaseId)
          .flatMap((p: { actions: unknown[] }) => p.actions);

  return (
    <div className="space-y-4">
      <PageHeader
        title={target.name}
        description={`${target.product.name} (${target.product.sku})`}
        backHref="/cost-optimization/roadmap"
      />

      <TargetHeader
        target={target}
        onEdit={() =>
          router.push(`/cost-optimization/roadmap/${targetId}`)
        }
      />

      <PhasesTimeline
        targetId={targetId}
        phases={target.phases}
        startCost={target.currentCost}
      />

      {/* Phase filter + Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Actions</h2>
          <Select
            value={selectedPhaseId}
            onValueChange={(v) => {
              const url = new URL(window.location.href);
              if (v === "all") {
                url.searchParams.delete("phase");
              } else {
                url.searchParams.set("phase", v);
              }
              router.push(url.pathname + url.search);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tat ca phases</SelectItem>
              {target.phases.map((p: { id: string; name: string }) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ActionsTable
          targetId={targetId}
          phaseId={selectedPhaseId !== "all" ? selectedPhaseId : undefined}
          actions={allActions}
        />
      </div>
    </div>
  );
}
