"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceArea,
} from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartToolbar } from "./ChartToolbar";
import { cn } from "@/lib/utils";

// Default colors
const DEFAULT_COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
];

export interface ChartSeries {
  key: string;
  name: string;
  color?: string;
  type?: "line" | "bar" | "area";
}

/** A single data point in the chart, with string keys for axis/series values */
export type ChartDataPoint = Record<string, string | number | null | undefined>;

export interface InteractiveChartProps {
  title: string;
  titleVi?: string;
  data: ChartDataPoint[];
  series: ChartSeries[];
  xAxisKey?: string;
  chartType?: "line" | "bar" | "area" | "mixed";
  showBrush?: boolean;
  showZoom?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  curved?: boolean;
  formatter?: "number" | "currency" | "percent";
  onExport?: (format: "png" | "csv") => void;
  onFullscreen?: () => void;
  className?: string;
}

export function InteractiveChart({
  title,
  titleVi,
  data,
  series,
  xAxisKey = "name",
  chartType = "line",
  showBrush = true,
  showZoom = true,
  showGrid = true,
  showLegend = true,
  stacked = false,
  curved = true,
  formatter = "number",
  onExport,
  onFullscreen,
  className,
}: InteractiveChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Zoom state
  const [zoomLeft, setZoomLeft] = useState<string | null>(null);
  const [zoomRight, setZoomRight] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [zoomedData, setZoomedData] = useState<ChartDataPoint[] | null>(null);

  const displayTitle = titleVi || title;
  const displayData = zoomedData || data;

  // Format value based on formatter type
  const formatValue = useCallback(
    (value: number): string => {
      if (formatter === "currency") {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(value);
      }
      if (formatter === "percent") {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString("vi-VN");
    },
    [formatter]
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color?: string; name?: string; value?: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-1">{label}</p>
          {payload.map((item, index: number) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {formatValue(item.value ?? 0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Handle zoom selection
  const handleMouseDown = useCallback<CategoricalChartFunc>(
    (e) => {
      if (!showZoom || !e?.activeLabel) return;
      setZoomLeft(String(e.activeLabel));
      setIsSelecting(true);
    },
    [showZoom]
  );

  const handleMouseMove = useCallback<CategoricalChartFunc>(
    (e) => {
      if (!isSelecting || !e?.activeLabel) return;
      setZoomRight(String(e.activeLabel));
    },
    [isSelecting]
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !zoomLeft || !zoomRight) {
      setIsSelecting(false);
      setZoomLeft(null);
      setZoomRight(null);
      return;
    }

    // Find indices
    const leftIndex = data.findIndex((d) => d[xAxisKey] === zoomLeft);
    const rightIndex = data.findIndex((d) => d[xAxisKey] === zoomRight);

    if (leftIndex >= 0 && rightIndex >= 0) {
      const start = Math.min(leftIndex, rightIndex);
      const end = Math.max(leftIndex, rightIndex);
      setZoomedData(data.slice(start, end + 1));
    }

    setIsSelecting(false);
    setZoomLeft(null);
    setZoomRight(null);
  }, [isSelecting, zoomLeft, zoomRight, data, xAxisKey]);

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    setZoomedData(null);
  }, []);

  // Handle export
  const handleExport = useCallback(
    async (format: "png" | "csv") => {
      if (onExport) {
        onExport(format);
        return;
      }

      if (format === "csv") {
        // Export to CSV
        const headers = [xAxisKey, ...series.map((s) => s.key)];
        const csvContent = [
          headers.join(","),
          ...displayData.map((row) =>
            headers.map((h) => row[h] ?? "").join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.replace(/\s+/g, "_")}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      // PNG export would require html2canvas - left as external implementation
    },
    [onExport, displayData, series, xAxisKey, title]
  );

  // Handle fullscreen
  const handleFullscreen = useCallback(() => {
    if (onFullscreen) {
      onFullscreen();
    } else {
      setIsFullscreen(!isFullscreen);
    }
  }, [onFullscreen, isFullscreen]);

  // Get chart component based on type
  const renderChartContent = () => {
    const commonProps = {
      data: displayData,
      onMouseDown: showZoom ? handleMouseDown : undefined,
      onMouseMove: showZoom ? handleMouseMove : undefined,
      onMouseUp: showZoom ? handleMouseUp : undefined,
    };

    const gridComponent = showGrid && (
      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
    );

    const xAxisComponent = (
      <XAxis
        dataKey={xAxisKey}
        tick={{ fontSize: 12 }}
        tickLine={false}
        axisLine={false}
      />
    );

    const yAxisComponent = (
      <YAxis
        tick={{ fontSize: 12 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={formatValue}
      />
    );

    const tooltipComponent = <Tooltip content={<CustomTooltip />} />;

    const legendComponent = showLegend && (
      <Legend verticalAlign="bottom" height={36} />
    );

    const brushComponent = showBrush && (
      <Brush dataKey={xAxisKey} height={30} stroke="#8884d8" />
    );

    // Zoom selection area
    const zoomArea =
      isSelecting && zoomLeft && zoomRight ? (
        <ReferenceArea
          x1={zoomLeft}
          x2={zoomRight}
          strokeOpacity={0.3}
          fill="#8884d8"
          fillOpacity={0.3}
        />
      ) : null;

    switch (chartType) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            {gridComponent}
            {xAxisComponent}
            {yAxisComponent}
            {tooltipComponent}
            {legendComponent}
            {series.map((s, index) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
            {brushComponent}
            {zoomArea}
          </BarChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            {gridComponent}
            {xAxisComponent}
            {yAxisComponent}
            {tooltipComponent}
            {legendComponent}
            {series.map((s, index) => (
              <Area
                key={s.key}
                type={curved ? "monotone" : "linear"}
                dataKey={s.key}
                name={s.name}
                stroke={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                fillOpacity={0.3}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
            {brushComponent}
            {zoomArea}
          </AreaChart>
        );

      case "line":
      default:
        return (
          <LineChart {...commonProps}>
            {gridComponent}
            {xAxisComponent}
            {yAxisComponent}
            {tooltipComponent}
            {legendComponent}
            {series.map((s, index) => (
              <Line
                key={s.key}
                type={curved ? "monotone" : "linear"}
                dataKey={s.key}
                name={s.name}
                stroke={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
            {brushComponent}
            {zoomArea}
          </LineChart>
        );
    }
  };

  return (
    <Card
      className={cn(
        "h-full flex flex-col",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-sm font-medium">{displayTitle}</CardTitle>
        <ChartToolbar
          onExportPNG={() => handleExport("png")}
          onExportCSV={() => handleExport("csv")}
          onFullscreen={handleFullscreen}
          onResetZoom={zoomedData ? handleResetZoom : undefined}
          isFullscreen={isFullscreen}
        />
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChartContent()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default InteractiveChart;
