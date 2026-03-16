"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActualVsPlanData {
  month: string;
  actual: number;
  plan: number;
}

interface ActualVsPlanChartProps {
  data: ActualVsPlanData[];
  totalActual: number;
  totalPlan: number;
}

export function ActualVsPlanChart({
  data,
  totalActual,
  totalPlan,
}: ActualVsPlanChartProps) {
  // Calculate cumulative values
  let cumulativeActual = 0;
  let cumulativePlan = 0;
  const chartData = data.map((d) => {
    cumulativeActual += d.actual;
    cumulativePlan += d.plan;
    return {
      ...d,
      cumulativeActual,
      cumulativePlan,
    };
  });

  const variance = totalPlan > 0
    ? ((totalActual - totalPlan) / totalPlan) * 100
    : 0;
  const isOnTrack = totalActual >= totalPlan;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Actual vs Plan
          </CardTitle>
          <Badge
            className={cn(
              isOnTrack
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {isOnTrack ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {isOnTrack ? "On Track" : "Behind"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value))]}
                labelStyle={{ color: "#333" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativePlan"
                name="Plan"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeActual"
                name="Actual"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted flex items-center justify-between text-sm">
          <span>
            Actual: <span className="font-semibold text-green-600">{formatCurrency(totalActual)}</span>
            {" vs "}
            Plan: <span className="font-semibold text-gray-600">{formatCurrency(totalPlan)}</span>
          </span>
          <span
            className={cn(
              "font-semibold",
              isOnTrack ? "text-green-600" : "text-red-600"
            )}
          >
            {variance >= 0 ? "+" : ""}
            {variance.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
