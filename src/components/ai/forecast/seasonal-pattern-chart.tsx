"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { Calendar, Sun, Leaf, Snowflake, Flower2 } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface SeasonalData {
  period: string;
  value: number;
  type?: "peak" | "normal" | "low";
}

interface SeasonalPatternChartProps {
  data: SeasonalData[];
  title?: string;
  height?: number;
  showLegend?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSeasonIcon(period: string) {
  const month = period.toLowerCase();
  if (["jan", "feb", "dec", "01", "02", "12"].some((m) => month.includes(m))) {
    return <Snowflake className="h-4 w-4 text-blue-400" />;
  }
  if (["mar", "apr", "may", "03", "04", "05"].some((m) => month.includes(m))) {
    return <Flower2 className="h-4 w-4 text-pink-400" />;
  }
  if (["jun", "jul", "aug", "06", "07", "08"].some((m) => month.includes(m))) {
    return <Sun className="h-4 w-4 text-amber-400" />;
  }
  return <Leaf className="h-4 w-4 text-orange-400" />;
}

function getBarColor(type?: string, value?: number, avg?: number) {
  if (type === "peak") return "#22c55e"; // green
  if (type === "low") return "#f97316"; // orange
  if (value && avg) {
    if (value > avg * 1.2) return "#22c55e";
    if (value < avg * 0.8) return "#f97316";
  }
  return "#30a46c"; // green (primary)
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SeasonalPatternChart({
  data,
  title = "Seasonal Patterns",
  height = 300,
  showLegend = true,
}: SeasonalPatternChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-muted-foreground py-8">
            <Calendar className="h-5 w-5 mr-2" />
            <span>No seasonal data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const seasonalityIndex = max > 0 ? ((max - min) / avg) * 100 : 0;

  // Determine seasonality strength
  const seasonalityStrength =
    seasonalityIndex > 50
      ? "high"
      : seasonalityIndex > 25
        ? "medium"
        : seasonalityIndex > 10
          ? "low"
          : "none";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {title}
          </span>
          <Badge
            variant="outline"
            className={
              seasonalityStrength === "high"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                : seasonalityStrength === "medium"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            }
          >
            {seasonalityStrength} seasonality
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as SeasonalData;
                const variance = ((item.value - avg) / avg) * 100;

                return (
                  <div className="bg-background border rounded-lg shadow-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeasonIcon(item.period)}
                      <span className="font-medium">{item.period}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Demand:</span>
                        <span className="font-medium">{item.value.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">vs Avg:</span>
                        <span
                          className={
                            variance > 0
                              ? "text-green-600 font-medium"
                              : variance < 0
                                ? "text-orange-600 font-medium"
                                : ""
                          }
                        >
                          {variance > 0 ? "+" : ""}
                          {variance.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {showLegend && (
              <Legend
                content={() => (
                  <div className="flex justify-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Peak</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span>Normal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-500" />
                      <span>Low</span>
                    </div>
                  </div>
                )}
              />
            )}
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.type, entry.value, avg)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Peak Period</p>
            <p className="font-medium text-green-600">
              {data.reduce((max, d) => (d.value > max.value ? d : max), data[0]).period}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Low Period</p>
            <p className="font-medium text-orange-600">
              {data.reduce((min, d) => (d.value < min.value ? d : min), data[0]).period}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Variation</p>
            <p className="font-medium">{seasonalityIndex.toFixed(0)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MONTHLY HEATMAP
// =============================================================================

export function MonthlyHeatmap({
  data,
}: {
  data: Array<{ month: string; value: number }>;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));

  const getHeatColor = (value: number) => {
    const normalized = max > min ? (value - min) / (max - min) : 0.5;
    if (normalized > 0.75) return "bg-green-500";
    if (normalized > 0.5) return "bg-green-300";
    if (normalized > 0.25) return "bg-amber-300";
    return "bg-amber-500";
  };

  return (
    <div className="grid grid-cols-6 gap-1">
      {data.map((item, idx) => (
        <div
          key={idx}
          className={`p-2 rounded text-center text-xs ${getHeatColor(item.value)} text-white`}
          title={`${item.month}: ${item.value.toLocaleString()}`}
        >
          {item.month.slice(0, 3)}
        </div>
      ))}
    </div>
  );
}
