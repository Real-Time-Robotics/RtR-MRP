"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
  Ban,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCostTargets } from "@/hooks/cost-optimization/use-cost-targets";

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: React.ElementType; label: string }
> = {
  DRAFT: { color: "bg-gray-100 text-gray-700", icon: Clock, label: "Draft" },
  ACTIVE: { color: "bg-blue-100 text-blue-700", icon: PlayCircle, label: "Active" },
  ON_TRACK: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "On Track" },
  AT_RISK: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "At Risk" },
  ACHIEVED: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Achieved" },
  CANCELLED: { color: "bg-gray-100 text-gray-700", icon: Ban, label: "Cancelled" },
};

export function TargetList() {
  const { data: targets, isLoading } = useCostTargets();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!targets || targets.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Chua co muc tieu nao
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Tao muc tieu giam chi phi dau tien
          </p>
          <Button className="mt-4" asChild>
            <Link href="/cost-optimization/roadmap/new">
              <Plus className="w-4 h-4 mr-1" />
              Tao muc tieu
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {targets.length} muc tieu chi phi
        </h2>
        <Button asChild>
          <Link href="/cost-optimization/roadmap/new">
            <Plus className="w-4 h-4 mr-1" />
            Tao muc tieu
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {targets.map(
          (target: {
            id: string;
            name: string;
            status: string;
            currentCost: number;
            targetCost: number;
            targetDate: string;
            product: { name: string; sku: string };
            totalActions: number;
            completedActions: number;
            averageProgress: number;
            achievedCost: number;
          }) => {
            const config = STATUS_CONFIG[target.status] || STATUS_CONFIG.DRAFT;
            const StatusIcon = config.icon;
            const totalReduction = target.currentCost - target.targetCost;
            const achievedReduction = target.currentCost - target.achievedCost;
            const progressPercent =
              totalReduction > 0
                ? Math.min(100, (achievedReduction / totalReduction) * 100)
                : 0;

            return (
              <Link
                key={target.id}
                href={`/cost-optimization/roadmap/${target.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        {target.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("gap-1", config.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {target.product.name} ({target.product.sku})
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {formatCurrency(target.currentCost)} →{" "}
                          <span className="text-green-600 font-medium">
                            {formatCurrency(target.targetCost)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Target: {formatDate(target.targetDate)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Giam {formatCurrency(totalReduction)} (
                            {target.currentCost > 0
                              ? (
                                  (totalReduction / target.currentCost) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %)
                          </span>
                          <span>{progressPercent.toFixed(0)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {target.completedActions}/{target.totalActions} actions
                          hoan thanh
                        </span>
                        <span>Avg progress: {target.averageProgress}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          }
        )}
      </div>
    </div>
  );
}
