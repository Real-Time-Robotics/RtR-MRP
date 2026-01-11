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
import Link from "next/link";

interface Part {
  id: string;
  partNumber: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { name: string };
}

export default function NewReceivingInspectionPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partId: "",
    lotNumber: "",
    quantityReceived: "",
    quantityInspected: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partsRes, poRes] = await Promise.all([
        fetch("/api/parts?limit=100"),
        fetch("/api/purchase-orders?status=OPEN"),
      ]);

      if (partsRes.ok) {
        const data = await partsRes.json();
        setParts(data.parts || data.data || []);
      }
      if (poRes.ok) {
        const data = await poRes.json();
        setPurchaseOrders(data.orders || data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
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
          type: "RECEIVING",
          partId: formData.partId || null,
          lotNumber: formData.lotNumber || null,
          quantityReceived: parseInt(formData.quantityReceived) || 0,
          quantityInspected: parseInt(formData.quantityInspected) || 0,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        const inspection = await res.json();
        router.push(`/quality/receiving/${inspection.id}`);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create inspection");
      }
    } catch (error) {
      console.error("Failed to create inspection:", error);
      alert("Failed to create inspection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo Receiving Inspection"
        description="Kiểm tra chất lượng nguyên vật liệu nhận về"
        backHref="/quality/receiving"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Material Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin vật tư</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Quantity Information */}
          <Card>
            <CardHeader>
              <CardTitle>Số lượng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantityReceived">Số lượng nhận *</Label>
                  <Input
                    id="quantityReceived"
                    type="number"
                    min="1"
                    value={formData.quantityReceived}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantityReceived: e.target.value,
                      })
                    }
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityInspected">Số lượng kiểm tra</Label>
                  <Input
                    id="quantityInspected"
                    type="number"
                    min="0"
                    value={formData.quantityInspected}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantityInspected: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú thêm</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Thêm ghi chú về inspection..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/quality/receiving">Hủy</Link>
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
