"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface SourceData {
  source: string;
  amount: number;
  percent: number;
}

interface SavingsBySourceChartProps {
  data: SourceData[];
}

const SOURCE_LABELS: Record<string, string> = {
  SAVINGS_MAKE_VS_BUY: "Make vs Buy",
  SAVINGS_SUBSTITUTE: "Substitute",
  SUPPLIER_NEGOTIATION: "Supplier Negotiation",
  CONSOLIDATION: "Consolidation",
  PROCESS_IMPROVEMENT: "Process",
  SAVINGS_DESIGN_CHANGE: "Design Change",
  SAVINGS_OTHER: "Other",
};

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6b7280",
];

export function SavingsBySourceChart({ data }: SavingsBySourceChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: SOURCE_LABELS[d.source] || d.source,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Savings by Source (YTD)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Chua co du lieu savings
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} layout="vertical">
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Savings",
                  ]}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {chartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
