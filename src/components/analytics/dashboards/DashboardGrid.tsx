"use client";

import React, { useCallback, useMemo } from "react";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { cn } from "@/lib/utils";
import type { Dashboard, DashboardWidget, WidgetData } from "@/lib/analytics/types";

export interface DashboardGridProps {
  dashboard: Dashboard;
  widgetData?: Record<string, WidgetData>;
  isEditing?: boolean;
  onLayoutChange?: (layout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  onWidgetConfigure?: (widget: DashboardWidget) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetDrillDown?: (widget: DashboardWidget, item: { id?: string; entityId?: string } | null) => void;
  className?: string;
}

export function DashboardGrid({
  dashboard,
  widgetData = {},
  isEditing = false,
  onLayoutChange,
  onWidgetConfigure,
  onWidgetRemove,
  onWidgetDrillDown,
  className,
}: DashboardGridProps) {
  const { layout, widgets } = dashboard;

  // Simple CSS grid layout for widgets
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${layout.columns || 12}, 1fr)`,
    gap: `${layout.margin?.[1] || 16}px`,
    padding: `${layout.containerPadding?.[1] || 16}px`,
  };

  return (
    <div className={cn("w-full", className)} style={gridStyle}>
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={cn(
            "widget-item relative",
            isEditing && "border-2 border-dashed border-primary/30 rounded-lg"
          )}
          style={{
            gridColumn: `span ${widget.gridW}`,
            gridRow: `span ${widget.gridH}`,
            minHeight: `${widget.gridH * (layout.rowHeight || 100)}px`,
          }}
        >
          <WidgetRenderer
            widget={widget}
            data={widgetData[widget.id]}
            onConfigure={isEditing ? () => onWidgetConfigure?.(widget) : undefined}
            onRemove={isEditing ? () => onWidgetRemove?.(widget.id) : undefined}
            onDrillDown={onWidgetDrillDown}
          />
        </div>
      ))}
    </div>
  );
}

export default DashboardGrid;
