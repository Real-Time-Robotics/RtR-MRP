"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, RefreshCw, Share2, Download, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { DateRangePicker } from "@/components/analytics/common/DateRangePicker";
import type { Dashboard, DashboardWidget, WidgetData, DateRangeConfig } from "@/lib/analytics/types";
import { clientLogger } from '@/lib/client-logger';

// Lazy-load DashboardGrid (renders chart widgets that import recharts ~500KB)
const DashboardGrid = dynamic(
  () => import("@/components/analytics/dashboards/DashboardGrid").then(mod => mod.DashboardGrid),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted h-96 rounded-lg" />,
  }
);

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
        clientLogger.error("Error fetching dashboard:", error);
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
      clientLogger.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle drill-down: navigate to the relevant detail view based on widget type
  const handleDrillDown = (widget: DashboardWidget, item: { id?: string; entityId?: string } | null) => {
    const entityId = item?.id || item?.entityId;
    if (!entityId) return;

    // Route to the appropriate detail page based on widget data source / type
    const widgetType = (widget?.widgetType || widget?.dataSource || "").toLowerCase();

    if (widgetType.includes("order") || widgetType.includes("sales")) {
      router.push(`/sales/orders/${entityId}`);
    } else if (widgetType.includes("purchase") || widgetType.includes("po")) {
      router.push(`/purchasing/orders/${entityId}`);
    } else if (widgetType.includes("inventory") || widgetType.includes("part")) {
      router.push(`/inventory/${entityId}`);
    } else if (widgetType.includes("quality") || widgetType.includes("ncr")) {
      router.push(`/quality/ncr/${entityId}`);
    } else if (widgetType.includes("work") || widgetType.includes("production")) {
      router.push(`/production/work-orders/${entityId}`);
    } else if (widgetType.includes("supplier")) {
      router.push(`/purchasing/suppliers/${entityId}`);
    } else {
      // Fallback: navigate to the widget's own drill-down page
      router.push(`/analytics/dashboards/${id}?widget=${widget?.id}&item=${entityId}`);
    }
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
                aria-label="Quay lại"
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
                aria-label="Làm mới"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/analytics/dashboards/${id}/edit`)}
                aria-label="Chỉnh sửa"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" aria-label="Chia sẻ">
                <Share2 className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" aria-label="Tải xuống">
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
