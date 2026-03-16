"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityTooltip } from "@/components/entity-tooltip";
import { DataTable, Column } from "@/components/ui-v2/data-table";

interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  total: number;
}

interface AgingItem {
  entityId: string;
  entityCode: string;
  entityName: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  total: number;
}

interface AgingReportProps {
  title: string;
  summary: AgingBucket;
  details: AgingItem[];
  entityLabel: string;
  entityType?: 'customer' | 'supplier';
}

export function AgingReport({ title, summary, details, entityLabel, entityType }: AgingReportProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const columns: Column<AgingItem>[] = useMemo(() => [
    {
      key: 'entity',
      header: entityLabel,
      width: '200px',
      render: (_, row) => entityType ? (
        <EntityTooltip type={entityType} id={row.entityId}>
          <div className="cursor-help">
            <div className="font-medium">{row.entityCode}</div>
            <div className="text-sm text-muted-foreground">{row.entityName}</div>
          </div>
        </EntityTooltip>
      ) : (
        <div>
          <div className="font-medium">{row.entityCode}</div>
          <div className="text-sm text-muted-foreground">{row.entityName}</div>
        </div>
      ),
    },
    {
      key: 'current',
      header: 'Current',
      width: '100px',
      sortable: true,
      render: (value) => formatCurrency(value),
    },
    {
      key: 'days30',
      header: '1-30 Days',
      width: '100px',
      sortable: true,
      render: (value) => <span className="text-yellow-600">{formatCurrency(value)}</span>,
    },
    {
      key: 'days60',
      header: '31-60 Days',
      width: '100px',
      sortable: true,
      render: (value) => <span className="text-orange-600">{formatCurrency(value)}</span>,
    },
    {
      key: 'days90Plus',
      header: '90+ Days',
      width: '100px',
      sortable: true,
      render: (value) => <span className="text-red-600">{formatCurrency(value)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      width: '100px',
      sortable: true,
      render: (value) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
  ], [entityLabel]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-muted-foreground">Current</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(summary.current)}
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-muted-foreground">1-30 Days</div>
            <div className="text-xl font-bold text-yellow-600">
              {formatCurrency(summary.days30)}
            </div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-muted-foreground">31-60 Days</div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(summary.days60)}
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-muted-foreground">90+ Days</div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(summary.days90Plus)}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-xl font-bold">{formatCurrency(summary.total)}</div>
          </div>
        </div>

        {/* Detail Table */}
        <DataTable
          data={details}
          columns={columns}
          keyField="entityId"
          emptyMessage="No outstanding balances"
          searchable={false}
          stickyHeader
          excelMode={{
            enabled: true,
            showRowNumbers: true,
            columnHeaderStyle: 'field-names',
            gridBorders: true,
            showFooter: true,
            sheetName: 'Aging Report',
            compactMode: true,
          }}
        />
      </CardContent>
    </Card>
  );
}
