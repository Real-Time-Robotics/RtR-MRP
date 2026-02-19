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

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface WorkOrder {
  id: string;
  woNumber: string;
}

export default function NewFinalInspectionPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: "",
    workOrderId: "",
    serialNumber: "",
    lotNumber: "",
    quantityInspected: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, woRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/production?status=IN_PROGRESS"),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || data.data || []);
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
          type: "FINAL",
          productId: formData.productId || null,
          workOrderId: formData.workOrderId || null,
          lotNumber: formData.lotNumber || null,
          quantityInspected: parseInt(formData.quantityInspected) || 0,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        const inspection = await res.json();
        router.push(`/quality/final/${inspection.id}`);
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
        title="Tạo phiếu kiểm tra cuối cùng"
        description="Kiểm tra chất lượng cuối cùng trước khi xuất hàng"
        backHref="/quality/final"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản phẩm</CardTitle>
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
                  <Label>Sản phẩm *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, productId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.sku} - {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value })
                    }
                    placeholder="SN-XXXX"
                  />
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
              <Link href="/quality/final">Hủy</Link>
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
