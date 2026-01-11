"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui-v2/data-table";

interface Inspection {
  id: string;
  workOrderNumber: string;
  partNumber: string;
  partName: string;
  operation: string;
  quantity: number;
  inspectedBy: string;
  status: string;
  inspectionDate: string;
}

export default function InProcessInspectionPage() {
  // Placeholder data - would come from API
  const inspections: Inspection[] = [
    {
      id: "1",
      workOrderNumber: "WO-2024-001",
      partNumber: "PRT-MT-001",
      partName: "KDE7215XF-135 Brushless Motor",
      operation: "Assembly",
      quantity: 8,
      inspectedBy: "John Smith",
      status: "passed",
      inspectionDate: "2024-12-28",
    },
    {
      id: "2",
      workOrderNumber: "WO-2024-002",
      partNumber: "PRT-FC-001",
      partName: "Pixhawk 6X Flight Controller",
      operation: "Testing",
      quantity: 3,
      inspectedBy: "Sarah Lee",
      status: "in_progress",
      inspectionDate: "2024-12-28",
    },
    {
      id: "3",
      workOrderNumber: "WO-2024-003",
      partNumber: "PRT-AF-001",
      partName: "Main Frame Carbon Fiber X8",
      operation: "Machining",
      quantity: 2,
      inspectedBy: "Mike Johnson",
      status: "failed",
      inspectionDate: "2024-12-27",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "passed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: Column<Inspection>[] = useMemo(() => [
    {
      key: 'workOrderNumber',
      header: 'Work Order',
      width: '120px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'part',
      header: 'Part',
      width: '200px',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.partNumber}</div>
          <div className="text-sm text-muted-foreground">{row.partName}</div>
        </div>
      ),
    },
    {
      key: 'operation',
      header: 'Operation',
      width: '100px',
      sortable: true,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      width: '80px',
      align: 'center',
      sortable: true,
    },
    {
      key: 'inspectedBy',
      header: 'Inspector',
      width: '120px',
      sortable: true,
    },
    {
      key: 'inspectionDate',
      header: 'Date',
      width: '100px',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      align: 'center',
      sortable: true,
      render: (value) => getStatusBadge(value),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-Process Inspection"
        description="Quality inspections during manufacturing operations"
        actions={
          <Button asChild>
            <Link href="/quality/in-process/new">
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
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
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Total Inspections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">20</p>
                <p className="text-sm text-muted-foreground">Passed</p>
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
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent In-Process Inspections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={inspections}
            columns={columns}
            keyField="id"
            emptyMessage="No inspections found"
            pagination
            pageSize={20}
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'In-Process Inspections',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
