"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, CheckCircle, XCircle, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui-v2/data-table";

interface FinalInspection {
  id: string;
  workOrderNumber: string;
  productSku: string;
  productName: string;
  serialNumber: string;
  inspectedBy: string;
  status: string;
  inspectionDate: string;
  certificateIssued: boolean;
}

export default function FinalInspectionPage() {
  // Placeholder data - would come from API
  const inspections: FinalInspection[] = [
    {
      id: "1",
      workOrderNumber: "WO-2024-001",
      productSku: "HERA-X8-PRO",
      productName: "HERA X8 Professional Drone",
      serialNumber: "HX8-2024-0001",
      inspectedBy: "John Smith",
      status: "passed",
      inspectionDate: "2024-12-28",
      certificateIssued: true,
    },
    {
      id: "2",
      workOrderNumber: "WO-2024-002",
      productSku: "HERA-X8-PRO",
      productName: "HERA X8 Professional Drone",
      serialNumber: "HX8-2024-0002",
      inspectedBy: "Sarah Lee",
      status: "passed",
      inspectionDate: "2024-12-27",
      certificateIssued: true,
    },
    {
      id: "3",
      workOrderNumber: "WO-2024-003",
      productSku: "HERA-X8-PRO",
      productName: "HERA X8 Professional Drone",
      serialNumber: "HX8-2024-0003",
      inspectedBy: "Mike Johnson",
      status: "failed",
      inspectionDate: "2024-12-26",
      certificateIssued: false,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Đạt</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Không đạt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: Column<FinalInspection>[] = useMemo(() => [
    {
      key: 'workOrderNumber',
      header: 'Lệnh SX',
      width: '120px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'product',
      header: 'Sản phẩm',
      width: '200px',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.productSku}</div>
          <div className="text-sm text-muted-foreground">{row.productName}</div>
        </div>
      ),
    },
    {
      key: 'serialNumber',
      header: 'Số serial',
      width: '140px',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    {
      key: 'inspectedBy',
      header: 'Người KT',
      width: '120px',
      sortable: true,
    },
    {
      key: 'inspectionDate',
      header: 'Ngày',
      width: '100px',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '100px',
      align: 'center',
      sortable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'certificateIssued',
      header: 'Chứng nhận',
      width: '100px',
      align: 'center',
      render: (value) => (
        value ? (
          <Badge className="bg-purple-100 text-purple-800">
            <Award className="h-3 w-3 mr-1" />Đã cấp
          </Badge>
        ) : (
          <Badge variant="secondary">Chờ</Badge>
        )
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm tra cuối cùng"
        description="Kiểm tra chất lượng trước khi xuất hàng"
        actions={
          <Button asChild>
            <Link href="/quality/final/new">
              <Plus className="h-4 w-4 mr-2" />
              Tạo mới
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">18</p>
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
                <p className="text-2xl font-bold">16</p>
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
                <p className="text-2xl font-bold">2</p>
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
                <p className="text-2xl font-bold">88.9%</p>
                <p className="text-sm text-muted-foreground">Tỷ lệ đạt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Phiếu kiểm tra gần đây</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={inspections}
            columns={columns}
            keyField="id"
            emptyMessage="Chưa có phiếu kiểm tra"
            pagination
            pageSize={20}
            searchable={true}
            searchColumns={['workOrderNumber', 'productSku', 'productName', 'serialNumber', 'inspectedBy']}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'Final Inspections',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
