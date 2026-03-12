"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { z } from "zod";
import { clientLogger } from '@/lib/client-logger';
import { useWorkSession } from '@/hooks/use-work-session';

const orderItemSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  quantity: z.number().int().min(1, "Số lượng phải >= 1"),
  unitPrice: z.number().min(0, "Đơn giá không được âm"),
});

const orderFormSchema = z.object({
  customerId: z.string().min(1, "Vui lòng chọn khách hàng"),
  requiredDate: z.string().min(1, "Ngày yêu cầu giao là bắt buộc"),
  items: z.array(orderItemSchema).min(1, "Vui lòng thêm ít nhất một sản phẩm"),
});

interface Customer {
  id: string;
  code: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number | null;
}

interface OrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    requiredDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    notes: "",
  });
  const [items, setItems] = useState<OrderLine[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Work Session tracking for SO creation
  const { trackActivity, completeSession } = useWorkSession({
    entityType: 'SO',
    entityId: 'new',
    entityNumber: 'NEW-SO',
    workflowSteps: ['Chọn khách hàng', 'Thêm sản phẩm', 'Lưu'],
    currentStep: 1,
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?status=active");
      if (res.ok) {
        const result = await res.json();
        setCustomers(result.data || []);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch customers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?pageSize=100");
      if (res.ok) {
        const result = await res.json();
        const items = result.data || result.products || [];
        setProducts(items);
      } else {
        clientLogger.error("[fetchProducts] API error:", res.status);
      }
    } catch (error) {
      clientLogger.error("Failed to fetch products:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderLine, value: string | number) => {
    const newItems = [...items];
    if (field === "productId") {
      newItems[index].productId = value as string;
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unitPrice = product.basePrice || 0;
      }
    } else if (field === "quantity") {
      newItems[index].quantity = parseInt(value as string) || 0;
    } else if (field === "unitPrice") {
      newItems[index].unitPrice = parseFloat(value as string) || 0;
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = orderFormSchema.safeParse({
      customerId: formData.customerId,
      requiredDate: formData.requiredDate,
      items,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      // Map nested item errors to a single key for display
      if (!errors.items && Object.keys(errors).some((k) => k.startsWith("items."))) {
        errors.items = "Vui lòng điền đầy đủ thông tin cho tất cả sản phẩm";
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: formData.customerId,
          requiredDate: formData.requiredDate,
          notes: formData.notes || null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      if (res.ok) {
        const order = await res.json();
        trackActivity('SO_CREATED', `Tạo đơn hàng mới với ${items.length} sản phẩm`);
        completeSession();
        router.push(`/orders/${order.id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Không thể tạo đơn hàng");
      }
    } catch (error) {
      clientLogger.error("Failed to create order:", error);
      toast.error("Không thể tạo đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo đơn hàng mới"
        description="Tạo đơn đặt hàng từ khách hàng"
        backHref="/orders"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Khách hàng *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, customerId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn khách hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.code} - {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.customerId && (
                    <p className="text-sm text-red-500">{fieldErrors.customerId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requiredDate">Ngày yêu cầu giao *</Label>
                  <Input
                    id="requiredDate"
                    type="date"
                    value={formData.requiredDate}
                    onChange={(e) =>
                      setFormData({ ...formData, requiredDate: e.target.value })
                    }
                    required
                  />
                  {fieldErrors.requiredDate && (
                    <p className="text-sm text-red-500">{fieldErrors.requiredDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Ghi chú cho đơn hàng..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chi tiết đơn hàng</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm sản phẩm
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fieldErrors.items && (
                <p className="text-sm text-red-500 mb-2">{fieldErrors.items}</p>
              )}
              {items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Sản phẩm</TableHead>
                      <TableHead className="w-[20%]">Số lượng</TableHead>
                      <TableHead className="w-[20%]">Đơn giá</TableHead>
                      <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.productId || undefined}
                            onValueChange={(value) => updateItem(index, "productId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn sản phẩm" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-[300px]">
                              {products.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">Không có sản phẩm</div>
                              ) : (
                                products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.sku} - {product.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${(item.quantity * item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            aria-label="Xóa dòng"
                          >
                            <Trash2 className="h-4 w-4 text-danger-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Tổng cộng:
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${calculateTotal().toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để thêm vào đơn hàng.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/orders">Hủy</Link>
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
                  Tạo đơn hàng
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
