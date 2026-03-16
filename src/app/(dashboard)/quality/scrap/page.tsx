"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import {
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  Recycle,
  Flame,
  AlertOctagon,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { EntityTooltip } from "@/components/entity-tooltip";
import { clientLogger } from '@/lib/client-logger';

interface ScrapInventoryItem {
  id: string;
  partId: string;
  part: {
    partNumber: string;
    name: string;
    unit: string;
    unitCost: number;
  };
  lotNumber: string | null;
  quantity: number;
  createdAt: string;
}

const DISPOSAL_METHODS = [
  {
    value: "PHYSICAL_DESTRUCTION",
    label: "Hủy vật lý",
    icon: Flame,
    color: "text-red-600",
  },
  {
    value: "RECYCLING",
    label: "Tái chế",
    icon: Recycle,
    color: "text-green-600",
  },
  {
    value: "HAZARDOUS_WASTE",
    label: "Chất thải nguy hại",
    icon: AlertOctagon,
    color: "text-amber-600",
  },
  {
    value: "OTHER",
    label: "Khác",
    icon: MoreHorizontal,
    color: "text-gray-600",
  },
];

export default function ScrapManagementPage() {
  const [inventory, setInventory] = useState<ScrapInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<ScrapInventoryItem | null>(null);
  const [disposeQuantity, setDisposeQuantity] = useState(0);
  const [disposalMethod, setDisposalMethod] = useState("");
  const [disposalReference, setDisposalReference] = useState("");
  const [disposeNotes, setDisposeNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quality/scrap");
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch {
      clientLogger.error("Failed to fetch SCRAP inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filteredInventory = inventory.filter(
    (item) =>
      item.part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.lotNumber && item.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventory.reduce(
    (sum, item) => sum + item.quantity * (item.part.unitCost || 0),
    0
  );

  function openDisposeDialog(item: ScrapInventoryItem) {
    setSelectedItem(item);
    setDisposeQuantity(item.quantity);
    setDisposalMethod("");
    setDisposalReference("");
    setDisposeNotes("");
    setError("");
  }

  function closeDialog() {
    setSelectedItem(null);
    setDisposeQuantity(0);
    setDisposalMethod("");
    setDisposalReference("");
    setDisposeNotes("");
    setError("");
  }

  async function executeDispose() {
    if (!selectedItem) return;

    if (!disposalMethod) {
      setError("Vui lòng chọn phương thức hủy");
      return;
    }

    if (disposeQuantity <= 0 || disposeQuantity > selectedItem.quantity) {
      setError(`Số lượng phải từ 1 đến ${selectedItem.quantity}`);
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch(`/api/quality/scrap/${selectedItem.id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: disposeQuantity,
          disposalMethod,
          disposalReference,
          notes: disposeNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra");
        return;
      }

      await fetchInventory();
      closeDialog();
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setProcessing(false);
    }
  }

  const calculateWriteOff = () => {
    if (!selectedItem) return 0;
    return disposeQuantity * (selectedItem.part.unitCost || 0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Kho Phế liệu (SCRAP)"
        description="Hủy bỏ và ghi nhận write-off phế liệu"
        actions={
          <Button onClick={fetchInventory} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng mục phế liệu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">items chờ hủy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng số lượng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">đơn vị phế liệu</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Giá trị write-off
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {totalValue.toLocaleString()} VND
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">cần hủy bỏ</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo mã, tên, số lô..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Recycle className="h-12 w-12 mb-2 text-green-500" />
              <p className="font-medium">Không có phế liệu</p>
              <p className="text-sm">Kho scrap trống</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Mã linh kiện</th>
                    <th className="text-left p-3 font-medium">Tên</th>
                    <th className="text-left p-3 font-medium">Số lô</th>
                    <th className="text-right p-3 font-medium">Số lượng</th>
                    <th className="text-right p-3 font-medium">Đơn giá</th>
                    <th className="text-right p-3 font-medium">Giá trị</th>
                    <th className="text-left p-3 font-medium">Ngày vào scrap</th>
                    <th className="text-right p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const itemValue = item.quantity * (item.part.unitCost || 0);
                    return (
                      <tr
                        key={item.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-mono font-medium">
                          <EntityTooltip type="part" id={item.partId}>
                            <span className="cursor-help">{item.part.partNumber}</span>
                          </EntityTooltip>
                        </td>
                        <td className="p-3">{item.part.name}</td>
                        <td className="p-3">
                          {item.lotNumber ? (
                            <Badge variant="outline">{item.lotNumber}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {item.quantity.toLocaleString()} {item.part.unit}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {(item.part.unitCost || 0).toLocaleString()} VND
                        </td>
                        <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">
                          {itemValue.toLocaleString()} VND
                        </td>
                        <td className="p-3">
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), {
                              locale: vi,
                              addSuffix: true,
                            })}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDisposeDialog(item)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Hủy bỏ
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispose Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Hủy bỏ phế liệu
            </DialogTitle>
            <DialogDescription>
              Xác nhận hủy bỏ và ghi nhận write-off vào sổ sách
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p>
                  <strong>Mã:</strong> {selectedItem.part.partNumber}
                </p>
                <p>
                  <strong>Tên:</strong> {selectedItem.part.name}
                </p>
                {selectedItem.lotNumber && (
                  <p>
                    <strong>Số lô:</strong> {selectedItem.lotNumber}
                  </p>
                )}
                <p>
                  <strong>Số lượng trong scrap:</strong> {selectedItem.quantity}{" "}
                  {selectedItem.part.unit}
                </p>
                <p>
                  <strong>Đơn giá:</strong>{" "}
                  {(selectedItem.part.unitCost || 0).toLocaleString()} VND
                </p>
              </div>

              <div className="space-y-2">
                <Label>Số lượng hủy *</Label>
                <Input
                  type="number"
                  value={disposeQuantity}
                  onChange={(e) => setDisposeQuantity(Number(e.target.value))}
                  min={1}
                  max={selectedItem.quantity}
                />
              </div>

              <div className="space-y-2">
                <Label>Phương thức hủy *</Label>
                <Select value={disposalMethod} onValueChange={setDisposalMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phương thức..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPOSAL_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className={`h-4 w-4 ${method.color}`} />
                          <span>{method.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Số chứng từ hủy</Label>
                <Input
                  value={disposalReference}
                  onChange={(e) => setDisposalReference(e.target.value)}
                  placeholder="VD: DISP-2026-001"
                />
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  value={disposeNotes}
                  onChange={(e) => setDisposeNotes(e.target.value)}
                  placeholder="Lý do, ghi chú thêm..."
                  rows={2}
                />
              </div>

              {/* Write-off value */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-red-700 dark:text-red-300 font-medium">
                    Giá trị write-off:
                  </span>
                  <span className="text-xl font-bold text-red-700 dark:text-red-300">
                    {calculateWriteOff().toLocaleString()} VND
                  </span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Giá trị này sẽ được ghi nhận vào chi phí
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={executeDispose}
              disabled={processing || !disposalMethod}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận hủy bỏ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
