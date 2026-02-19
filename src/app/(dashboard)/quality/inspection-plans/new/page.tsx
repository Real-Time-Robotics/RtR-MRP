"use client";

import { useState, useEffect } from "react";
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

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

const TYPE_OPTIONS = [
  { value: "RECEIVING", label: "Kiểm tra nhận hàng" },
  { value: "IN_PROCESS", label: "Kiểm tra trong SX" },
  { value: "FINAL", label: "Kiểm tra cuối cùng" },
];

export default function NewInspectionPlanPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "RECEIVING",
    partId: "",
    description: "",
    aqlLevel: "II",
    sampleSize: "",
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const res = await fetch("/api/parts?limit=100");
      if (res.ok) {
        const data = await res.json();
        setParts(data.parts || data.data || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch parts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/quality/inspection-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          partId: formData.partId || null,
          sampleSize: formData.sampleSize ? parseInt(formData.sampleSize) : null,
        }),
      });

      if (res.ok) {
        const plan = await res.json();
        router.push(`/quality/inspection-plans/${plan.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create inspection plan");
      }
    } catch (error) {
      clientLogger.error("Failed to create inspection plan:", error);
      toast.error("Failed to create inspection plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo Inspection Plan"
        description="Định nghĩa kế hoạch kiểm tra chất lượng"
        backHref="/quality/inspection-plans"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên kế hoạch *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Tên kế hoạch kiểm tra"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại kiểm tra *</Label>
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
                  <Label>Part/Sản phẩm</Label>
                  <Select
                    value={formData.partId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, partId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn part (tùy chọn)" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.partNumber} - {part.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  placeholder="Mô tả kế hoạch kiểm tra..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sampling */}
          <Card>
            <CardHeader>
              <CardTitle>Lấy mẫu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AQL Level</Label>
                  <Select
                    value={formData.aqlLevel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, aqlLevel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Level I (Reduced)</SelectItem>
                      <SelectItem value="II">Level II (Normal)</SelectItem>
                      <SelectItem value="III">Level III (Tightened)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sampleSize">Cỡ mẫu cố định</Label>
                  <Input
                    id="sampleSize"
                    type="number"
                    min="1"
                    value={formData.sampleSize}
                    onChange={(e) =>
                      setFormData({ ...formData, sampleSize: e.target.value })
                    }
                    placeholder="Để trống để dùng AQL"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/quality/inspection-plans">Hủy</Link>
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
                  Tạo Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
