"use client";

import { use } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Loader2 } from "lucide-react";
import { useSubstituteDetail } from "@/hooks/cost-optimization/use-substitutes";
import { EvaluationDetail } from "@/components/cost-optimization/substitutes/evaluation-detail";
import { SpecsComparison } from "@/components/cost-optimization/substitutes/specs-comparison";

export default function SubstituteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: evaluation, isLoading, mutate } = useSubstituteDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Khong tim thay danh gia
      </div>
    );
  }

  const specsComparison = Array.isArray(evaluation.specsComparisonJson)
    ? (evaluation.specsComparisonJson as {
        specName: string;
        originalValue: string;
        substituteValue: string;
        matchType: "exact" | "better" | "acceptable" | "worse" | "incompatible";
        notes?: string;
      }[])
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Danh gia: ${evaluation.originalPart.partNumber} → ${evaluation.substitutePart.partNumber}`}
        description={`${evaluation.originalPart.name} → ${evaluation.substitutePart.name}`}
        backHref="/cost-optimization/substitutes"
      />

      <EvaluationDetail evaluation={evaluation} onUpdate={() => mutate()} />

      {specsComparison.length > 0 && (
        <SpecsComparison
          originalPart={evaluation.originalPart}
          substitutePart={evaluation.substitutePart}
          specs={specsComparison}
          overallScore={evaluation.compatibilityScore}
        />
      )}
    </div>
  );
}
