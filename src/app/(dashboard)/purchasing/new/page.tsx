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
import Link from "next/link";
import { format } from "date-fns";

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface Part {
  id: string;
  partNumber: string;
  name: string;
  unitCost: number;
}

interface POLine {
  partId: string;
  quantity: number;
  unitPrice: number;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Nháp" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "VND", label: "VND" },
  { value: "EUR", label: "EUR" },
];

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    poNumber: `PO-${Date.now().toString().slice(-6)}`,
    supplierId: "",
    orderDate: format(new Date(), "yyyy-MM-dd"),
    expectedDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    status: "draft",
    currency: "USD",
    notes: "",
  });
  const [lines, setLines] = useState<POLine[]>([]);

  useEffect(() => {
    fetchSuppliers();
    fetchParts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers?status=active");
      if (res.ok) {
        const result = await res.json();
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await fetch("/api/parts?makeOrBuy=BUY");
      if (res.ok) {
        const result = await res.json();
        setParts(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch parts:", error);
    }
  };

  const addLine = () => {
    setLines([...lines, { partId: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof POLine, value: string | number) => {
    const newLines = [...lines];
    if (field === "partId") {
      newLines[index].partId = value as string;
      const part = parts.find((p) => p.id === value);
      if (part) {
        newLines[index].unitPrice = part.unitCost;
      }
    } else if (field === "quantity") {
      newLines[index].quantity = parseInt(value as string) || 0;
    } else if (field === "unitPrice") {
      newLines[index].unitPrice = parseFloat(value as string) || 0;
    }
    setLines(newLines);
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      alert("Vui lòng chọn nhà cung cấp");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          notes: formData.notes || null,
          lines: lines.length > 0 ? lines : undefined,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const order = result.data || result;
        router.push(`/purchasing/${order.id}`);
      } else {
        const error = await res.json();
        alert(error.error || error.message || "Không thể tạo PO");
      }
    } catch (error) {
      console.error("Failed to create PO:", error);
      alert("Không thể tạo PO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tạo PO mới"
        description="Tạo đơn mua hàng mới từ nhà cung cấp"
        backHref="/purchasing"
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
                  <Label htmlFor="poNumber">Số PO *</Label>
                  <Input
                    id="poNumber"
                    value={formData.poNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, poNumber: e.target.value })
                    }
                    placeholder="PO-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nhà cung cấp *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, supplierId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderDate">Ngày đặt *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) =>
                      setFormData({ ...formData, orderDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedDate">Ngày dự kiến nhận *</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expectedDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>Tiền tệ</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  placeholder="Ghi chú cho đơn mua hàng..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* PO Lines */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chi tiết đơn hàng</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm dòng
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Part/Vật tư</TableHead>
                      <TableHead className="w-[20%]">Số lượng</TableHead>
                      <TableHead className="w-[20%]">Đơn giá</TableHead>
                      <TableHead className="w-[15%] text-right">Thành tiền</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.partId}
                            onValueChange={(value) => updateLine(index, "partId", value)}
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
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${(line.quantity * line.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(index)}
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
                  Chưa có item nào. Nhấn "Thêm dòng" để thêm vật tư.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/purchasing">Hủy</Link>
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
                  Tạo PO
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
