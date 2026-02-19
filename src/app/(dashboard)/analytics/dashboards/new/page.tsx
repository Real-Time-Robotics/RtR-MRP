"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Dashboard } from "@/lib/analytics/types";
import { DEFAULT_LAYOUT } from "@/lib/analytics/dashboard-service";
import { clientLogger } from '@/lib/client-logger';

// Lazy-load DashboardBuilder (~506 lines, uses charts/widgets internally)
const DashboardBuilder = dynamic(
  () => import("@/components/analytics/dashboards/DashboardBuilder").then(mod => mod.DashboardBuilder),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-screen rounded-lg" />,
  }
);

export default function NewDashboardPage() {
  const router = useRouter();

  // Create a new empty dashboard
  const newDashboard: Dashboard = {
    id: "new",
    userId: "",
    name: "Dashboard mới",
    description: "",
    layout: DEFAULT_LAYOUT,
    isPublic: false,
    isDefault: false,
    viewCount: 0,
    widgets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save dashboard
  const handleSave = async (dashboard: Dashboard) => {
    try {
      // Create the dashboard
      const response = await fetch("/api/analytics/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout,
          isPublic: dashboard.isPublic,
          isDefault: dashboard.isDefault,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create dashboard");
      }

      const dashboardId = data.data.id;

      // Add widgets
      for (const widget of dashboard.widgets) {
        await fetch(`/api/analytics/dashboards/${dashboardId}/widgets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            widgetType: widget.widgetType,
            title: widget.title,
            titleVi: widget.titleVi,
            dataSource: widget.dataSource,
            metric: widget.metric,
            queryConfig: widget.queryConfig,
            displayConfig: widget.displayConfig,
            gridX: widget.gridX,
            gridY: widget.gridY,
            gridW: widget.gridW,
            gridH: widget.gridH,
            refreshInterval: widget.refreshInterval,
            drillDownConfig: widget.drillDownConfig,
          }),
        });
      }

      // Navigate to the new dashboard
      router.push(`/analytics/dashboards/${dashboardId}`);
    } catch (error) {
      clientLogger.error("Error creating dashboard:", error);
      throw error;
    }
  };

  // Cancel
  const handleCancel = () => {
    router.push("/analytics/dashboards");
  };

  return (
    <DashboardBuilder
      dashboard={newDashboard}
      onSave={handleSave}
      onCancel={handleCancel}
      className="h-screen"
    />
  );
}
