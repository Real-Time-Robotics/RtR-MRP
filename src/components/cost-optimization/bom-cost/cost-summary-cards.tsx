"use client";

import { DollarSign, Factory, ShoppingCart, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface CostSummaryCardsProps {
  totalCost: number;
  makeCost: number;
  buyCost: number;
  makePercent: number;
  buyPercent: number;
  targetCost: number | null;
  costGap: number | null;
}

export function CostSummaryCards({
  totalCost,
  makeCost,
  buyCost,
  makePercent,
  buyPercent,
  targetCost,
  costGap,
}: CostSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Tổng chi phí</p>
          </div>
          <p className="text-2xl font-mono font-bold">{formatCurrency(totalCost)}</p>
          <p className="text-xs text-muted-foreground mt-1">per unit</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-muted-foreground">Tự sản xuất (Make)</p>
          </div>
          <p className="text-2xl font-mono font-bold text-blue-700">
            {formatCurrency(makeCost)}
          </p>
          <p className="text-xs text-blue-600 mt-1">{makePercent.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-muted-foreground">Mua ngoài (Buy)</p>
          </div>
          <p className="text-2xl font-mono font-bold text-gray-700">
            {formatCurrency(buyCost)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{buyPercent.toFixed(1)}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-orange-500" />
            <p className="text-sm text-muted-foreground">
              {targetCost ? "Khoảng cách mục tiêu" : "Mục tiêu"}
            </p>
          </div>
          {targetCost ? (
            <>
              <p className={`text-2xl font-mono font-bold ${costGap && costGap > 0 ? "text-red-600" : "text-green-600"}`}>
                {costGap && costGap > 0 ? `- ${formatCurrency(costGap)}` : "Đạt mục tiêu"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Target: {formatCurrency(targetCost)}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-mono font-bold text-muted-foreground">—</p>
              <p className="text-xs text-muted-foreground mt-1">Chưa thiết lập</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
