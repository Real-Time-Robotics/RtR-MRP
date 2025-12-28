"use client";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

interface ForecastChartProps {
  data: Array<{
    period: string;
    actual?: number;
    forecast?: number;
    lowerBound?: number;
    upperBound?: number;
  }>;
}

export function ForecastChart({ data }: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No forecast data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400} minWidth={300} minHeight={300}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Legend />

        {/* Confidence band */}
        <Area
          type="monotone"
          dataKey="upperBound"
          stroke="none"
          fill="#93c5fd"
          fillOpacity={0.3}
          name="Upper Bound"
        />
        <Area
          type="monotone"
          dataKey="lowerBound"
          stroke="none"
          fill="#ffffff"
          fillOpacity={1}
          name="Lower Bound"
        />

        {/* Historical data */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#1e40af"
          strokeWidth={2}
          dot={{ fill: "#1e40af" }}
          name="Actual"
        />

        {/* Forecast line */}
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: "#f97316" }}
          name="Forecast"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
