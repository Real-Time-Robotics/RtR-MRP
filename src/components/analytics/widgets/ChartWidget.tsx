"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { WidgetContainer } from "./WidgetContainer";
import { cn } from "@/lib/utils";
import type {
  WidgetType,
  ChartData,
  ChartDataPoint,
  WidgetDisplayConfig,
} from "@/lib/analytics/types";

// Default colors palette
const DEFAULT_COLORS = [
  "#4F46E5", // Primary indigo
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

export interface ChartWidgetProps {
  id: string;
  title: string;
  titleVi?: string;
  widgetType: WidgetType;
  initialData?: ChartData | null;
  displayConfig?: WidgetDisplayConfig;
  refreshInterval?: number;
  onDrillDown?: (item: unknown) => void;
  className?: string;
}

export function ChartWidget({
  id,
  title,
  titleVi,
  widgetType,
  initialData,
  displayConfig = {},
  refreshInterval,
  onDrillDown,
  className,
}: ChartWidgetProps) {
  const [data, setData] = useState<ChartData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const colors = displayConfig.colors || DEFAULT_COLORS;
  const showLegend = displayConfig.showLegend ?? true;
  const legendPosition = displayConfig.legendPosition || "bottom";
  const showGrid = displayConfig.showGrid ?? true;
  const showLabels = displayConfig.showLabels ?? true;
  const animation = displayConfig.animation ?? true;
  const stacked = displayConfig.stacked ?? false;
  const curved = displayConfig.curved ?? false;

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/widgets/${id}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch chart data");
      }
    } catch (err) {
      setError("Failed to fetch chart data");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [fetchData, initialData]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchData();
  };

  // Format values for tooltip
  const formatValue = (value: number): string => {
    if (displayConfig.formatter === "currency") {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (displayConfig.formatter === "percent") {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString("vi-VN");
  };

  // Custom tooltip
  interface TooltipPayloadItem {
    color: string;
    name: string;
    value: number;
    dataKey: string;
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((item, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: item.color }}
            >
              {item.name}: {formatValue(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render line chart
  const renderLineChart = () => {
    if (!data?.data) return null;

    const chartData = data.data as Record<string, string | number>[];
    const series = data.series || [{ key: "value", name: "Giá trị" }];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey={data.xAxisKey || "name"}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign={legendPosition === "top" ? "top" : "bottom"}
            />
          )}
          {series.map((s, index) => (
            <Line
              key={s.key}
              type={curved ? "monotone" : "linear"}
              dataKey={s.key}
              name={s.name}
              stroke={s.color || colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={animation}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render bar chart
  const renderBarChart = () => {
    if (!data?.data) return null;

    const chartData = data.data as ChartDataPoint[];
    const series = data.series || [{ key: "value", name: "Giá trị" }];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign={legendPosition === "top" ? "top" : "bottom"}
            />
          )}
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color || colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
              isAnimationActive={animation}
              stackId={stacked ? "stack" : undefined}
              onClick={(data) => onDrillDown?.(data)}
              className="cursor-pointer"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Render pie chart
  const renderPieChart = () => {
    if (!data?.data) return null;

    const chartData = data.data as ChartDataPoint[];
    const pieData = chartData.map(d => ({ name: d.name, value: d.value, color: d.color }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={widgetType === "chart-donut" ? "60%" : 0}
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={animation}
            onClick={(data) => onDrillDown?.(data)}
            label={showLabels ? ({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)` : false}
            labelLine={showLabels}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || colors[index % colors.length]}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign={legendPosition === "top" ? "top" : "bottom"}
              layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
              align={legendPosition === "left" ? "left" : legendPosition === "right" ? "right" : "center"}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Render area chart
  const renderAreaChart = () => {
    if (!data?.data) return null;

    const chartData = data.data as Record<string, string | number>[];
    const series = data.series || [{ key: "value", name: "Giá trị" }];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
          <XAxis
            dataKey={data.xAxisKey || "name"}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              verticalAlign={legendPosition === "top" ? "top" : "bottom"}
            />
          )}
          {series.map((s, index) => (
            <Area
              key={s.key}
              type={curved ? "monotone" : "linear"}
              dataKey={s.key}
              name={s.name}
              stroke={s.color || colors[index % colors.length]}
              fill={s.color || colors[index % colors.length]}
              fillOpacity={0.3}
              strokeWidth={2}
              isAnimationActive={animation}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // Render based on widget type
  const renderChart = () => {
    switch (widgetType) {
      case "chart-line":
        return renderLineChart();
      case "chart-bar":
        return renderBarChart();
      case "chart-pie":
      case "chart-donut":
        return renderPieChart();
      case "chart-area":
        return renderAreaChart();
      default:
        return <div className="text-muted-foreground">Unsupported chart type</div>;
    }
  };

  return (
    <WidgetContainer
      id={id}
      title={title}
      titleVi={titleVi}
      isLoading={isLoading}
      error={error}
      refreshInterval={refreshInterval}
      onRefresh={handleRefresh}
      className={className}
    >
      <div className="h-full w-full min-h-[200px]">
        {renderChart()}
      </div>
    </WidgetContainer>
  );
}

export default ChartWidget;
