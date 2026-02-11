"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAIContextSync } from "@/hooks/use-ai-context-sync";
import { Loader2, Play, Pause, CheckCircle, Package, Printer, Lock, Archive, AlertTriangle, PackageCheck, Clock, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { WOStatusBadge } from "@/components/production/wo-status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateMedium } from "@/lib/date";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { EntityDiscussions } from "@/components/discussions/entity-discussions";

interface WorkOrderData {
  id: string;
  woNumber: string;
  quantity: number;
  priority: string;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  completedQty: number;
  scrapQty: number;
  notes: string | null;
  product: {
    sku: string;
    name: string;
  };
  salesOrder: {
    orderNumber: string;
    requiredDate: string;
    customer: {
      name: string;
    };
  } | null;
  allocations: Array<{
    id: string;
    requiredQty: number;
    allocatedQty: number;
    issuedQty: number;
    status: string;
    part: {
      partNumber: string;
      name: string;
    };
  }>;
  productionReceipt: {
    id: string;
    receiptNumber: string;
    quantity: number;
    lotNumber: string;
    status: string;
    requestedAt: string;
    confirmedAt: string | null;
    rejectedAt: string | null;
    rejectedReason: string | null;
  } | null;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<WorkOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionData, setCompletionData] = useState({ completedQty: 0, scrapQty: 0 });
  const [receiving, setReceiving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/${id}`);
      const result = await res.json();
      setData(result.data || result);
    } catch (error) {
      console.error("Failed to fetch work order:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAIContextSync('production', data);

  const allocations = data?.allocations || [];

  const allocationColumns: Column<WorkOrderData['allocations'][0]>[] = useMemo(() => [
    {
      key: 'part',
      header: 'Part',
      width: '200px',
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.part.partNumber}</p>
          <p className="text-sm text-muted-foreground">{row.part.name}</p>
        </div>
      ),
    },
    {
      key: 'requiredQty',
      header: 'Required',
      width: '90px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'allocatedQty',
      header: 'Allocated',
      width: '90px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'issuedQty',
      header: 'Issued',
      width: '90px',
      align: 'right',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      align: 'center',
      render: (_, row) => {
        if (row.issuedQty >= row.requiredQty) {
          return <Badge variant="default" className="bg-green-600">Issued</Badge>;
        }
        if (row.allocatedQty >= row.requiredQty) {
          return <Badge variant="default">Ready</Badge>;
        }
        return <Badge variant="secondary">Partial</Badge>;
      },
    },
  ], []);

  const handleAllocate = async () => {
    setAllocating(true);
    try {
      await fetch(`/api/production/${id}/allocate`, { method: "POST" });
      fetchData();
    } catch (error) {
      console.error("Failed to allocate:", error);
    } finally {
      setAllocating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/production/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || err.message || "Không thể cập nhật trạng thái");
        return;
      }
      fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Lỗi cập nhật trạng thái");
    }
  };

  const handleComplete = async () => {
    try {
      const res = await fetch(`/api/production/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completedQty: completionData.completedQty,
          scrapQty: completionData.scrapQty,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || err.message || "Không thể hoàn thành Work Order");
        return;
      }
      setCompleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Failed to complete work order:", error);
      alert("Lỗi hoàn thành Work Order");
    }
  };

  const handleReceiveOutput = async () => {
    setReceiving(true);
    try {
      const res = await fetch(`/api/production/${id}/receive`, { method: "POST" });
      const result = await res.json();

      if (res.status === 409) {
        // Already pending or confirmed — refresh to get latest state
        fetchData();
        return;
      }

      if (!res.ok) {
        alert(result.error || result.message || "Lỗi nhập kho thành phẩm");
        return;
      }

      // Success — refresh to show new PENDING receipt
      fetchData();
    } catch (error) {
      console.error("Failed to receive production output:", error);
      alert("Lỗi nhập kho thành phẩm");
    } finally {
      setReceiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Work order not found</p>
        <Button variant="link" onClick={() => router.push("/production")}>
          Back to Production
        </Button>
      </div>
    );
  }

  const handlePrintPDF = async () => {
    const { generateWorkOrderPDF } = await import('@/lib/documents');
    generateWorkOrderPDF(data);
  };

  const progressPercent = data.quantity > 0 ? (data.completedQty / data.quantity) * 100 : 0;
  const totalRequired = allocations.reduce((sum, a) => sum + a.requiredQty, 0);
  const materialReadiness =
    totalRequired > 0
      ? Math.round(
        (allocations.reduce((sum, a) => sum + a.allocatedQty, 0) / totalRequired) * 100
      )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Work Order ${data.woNumber}`}
        description={data.product.name}
        backHref="/production"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintPDF}>
              <Printer className="h-4 w-4 mr-2" />
              Print PDF
            </Button>
            {data.status?.toLowerCase() === "draft" && (
              <Button onClick={() => handleStatusChange("released")}>
                <Play className="h-4 w-4 mr-2" />
                Release
              </Button>
            )}
            {data.status?.toLowerCase() === "released" && (
              <Button onClick={() => handleStatusChange("in_progress")}>
                <Play className="h-4 w-4 mr-2" />
                Start Production
              </Button>
            )}
            {data.status?.toLowerCase() === "in_progress" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("on_hold")}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Put on Hold
                </Button>
                <Button onClick={() => {
                  setCompletionData({ completedQty: data.quantity, scrapQty: 0 });
                  setCompleteDialogOpen(true);
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              </>
            )}
            {data.status?.toLowerCase() === "on_hold" && (
              <Button onClick={() => handleStatusChange("in_progress")}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            {data.status?.toLowerCase() === "completed" && (
              <Button variant="outline" onClick={() => {
                if (confirm("Đóng Work Order? Sau khi đóng sẽ không thể thay đổi.")) {
                  handleStatusChange("closed");
                }
              }}>
                <Archive className="h-4 w-4 mr-2" />
                Close WO
              </Button>
            )}
            {["completed", "closed"].includes(data.status?.toLowerCase()) && data.completedQty > 0 && (
              data.productionReceipt?.status === "CONFIRMED" ? (
                <Badge variant="default" className="bg-green-600 text-white px-3 py-1.5">
                  <PackageCheck className="h-4 w-4 mr-1.5" />
                  Đã nhập kho: {data.productionReceipt.quantity} units
                </Badge>
              ) : data.productionReceipt?.status === "PENDING" ? (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-3 py-1.5">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Chờ kho xác nhận ({data.productionReceipt.quantity} units)
                </Badge>
              ) : data.productionReceipt?.status === "REJECTED" ? (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="px-3 py-1.5">
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Bị từ chối: {data.productionReceipt.rejectedReason}
                  </Badge>
                  <Button
                    onClick={handleReceiveOutput}
                    disabled={receiving}
                    size="sm"
                    variant="outline"
                  >
                    {receiving ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                    )}
                    Gửi lại
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleReceiveOutput}
                  disabled={receiving}
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {receiving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4 mr-2" />
                  )}
                  Nhập kho thành phẩm
                </Button>
              )
            )}
          </div>
        }
      />

      {/* Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Product</p>
          <p className="font-medium">{data.product.name}</p>
          <p className="text-sm text-muted-foreground">{data.product.sku}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Quantity</p>
          <p className="text-2xl font-bold">{data.quantity}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <div className="mt-1">
            <WOStatusBadge status={data.status} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Due Date</p>
          <p className="font-medium">
            {data.plannedEnd
              ? formatDateMedium(data.plannedEnd)
              : "-"}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Chi tiết</TabsTrigger>
          <TabsTrigger value="discussions">Thảo luận</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-6">
          {/* Schedule & Progress */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Planned Start</p>
                    <p className="font-medium">
                      {data.plannedStart
                        ? formatDateMedium(data.plannedStart)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Planned End</p>
                    <p className="font-medium">
                      {data.plannedEnd
                        ? formatDateMedium(data.plannedEnd)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actual Start</p>
                    <p className="font-medium">
                      {data.actualStart
                        ? formatDateMedium(data.actualStart)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actual End</p>
                    <p className="font-medium">
                      {data.actualEnd
                        ? formatDateMedium(data.actualEnd)
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">
                      Completed: {data.completedQty}/{data.quantity}
                    </span>
                    <span className="text-sm font-medium">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <Progress value={progressPercent} />
                </div>
                <div className="text-sm text-muted-foreground">
                  Scrap: {data.scrapQty} units
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Order Info */}
          {data.salesOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Sales Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-medium">{data.salesOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{data.salesOrder.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Required Date</p>
                    <p className="font-medium">
                      {formatDateMedium(data.salesOrder.requiredDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Material Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Material Checklist
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Badge variant={materialReadiness === 100 ? "default" : "secondary"}>
                    {materialReadiness}% Ready
                  </Badge>
                  <Button
                    onClick={handleAllocate}
                    disabled={allocating || ["completed", "closed"].includes(data.status?.toLowerCase())}
                  >
                    {allocating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Allocate Materials
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={allocations}
                columns={allocationColumns}
                keyField="id"
                emptyMessage="No materials allocated yet"
                searchable={false}
                stickyHeader
                excelMode={{
                  enabled: true,
                  showRowNumbers: true,
                  columnHeaderStyle: 'field-names',
                  gridBorders: true,
                  showFooter: true,
                  sheetName: 'Material Checklist',
                  compactMode: true,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <EntityDiscussions
            contextType="WORK_ORDER"
            contextId={data.id}
            contextTitle={`Work Order ${data.woNumber} - ${data.product.name}`}
          />
        </TabsContent>
      </Tabs>

      {/* Completion Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn thành Work Order</DialogTitle>
            <DialogDescription>
              Nhập số lượng hoàn thành và phế phẩm cho {data.woNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="completedQty">Số lượng hoàn thành</Label>
              <Input
                id="completedQty"
                type="number"
                min={0}
                max={data.quantity}
                value={completionData.completedQty}
                onChange={(e) =>
                  setCompletionData((prev) => ({
                    ...prev,
                    completedQty: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scrapQty">Số lượng phế phẩm (scrap)</Label>
              <Input
                id="scrapQty"
                type="number"
                min={0}
                value={completionData.scrapQty}
                onChange={(e) =>
                  setCompletionData((prev) => ({
                    ...prev,
                    scrapQty: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm">
                Tổng: {completionData.completedQty + completionData.scrapQty} / {data.quantity}
              </p>
              <Progress
                value={data.quantity > 0 ? (completionData.completedQty / data.quantity) * 100 : 0}
              />
              {completionData.completedQty + completionData.scrapQty > data.quantity && (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Tổng vượt quá số lượng kế hoạch ({data.quantity})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
