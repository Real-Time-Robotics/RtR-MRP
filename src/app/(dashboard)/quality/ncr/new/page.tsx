"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
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

const SOURCE_OPTIONS = [
  { value: "receiving", label: "Kiểm tra nhận hàng" },
  { value: "in_process", label: "Kiểm tra trong SX" },
  { value: "final", label: "Kiểm tra cuối cùng" },
  { value: "customer_complaint", label: "Khiếu nại khách hàng" },
  { value: "supplier", label: "Lỗi nhà cung cấp" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Nghiêm trọng" },
  { value: "high", label: "Cao" },
  { value: "medium", label: "Trung bình" },
  { value: "low", label: "Thấp" },
];

const DEFECT_CATEGORIES = [
  { value: "DIMENSIONAL", label: "Kích thước" },
  { value: "VISUAL", label: "Ngoại quan" },
  { value: "FUNCTIONAL", label: "Chức năng" },
  { value: "MATERIAL", label: "Vật liệu" },
  { value: "DOCUMENTATION", label: "Tài liệu" },
  { value: "PACKAGING", label: "Đóng gói" },
  { value: "OTHER", label: "Khác" },
];

export default function NewNCRPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    source: "",
    partId: "",
    lotNumber: "",
    quantityAffected: "",
    priority: "medium",
    defectCategory: "",
    defectCode: "",
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
      const res = await fetch("/api/quality/ncr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantityAffected: parseInt(formData.quantityAffected) || 0,
          partId: formData.partId || null,
        }),
      });

      if (res.ok) {
        const ncr = await res.json();
        router.push(`/quality/ncr/${ncr.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create NCR");
      }
    } catch (error) {
      clientLogger.error("Failed to create NCR:", error);
      toast.error("Failed to create NCR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo NCR mới"
        description="Tạo báo cáo không phù hợp mới"
        backHref="/quality/ncr"
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
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Mô tả ngắn gọn vấn đề"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả chi tiết</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mô tả chi tiết về vấn đề không phù hợp..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nguồn phát hiện *</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nguồn phát hiện" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mức độ ưu tiên *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Part/Sản phẩm</Label>
                  <Select
                    value={formData.partId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, partId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn part" />
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

                <div className="space-y-2">
                  <Label htmlFor="lotNumber">Số Lot/Batch</Label>
                  <Input
                    id="lotNumber"
                    value={formData.lotNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, lotNumber: e.target.value })
                    }
                    placeholder="LOT-XXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityAffected">Số lượng bị ảnh hưởng *</Label>
                <Input
                  id="quantityAffected"
                  type="number"
                  min="1"
                  value={formData.quantityAffected}
                  onChange={(e) =>
                    setFormData({ ...formData, quantityAffected: e.target.value })
                  }
                  placeholder="0"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Defect Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin lỗi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại lỗi</Label>
                  <Select
                    value={formData.defectCategory}
                    onValueChange={(value) =>
                      setFormData({ ...formData, defectCategory: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại lỗi" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFECT_CATEGORIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defectCode">Mã lỗi</Label>
                  <Input
                    id="defectCode"
                    value={formData.defectCode}
                    onChange={(e) =>
                      setFormData({ ...formData, defectCode: e.target.value })
                    }
                    placeholder="DEF-XXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/quality/ncr">Hủy</Link>
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
                  Tạo NCR
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
