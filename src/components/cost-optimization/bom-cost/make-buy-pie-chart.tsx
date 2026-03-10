"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

interface MakeBuyPieChartProps {
  makeCost: number;
  buyCost: number;
  makePercent: number;
  buyPercent: number;
}

const COLORS = {
  make: "#3182CE",
  buy: "#718096",
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { name: string; value: number; percent: number; fill: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3">
      <p className="font-medium">{item.name}</p>
      <p className="font-mono text-sm">{formatCurrency(item.value)}</p>
      <p className="text-xs text-muted-foreground">{item.payload.percent.toFixed(1)}%</p>
    </div>
  );
}

export function MakeBuyPieChart({
  makeCost,
  buyCost,
  makePercent,
  buyPercent,
}: MakeBuyPieChartProps) {
  const data = [
    { name: "Make (Tự SX)", value: makeCost, percent: makePercent, fill: COLORS.make },
    { name: "Buy (Mua ngoài)", value: buyCost, percent: buyPercent, fill: COLORS.buy },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Make vs Buy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Make vs Buy</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="value"
              strokeWidth={2}
              stroke="#fff"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-sm">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
