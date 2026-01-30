"use client";

import React, { useState, useCallback } from "react";
import { Layout } from "react-grid-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Save,
  Eye,
  Settings,
  LayoutDashboard,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Gauge,
  Activity,
} from "lucide-react";
import { DashboardGrid } from "./DashboardGrid";
import { cn } from "@/lib/utils";
import type {
  Dashboard,
  DashboardWidget,
  WidgetType,
  DataSource,
} from "@/lib/analytics/types";

// Widget type options
const WIDGET_TYPES: { value: WidgetType; label: string; icon: React.ReactNode }[] = [
  { value: "kpi", label: "KPI", icon: <Activity className="h-4 w-4" /> },
  { value: "chart-line", label: "Biểu đồ đường", icon: <LineChart className="h-4 w-4" /> },
  { value: "chart-bar", label: "Biểu đồ cột", icon: <BarChart3 className="h-4 w-4" /> },
  { value: "chart-pie", label: "Biểu đồ tròn", icon: <PieChart className="h-4 w-4" /> },
  { value: "chart-area", label: "Biểu đồ vùng", icon: <LineChart className="h-4 w-4" /> },
  { value: "table", label: "Bảng dữ liệu", icon: <Table className="h-4 w-4" /> },
  { value: "gauge", label: "Đồng hồ đo", icon: <Gauge className="h-4 w-4" /> },
];

// Data source options
const DATA_SOURCES: { value: DataSource; label: string }[] = [
  { value: "inventory", label: "Tồn kho" },
  { value: "sales", label: "Bán hàng" },
  { value: "production", label: "Sản xuất" },
  { value: "quality", label: "Chất lượng" },
  { value: "financial", label: "Tài chính" },
  { value: "supplier", label: "Nhà cung cấp" },
];

// KPI options by data source
const KPI_OPTIONS: Record<DataSource, { value: string; label: string }[]> = {
  inventory: [
    { value: "INV_VALUE", label: "Giá trị tồn kho" },
    { value: "INV_TURNOVER", label: "Vòng quay tồn kho" },
    { value: "INV_LOW_STOCK", label: "Vật tư sắp hết" },
    { value: "INV_OUT_STOCK", label: "Vật tư hết hàng" },
  ],
  sales: [
    { value: "REVENUE_MTD", label: "Doanh thu tháng" },
    { value: "ORDER_COUNT", label: "Số đơn hàng" },
    { value: "AVG_ORDER_VALUE", label: "Giá trị đơn TB" },
  ],
  production: [
    { value: "ON_TIME_DELIVERY", label: "Giao đúng hạn" },
    { value: "PRODUCTION_EFFICIENCY", label: "Hiệu suất SX" },
    { value: "ACTIVE_WORK_ORDERS", label: "Lệnh SX đang chạy" },
  ],
  quality: [
    { value: "FIRST_PASS_YIELD", label: "Tỷ lệ đạt lần đầu" },
    { value: "DEFECT_RATE", label: "Tỷ lệ lỗi" },
    { value: "OPEN_NCRS", label: "NCR đang mở" },
    { value: "OPEN_CAPAS", label: "CAPA đang mở" },
  ],
  financial: [
    { value: "GROSS_MARGIN", label: "Biên lợi nhuận" },
    { value: "COST_VARIANCE", label: "Chênh lệch CP" },
  ],
  supplier: [
    { value: "SUPPLIER_OTD", label: "NCC giao đúng hạn" },
    { value: "AVG_LEAD_TIME", label: "Lead time TB" },
  ],
  mrp: [],
  custom: [],
};

