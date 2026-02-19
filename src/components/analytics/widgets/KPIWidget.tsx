"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  Target,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { WidgetContainer } from "./WidgetContainer";
import type { KPIValue, KPITrendPoint } from "@/lib/analytics/types";

export interface KPIWidgetProps {
  id: string;
  title: string;
  titleVi?: string;
  metric: string;
  initialData?: KPIValue | null;
  showTrend?: boolean;
  showSparkline?: boolean;
  showTarget?: boolean;
  refreshInterval?: number;
  onClick?: () => void;
  onDrillDown?: (metric: string) => void;
  className?: string;
}

export function KPIWidget({
  id,
  title,
  titleVi,
  metric,
  initialData,
  showTrend = true,
  showSparkline = true,
  showTarget = true,
  refreshInterval,
  onClick,
  onDrillDown,
  className,
}: KPIWidgetProps) {
  const [data, setData] = useState<KPIValue | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/analytics/kpis/${metric}?includeTrend=${showSparkline}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data.value);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch KPI");
      }
    } catch (err) {
      setError("Failed to fetch KPI data");
    } finally {
      setIsLoading(false);
    }
  }, [metric, showSparkline]);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [fetchData, initialData]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchData();
  };

  const handleDrillDown = () => {
    if (onDrillDown) {
      onDrillDown(metric);
    } else if (onClick) {
      onClick();
    }
  };

  // Determine status colors
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "critical":
        return "text-destructive";
      case "warning":
        return "text-amber-500";
      default:
        return "text-foreground";
    }
  };

  const getStatusBgColor = (status: string | undefined) => {
    switch (status) {
      case "critical":
        return "bg-destructive/10";
      case "warning":
        return "bg-amber-500/10";
      default:
        return "bg-primary/10";
    }
  };

  // Trend indicator
  const renderTrendIndicator = () => {
    if (!data?.trend) return null;

    const { direction, changePercent } = data.trend;
    const isPositive = changePercent > 0;
    const isNeutral = Math.abs(changePercent) < 1;

    if (isNeutral) {
      return (
        <span className="flex items-center text-xs text-muted-foreground">
          <Minus className="h-3 w-3 mr-1" />
          Ổn định
        </span>
      );
    }

    return (
      <span
        className={cn(
          "flex items-center text-xs",
          isPositive ? "text-green-600" : "text-red-600"
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        {isPositive ? "+" : ""}
        {changePercent.toFixed(1)}%
      </span>
    );
  };

  // Status icon
  const renderStatusIcon = () => {
    if (!data?.status) return null;

    switch (data.status) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  // Sparkline chart
  const renderSparkline = () => {
    if (!showSparkline || !data?.trend?.data || data.trend.data.length < 2)
      return null;

    const chartData = data.trend.data.map((point: KPITrendPoint) => ({
      date: point.date,
      value: point.value,
    }));

    const color =
      data.trend.direction === "up"
        ? "#10B981"
        : data.trend.direction === "down"
        ? "#EF4444"
        : "#6B7280";

    return (
      <div className="h-10 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border rounded-md px-2 py-1 text-xs shadow-md">
                      <p className="font-medium">
                        {typeof payload[0].value === "number"
                          ? payload[0].value.toLocaleString("vi-VN")
                          : payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Target progress
  const renderTargetProgress = () => {
    if (!showTarget || !data?.target || !data?.targetPercent) return null;

    const percent = Math.min(data.targetPercent, 100);

    return (
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center">
            <Target className="h-3 w-3 mr-1" />
            Mục tiêu: {data.target.toLocaleString("vi-VN")}
          </span>
          <span>{percent.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              percent >= 100
                ? "bg-green-500"
                : percent >= 75
                ? "bg-primary"
                : percent >= 50
                ? "bg-amber-500"
                : "bg-red-500"
            )}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    );
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
      showDragHandle={false}
      className={cn(
        onClick || onDrillDown ? "cursor-pointer hover:shadow-md transition-shadow" : "",
        className
      )}
    >
      <div
        className="h-full flex flex-col"
        role="button"
        tabIndex={0}
        onClick={handleDrillDown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDrillDown();
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div
              className={cn(
                "text-2xl font-bold",
                getStatusColor(data?.status)
              )}
            >
              {data?.formattedValue || "—"}
            </div>
            {showTrend && (
              <div className="flex items-center gap-2">
                {renderTrendIndicator()}
                {renderStatusIcon()}
              </div>
            )}
          </div>

          {(onClick || onDrillDown) && (
            <div
              className={cn(
                "p-2 rounded-full",
                getStatusBgColor(data?.status)
              )}
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {renderSparkline()}
        {renderTargetProgress()}
      </div>
    </WidgetContainer>
  );
}

export default KPIWidget;
