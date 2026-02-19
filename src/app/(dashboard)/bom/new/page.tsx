"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Plus, Pencil } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { clientLogger } from '@/lib/client-logger';

const bomFormSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  version: z.string().min(1, "Version là bắt buộc"),
  effectiveDate: z.string().min(1, "Ngày hiệu lực là bắt buộc"),
});

interface Product {
  id: string;
  sku: string;
  name: string;
}

export default function NewBOMPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(true);

  // Product dialog (create / edit)
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogMode, setProductDialogMode] = useState<"create" | "edit">("create");
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");

  // Form state
  const [productId, setProductId] = useState("");
  const [version, setVersion] = useState("1.0");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      // Handle both array and paginated response
      const productsArray = Array.isArray(data) ? data : (data?.data || []);
      setProducts(productsArray);
    } catch (error) {
      clientLogger.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setFetchingProducts(false);
    }
  };

  const openCreateDialog = () => {
    setProductDialogMode("create");
    setEditingProductId("");
    setNewProductSku("");
    setNewProductName("");
    setNewProductDescription("");
    setNewProductPrice("");
    setProductDialogOpen(true);
  };

  const openEditDialog = async () => {
    if (!productId) return;
    setProductDialogMode("edit");
    setEditingProductId(productId);
    // Fetch full product data
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setNewProductSku(data.sku || "");
        setNewProductName(data.name || "");
        setNewProductDescription(data.description || "");
        setNewProductPrice(data.basePrice != null ? String(data.basePrice) : "");
        setProductDialogOpen(true);
      } else {
        toast.error("Không thể tải thông tin product");
      }
    } catch {
      toast.error("Lỗi kết nối");
    }
  };

  const handleSaveProduct = async () => {
    if (!newProductSku.trim()) {
      toast.error("SKU là bắt buộc");
      return;
    }
    if (!newProductName.trim()) {
      toast.error("Tên sản phẩm là bắt buộc");
      return;
    }

    setSavingProduct(true);
    try {
      const isEdit = productDialogMode === "edit";
      const url = isEdit ? `/api/products/${editingProductId}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: newProductSku.trim(),
          name: newProductName.trim(),
          description: newProductDescription.trim() || null,
          basePrice: newProductPrice ? parseFloat(newProductPrice) : null,
        }),
      });

      if (response.ok) {
        const savedProduct = await response.json();
        if (isEdit) {
          toast.success(`Đã cập nhật product "${savedProduct.name}"`);
          setProducts((prev) =>
            prev.map((p) =>
              p.id === savedProduct.id
                ? { id: savedProduct.id, sku: savedProduct.sku, name: savedProduct.name }
                : p
            )
          );
        } else {
          toast.success(`Đã tạo product "${savedProduct.name}"`);
          setProducts((prev) => [...prev, { id: savedProduct.id, sku: savedProduct.sku, name: savedProduct.name }]);
          setProductId(savedProduct.id);
        }
        setProductDialogOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || (isEdit ? "Lỗi cập nhật product" : "Lỗi tạo product"));
      }
    } catch (error) {
      clientLogger.error("Failed to save product:", error);
      toast.error("Lỗi lưu product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = bomFormSchema.safeParse({ productId, version, effectiveDate });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);

    try {
      const response = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          version,
          effectiveDate,
          notes: notes || null,
          status: "draft",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("BOM created successfully!");
        router.push(`/bom/${data.productId || productId}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create BOM");
      }
    } catch (error) {
      clientLogger.error("Failed to create BOM:", error);
      toast.error("Failed to create BOM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bom">
          <Button variant="ghost" size="icon" aria-label="Quay lại">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New BOM</h1>
          <p className="text-muted-foreground">
            Create a new Bill of Materials for a product
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>BOM Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={productId}
                    onValueChange={setProductId}
                    disabled={fetchingProducts}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          fetchingProducts ? "Loading products..." : "Select product..."
                        }
                      />
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
                {productId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={openEditDialog}
                    title="Sửa product đang chọn"
                    aria-label="Sửa product đang chọn"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCreateDialog}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tạo mới
                </Button>
              </div>
              {fieldErrors.productId && (
                <p className="text-sm text-red-500">{fieldErrors.productId}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Chọn product có sẵn hoặc bấm &quot;Tạo mới&quot; để tạo product mới
              </p>
            </div>

            {/* Version and Effective Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  required
                />
                {fieldErrors.version && (
                  <p className="text-sm text-red-500">{fieldErrors.version}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  BOM version number (e.g., 1.0, 2.0)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  required
                />
                {fieldErrors.effectiveDate && (
                  <p className="text-sm text-red-500">{fieldErrors.effectiveDate}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Date when this BOM becomes active
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this BOM..."
                rows={3}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                After creating the BOM header, you can add component parts in
                the BOM detail page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/bom">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !productId}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create BOM"
            )}
          </Button>
        </div>
      </form>

      {/* Create / Edit Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {productDialogMode === "edit" ? "Sửa Product" : "Tạo Product mới"}
            </DialogTitle>
            <DialogDescription>
              {productDialogMode === "edit"
                ? "Cập nhật thông tin sản phẩm."
                : "Nhập thông tin sản phẩm mới. Sau khi tạo sẽ tự động chọn product này cho BOM."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                value={newProductSku}
                onChange={(e) => setNewProductSku(e.target.value)}
                placeholder="e.g., DRONE-X1, RTR-500"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Tên sản phẩm *</Label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="e.g., RTR Drone X1 Pro"
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
                placeholder="Mô tả sản phẩm..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Giá cơ bản (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductDialogOpen(false)}
                disabled={savingProduct}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleSaveProduct}
                disabled={savingProduct || !newProductSku.trim() || !newProductName.trim()}
              >
                {savingProduct ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {productDialogMode === "edit" ? "Đang lưu..." : "Đang tạo..."}
                  </>
                ) : productDialogMode === "edit" ? (
                  "Lưu thay đổi"
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Product
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
