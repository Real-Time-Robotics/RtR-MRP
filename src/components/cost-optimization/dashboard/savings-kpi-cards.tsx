"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  PlayCircle,
  Target,
  CheckCircle,
  Crosshair,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KPIs {
  ytdSavings: number;
  inProgressActions: number;
  pipelineSavings: number;
  completedActions: number;
  activeTargets: number;
}

interface SavingsKPICardsProps {
  kpis: KPIs;
}

export function SavingsKPICards({ kpis }: SavingsKPICardsProps) {
  const cards = [
    {
      title: "YTD Savings",
      value: formatCurrency(kpis.ytdSavings),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Completed Actions",
      value: kpis.completedActions.toString(),
      subtitle: "actions",
      icon: CheckCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "In Progress",
      value: kpis.inProgressActions.toString(),
      subtitle: "actions",
      icon: PlayCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Pipeline",
      value: formatCurrency(kpis.pipelineSavings),
      subtitle: "expected",
      icon: Target,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      title: "Active Targets",
      value: kpis.activeTargets.toString(),
      subtitle: "targets",
      icon: Crosshair,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                <div className={cn("p-2 rounded-lg", card.bg)}>
                  <Icon className={cn("w-5 h-5", card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
