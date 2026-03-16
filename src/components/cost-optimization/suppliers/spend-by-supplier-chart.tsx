"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface SpendItem {
  supplierName: string;
  totalSpend: number;
  percent?: number;
}

interface SpendBySupplierChartProps {
  data: SpendItem[];
}

export function SpendBySupplierChart({ data }: SpendBySupplierChartProps) {
  const chartData = data.map((d) => ({
    name: d.supplierName.length > 15 ? d.supplierName.slice(0, 15) + "..." : d.supplierName,
    spend: Math.round(d.totalSpend),
    percent: d.percent ? Math.round(d.percent * 10) / 10 : 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Spend theo NCC (Top 10)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, "Spend"]}
              />
              <Bar dataKey="spend" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
