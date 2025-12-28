"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface VarianceCardProps {
  title: string;
  standardValue: number;
  actualValue: number;
  variance: number;
  varianceType: "FAVORABLE" | "UNFAVORABLE" | "NONE";
  unit?: string;
  description?: string;
}

export function VarianceCard({
  title,
  standardValue,
  actualValue,
  variance,
  varianceType,
  unit = "$",
  description,
}: VarianceCardProps) {
  const getVarianceIcon = () => {
    if (varianceType === "FAVORABLE") return <TrendingUp className="h-4 w-4" />;
    if (varianceType === "UNFAVORABLE") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getVarianceBadge = () => {
    if (varianceType === "FAVORABLE") {
      return <Badge className="bg-green-100 text-green-800">Favorable</Badge>;
    }
    if (varianceType === "UNFAVORABLE") {
      return <Badge className="bg-red-100 text-red-800">Unfavorable</Badge>;
    }
    return <Badge variant="secondary">No Variance</Badge>;
  };

  const formatValue = (value: number) => {
    if (unit === "$") {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${unit}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {getVarianceBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Standard</span>
            <span>{formatValue(standardValue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Actual</span>
            <span>{formatValue(actualValue)}</span>
          </div>
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">Variance</span>
              <span
                className={`flex items-center gap-1 font-medium ${
                  varianceType === "FAVORABLE"
                    ? "text-green-600"
                    : varianceType === "UNFAVORABLE"
                    ? "text-red-600"
                    : ""
                }`}
              >
                {getVarianceIcon()}
                {formatValue(Math.abs(variance))}
              </span>
            </div>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground pt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
