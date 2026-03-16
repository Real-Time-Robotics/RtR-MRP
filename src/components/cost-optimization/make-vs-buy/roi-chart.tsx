"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { generateBreakEvenChartData } from "@/lib/cost-optimization/roi-calculations";

interface ROIChartProps {
  buyPrice: number;
  makeCost: number;
  investment: number;
  annualVolume: number;
  months?: number;
}

export function ROIChart({
  buyPrice,
  makeCost,
  investment,
  annualVolume,
  months = 24,
}: ROIChartProps) {
  const data = generateBreakEvenChartData(
    { buyPrice, makeCost, investment, annualVolume },
    months
  );

  const breakEvenMonth = data.find((d) => d.cumulativeSavings >= 0)?.month;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Bieu do Break-Even
          {breakEvenMonth != null && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Hoa von thang {breakEvenMonth})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                label={{ value: "Thang", position: "insideBottom", offset: -2, fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Loi nhuan tich luy",
                ]}
                labelFormatter={(label) => `Thang ${label}`}
              />
              <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="cumulativeSavings"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
