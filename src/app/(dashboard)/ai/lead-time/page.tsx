"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TrendIndicator } from "@/components/ai/trend-indicator";
import { compareSupplierLeadTimes } from "@/lib/ai/lead-time-predictor";
import { DataTable, Column } from "@/components/ui-v2/data-table";
import { EntityTooltip } from "@/components/entity-tooltip";
import { clientLogger } from '@/lib/client-logger';

interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
}

export default function LeadTimePage() {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [predictions, setPredictions] = useState<
    Array<{
      supplierId: string;
      supplierName: string;
      statedDays: number;
      predictedDays: number;
      actualAvg: number;
      trend: "faster" | "on_time" | "slower";
      trendDays: number;
    }>
  >([]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const response = await res.json();
      // Handle paginated response format
      const supplierData = Array.isArray(response) ? response : (response.data || []);
      setSuppliers(supplierData);
      const leadTimeData = compareSupplierLeadTimes(supplierData);
      setPredictions(leadTimeData);
    } catch (error) {
      clientLogger.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const slowerCount = predictions.filter((p) => p.trend === "slower").length;
  const fasterCount = predictions.filter((p) => p.trend === "faster").length;
  const onTimeCount = predictions.filter((p) => p.trend === "on_time").length;
  const avgDelay =
    predictions.reduce((sum, p) => sum + p.trendDays, 0) / predictions.length ||
    0;

  const leadTimeColumns: Column<{
    supplierId: string;
    supplierName: string;
    statedDays: number;
    predictedDays: number;
    actualAvg: number;
    trend: "faster" | "on_time" | "slower";
    trendDays: number;
  }>[] = useMemo(() => [
    {
      key: 'supplierName',
      header: 'Supplier',
      width: '180px',
      sortable: true,
      render: (value, row) => (
        <EntityTooltip type="supplier" id={row.supplierId}>
          <span className="font-medium cursor-help">{value}</span>
        </EntityTooltip>
      ),
    },
    {
      key: 'statedDays',
      header: 'Stated',
      width: '80px',
      sortable: true,
      render: (value) => `${value}d`,
    },
    {
      key: 'predictedDays',
      header: 'Predicted',
      width: '90px',
      sortable: true,
      render: (value) => <span className="font-bold">{value}d</span>,
    },
    {
      key: 'actualAvg',
      header: 'Actual Avg',
      width: '90px',
      sortable: true,
      render: (value) => <span className="text-muted-foreground">{value.toFixed(1)}d</span>,
    },
    {
      key: 'variance',
      header: 'Variance',
      width: '100px',
      render: (_, row) => (
        <TrendIndicator
          trend={row.trend}
          value={`${row.trendDays > 0 ? "+" : ""}${row.trendDays}d`}
        />
      ),
    },
    {
      key: 'trend',
      header: 'Status',
      width: '90px',
      sortable: true,
      cellClassName: (row) => {
        switch (row.trend) {
          case "faster": return "bg-green-50 text-green-800";
          case "slower": return "bg-red-50 text-red-800";
          default: return "bg-gray-50 text-gray-800";
        }
      },
      render: (value) => value === "faster" ? "Faster" : value === "slower" ? "Slower" : "On Time",
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Time Predictions"
        description="AI-powered lead time analysis and predictions"
        backHref="/ai"
        actions={
          <Button variant="outline" onClick={fetchSuppliers} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
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
              <p className="text-2xl font-bold text-red-600">{slowerCount}</p>
              <p className="text-sm text-muted-foreground">Slower Than Stated</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold text-green-600">{fasterCount}</p>
            <p className="text-sm text-muted-foreground">Faster Than Stated</p>
          </div>
        </Card>
        <Card className="p-4">
          <div>
            <p className="text-2xl font-bold">{onTimeCount}</p>
            <p className="text-sm text-muted-foreground">On Time</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {avgDelay > 0 ? "+" : ""}
                {avgDelay.toFixed(1)}d
              </p>
              <p className="text-sm text-muted-foreground">Avg Variance</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lead Time Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Time by Supplier</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={predictions}
            columns={leadTimeColumns}
            keyField="supplierId"
            loading={loading}
            emptyMessage="No supplier data available"
            searchable={false}
            stickyHeader
            excelMode={{
              enabled: true,
              showRowNumbers: true,
              columnHeaderStyle: 'field-names',
              gridBorders: true,
              showFooter: true,
              sheetName: 'Lead Time',
              compactMode: true,
            }}
          />
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alerts & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {predictions
              .filter((p) => p.trend === "slower" && p.trendDays > 3)
              .map((pred) => (
                <li
                  key={pred.supplierId}
                  className="flex items-start gap-3 p-3 bg-red-50 rounded-lg"
                >
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {pred.supplierName} lead time {Math.round((pred.trendDays / pred.statedDays) * 100)}% longer than stated
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Consider adjusting planning buffer or negotiating improved terms
                    </p>
                  </div>
                </li>
              ))}

            {predictions.filter((p) => p.trend === "slower" && p.trendDays > 3)
              .length === 0 && (
              <li className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-xs">*</span>
                </div>
                <div>
                  <p className="font-medium">All suppliers within acceptable variance</p>
                  <p className="text-sm text-muted-foreground">
                    No immediate action required
                  </p>
                </div>
              </li>
            )}

            <li className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs">i</span>
              </div>
              <div>
                <p className="font-medium">Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  Consider adding +5 days buffer for international suppliers during peak seasons
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
