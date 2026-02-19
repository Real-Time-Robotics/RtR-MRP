"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { z } from "zod";
import { clientLogger } from '@/lib/client-logger';

const workOrderFormSchema = z.object({
  productId: z.string().min(1, "Vui lòng chọn sản phẩm"),
  quantity: z.number().int().min(1, "Số lượng phải >= 1"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface SalesOrderLine {
  id: string;
  productId: string;
  quantity: number;
  product?: { name: string };
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
  };
  requiredDate: string;
  items?: SalesOrderLine[];
  lines?: SalesOrderLine[];
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

  // Form state
  const [productId, setProductId] = useState("");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [priority, setPriority] = useState("normal");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedEnd, setPlannedEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders?status=confirmed"),
      ]);
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();

      // Handle both array and paginated response formats
      const productsArray = Array.isArray(productsData)
        ? productsData
        : (productsData?.data || []);
      const ordersArray = Array.isArray(ordersData)
        ? ordersData
        : (ordersData?.data || []);

      setProducts(productsArray);
      setSalesOrders(ordersArray);
    } catch (error) {
      clientLogger.error("Failed to fetch data:", error);
      setProducts([]);
      setSalesOrders([]);
    }
  };

  const handleSalesOrderChange = (orderId: string) => {
    setSalesOrderId(orderId);
    const order = salesOrders.find((o) => o.id === orderId);
    const items = order?.items || order?.lines || [];
    if (order && items.length > 0) {
      setProductId(items[0].productId);
      setQuantity(items[0].quantity.toString());
      // Set planned end to required date
      if (order.requiredDate) {
        setPlannedEnd(order.requiredDate.split("T")[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = workOrderFormSchema.safeParse({
      productId,
      quantity: parseInt(quantity) || 0,
      priority,
    });
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
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          salesOrderId: salesOrderId && salesOrderId !== "none" ? salesOrderId : undefined,
          quantity: parseInt(quantity),
          priority,
          plannedStart: plannedStart || undefined,
          plannedEnd: plannedEnd || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Tạo Work Order thành công!");
        const woId = data.data?.id || data.id;
        router.push(`/production/${woId}`);
      } else {
        const errMsg = data.error || data.message || "Không thể tạo Work Order";
        toast.error(errMsg);
        clientLogger.error("Failed to create work order:", data);
      }
    } catch (error) {
      clientLogger.error("Failed to create work order:", error);
      toast.error("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Work Order"
        description="Create a new production work order"
        backHref="/production"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-6">
          {/* Main Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salesOrder">Sales Order (Optional)</Label>
                <Select value={salesOrderId} onValueChange={handleSalesOrderChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to sales order..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked order</SelectItem>
                    {salesOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber} - {order.customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select value={productId} onValueChange={setProductId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.productId && (
                  <p className="text-sm text-red-500">{fieldErrors.productId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                {fieldErrors.quantity && (
                  <p className="text-sm text-red-500">{fieldErrors.quantity}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plannedStart">Planned Start Date</Label>
                <Input
                  id="plannedStart"
                  type="date"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plannedEnd">Planned End Date</Label>
                <Input
                  id="plannedEnd"
                  type="date"
                  value={plannedEnd}
                  onChange={(e) => setPlannedEnd(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or instructions..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/production")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !productId || !quantity}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Work Order"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
