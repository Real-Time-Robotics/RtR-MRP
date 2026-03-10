"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Factory,
  ShoppingCart,
  Cog,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AutonomySummary } from "@/hooks/cost-optimization/use-autonomy";

interface AutonomySummaryCardsProps {
  summary: AutonomySummary;
}

export function AutonomySummaryCards({ summary }: AutonomySummaryCardsProps) {
  const cards = [
    {
      label: "Tu san xuat",
      value: summary.byStatus.MAKE,
      icon: <Factory className="w-4 h-4" />,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Dang phat trien",
      value: summary.byStatus.IN_DEVELOPMENT,
      icon: <Cog className="w-4 h-4" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Dang danh gia",
      value: summary.byStatus.EVALUATE,
      icon: <Search className="w-4 h-4" />,
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
    },
    {
      label: "Mua chien luoc",
      value: summary.byStatus.BUY_STRATEGIC,
      icon: <ShoppingCart className="w-4 h-4" />,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Phai mua",
      value: summary.byStatus.BUY_REQUIRED,
      icon: <ShoppingCart className="w-4 h-4" />,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "NDAA Compliant",
      value: `${summary.ndaaCompliantPercent}%`,
      icon: <ShieldCheck className="w-4 h-4" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="py-3 px-4">
            <div className={`flex items-center gap-1.5 mb-1 ${card.color}`}>
              {card.icon}
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
