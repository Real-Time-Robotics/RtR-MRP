"use client";

import React, { useCallback, useMemo } from "react";
import GridLayout, { Layout, WidthProvider } from "react-grid-layout";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { cn } from "@/lib/utils";
import type { Dashboard, DashboardWidget, WidgetData } from "@/lib/analytics/types";

import "react-grid-layout/css/styles.css";

const ResponsiveGridLayout = WidthProvider(GridLayout);

export interface DashboardGridProps {
  dashboard: Dashboard;
  widgetData?: Record<string, WidgetData>;
  isEditing?: boolean;
  onLayoutChange?: (layout: Layout[]) => void;
  onWidgetConfigure?: (widget: DashboardWidget) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetDrillDown?: (widget: DashboardWidget, item: any) => void;
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

  // Convert widgets to grid layout items
  const gridLayout: Layout[] = useMemo(
    () =>
      widgets.map((widget) => ({
        i: widget.id,
        x: widget.gridX,
        y: widget.gridY,
        w: widget.gridW,
        h: widget.gridH,
        minW: 2,
        minH: 2,
        static: !isEditing,
      })),
    [widgets, isEditing]
  );

  // Handle layout change from drag/resize
  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      if (!isEditing) return;
      onLayoutChange?.(newLayout);
    },
    [isEditing, onLayoutChange]
  );

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveGridLayout
        className="layout"
        layout={gridLayout}
        cols={layout.columns || 12}
        rowHeight={layout.rowHeight || 100}
        margin={layout.margin || [16, 16]}
        containerPadding={layout.containerPadding || [16, 16]}
        compactType={layout.compactType || "vertical"}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        useCSSTransforms
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(
              "widget-item",
              isEditing && "border-2 border-dashed border-primary/30 rounded-lg"
            )}
          >
            <div className={cn(isEditing && "widget-drag-handle absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing")} />
            <WidgetRenderer
              widget={widget}
              data={widgetData[widget.id]}
              onConfigure={isEditing ? () => onWidgetConfigure?.(widget) : undefined}
              onRemove={isEditing ? () => onWidgetRemove?.(widget.id) : undefined}
              onDrillDown={onWidgetDrillDown}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}

export default DashboardGrid;
