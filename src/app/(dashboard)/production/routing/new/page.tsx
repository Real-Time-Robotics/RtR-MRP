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

export default function NewRoutingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productId: "",
    version: 1,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      if (res.ok) {
        const result = await res.json();
        setProducts(result.data || result.products || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch products:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error("Vui lòng chọn sản phẩm");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên routing");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/production/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          productId: formData.productId,
          version: formData.version,
        }),
      });

      if (res.ok) {
        const routing = await res.json();
        router.push(`/production/routing/${routing.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Không thể tạo routing");
      }
    } catch (error) {
      clientLogger.error("Failed to create routing:", error);
      toast.error("Không thể tạo routing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo Routing mới"
        description="Định nghĩa quy trình sản xuất cho sản phẩm"
        backHref="/production/routing"
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
                <Label htmlFor="name">Tên Routing *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VD: Quy trình lắp ráp sản phẩm A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mô tả chi tiết về quy trình sản xuất..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sản phẩm *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, productId: value })
                    }
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

                <div className="space-y-2">
                  <Label htmlFor="version">Phiên bản</Label>
                  <Input
                    id="version"
                    type="number"
                    min={1}
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800">
                <strong>Lưu ý:</strong> Sau khi tạo routing, bạn có thể thêm các operation (công đoạn)
                trong trang chi tiết routing. Mỗi operation sẽ được gán cho một work center cụ thể.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/production/routing">Hủy</Link>
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
                  Tạo Routing
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
