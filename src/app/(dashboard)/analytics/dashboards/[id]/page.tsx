"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, RefreshCw, Share2, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardGrid } from "@/components/analytics/dashboards/DashboardGrid";
import { DateRangePicker } from "@/components/analytics/common/DateRangePicker";
import type { Dashboard, WidgetData, DateRangeConfig } from "@/lib/analytics/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardViewPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgetData, setWidgetData] = useState<Record<string, WidgetData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeConfig>({
    type: "preset",
    preset: "last30days",
  });

  // Fetch dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(
          `/api/analytics/dashboards/${id}?includeData=true`
        );
        const data = await response.json();

        if (data.success) {
          setDashboard(data.data);
          if (data.data.widgetData) {
            const dataMap: Record<string, WidgetData> = {};
            data.data.widgetData.forEach((wd: WidgetData) => {
              dataMap[wd.widgetId] = wd;
            });
            setWidgetData(dataMap);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [id]);

  // Refresh widget data
  const handleRefresh = async () => {
    if (!dashboard) return;

    setIsRefreshing(true);
    try {
      // Fetch data for each widget
      const dataPromises = dashboard.widgets.map(async (widget) => {
        const response = await fetch(`/api/analytics/widgets/${widget.id}`);
        const data = await response.json();
        return data.success ? data.data : null;
      });

      const results = await Promise.all(dataPromises);
      const newWidgetData: Record<string, WidgetData> = {};

      results.forEach((result) => {
        if (result) {
          newWidgetData[result.widgetId] = result;
        }
      });

      setWidgetData(newWidgetData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle drill-down
  const handleDrillDown = (widget: any, item: any) => {
    // TODO: Navigate to detail view or open modal
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="h-[600px] rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="container py-6 text-center">
        <h2 className="text-xl font-semibold">Dashboard không tồn tại</h2>
        <p className="text-muted-foreground mb-4">
          Dashboard bạn tìm không tồn tại hoặc đã bị xóa
        </p>
        <Button onClick={() => router.push("/analytics/dashboards")}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/analytics/dashboards")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{dashboard.name}</h1>
                {dashboard.description && (
                  <p className="text-sm text-muted-foreground">
                    {dashboard.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DateRangePicker value={dateRange} onChange={setDateRange} />

              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/analytics/dashboards/${id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 overflow-auto bg-muted/10">
        <div className="container py-6">
          <DashboardGrid
            dashboard={dashboard}
            widgetData={widgetData}
            isEditing={false}
            onWidgetDrillDown={handleDrillDown}
          />
        </div>
      </div>
    </div>
  );
}