export interface DashboardBuilderProps {
  dashboard: Dashboard;
  onSave: (dashboard: Dashboard) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function DashboardBuilder({
  dashboard: initialDashboard,
  onSave,
  onCancel,
  className,
}: DashboardBuilderProps) {
  const [dashboard, setDashboard] = useState<Dashboard>(initialDashboard);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // New widget form state
  const [newWidget, setNewWidget] = useState<Partial<DashboardWidget>>({
    widgetType: "kpi",
    title: "",
    dataSource: "sales",
    metric: "",
    gridW: 3,
    gridH: 2,
  });

  // Handle layout change from grid
  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.map((widget) => {
        const layoutItem = layout.find((l) => l.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            gridX: layoutItem.x,
            gridY: layoutItem.y,
            gridW: layoutItem.w,
            gridH: layoutItem.h,
          };
        }
        return widget;
      }),
    }));
  }, []);

  // Add new widget
  const handleAddWidget = useCallback(() => {
    if (!newWidget.title || !newWidget.widgetType || !newWidget.dataSource) return;

    const widget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      dashboardId: dashboard.id,
      widgetType: newWidget.widgetType!,
      title: newWidget.title,
      titleVi: newWidget.titleVi,
      dataSource: newWidget.dataSource!,
      metric: newWidget.metric,
      queryConfig: {},
      displayConfig: {
        showTrend: true,
        showLegend: true,
        animation: true,
      },
      gridX: 0,
      gridY: Infinity, // Will be placed at bottom
      gridW: newWidget.gridW || 4,
      gridH: newWidget.gridH || 3,
    };

    setDashboard((prev) => ({
      ...prev,
      widgets: [...prev.widgets, widget],
    }));

    setNewWidget({
      widgetType: "kpi",
      title: "",
      dataSource: "sales",
      metric: "",
      gridW: 3,
      gridH: 2,
    });
    setIsAddWidgetOpen(false);
  }, [dashboard.id, newWidget]);

  // Remove widget
  const handleRemoveWidget = useCallback((widgetId: string) => {
    setDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
    }));
  }, []);

  // Save dashboard
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(dashboard);
    } finally {
      setIsSaving(false);
    }
  };

  // Update dashboard settings
  const handleUpdateSettings = (updates: Partial<Dashboard>) => {
    setDashboard((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">{dashboard.name}</h1>
            <p className="text-sm text-muted-foreground">
              {dashboard.widgets.length} widgets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreviewMode ? "Chỉnh sửa" : "Xem trước"}
          </Button>

          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Cài đặt
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Cài đặt Dashboard</SheetTitle>
                <SheetDescription>
                  Tùy chỉnh thông tin và cấu hình dashboard
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tên dashboard</Label>
                  <Input
                    value={dashboard.name}
                    onChange={(e) => handleUpdateSettings({ name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={dashboard.description || ""}
                    onChange={(e) => handleUpdateSettings({ description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Công khai</Label>
                  <Switch
                    checked={dashboard.isPublic}
                    onCheckedChange={(checked) => handleUpdateSettings({ isPublic: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Đặt làm mặc định</Label>
                  <Switch
                    checked={dashboard.isDefault}
                    onCheckedChange={(checked) => handleUpdateSettings({ isDefault: checked })}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" size="sm" onClick={onCancel}>
            Hủy
          </Button>

          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Widget library sidebar */}
        {!isPreviewMode && (
          <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Thêm Widget</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsAddWidgetOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm widget mới
                </Button>
              </div>

              <div>
                <h3 className="font-medium mb-2">Widget có sẵn</h3>
                <div className="space-y-2">
                  {WIDGET_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setNewWidget((prev) => ({
                          ...prev,
                          widgetType: type.value,
                          title: type.label,
                        }));
                        setIsAddWidgetOpen(true);
                      }}
                    >
                      {type.icon}
                      <span className="ml-2">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard grid */}
        <div className="flex-1 overflow-auto p-4 bg-muted/10">
          {dashboard.widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <LayoutDashboard className="h-12 w-12 mb-4" />
              <h3 className="font-medium text-lg">Dashboard trống</h3>
              <p className="text-sm mb-4">Thêm widget để bắt đầu xây dựng dashboard</p>
              <Button onClick={() => setIsAddWidgetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm widget
              </Button>
            </div>
          ) : (
            <DashboardGrid
              dashboard={dashboard}
              isEditing={!isPreviewMode}
              onLayoutChange={handleLayoutChange}
              onWidgetRemove={handleRemoveWidget}
            />
          )}
        </div>
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thêm Widget mới</DialogTitle>
            <DialogDescription>
              Chọn loại widget và cấu hình để thêm vào dashboard
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Loại widget</Label>
              <Select
                value={newWidget.widgetType}
                onValueChange={(v) => setNewWidget((prev) => ({ ...prev, widgetType: v as WidgetType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        {type.icon}
                        <span className="ml-2">{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={newWidget.title || ""}
                onChange={(e) => setNewWidget((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nhập tiêu đề widget"
              />
            </div>

            <div className="space-y-2">
              <Label>Nguồn dữ liệu</Label>
              <Select
                value={newWidget.dataSource}
                onValueChange={(v) => setNewWidget((prev) => ({ ...prev, dataSource: v as DataSource, metric: "" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newWidget.widgetType === "kpi" && newWidget.dataSource && (
              <div className="space-y-2">
                <Label>Chỉ số KPI</Label>
                <Select
                  value={newWidget.metric || ""}
                  onValueChange={(v) => setNewWidget((prev) => ({ ...prev, metric: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn chỉ số" />
                  </SelectTrigger>
                  <SelectContent>
                    {KPI_OPTIONS[newWidget.dataSource]?.map((kpi) => (
                      <SelectItem key={kpi.value} value={kpi.value}>
                        {kpi.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chiều rộng (1-12)</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={newWidget.gridW || 4}
                  onChange={(e) => setNewWidget((prev) => ({ ...prev, gridW: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Chiều cao</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={newWidget.gridH || 3}
                  onChange={(e) => setNewWidget((prev) => ({ ...prev, gridH: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddWidgetOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddWidget} disabled={!newWidget.title}>
              Thêm widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DashboardBuilder;
