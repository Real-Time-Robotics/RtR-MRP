"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  savings: number;
}

interface SavingsTrendChartProps {
  data: MonthlyData[];
}

export function SavingsTrendChart({ data }: SavingsTrendChartProps) {
  // Calculate cumulative savings
  let cumulative = 0;
  const chartData = data.map((d) => {
    cumulative += d.savings;
    return {
      ...d,
      cumulative,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Savings Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value))]}
                labelStyle={{ color: "#333" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="savings"
                name="Monthly Savings"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
