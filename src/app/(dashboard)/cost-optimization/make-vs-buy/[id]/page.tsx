"use client";

import { use } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Factory,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { useMakeVsBuyDetail } from "@/hooks/cost-optimization/use-make-vs-buy";
import { ROICalculator } from "@/components/cost-optimization/make-vs-buy/roi-calculator";
import { ROIChart } from "@/components/cost-optimization/make-vs-buy/roi-chart";
import { ScoringDisplay } from "@/components/cost-optimization/make-vs-buy/scoring-display";
import { CapabilityGaps } from "@/components/cost-optimization/make-vs-buy/capability-gaps";

interface CapabilityGap {
  area: string;
  current: number;
  required: number;
  gap: number;
  action: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

const statusLabels: Record<string, string> = {
  ANALYSIS_DRAFT: "Nhap",
  ANALYSIS_SUBMITTED: "Da nop",
  ANALYSIS_UNDER_REVIEW: "Dang xem xet",
  ANALYSIS_DECIDED: "Da quyet dinh",
  ANALYSIS_ARCHIVED: "Luu tru",
};

const decisionLabels: Record<string, string> = {
  DECIDE_MAKE: "Tu san xuat",
  DECIDE_BUY: "Mua ngoai",
  DECIDE_HYBRID: "Ket hop",
  DECIDE_DEFER: "Hoan lai",
};

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: analysis, isLoading, mutate } = useMakeVsBuyDetail(id);
  const [deciding, setDeciding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDecision = async (decision: string) => {
    setDeciding(true);
    try {
      const res = await fetch(`/api/cost-optimization/make-vs-buy/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        mutate();
      }
    } catch {
      // ignore
    }
    setDeciding(false);
  };

  const handleDelete = async () => {
    if (!confirm("Ban co chac muon xoa phan tich nay?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cost-optimization/make-vs-buy/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/cost-optimization/make-vs-buy");
      }
    } catch {
      // ignore
    }
    setDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Khong tim thay phan tich
      </div>
    );
  }

  const roi = {
    savingsPerUnit: analysis.savingsPerUnit,
    savingsPercent:
      analysis.buyPrice > 0
        ? (analysis.savingsPerUnit / analysis.buyPrice) * 100
        : 0,
    annualSavings: analysis.annualSavings,
    breakEvenUnits: analysis.breakEvenUnits,
    breakEvenMonths: analysis.breakEvenMonths,
    npv1Year: 0,
    npv3Year: analysis.npv3Year,
    npv5Year: 0,
    paybackMonths:
      analysis.annualSavings > 0
        ? Math.ceil((analysis.makeInvestmentRequired / analysis.annualSavings) * 12)
        : 999,
  };

  const gaps: CapabilityGap[] = Array.isArray(analysis.makeCapabilityGapsJson)
    ? (analysis.makeCapabilityGapsJson as CapabilityGap[])
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Phan tich: ${analysis.part.partNumber}`}
        description={analysis.part.name}
        backHref="/cost-optimization/make-vs-buy"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status & Decision */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {statusLabels[analysis.status] || analysis.status}
                  </Badge>
                  {analysis.decision && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {decisionLabels[analysis.decision] || analysis.decision}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!analysis.decision && (
                    <Select onValueChange={handleDecision} disabled={deciding}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Ra quyet dinh..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DECIDE_MAKE">Tu san xuat</SelectItem>
                        <SelectItem value="DECIDE_BUY">Mua ngoai</SelectItem>
                        <SelectItem value="DECIDE_HYBRID">Ket hop</SelectItem>
                        <SelectItem value="DECIDE_DEFER">Hoan lai</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buy vs Make comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-orange-500" />
                  Mua ngoai
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gia mua</span>
                  <span className="font-mono">{formatCurrency(analysis.buyPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">MOQ</span>
                  <span>{analysis.buyMOQ.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead time</span>
                  <span>{analysis.buyLeadTimeDays} ngay</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Factory className="w-4 h-4 text-blue-500" />
                  Tu san xuat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Chi phi</span>
                  <span className="font-mono">{formatCurrency(analysis.makeCostEstimate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Von dau tu</span>
                  <span className="font-mono">
                    {formatCurrency(analysis.makeInvestmentRequired)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead time</span>
                  <span>{analysis.makeLeadTimeDays} ngay</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timeline</span>
                  <span>{analysis.makeTimelineMonths} thang</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ROI Chart */}
          <ROIChart
            buyPrice={analysis.buyPrice}
            makeCost={analysis.makeCostEstimate}
            investment={analysis.makeInvestmentRequired}
            annualVolume={analysis.annualVolumeEstimate}
          />

          {/* Capability Gaps */}
          {gaps.length > 0 && <CapabilityGaps gaps={gaps} />}
        </div>

        {/* Right: Scores */}
        <div className="space-y-4">
          <ROICalculator roi={roi} />
          <ScoringDisplay
            financialScore={analysis.financialScore}
            capabilityScore={analysis.capabilityScore}
            strategicScore={analysis.strategicScore}
            overallScore={analysis.overallScore}
            recommendation={analysis.recommendation}
            rationale={analysis.recommendationRationale}
            conditions={analysis.conditions}
          />
        </div>
      </div>
    </div>
  );
}
