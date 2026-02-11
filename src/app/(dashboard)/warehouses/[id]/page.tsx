"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Package,
  Archive,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SmartGrid } from "@/components/ui-v2/smart-grid";
import { Column } from "@/components/ui-v2/data-table";
import { StockStatusBadge } from "@/components/inventory/stock-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateMedium } from "@/lib/date";
import type { StockStatus } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  location?: string;
  type?: string;
  status: string;
}

interface InventoryItem {
  id: string;
  partId: string;
  partNumber: string;
  name: string;
  category: string;
  quantity: number;
  reserved: number;
  available: number;
  status: StockStatus;
  isCritical: boolean;
  lotNumber?: string;
  locationCode?: string;
}

interface PendingReceipt {
  id: string;
  receiptNumber: string;
  quantity: number;
  lotNumber: string;
  status: string;
  requestedAt: string;
  notes: string | null;
  workOrder: {
    woNumber: string;
    status: string;
    completedQty: number;
  };
  product: {
    id: string;
    sku: string;
    name: string;
  };
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

const typeConfig: Record<string, { badge: string; label: string }> = {
  MAIN: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    label: "Kho chính",
  },
  RECEIVING: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Khu nhận hàng",
  },
  QUARANTINE: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    label: "Kho cách ly",
  },
  HOLD: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    label: "Kho giữ hàng",
  },
  SCRAP: {
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
    label: "Kho phế liệu",
  },
};

function getTypeConfig(type?: string) {
  return typeConfig[type || "MAIN"] || typeConfig.MAIN;
}

function extractPO(lotNumber?: string): string | null {
  if (!lotNumber) return null;
  const match = lotNumber.match(/PO-\d{4}-\d{3}/);
  return match ? match[0] : null;
}

// =============================================================================
// STATS CARDS (compact style giống InventoryTable)
// =============================================================================

