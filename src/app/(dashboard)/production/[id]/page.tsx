"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAIContextSync } from "@/hooks/use-ai-context-sync";
import { Loader2, Play, Pause, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { WOStatusBadge } from "@/components/production/wo-status-badge";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { DataTable, Column } from "@/components/ui-v2/data-table";

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
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<WorkOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/${id}`);
      const result = await res.json();
      setData(result);
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
      await fetch(`/api/production/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
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

  const progressPercent = (data.completedQty / data.quantity) * 100;
  const materialReadiness =
    data.allocations.length > 0
      ? Math.round(
        (data.allocations.reduce((sum, a) => sum + a.allocatedQty, 0) /
          data.allocations.reduce((sum, a) => sum + a.requiredQty, 0)) *
        100
      )
      : 0;

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
      render: (_, row) => (
        <Badge variant={row.allocatedQty >= row.requiredQty ? "default" : "secondary"}>
          {row.allocatedQty >= row.requiredQty ? "Ready" : "Partial"}
        </Badge>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Work Order ${data.woNumber}`}
        description={data.product.name}
        backHref="/production"
        actions={
          <div className="flex gap-2">
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
                <Button onClick={() => handleStatusChange("completed")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              </>
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
              ? format(new Date(data.plannedEnd), "MMM dd, yyyy")
              : "-"}
          </p>
        </Card>
      </div>

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
                    ? format(new Date(data.plannedStart), "MMM dd")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planned End</p>
                <p className="font-medium">
                  {data.plannedEnd
                    ? format(new Date(data.plannedEnd), "MMM dd")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Start</p>
                <p className="font-medium">
                  {data.actualStart
                    ? format(new Date(data.actualStart), "MMM dd")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual End</p>
                <p className="font-medium">
                  {data.actualEnd
                    ? format(new Date(data.actualEnd), "MMM dd")
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
                  {format(new Date(data.salesOrder.requiredDate), "MMM dd, yyyy")}
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
                disabled={allocating || data.status === "completed"}
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
            data={data.allocations}
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
    </div>
  );
}
