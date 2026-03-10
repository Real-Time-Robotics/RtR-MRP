"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Building2, TrendingDown, AlertCircle } from "lucide-react";

interface SpendSummaryCardsProps {
  totalSpend: number;
  supplierCount: number;
  potentialSavings: number;
  pendingActions: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export function SpendSummaryCards({
  totalSpend,
  supplierCount,
  potentialSavings,
  pendingActions,
}: SpendSummaryCardsProps) {
  const cards = [
    {
      title: "Tong Spend", value: formatCurrency(totalSpend), subtitle: "YTD",
      icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "So NCC", value: String(supplierCount), subtitle: "active",
      icon: Building2, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Tiet kiem Tiem nang", value: formatCurrency(potentialSavings), subtitle: "/nam",
      icon: TrendingDown, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Actions Pending", value: String(pendingActions), subtitle: "can xu ly",
      icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className="text-xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
