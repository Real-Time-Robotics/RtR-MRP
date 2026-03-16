"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Award,
  RefreshCw,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { EntityTooltip } from "@/components/entity-tooltip";
import { formatDateMedium } from "@/lib/date";
import { clientLogger } from "@/lib/client-logger";

interface FinalInspection {
  id: string;
  inspectionNumber: string;
  status: string;
  result: string | null;
  quantityInspected: number;
  quantityAccepted: number;
  quantityRejected: number;
  inspectedBy: string;
  inspectedAt: string | null;
  createdAt: string;
  lotNumber: string | null;
  notes: string | null;
  partId: string | null;
  productId: string | null;
  workOrderId: string | null;
  salesOrderId: string | null;
  part: { partNumber: string; name: string } | null;
  product: { sku: string; name: string } | null;
  workOrder: { woNumber: string } | null;
  plan: { planNumber: string; name: string } | null;
}

export default function FinalInspectionPage() {
  const [inspections, setInspections] = useState<FinalInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quality/inspections?type=FINAL&pageSize=100");
      const json = await res.json();
      setInspections(json.data || []);
      if (json.pagination) setPagination(json.pagination);
    } catch (error) {
      clientLogger.error("Failed to fetch final inspections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const stats = useMemo(() => {
    const total = inspections.length;
    const passed = inspections.filter((i) => i.result === "PASS").length;
    const failed = inspections.filter((i) => i.result === "FAIL").length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
    return { total: pagination.total || total, passed, failed, passRate };
  }, [inspections, pagination.total]);

  const columns: Column<FinalInspection>[] = useMemo(
    () => [
      {
        key: "inspectionNumber",
        header: "Số phiếu",
        width: "130px",
        sortable: true,
        render: (value, row) => (
          <Link
            href={`/quality/inspections/${row.id}`}
            className="font-mono font-medium text-primary hover:underline"
          >
            {value}
          </Link>
        ),
      },
      {
        key: "workOrder",
        header: "Lệnh SX",
        width: "120px",
        render: (value, row) =>
          value && row.workOrderId ? (
            <EntityTooltip type="wo" id={row.workOrderId}>
              <span className="font-medium cursor-help">{value.woNumber}</span>
            </EntityTooltip>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        key: "product",
        header: "Sản phẩm",
        width: "200px",
        render: (value, row) => {
          if (value && row.productId) {
            return (
              <EntityTooltip type="product" id={row.productId}>
                <div className="cursor-help">
                  <div className="font-medium">{value.sku}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {value.name}
                  </div>
                </div>
              </EntityTooltip>
            );
          }
          if (row.part && row.partId) {
            return (
              <EntityTooltip type="part" id={row.partId}>
                <div className="cursor-help">
                  <div className="font-medium">{row.part.partNumber}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {row.part.name}
                  </div>
                </div>
              </EntityTooltip>
            );
          }
          return <span className="text-muted-foreground">-</span>;
        },
      },
      {
        key: "lotNumber",
        header: "Số lô / Serial",
        width: "130px",
        render: (value) =>
          value ? (
            <span className="font-mono text-xs">{value}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        key: "quantityInspected",
        header: "SL kiểm tra",
        width: "90px",
        sortable: true,
        render: (value) => <span className="font-mono">{value || 0}</span>,
      },
      {
        key: "quantityAccepted",
        header: "Đạt",
        width: "70px",
        render: (value) => (
          <span className="font-mono text-green-600">{value || 0}</span>
        ),
      },
      {
        key: "quantityRejected",
        header: "Loại",
        width: "70px",
        render: (value) => (
          <span className={`font-mono ${value > 0 ? "text-red-600 font-bold" : ""}`}>
            {value || 0}
          </span>
        ),
      },
      {
        key: "plan",
        header: "Kế hoạch KT",
        width: "120px",
        render: (value) =>
          value ? (
            <span className="text-xs">{value.planNumber}</span>
          ) : (
            <span className="text-muted-foreground text-xs">-</span>
          ),
      },
      {
        key: "createdAt",
        header: "Ngày",
        width: "100px",
        sortable: true,
        render: (value) => (value ? formatDateMedium(value) : "-"),
      },
      {
        key: "status",
        header: "Kết quả",
        width: "110px",
        sortable: true,
        cellClassName: (row) => {
          const resultOrStatus = row.result || row.status;
          switch (resultOrStatus) {
            case "PASS":
            case "completed":
              return "bg-green-50 dark:bg-green-950/30";
            case "FAIL":
              return "bg-red-50 dark:bg-red-950/30";
            case "CONDITIONAL":
              return "bg-yellow-50 dark:bg-yellow-950/30";
            default:
              return "";
          }
        },
        render: (value, row) => {
          if (row.result) {
            switch (row.result) {
              case "PASS":
                return (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-700 dark:text-green-300 font-medium">Đạt</span>
                  </div>
                );
              case "FAIL":
                return (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-red-700 dark:text-red-300 font-medium">Không đạt</span>
                  </div>
                );
              case "CONDITIONAL":
                return <span className="text-yellow-700 dark:text-yellow-300 font-medium">Có ĐK</span>;
            }
          }
          switch (value) {
            case "pending":
              return <span className="text-muted-foreground">Chờ KT</span>;
            case "in_progress":
              return <span className="text-blue-700 dark:text-blue-300">Đang KT</span>;
            case "on_hold":
              return <span className="text-amber-700 dark:text-amber-300">Tạm dừng</span>;
            default:
              return <span>{value}</span>;
          }
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm tra cuối cùng (Final Inspection)"
        description="Kiểm tra chất lượng thành phẩm trước khi xuất hàng"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchInspections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button asChild>
              <Link href="/quality/inspections/new?type=FINAL">
                <Plus className="h-4 w-4 mr-2" />
                Tạo phiếu KT
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Tổng phiếu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.passed}</p>
                <p className="text-sm text-muted-foreground">Đạt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Không đạt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.passRate}%</p>
                <p className="text-sm text-muted-foreground">Tỷ lệ đạt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Phiếu kiểm tra cuối cùng</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={inspections}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="Chưa có phiếu kiểm tra cuối cùng"
            pagination
            pageSize={20}
            searchable
            searchColumns={[
              "inspectionNumber",
              "lotNumber",
            ]}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: "field-names",
              gridBorders: true,
              showFooter: true,
              sheetName: "Final Inspections",
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
