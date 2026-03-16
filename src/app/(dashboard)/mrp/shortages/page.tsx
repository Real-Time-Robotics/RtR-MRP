"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { EntityTooltip } from "@/components/entity-tooltip";
import { clientLogger } from '@/lib/client-logger';

interface ShortageItem {
  id: string;
  partId: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  safetyStock: number;
  requiredQty: number;
  shortfallQty: number;
  earliestNeed: string;
  affectedOrders: number;
  priority: string;
  supplier: string | null;
  supplierId: string | null;
  leadTimeDays: number;
}

export default function ShortagesPage() {
  const [shortages, setShortages] = useState<ShortageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortages();
  }, []);

  const fetchShortages = async () => {
    try {
      const res = await fetch("/api/mrp/shortages");
      const data = await res.json();
      setShortages(data);
    } catch (error) {
      clientLogger.error("Failed to fetch shortages:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalShortfall = shortages.reduce((sum, s) => sum + s.shortfallQty, 0);
  const criticalCount = shortages.filter((s) => s.priority === "critical").length;

  const columns: Column<ShortageItem>[] = useMemo(() => [
    {
      key: 'part',
      header: 'Part',
      width: '200px',
      render: (_, row) => (
        <EntityTooltip type="part" id={row.partId}>
          <div className="cursor-help">
            <p className="font-medium">{row.partNumber}</p>
            <p className="text-sm text-muted-foreground">{row.partName}</p>
          </div>
        </EntityTooltip>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current',
      width: '80px',
      sortable: true,
    },
    {
      key: 'safetyStock',
      header: 'Safety',
      width: '80px',
      sortable: true,
    },
    {
      key: 'requiredQty',
      header: 'Required',
      width: '80px',
      sortable: true,
    },
    {
      key: 'shortfallQty',
      header: 'Shortfall',
      width: '90px',
      sortable: true,
      render: (value) => (
        <span className="font-bold text-red-600">-{value}</span>
      ),
    },
    {
      key: 'earliestNeed',
      header: 'Earliest Need',
      width: '110px',
      sortable: true,
      render: (value) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      width: '150px',
      render: (value, row) => value ? (
        row.supplierId ? (
          <EntityTooltip type="supplier" id={row.supplierId}>
            <div className="cursor-help">
              <p>{value}</p>
              <p className="text-sm text-muted-foreground">{row.leadTimeDays} days lead time</p>
            </div>
          </EntityTooltip>
        ) : (
          <div>
            <p>{value}</p>
            <p className="text-sm text-muted-foreground">{row.leadTimeDays} days lead time</p>
          </div>
        )
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '90px',
      sortable: true,
      cellClassName: (row) => {
        switch (row.priority) {
          case "critical": return "bg-red-50 text-red-800";
          case "high": return "bg-orange-50 text-orange-800";
          case "medium": return "bg-yellow-50 text-yellow-800";
          default: return "bg-gray-50 text-gray-800";
        }
      },
      render: (value) => value,
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shortage Report"
        description="Parts with insufficient inventory to meet demand"
        backHref="/mrp"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{shortages.length}</p>
              <p className="text-sm text-muted-foreground">Total Shortages</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Critical</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{totalShortfall}</p>
            <p className="text-sm text-muted-foreground">Total Shortfall Units</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">
              {shortages.reduce((sum, s) => sum + s.affectedOrders, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Affected Orders</p>
          </div>
        </Card>
      </div>

      {/* Shortages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Shortage Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={shortages}
            columns={columns}
            keyField="id"
            loading={loading}
            emptyMessage="No shortages detected. All parts have sufficient inventory."
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
              sheetName: 'Shortages',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
