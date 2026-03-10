"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
} from "lucide-react";
import { ROIResult } from "@/lib/cost-optimization/roi-calculations";

interface ROICalculatorProps {
  roi: ROIResult;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ROICalculator({ roi }: ROICalculatorProps) {
  const cards = [
    {
      label: "Tiet kiem / don vi",
      value: formatCurrency(roi.savingsPerUnit),
      sub: `${roi.savingsPercent.toFixed(1)}%`,
      icon: <DollarSign className="w-4 h-4" />,
      color: roi.savingsPerUnit > 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Tiet kiem hang nam",
      value: formatCurrency(roi.annualSavings),
      sub: null,
      icon: <TrendingUp className="w-4 h-4" />,
      color: roi.annualSavings > 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Hoa von",
      value: `${roi.breakEvenMonths} thang`,
      sub: `${roi.breakEvenUnits.toLocaleString()} don vi`,
      icon: <Clock className="w-4 h-4" />,
      color:
        roi.breakEvenMonths <= 12
          ? "text-green-600"
          : roi.breakEvenMonths <= 24
          ? "text-yellow-600"
          : "text-red-600",
    },
    {
      label: "Hoan von",
      value: `${roi.paybackMonths} thang`,
      sub: null,
      icon: <Clock className="w-4 h-4" />,
      color:
        roi.paybackMonths <= 12
          ? "text-green-600"
          : roi.paybackMonths <= 24
          ? "text-yellow-600"
          : "text-red-600",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Ket qua ROI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <div key={card.label} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                {card.icon}
                {card.label}
              </div>
              <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
              {card.sub && (
                <div className="text-xs text-muted-foreground">{card.sub}</div>
              )}
            </div>
          ))}
        </div>

        {/* NPV Table */}
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Net Present Value (NPV)</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { year: "1 Nam", value: roi.npv1Year },
              { year: "3 Nam", value: roi.npv3Year },
              { year: "5 Nam", value: roi.npv5Year },
            ].map((npv) => (
              <div key={npv.year} className="p-2 bg-muted/30 rounded">
                <div className="text-xs text-muted-foreground">{npv.year}</div>
                <div
                  className={`text-sm font-semibold ${
                    npv.value >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(npv.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
