"use client";

import React from "react";
import { KPIWidget } from "./KPIWidget";
import { ChartWidget } from "./ChartWidget";
import { TableWidget } from "./TableWidget";
import type { DashboardWidget, WidgetData, KPIValue, ChartData } from "@/lib/analytics/types";
import type { TableColumn, TableRow } from "./TableWidget";

export interface WidgetRendererProps {
  widget: DashboardWidget;
  data?: WidgetData | null;
  onConfigure?: (widget: DashboardWidget) => void;
  onRemove?: (widgetId: string) => void;
  onDrillDown?: (widget: DashboardWidget, item: { id?: string; entityId?: string } | null) => void;
}

export function WidgetRenderer({
  widget,
  data,
  onConfigure,
  onRemove,
  onDrillDown,
}: WidgetRendererProps) {
  const handleDrillDown = (item: unknown) => {
    const drillItem = item as { id?: string; entityId?: string } | null;
    onDrillDown?.(widget, drillItem);
  };

  switch (widget.widgetType) {
    case "kpi":
      return (
        <KPIWidget
          id={widget.id}
          title={widget.title}
          titleVi={widget.titleVi}
          metric={widget.metric || ""}
          initialData={data?.data as KPIValue | null | undefined}
          showTrend={widget.displayConfig.showTrend}
          showSparkline={widget.displayConfig.showTrend}
          showTarget={true}
          refreshInterval={widget.refreshInterval}
          onDrillDown={widget.drillDownConfig?.enabled ? () => handleDrillDown(null) : undefined}
        />
      );

    case "chart-line":
    case "chart-bar":
    case "chart-pie":
    case "chart-donut":
    case "chart-area":
      return (
        <ChartWidget
          id={widget.id}
          title={widget.title}
          titleVi={widget.titleVi}
          widgetType={widget.widgetType}
          initialData={data?.data as ChartData | null | undefined}
          displayConfig={widget.displayConfig}
          refreshInterval={widget.refreshInterval}
          onDrillDown={widget.drillDownConfig?.enabled ? handleDrillDown : undefined}
        />
      );

    case "table":
      return (
        <TableWidget
          id={widget.id}
          title={widget.title}
          titleVi={widget.titleVi}
          initialData={data?.data as { columns: TableColumn[]; rows: TableRow[] } | null | undefined}
          refreshInterval={widget.refreshInterval}
          onRowClick={widget.drillDownConfig?.enabled ? handleDrillDown : undefined}
        />
      );

    case "gauge":
      // For now, render as KPI
      return (
        <KPIWidget
          id={widget.id}
          title={widget.title}
          titleVi={widget.titleVi}
          metric={widget.metric || ""}
          initialData={data?.data as KPIValue | null | undefined}
          showTrend={false}
          showSparkline={false}
          showTarget={true}
          refreshInterval={widget.refreshInterval}
        />
      );

    case "sparkline":
      return (
        <KPIWidget
          id={widget.id}
          title={widget.title}
          titleVi={widget.titleVi}
          metric={widget.metric || ""}
          initialData={data?.data as KPIValue | null | undefined}
          showTrend={true}
          showSparkline={true}
          showTarget={false}
          refreshInterval={widget.refreshInterval}
        />
      );

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Unsupported widget type: {widget.widgetType}
        </div>
      );
  }
}

export default WidgetRenderer;