function StatsCards({ inventory }: { inventory: InventoryItem[] }) {
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((s, i) => s + i.quantity, 0);
  const totalReserved = inventory.reduce((s, i) => s + i.reserved, 0);
  const alertCount = inventory.filter(
    (i) => i.status === "CRITICAL" || i.status === "OUT_OF_STOCK"
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 shrink-0">
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{totalItems}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng items</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono">{totalQuantity.toLocaleString()}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Tổng số lượng</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-amber-600">{totalReserved.toLocaleString()}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Đã giữ</p>
        </CardContent>
      </Card>
      <Card className="border-gray-200 dark:border-mrp-border">
        <CardContent className="p-3">
          <div className="text-lg font-semibold font-mono text-red-600">{alertCount}</div>
          <p className="text-[10px] text-gray-500 dark:text-mrp-text-muted">Cảnh báo</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function WarehouseDetailPage() {
  const params = useParams();
  const warehouseId = params.id as string;

  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PendingReceipt | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [whRes, invRes, receiptsRes] = await Promise.all([
        fetch("/api/warehouses"),
        fetch(`/api/inventory?warehouseId=${warehouseId}`),
        fetch(`/api/warehouse-receipts?warehouseId=${warehouseId}&status=PENDING`),
      ]);

      const whJson = await whRes.json();
      const invJson = await invRes.json();
      const receiptsJson = await receiptsRes.json();

      if (!whJson.success) throw new Error("Failed to fetch warehouse");
      if (!invJson.success) throw new Error("Failed to fetch inventory");

      const wh = (whJson.data as WarehouseData[]).find(
        (w) => w.id === warehouseId
      );
      if (!wh) throw new Error("Kho không tồn tại");

      setWarehouse(wh);
      setInventory(invJson.data || []);
      setPendingReceipts(receiptsJson.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirm = async (receiptId: string) => {
    setProcessingId(receiptId);
    try {
      const res = await fetch(`/api/warehouse-receipts/${receiptId}/confirm`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || result.message || "Lỗi xác nhận phiếu");
        return;
      }
      fetchData();
    } catch {
      alert("Lỗi xác nhận phiếu nhập kho");
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (receipt: PendingReceipt) => {
    setRejectTarget(receipt);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setProcessingId(rejectTarget.id);
    setRejectDialogOpen(false);
    try {
      const res = await fetch(`/api/warehouse-receipts/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || result.message || "Lỗi từ chối phiếu");
        return;
      }
      fetchData();
    } catch {
      alert("Lỗi từ chối phiếu nhập kho");
    } finally {
      setProcessingId(null);
      setRejectTarget(null);
    }
  };

  // Column definitions - Excel-like pattern
  const columns: Column<InventoryItem>[] = useMemo(() => [
    {
      key: "partNumber",
      header: "Mã VT",
      width: "120px",
      sortable: true,
      sticky: "left",
      render: (value: string, row: InventoryItem) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/inventory/${row.id}`}
            className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {value}
          </Link>
          {row.isCritical && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </div>
      ),
    },
    {
      key: "name",
      header: "Tên",
      width: "180px",
      sortable: true,
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "lotNumber",
      header: "PO",
      width: "110px",
      sortable: true,
      render: (_: string | undefined, row: InventoryItem) => {
        const po = extractPO(row.lotNumber);
        return po ? (
          <span className="font-mono text-sm text-blue-600 dark:text-blue-400">{po}</span>
        ) : (
          <span className="text-slate-400">-</span>
        );
      },
    },
    {
      key: "lotNumber",
      header: "Lot",
      width: "130px",
      sortable: true,
      render: (value: string | undefined) =>
        value ? (
          <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {value}
          </span>
        ) : (
          <span className="text-slate-400">-</span>
        ),
    },
    {
      key: "locationCode",
      header: "Vị trí",
      width: "100px",
      sortable: true,
      render: (value: string | undefined) => (
        <span className="text-sm">{value || "-"}</span>
      ),
    },
    {
      key: "quantity",
      header: "Tồn kho",
      width: "100px",
      align: "right",
      type: "number",
      sortable: true,
      render: (value: number) => <span className="font-bold">{value.toLocaleString()}</span>,
    },
    {
      key: "reserved",
      header: "Đã giữ",
      width: "90px",
      align: "right",
      type: "number",
      render: (value: number) => <span className="text-amber-600">{value.toLocaleString()}</span>,
    },
    {
      key: "available",
      header: "Khả dụng",
      width: "100px",
      align: "right",
      type: "number",
      render: (value: number) => (
        <span className="text-green-600 font-medium">{value.toLocaleString()}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      width: "120px",
      align: "center",
      sortable: true,
      render: (_: StockStatus, row: InventoryItem) => <StockStatusBadge status={row.status} />,
    },
  ], []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Đang tải..." backHref="/warehouses" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Lỗi" backHref="/warehouses" />
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6 text-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>{error || "Kho không tồn tại"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tc = getTypeConfig(warehouse.type);

  return (
    <div className="h-full flex flex-col space-y-4 p-6">
      {/* Header */}
      <PageHeader
        title={warehouse.name}
        description={`${warehouse.code}${warehouse.location ? ` — ${warehouse.location}` : ""}`}
        backHref="/warehouses"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={tc.badge}>
              {warehouse.type || "MAIN"}
            </Badge>
            <Badge
              variant="secondary"
              className={
                warehouse.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }
            >
              {warehouse.status === "active" ? "Hoạt động" : warehouse.status}
            </Badge>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards inventory={inventory} />

      {/* Tabs: Inventory + Pending Receipts */}
      <Tabs defaultValue="inventory" className="flex-1 min-h-0 flex flex-col">
        <TabsList>
          <TabsTrigger value="inventory">Tồn kho</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-1.5">
            Phiếu chờ nhập kho
            {pendingReceipts.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {pendingReceipts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-4">
          <SmartGrid
            data={inventory}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="Chưa có vật tư nào trong kho này"
            searchable
            searchPlaceholder="Tìm theo mã vật tư, tên, lot..."
            pagination
            pageSize={20}
            stickyHeader
            columnToggle
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: "field-names",
              gridBorders: true,
              showFooter: true,
              sheetName: warehouse.code,
              compactMode: true,
            }}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingReceipts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Không có phiếu chờ nhập kho</p>
              </CardContent>
            </Card>
          ) : (
            pendingReceipts.map((receipt) => (
              <Card key={receipt.id} className="border-yellow-200 dark:border-yellow-900/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">{receipt.receiptNumber}</span>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                          <Clock className="h-3 w-3 mr-1" />
                          Chờ xác nhận
                        </Badge>
                      </div>
                      <p className="font-medium">{receipt.product.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>WO: <Link href={`/production/${receipt.workOrder.woNumber}`} className="text-blue-600 hover:underline">{receipt.workOrder.woNumber}</Link></span>
                        <span>Số lượng: <strong className="text-foreground">{receipt.quantity}</strong></span>
                        <span>Lot: <span className="font-mono">{receipt.lotNumber}</span></span>
                        <span>Ngày yêu cầu: {formatDateMedium(receipt.requestedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={processingId === receipt.id}
                        onClick={() => handleConfirm(receipt.id)}
                      >
                        {processingId === receipt.id ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                        )}
                        Xác nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={processingId === receipt.id}
                        onClick={() => openRejectDialog(receipt)}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Từ chối
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối phiếu nhập kho</DialogTitle>
            <DialogDescription>
              {rejectTarget && `Từ chối phiếu ${rejectTarget.receiptNumber} - ${rejectTarget.product.name} (${rejectTarget.quantity} units)`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Lý do từ chối *</Label>
              <Textarea
                id="rejectReason"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
