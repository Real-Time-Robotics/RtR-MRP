"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, LayoutTemplate, Search, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardCard } from "@/components/analytics/dashboards/DashboardCard";
import type { Dashboard, DashboardTemplate } from "@/lib/analytics/types";

export default function DashboardsPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"blank" | "template">("blank");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch dashboards
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, templatesRes] = await Promise.all([
          fetch("/api/analytics/dashboards"),
          fetch("/api/analytics/templates"),
        ]);

        const dashData = await dashRes.json();
        const templatesData = await templatesRes.json();

        if (dashData.success) {
          setDashboards(dashData.data);
        }
        if (templatesData.success) {
          setTemplates(templatesData.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
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
        response = await fetch("/api/analytics/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedTemplate,
            name: newName,
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
      }
    } catch (error) {
      console.error("Error creating dashboard:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle dashboard actions
  const handleSelect = (id: string) => {
    router.push(`/analytics/dashboards/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/analytics/dashboards/${id}/edit`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa dashboard này?")) return;

    try {
      const response = await fetch(`/api/analytics/dashboards/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (error) {
      console.error("Error deleting dashboard:", error);
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
      console.error("Error setting default:", error);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboards</h1>
          <p className="text-muted-foreground">
            Quản lý và xem các dashboard phân tích
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo Dashboard
        </Button>
      </div>

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
            Tạo dashboard đầu tiên để bắt đầu theo dõi các chỉ số quan trọng
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Dashboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
                        {template.nameVi || template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              disabled={!newName.trim() || isCreating}
            >
              {isCreating ? "Đang tạo..." : "Tạo Dashboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
