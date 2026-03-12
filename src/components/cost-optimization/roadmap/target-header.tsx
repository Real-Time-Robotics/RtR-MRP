"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  PlayCircle,
  Ban,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

interface CostTargetData {
  id: string;
  name: string;
  currentCost: number;
  targetCost: number;
  targetDate: string;
  status: string;
  achievedCost?: number;
}

interface TargetHeaderProps {
  target: CostTargetData;
  onEdit?: () => void;
}

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

export function TargetHeader({ target, onEdit }: TargetHeaderProps) {
  const totalReduction = target.currentCost - target.targetCost;
  const achievedReduction = target.achievedCost
    ? target.currentCost - target.achievedCost
    : 0;
  const progressPercent =
    totalReduction > 0
      ? Math.min(100, (achievedReduction / totalReduction) * 100)
      : 0;
  const remainingGap = target.achievedCost
    ? target.achievedCost - target.targetCost
    : totalReduction;

  const config = STATUS_CONFIG[target.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              {target.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Target: {formatDate(target.targetDate)}
              </span>
              <Badge className={cn("gap-1", config.color)}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </Badge>
            </div>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Current</div>
              <div className="text-2xl font-bold">
                {formatCurrency(target.currentCost)}
              </div>
            </div>

            <div className="flex-1 mx-8">
              <Progress value={progressPercent} className="h-4" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Start</span>
                <span className="font-medium text-primary">
                  {progressPercent.toFixed(0)}% complete
                </span>
                <span>Target</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">Target</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(target.targetCost)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Reduction</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatCurrency(totalReduction)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Achieved</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(achievedReduction)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Remaining Gap</div>
              <div className="text-lg font-semibold text-orange-600">
                {formatCurrency(remainingGap)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Reduction %</div>
              <div className="text-lg font-semibold">
                {target.currentCost > 0
                  ? ((totalReduction / target.currentCost) * 100).toFixed(0)
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
