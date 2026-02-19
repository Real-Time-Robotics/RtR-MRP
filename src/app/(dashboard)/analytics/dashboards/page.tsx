"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutTemplate, Search, LayoutDashboard, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardCard } from "@/components/analytics/dashboards/DashboardCard";
import type { Dashboard, DashboardTemplate } from "@/lib/analytics/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clientLogger } from '@/lib/client-logger';

interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  canViewAll: boolean;
}

interface Features {
  canCustomizeWidgets: boolean;
  canExportData: boolean;
  canScheduleReports: boolean;
  canAccessRawData: boolean;
}

export default function DashboardsPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");

  // Role-based permissions
  const [permissions, setPermissions] = useState<Permissions>({
    canCreate: true,
    canEdit: true,
    canShare: true,
    canDelete: true,
    canViewAll: false,
  });
  const [features, setFeatures] = useState<Features>({
    canCustomizeWidgets: true,
    canExportData: true,
    canScheduleReports: false,
    canAccessRawData: false,
  });
  const [canCreateMore, setCanCreateMore] = useState(true);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"blank" | "template">("blank");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch dashboards and permissions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, templatesRes, permissionsRes] = await Promise.all([
          fetch("/api/analytics/dashboards"),
          fetch("/api/analytics/dashboards?action=templates"),
          fetch("/api/analytics/dashboards?action=permissions"),
        ]);

        const dashData = await dashRes.json();
        const templatesData = await templatesRes.json();
        const permissionsData = await permissionsRes.json();

        if (dashData.success) {
          setDashboards(dashData.data);
          if (dashData.permissions) {
            setPermissions(dashData.permissions);
          }
        }
        if (templatesData.success) {
          setTemplates(templatesData.data);
        }
        if (permissionsData.success) {
          setPermissions(permissionsData.data.permissions);
          setFeatures(permissionsData.data.features);
          setCanCreateMore(permissionsData.data.canCreate);
        }
      } catch (error) {
        clientLogger.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort dashboards
  const filteredDashboards = dashboards
    .filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "viewCount":
          return b.viewCount - a.viewCount;
        case "createdAt":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "updatedAt":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  // Create dashboard
  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      let response;

      if (createMode === "template" && selectedTemplate) {
        response = await fetch("/api/analytics/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            fromTemplateId: selectedTemplate,
          }),
        });
      } else {
        response = await fetch("/api/analytics/dashboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            description: newDescription,
          }),
        });
      }

      const data = await response.json();

      if (data.success) {
        // Navigate to edit the new dashboard
        router.push(`/analytics/dashboards/${data.data.id}/edit`);
      } else {
        clientLogger.error("Error creating dashboard:", data.error);
        toast.error(data.error || "Không thể tạo dashboard");
      }
    } catch (error) {
      clientLogger.error("Error creating dashboard:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle dashboard actions
  const handleSelect = (id: string) => {
    router.push(`/analytics/dashboards/${id}`);
  };

  const handleEdit = (id: string) => {
    if (!permissions.canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa dashboard");
      return;
    }
    router.push(`/analytics/dashboards/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!permissions.canDelete) {
      toast.error("Bạn không có quyền xóa dashboard");
      return;
    }

    if (!confirm("Bạn có chắc muốn xóa dashboard này?")) return;

    try {
      const response = await fetch(`/api/analytics/dashboards/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
      } else {
        toast.error(data.error || "Không thể xóa dashboard");
      }
    } catch (error) {
      clientLogger.error("Error deleting dashboard:", error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/analytics/dashboards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (response.ok) {
        setDashboards((prev) =>
          prev.map((d) => ({
            ...d,
            isDefault: d.id === id,
          }))
        );
      }
    } catch (error) {
      clientLogger.error("Error setting default:", error);
    }
  };

  const canCreate = permissions.canCreate && canCreateMore;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            Dashboards
          </h1>
          <p className="text-muted-foreground">
            Quản lý và xem các dashboard phân tích
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Dashboard
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled variant="outline">
                <Lock className="h-4 w-4 mr-2" />
                Tạo Dashboard
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!permissions.canCreate
                ? "Bạn không có quyền tạo dashboard"
                : "Bạn đã đạt giới hạn số dashboard"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Permission Notice */}
      {!permissions.canEdit && (
        <div className="flex items-center gap-2 p-3 bg-warning-50 dark:bg-warning-950 rounded-lg border border-warning-200 dark:border-warning-800">
          <Shield className="w-4 h-4 text-warning-600" />
          <p className="text-sm text-warning-700 dark:text-warning-300">
            Bạn đang ở chế độ chỉ xem. Liên hệ quản trị viên nếu cần quyền chỉnh sửa.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm dashboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Cập nhật gần nhất</SelectItem>
            <SelectItem value="createdAt">Tạo gần nhất</SelectItem>
            <SelectItem value="name">Tên A-Z</SelectItem>
            <SelectItem value="viewCount">Lượt xem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dashboard grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : filteredDashboards.length === 0 ? (
        <div className="text-center py-12">
          <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Chưa có dashboard nào</h3>
          <p className="text-muted-foreground mb-4">
            {canCreate
              ? "Tạo dashboard đầu tiên để bắt đầu theo dõi các chỉ số quan trọng"
              : "Liên hệ quản trị viên để được cấp quyền tạo dashboard"}
          </p>
          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Dashboard
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onSelect={handleSelect}
              onEdit={permissions.canEdit ? handleEdit : undefined}
              onDelete={permissions.canDelete ? handleDelete : undefined}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tạo Dashboard mới</DialogTitle>
            <DialogDescription>
              Tạo dashboard trống hoặc từ mẫu có sẵn
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Mode selection */}
            <div className="flex gap-4">
              <Button
                variant={createMode === "blank" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setCreateMode("blank")}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard trống
              </Button>
              <Button
                variant={createMode === "template" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setCreateMode("template")}
                disabled={templates.length === 0}
              >
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Từ mẫu
              </Button>
            </div>

            {/* Template selection */}
            {createMode === "template" && (
              <div className="space-y-2">
                <Label>Chọn mẫu</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mẫu dashboard" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.nameVi || template.name}</span>
                          {template.usageCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {template.usageCount} lượt dùng
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Không có mẫu nào khả dụng cho vai trò của bạn
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Tên dashboard</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nhập tên dashboard"
              />
            </div>

            {createMode === "blank" && (
              <div className="space-y-2">
                <Label>Mô tả (tùy chọn)</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Nhập mô tả ngắn"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !newName.trim() ||
                isCreating ||
                (createMode === "template" && !selectedTemplate)
              }
            >
              {isCreating ? "Đang tạo..." : "Tạo Dashboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
