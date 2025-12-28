"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  subcontractCost: number;
  otherCost: number;
  totalCost: number;
}

interface CostBreakdownChartProps {
  costs: CostBreakdown;
  title?: string;
}

export function CostBreakdownChart({ costs, title = "Cost Breakdown" }: CostBreakdownChartProps) {
  const items = [
    { label: "Material", value: costs.materialCost, color: "bg-blue-500" },
    { label: "Labor", value: costs.laborCost, color: "bg-green-500" },
    { label: "Overhead", value: costs.overheadCost, color: "bg-yellow-500" },
    { label: "Subcontract", value: costs.subcontractCost, color: "bg-purple-500" },
    { label: "Other", value: costs.otherCost, color: "bg-gray-500" },
  ].filter((item) => item.value > 0);

  const total = costs.totalCost || items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-medium">
                    ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
              </div>
            );
          })}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between font-medium">
              <span>Total Cost</span>
              <span>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
