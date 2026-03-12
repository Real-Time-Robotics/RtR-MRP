"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAIContextSync } from "@/hooks/use-ai-context-sync";
import { Loader2, Play, Pause, CheckCircle, Package, Printer, Lock, Archive, AlertTriangle, PackageCheck, Clock, XCircle, RotateCcw, Trash2, Ban, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { EntityAuditHistory } from "@/components/audit/entity-audit-history";
import { clientLogger } from '@/lib/client-logger';
import { useWorkSession } from '@/hooks/use-work-session';
import { SmartBreadcrumb } from '@/components/smart-breadcrumb';
import { EntityTooltip } from '@/components/entity-tooltip';

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
      id: string;
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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    quantity: 1,
    priority: "normal",
    plannedStart: "",
    plannedEnd: "",
    notes: "",
  });
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendData, setResendData] = useState({ completedQty: 0, scrapQty: 0 });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/${id}`);
      const result = await res.json();
      setData(result.data || result);
    } catch (error) {
      clientLogger.error("Failed to fetch work order:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAIContextSync('production', data);

  // Work Session tracking
  const { trackActivity, updateContext } = useWorkSession({
    entityType: 'WORK_ORDER',
    entityId: id,
    entityNumber: data?.woNumber || id,
    workflowSteps: ['Xem chi tiết', 'Phân bổ vật tư', 'Sản xuất', 'Hoàn thành', 'Nhập kho'],
    currentStep: 1,
    enabled: !!id,
  });

  // Update work session context when WO data loads
  useEffect(() => {
    if (!data) return;
    const totalRequired = data.allocations.reduce((sum, a) => sum + a.requiredQty, 0);
    const totalAllocated = data.allocations.reduce((sum, a) => sum + a.allocatedQty, 0);
    const materialReadiness = totalRequired > 0 ? Math.round((totalAllocated / totalRequired) * 100) : 0;
    updateContext({
      summary: `WO ${data.woNumber} - ${data.product.name} - ${data.status}`,
      keyMetrics: {
        status: data.status,
        product: data.product.name,
        quantity: data.quantity,
        completedQty: data.completedQty,
        scrapQty: data.scrapQty,
        progress: `${data.quantity > 0 ? Math.round((data.completedQty / data.quantity) * 100) : 0}%`,
        materialReadiness: `${materialReadiness}%`,
      },
    });
  }, [data, updateContext]);

  const allocations = data?.allocations || [];

  const allocationColumns: Column<WorkOrderData['allocations'][0]>[] = useMemo(() => [
    {
      key: 'part',
      header: 'Part',
      width: '200px',
      render: (_, row) => (
        <EntityTooltip type="part" id={row.part.id}>
          <div className="cursor-help">
            <p className="font-medium">{row.part.partNumber}</p>
            <p className="text-sm text-muted-foreground">{row.part.name}</p>
          </div>
        </EntityTooltip>
      ),
    },
    {
      key: 'requiredQty',
      header: 'Required',
      width: '90px',
      sortable: true,
    },
    {
      key: 'allocatedQty',
      header: 'Allocated',
      width: '90px',
      sortable: true,
    },
    {
      key: 'issuedQty',
      header: 'Issued',
      width: '90px',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (_, row) => {
        if (row.issuedQty >= row.requiredQty) return 'Issued';
        if (row.allocatedQty >= row.requiredQty) return 'Ready';
        return 'Partial';
      },
      cellClassName: (_, row) => {
        if (row.issuedQty >= row.requiredQty) return 'bg-green-50 dark:bg-green-950/30';
        if (row.allocatedQty >= row.requiredQty) return 'bg-blue-50 dark:bg-blue-950/30';
        return 'bg-yellow-50 dark:bg-yellow-950/30';
      },
    },
  ], []);

  const handleAllocate = async () => {
    setAllocating(true);
    try {
      await fetch(`/api/production/${id}/allocate`, { method: "POST" });
      trackActivity('WO_ALLOCATE', `Phân bổ vật tư cho ${data?.woNumber}`);
      fetchData();
    } catch (error) {
      clientLogger.error("Failed to allocate:", error);
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
        toast.error(err.error || err.message || "Không thể cập nhật trạng thái");
        return;
      }
      trackActivity('WO_STATUS_CHANGE', `Chuyển trạng thái sang "${newStatus}"`, { from: data?.status, to: newStatus });
      fetchData();
    } catch (error) {
      clientLogger.error("Failed to update status:", error);
      toast.error("Lỗi cập nhật trạng thái");
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
        toast.error(err.error || err.message || "Không thể hoàn thành Work Order");
        return;
      }
      trackActivity('WO_COMPLETED', `Hoàn thành ${data?.woNumber}: ${completionData.completedQty} units, scrap: ${completionData.scrapQty}`);
      setCompleteDialogOpen(false);
      fetchData();
    } catch (error) {
      clientLogger.error("Failed to complete work order:", error);
      toast.error("Lỗi hoàn thành Work Order");
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
        toast.error(result.error || result.message || "Lỗi nhập kho thành phẩm");
        return;
      }

      // Success — refresh to show new PENDING receipt
      fetchData();
    } catch (error) {
      clientLogger.error("Failed to receive production output:", error);
      toast.error("Lỗi nhập kho thành phẩm");
    } finally {
      setReceiving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/production/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || err.message || "Không thể hủy Work Order");
        return;
      }
      setCancelDialogOpen(false);
      toast.success("Work Order đã được hủy");
      fetchData();
    } catch {
      toast.error("Lỗi hủy Work Order");
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/production/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || err.message || "Không thể xóa Work Order");
        return;
      }
      toast.success("Work Order đã được xóa");
      router.push("/production");
    } catch {
      toast.error("Lỗi xóa Work Order");
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = () => {
    if (!data) return;
    setEditData({
      quantity: data.quantity,
      priority: data.priority || "normal",
      plannedStart: data.plannedStart ? new Date(data.plannedStart).toISOString().slice(0, 10) : "",
      plannedEnd: data.plannedEnd ? new Date(data.plannedEnd).toISOString().slice(0, 10) : "",
      notes: data.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        priority: editData.priority,
        notes: editData.notes || null,
      };
      if (editData.quantity !== data?.quantity) body.quantity = editData.quantity;
      if (editData.plannedStart) body.plannedStart = new Date(editData.plannedStart).toISOString();
      else body.plannedStart = null;
      if (editData.plannedEnd) body.plannedEnd = new Date(editData.plannedEnd).toISOString();
      else body.plannedEnd = null;

      const res = await fetch(`/api/production/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || err.message || "Không thể cập nhật Work Order");
        return;
      }
      setEditDialogOpen(false);
      toast.success("Work Order đã được cập nhật");
      fetchData();
    } catch {
      toast.error("Lỗi cập nhật Work Order");
    } finally {
      setSaving(false);
    }
  };

  const openResendDialog = () => {
    if (!data) return;
    setResendData({
      completedQty: data.completedQty,
      scrapQty: data.scrapQty,
    });
    setResendDialogOpen(true);
  };

  const handleResend = async () => {
    setReceiving(true);
    try {
      // First update completedQty/scrapQty if changed
      if (data && (resendData.completedQty !== data.completedQty || resendData.scrapQty !== data.scrapQty)) {
        const patchRes = await fetch(`/api/production/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            completedQty: resendData.completedQty,
            scrapQty: resendData.scrapQty,
          }),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json();
          toast.error(err.error || err.message || "Không thể cập nhật số lượng");
          return;
        }
      }
      // Then resend receipt
      const res = await fetch(`/api/production/${id}/receive`, { method: "POST" });
      const result = await res.json();
      if (res.status === 409) {
        fetchData();
        setResendDialogOpen(false);
        return;
      }
      if (!res.ok) {
        toast.error(result.error || result.message || "Lỗi gửi lại phiếu nhập kho");
        return;
      }
      setResendDialogOpen(false);
      toast.success("Đã gửi lại phiếu nhập kho, chờ kho xác nhận");
      fetchData();
    } catch {
      toast.error("Lỗi gửi lại phiếu nhập kho");
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
      {/* Smart Breadcrumb with Progress */}
      <SmartBreadcrumb
        items={[
          { label: 'Production', href: '/production' },
          { label: data.woNumber },
        ]}
        entityType="WORK_ORDER"
        entityData={data as unknown as Record<string, unknown>}
      />

      <PageHeader
        title={`Work Order ${data.woNumber}`}
        description={data.product.name}
        backHref="/production"
        actions={
          <div className="flex gap-2">
            {/* Edit - only when not completed/closed/cancelled */}
            {!["completed", "closed", "cancelled"].includes(data.status?.toLowerCase()) && (
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {/* Cancel - for draft/released/in_progress/on_hold */}
            {["draft", "released", "in_progress", "on_hold"].includes(data.status?.toLowerCase()) && (
              <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => setCancelDialogOpen(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            {/* Delete - only draft or cancelled */}
            {["draft", "cancelled"].includes(data.status?.toLowerCase()) && (
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
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
                    onClick={openResendDialog}
                    disabled={receiving}
                    size="sm"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Sửa &amp; Gửi lại
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleReceiveOutput}
                  disabled={receiving}
                  size="sm"
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
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
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

        <TabsContent value="history" className="mt-4">
          <EntityAuditHistory entityType="WorkOrder" entityId={data.id} title="Lịch sử thay đổi" />
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Ban className="h-5 w-5" />
              Hủy Work Order
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn hủy <strong>{data.woNumber}</strong>? Work Order sẽ chuyển sang trạng thái &quot;Đã hủy&quot; và không thể tiếp tục sản xuất.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
            <p className="flex items-center gap-1 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Lưu ý
            </p>
            <ul className="mt-1 ml-5 list-disc space-y-1">
              <li>Vật tư đã cấp phát sẽ không tự động hoàn trả</li>
              <li>Sau khi hủy, có thể xóa Work Order nếu cần</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
              Đóng
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className="bg-orange-600 hover:bg-orange-700">
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Xóa Work Order
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa vĩnh viễn <strong>{data.woNumber}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="flex items-center gap-1 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Cảnh báo
            </p>
            <p className="mt-1">Toàn bộ dữ liệu liên quan (phân bổ vật tư, operations, chi phí) sẽ bị xóa theo.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Đóng
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Xóa vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Chỉnh sửa Work Order
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho {data.woNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editQuantity">Số lượng</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  min={1}
                  value={editData.quantity}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      quantity: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPriority">Độ ưu tiên</Label>
                <Select
                  value={editData.priority}
                  onValueChange={(value) =>
                    setEditData((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger id="editPriority">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPlannedStart">Ngày bắt đầu dự kiến</Label>
                <Input
                  id="editPlannedStart"
                  type="date"
                  value={editData.plannedStart}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, plannedStart: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPlannedEnd">Ngày kết thúc dự kiến</Label>
                <Input
                  id="editPlannedEnd"
                  type="date"
                  value={editData.plannedEnd}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, plannedEnd: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">Ghi chú</Label>
              <Textarea
                id="editNotes"
                rows={3}
                value={editData.notes}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Thêm ghi chú..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Receipt Dialog - when rejected */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Sửa &amp; Gửi lại phiếu nhập kho
            </DialogTitle>
            <DialogDescription>
              Phiếu trước bị từ chối{data.productionReceipt?.rejectedReason ? `: "${data.productionReceipt.rejectedReason}"` : ""}. Chỉnh sửa số lượng rồi gửi lại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resendCompletedQty">Số lượng hoàn thành</Label>
              <Input
                id="resendCompletedQty"
                type="number"
                min={0}
                max={data.quantity}
                value={resendData.completedQty}
                onChange={(e) =>
                  setResendData((prev) => ({
                    ...prev,
                    completedQty: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resendScrapQty">Số lượng phế phẩm (scrap)</Label>
              <Input
                id="resendScrapQty"
                type="number"
                min={0}
                value={resendData.scrapQty}
                onChange={(e) =>
                  setResendData((prev) => ({
                    ...prev,
                    scrapQty: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-sm">
                Tổng: {resendData.completedQty + resendData.scrapQty} / {data.quantity}
              </p>
              <Progress
                value={data.quantity > 0 ? (resendData.completedQty / data.quantity) * 100 : 0}
              />
              {resendData.completedQty + resendData.scrapQty > data.quantity && (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Tổng vượt quá số lượng kế hoạch ({data.quantity})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendDialogOpen(false)} disabled={receiving}>
              Hủy
            </Button>
            <Button onClick={handleResend} disabled={receiving || resendData.completedQty <= 0}>
              {receiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gửi lại phiếu nhập kho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
