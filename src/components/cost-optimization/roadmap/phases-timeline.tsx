"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Phase {
  id: string;
  name: string;
  targetCost: number;
  targetDate: string;
  status: string;
  actions: { id: string; status: string; progressPercent: number }[];
}

interface PhasesTimelineProps {
  targetId: string;
  phases: Phase[];
  startCost: number;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: React.ElementType; badge: string }
> = {
  PLANNED: {
    color: "border-gray-300 bg-gray-50",
    icon: Clock,
    badge: "bg-gray-100 text-gray-700",
  },
  IN_PROGRESS: {
    color: "border-blue-500 bg-blue-50",
    icon: PlayCircle,
    badge: "bg-blue-100 text-blue-700",
  },
  COMPLETED: {
    color: "border-green-500 bg-green-50",
    icon: CheckCircle,
    badge: "bg-green-100 text-green-700",
  },
  DELAYED: {
    color: "border-red-500 bg-red-50",
    icon: AlertCircle,
    badge: "bg-red-100 text-red-700",
  },
};

export function PhasesTimeline({
  targetId,
  phases,
  startCost,
}: PhasesTimelineProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Phases</CardTitle>
        <Button size="sm" asChild>
          <Link href={`/cost-optimization/roadmap/${targetId}/phases/new`}>
            <Plus className="w-4 h-4 mr-1" />
            Add Phase
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-stretch gap-4 overflow-x-auto pb-4">
          {/* Start marker */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-medium">Start</span>
            </div>
            <div className="mt-2 text-center">
              <div className="text-lg font-bold">{formatCurrency(startCost)}</div>
            </div>
          </div>

          {phases.map((phase) => {
            const config = STATUS_CONFIG[phase.status] || STATUS_CONFIG.PLANNED;
            const Icon = config.icon;
            const completedCount = phase.actions.filter(
              (a) => a.status === "COMPLETED_ACTION"
            ).length;
            const progress =
              phase.actions.length > 0
                ? (completedCount / phase.actions.length) * 100
                : 0;

            return (
              <div key={phase.id} className="flex items-stretch">
                <div className="flex items-center px-2">
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>

                <Link
                  href={`/cost-optimization/roadmap/${targetId}?phase=${phase.id}`}
                  className="flex-shrink-0"
                >
                  <div
                    className={cn(
                      "w-48 p-4 rounded-lg border-2 transition-all hover:shadow-md",
                      config.color
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate">
                        {phase.name}
                      </span>
                      <Icon className="w-4 h-4 flex-shrink-0" />
                    </div>

                    <div className="text-xl font-bold mb-1">
                      {formatCurrency(phase.targetCost)}
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">
                      {formatDate(phase.targetDate)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Actions</span>
                        <span>
                          {completedCount}/{phase.actions.length}
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>

                    <Badge className={cn("mt-2", config.badge)}>
                      {phase.status.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              </div>
            );
          })}

          {/* Target marker */}
          <div className="flex items-stretch">
            <div className="flex items-center px-2">
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex-shrink-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="mt-2 text-center">
                <div className="text-xs text-muted-foreground">Target</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
