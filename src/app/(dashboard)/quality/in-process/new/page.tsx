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

interface WorkOrder {
  id: string;
  woNumber: string;
}

export default function NewInProcessInspectionPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partId: "",
    workOrderId: "",
    workCenter: "",
    lotNumber: "",
    quantityInspected: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partsRes, woRes] = await Promise.all([
        fetch("/api/parts?limit=100"),
        fetch("/api/production?status=IN_PROGRESS"),
      ]);

      if (partsRes.ok) {
        const data = await partsRes.json();
        setParts(data.parts || data.data || []);
      }
      if (woRes.ok) {
        const data = await woRes.json();
        setWorkOrders(data.workOrders || data.data || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "IN_PROCESS",
          partId: formData.partId || null,
          workOrderId: formData.workOrderId || null,
          workCenter: formData.workCenter || null,
          lotNumber: formData.lotNumber || null,
          quantityInspected: parseInt(formData.quantityInspected) || 0,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        const inspection = await res.json();
        router.push(`/quality/in-process/${inspection.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create inspection");
      }
    } catch (error) {
      clientLogger.error("Failed to create inspection:", error);
      toast.error("Failed to create inspection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo phiếu kiểm tra trong sản xuất"
        description="Kiểm tra chất lượng trong quá trình sản xuất"
        backHref="/quality/in-process"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Work Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản xuất</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Order</Label>
                  <Select
                    value={formData.workOrderId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, workOrderId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn Work Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.map((wo) => (
                        <SelectItem key={wo.id} value={wo.id}>
                          {wo.woNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workCenter">Work Center</Label>
                  <Input
                    id="workCenter"
                    value={formData.workCenter}
                    onChange={(e) =>
                      setFormData({ ...formData, workCenter: e.target.value })
                    }
                    placeholder="Tên work center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Part/Vật tư *</Label>
                  <Select
                    value={formData.partId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, partId: value })
                    }
                    required
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
            </CardContent>
          </Card>

          {/* Quantity */}
          <Card>
            <CardHeader>
              <CardTitle>Số lượng kiểm tra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="quantityInspected">Số lượng kiểm tra *</Label>
                <Input
                  id="quantityInspected"
                  type="number"
                  min="1"
                  value={formData.quantityInspected}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityInspected: e.target.value,
                    })
                  }
                  placeholder="0"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Thêm ghi chú..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/quality/in-process">Hủy</Link>
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
                  Tạo Inspection
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
