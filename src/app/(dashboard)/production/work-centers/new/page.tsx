"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import Link from "next/link";
import { clientLogger } from '@/lib/client-logger';

const TYPE_OPTIONS = [
  { value: "MACHINE", label: "Máy móc (Machine)" },
  { value: "ASSEMBLY", label: "Lắp ráp (Assembly)" },
  { value: "TESTING", label: "Kiểm tra (Testing)" },
  { value: "PACKAGING", label: "Đóng gói (Packaging)" },
  { value: "LABOR_ONLY", label: "Chỉ nhân công (Labor Only)" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động" },
  { value: "maintenance", label: "Bảo trì" },
  { value: "inactive", label: "Không hoạt động" },
];

const CAPACITY_TYPE_OPTIONS = [
  { value: "hours", label: "Giờ" },
  { value: "units", label: "Đơn vị" },
];

export default function NewWorkCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "MACHINE",
    department: "",
    location: "",
    capacityType: "hours",
    capacityPerDay: 8,
    capacityPerHour: 1,
    efficiency: 100,
    utilizationTarget: 85,
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    breakMinutes: 60,
    hourlyRate: 0,
    setupCostPerHour: 0,
    overheadRate: 0,
    maxConcurrentJobs: 1,
    requiresOperator: true,
    operatorSkillLevel: "",
    status: "active",
    maintenanceInterval: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Vui lòng nhập mã work center");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên work center");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/production/work-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          description: formData.description || null,
          department: formData.department || null,
          location: formData.location || null,
          operatorSkillLevel: formData.operatorSkillLevel || null,
          hourlyRate: formData.hourlyRate || null,
          setupCostPerHour: formData.setupCostPerHour || null,
          overheadRate: formData.overheadRate || null,
          maintenanceInterval: formData.maintenanceInterval || null,
          workingDays: [1, 2, 3, 4, 5], // Monday to Friday
        }),
      });

      if (res.ok) {
        const workCenter = await res.json();
        router.push(`/production/work-centers/${workCenter.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Không thể tạo work center");
      }
    } catch (error) {
      clientLogger.error("Failed to create work center:", error);
      toast.error("Không thể tạo work center");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo Work Center mới"
        description="Thêm máy móc, trạm lắp ráp hoặc nguồn nhân công"
        backHref="/production/work-centers"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Mã Work Center *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="VD: WC-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Tên Work Center *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="VD: Máy CNC 1"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mô tả chi tiết về work center..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Loại *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Phòng ban</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="VD: Sản xuất"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Vị trí</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="VD: Nhà xưởng A, Tầng 1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin công suất</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Loại công suất</Label>
                  <Select
                    value={formData.capacityType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, capacityType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACITY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacityPerDay">Công suất/ngày</Label>
                  <Input
                    id="capacityPerDay"
                    type="number"
                    min={0}
                    step={0.5}
                    value={formData.capacityPerDay}
                    onChange={(e) =>
                      setFormData({ ...formData, capacityPerDay: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="efficiency">Hiệu suất (%)</Label>
                  <Input
                    id="efficiency"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.efficiency}
                    onChange={(e) =>
                      setFormData({ ...formData, efficiency: parseInt(e.target.value) || 100 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utilizationTarget">Mục tiêu sử dụng (%)</Label>
                  <Input
                    id="utilizationTarget"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.utilizationTarget}
                    onChange={(e) =>
                      setFormData({ ...formData, utilizationTarget: parseInt(e.target.value) || 85 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">Giờ bắt đầu</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={formData.workingHoursStart}
                    onChange={(e) =>
                      setFormData({ ...formData, workingHoursStart: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">Giờ kết thúc</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={formData.workingHoursEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, workingHoursEnd: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breakMinutes">Thời gian nghỉ (phút)</Label>
                  <Input
                    id="breakMinutes"
                    type="number"
                    min={0}
                    value={formData.breakMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentJobs">Số job đồng thời tối đa</Label>
                  <Input
                    id="maxConcurrentJobs"
                    type="number"
                    min={1}
                    value={formData.maxConcurrentJobs}
                    onChange={(e) =>
                      setFormData({ ...formData, maxConcurrentJobs: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chi phí</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Chi phí/giờ ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setupCostPerHour">Chi phí setup/giờ ($)</Label>
                  <Input
                    id="setupCostPerHour"
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.setupCostPerHour}
                    onChange={(e) =>
                      setFormData({ ...formData, setupCostPerHour: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overheadRate">Tỷ lệ phí overhead (%)</Label>
                  <Input
                    id="overheadRate"
                    type="number"
                    min={0}
                    step={0.1}
                    value={formData.overheadRate}
                    onChange={(e) =>
                      setFormData({ ...formData, overheadRate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operator & Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle>Nhân sự & Bảo trì</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Yêu cầu người vận hành</Label>
                  <Select
                    value={formData.requiresOperator ? "true" : "false"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, requiresOperator: value === "true" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Có</SelectItem>
                      <SelectItem value="false">Không</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operatorSkillLevel">Cấp độ kỹ năng yêu cầu</Label>
                  <Input
                    id="operatorSkillLevel"
                    value={formData.operatorSkillLevel}
                    onChange={(e) =>
                      setFormData({ ...formData, operatorSkillLevel: e.target.value })
                    }
                    placeholder="VD: Junior, Senior, Expert"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceInterval">Chu kỳ bảo trì (ngày)</Label>
                  <Input
                    id="maintenanceInterval"
                    type="number"
                    min={0}
                    value={formData.maintenanceInterval}
                    onChange={(e) =>
                      setFormData({ ...formData, maintenanceInterval: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/production/work-centers">Hủy</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Tạo Work Center
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
