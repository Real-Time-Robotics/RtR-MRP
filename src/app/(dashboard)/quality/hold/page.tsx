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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import {
  PauseCircle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { EntityTooltip } from "@/components/entity-tooltip";
import { clientLogger } from '@/lib/client-logger';

interface HoldInventoryItem {
  id: string;
  partId: string;
  part: {
    partNumber: string;
    name: string;
    unit: string;
  };
  lotNumber: string | null;
  quantity: number;
  createdAt: string;
}

export default function HoldManagementPage() {
  const [inventory, setInventory] = useState<HoldInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<HoldInventoryItem | null>(null);
  const [decisionType, setDecisionType] = useState<"RELEASE" | "REJECT" | null>(null);
  const [decisionQuantity, setDecisionQuantity] = useState(0);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quality/hold");
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch {
      clientLogger.error("Failed to fetch HOLD inventory");
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
  const oldestItem =
    inventory.length > 0
      ? inventory.reduce((oldest, item) =>
          new Date(item.createdAt) < new Date(oldest.createdAt) ? item : oldest
        )
      : null;

  function openDecisionDialog(item: HoldInventoryItem, type: "RELEASE" | "REJECT") {
    setSelectedItem(item);
    setDecisionType(type);
    setDecisionQuantity(item.quantity);
    setDecisionNotes("");
    setError("");
  }

  function closeDialog() {
    setSelectedItem(null);
    setDecisionType(null);
    setDecisionQuantity(0);
    setDecisionNotes("");
    setError("");
  }

  async function executeDecision() {
    if (!selectedItem || !decisionType) return;

    if (decisionQuantity <= 0 || decisionQuantity > selectedItem.quantity) {
      setError(`Số lượng phải từ 1 đến ${selectedItem.quantity}`);
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch(`/api/quality/hold/${selectedItem.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionType,
          quantity: decisionQuantity,
          notes: decisionNotes,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Kho Tạm giữ (HOLD)"
        description="Xem xét và quyết định hàng đang chờ duyệt"
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
              Tổng mục đang giữ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">items cần review</p>
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
            <p className="text-xs text-muted-foreground">đơn vị đang chờ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lâu nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {oldestItem
                ? formatDistanceToNow(new Date(oldestItem.createdAt), {
                    locale: vi,
                    addSuffix: false,
                  })
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {oldestItem ? oldestItem.part.partNumber : "Không có item"}
            </p>
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
              <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
              <p className="font-medium">Không có hàng đang tạm giữ</p>
              <p className="text-sm">Tất cả đã được xử lý</p>
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
                    <th className="text-left p-3 font-medium">Thời gian giữ</th>
                    <th className="text-right p-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
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
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatDistanceToNow(new Date(item.createdAt), {
                              locale: vi,
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20"
                            onClick={() => openDecisionDialog(item, "RELEASE")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => openDecisionDialog(item, "REJECT")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Từ chối
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={!!selectedItem && !!decisionType} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionType === "RELEASE" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Duyệt hàng (Release)
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Từ chối hàng (Reject)
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {decisionType === "RELEASE"
                ? "Hàng sẽ được chuyển sang kho MAIN để sử dụng."
                : "Hàng sẽ được chuyển sang QUARANTINE và tạo NCR mới."}
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
                  <strong>Số lượng đang giữ:</strong> {selectedItem.quantity}{" "}
                  {selectedItem.part.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Số lượng xử lý *</Label>
                <Input
                  type="number"
                  value={decisionQuantity}
                  onChange={(e) => setDecisionQuantity(Number(e.target.value))}
                  min={1}
                  max={selectedItem.quantity}
                />
                {decisionQuantity > 0 && decisionQuantity < selectedItem.quantity && (
                  <p className="text-sm text-amber-600">
                    Xử lý một phần. Còn lại {selectedItem.quantity - decisionQuantity} trong
                    HOLD.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder={
                    decisionType === "RELEASE" ? "Lý do duyệt..." : "Lý do từ chối..."
                  }
                  rows={3}
                />
              </div>

              {/* Flow preview */}
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20">
                  WH-HOLD
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                {decisionType === "RELEASE" ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400">
                    WH-MAIN
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400">
                    WH-QUARANTINE + NCR
                  </Badge>
                )}
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
              onClick={executeDecision}
              disabled={processing}
              className={
                decisionType === "RELEASE"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : decisionType === "RELEASE" ? (
                "Xác nhận duyệt"
              ) : (
                "Xác nhận từ chối"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
