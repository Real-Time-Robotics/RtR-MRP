"use client";

import React, { useState, useEffect, use } from "react";
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardEditPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`/api/analytics/dashboards/${id}`);
        const data = await response.json();

        if (data.success) {
          setDashboard(data.data);
        }
      } catch (error) {
        clientLogger.error("Error fetching dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [id]);

  // Save dashboard
  const handleSave = async (updatedDashboard: Dashboard) => {
    try {
      // Update dashboard metadata
      await fetch(`/api/analytics/dashboards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updatedDashboard.name,
          description: updatedDashboard.description,
          layout: updatedDashboard.layout,
          isPublic: updatedDashboard.isPublic,
          isDefault: updatedDashboard.isDefault,
        }),
      });

      // Get current widgets from server
      const currentResponse = await fetch(`/api/analytics/dashboards/${id}`);
      const currentData = await currentResponse.json();
      const currentWidgets = currentData.success ? currentData.data.widgets : [];

      // Find widgets to add, update, or remove
      const currentWidgetIds = new Set(currentWidgets.map((w: { id: string }) => w.id));
      const updatedWidgetIds = new Set(updatedDashboard.widgets.map((w) => w.id));

      // Add new widgets
      for (const widget of updatedDashboard.widgets) {
        if (!currentWidgetIds.has(widget.id) || widget.id.startsWith("widget-")) {
          // New widget
          await fetch(`/api/analytics/dashboards/${id}/widgets`, {
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
        } else {
          // Existing widget - update position and config
          await fetch(`/api/analytics/widgets/${widget.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: widget.title,
              titleVi: widget.titleVi,
              gridX: widget.gridX,
              gridY: widget.gridY,
              gridW: widget.gridW,
              gridH: widget.gridH,
              queryConfig: widget.queryConfig,
              displayConfig: widget.displayConfig,
            }),
          });
        }
      }

      // Remove deleted widgets
      for (const currentWidget of currentWidgets) {
        if (!updatedWidgetIds.has(currentWidget.id)) {
          await fetch(`/api/analytics/widgets/${currentWidget.id}`, {
            method: "DELETE",
          });
        }
      }

      // Navigate to view page
      router.push(`/analytics/dashboards/${id}`);
    } catch (error) {
      clientLogger.error("Error saving dashboard:", error);
      throw error;
    }
  };

  // Cancel editing
  const handleCancel = () => {
    router.push(`/analytics/dashboards/${id}`);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Dashboard không tồn tại</h2>
          <p className="text-muted-foreground">
            Dashboard bạn tìm không tồn tại hoặc đã bị xóa
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardBuilder
      dashboard={dashboard}
      onSave={handleSave}
      onCancel={handleCancel}
      className="h-screen"
    />
  );
}
