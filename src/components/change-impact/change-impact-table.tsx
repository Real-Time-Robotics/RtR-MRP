'use client';

/**
 * Change Impact Table Component
 * Displays a table of impacted items with their changes
 */

import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui-v2/data-table';
import { ImpactedItem, FieldChange, ValueType } from '@/lib/change-impact/types';
import { ChangeImpactTableProps } from './types';

// Format value based on type
function formatValue(value: unknown, valueType: ValueType): string {
  if (value === null || value === undefined) return '-';

  switch (valueType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value));
    case 'number':
      return new Intl.NumberFormat('vi-VN').format(Number(value));
    case 'percentage':
      return `${Number(value).toFixed(1)}%`;
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('vi-VN');
      }
      return String(value);
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

// Render change with old → new values
function ChangeDisplay({ change }: { change: FieldChange }) {
  const oldFormatted = formatValue(change.oldValue, change.valueType);
  const newFormatted = formatValue(change.newValue, change.valueType);

  return (
    <div className="text-sm">
      <span className="font-medium">{change.fieldLabel}:</span>{' '}
      <span className="text-muted-foreground line-through">{oldFormatted}</span>
      <span className="mx-1">→</span>
      <span className="text-primary font-medium">{newFormatted}</span>
    </div>
  );
}

// Entity badge color mapping
function getEntityBadgeVariant(entity: string): 'default' | 'secondary' | 'outline' {
  switch (entity) {
    case 'bomLine':
    case 'bom':
      return 'default';
    case 'inventory':
      return 'secondary';
    default:
      return 'outline';
  }
}

// Entity display name mapping
function getEntityDisplayName(entity: string): string {
  const names: Record<string, string> = {
    part: 'Part',
    bom: 'BOM',
    bomLine: 'BOM Line',
    inventory: 'Inventory',
    workOrder: 'Work Order',
    purchaseOrder: 'PO',
    poLine: 'PO Line',
    salesOrder: 'SO',
    soLine: 'SO Line',
    supplier: 'Supplier',
    customer: 'Customer',
  };
  return names[entity] || entity;
}

export function ChangeImpactTable({ items, onNavigate }: ChangeImpactTableProps) {
  const columns: Column<ImpactedItem>[] = useMemo(
    () => [
      {
        key: 'entity',
        header: 'Type',
        width: '100px',
        render: (_, row) => (
          <Badge variant={getEntityBadgeVariant(row.entity)}>
            {getEntityDisplayName(row.entity)}
          </Badge>
        ),
      },
      {
        key: 'entityCode',
        header: 'Code',
        width: '120px',
        render: (value) => <span className="font-mono text-sm">{value}</span>,
      },
      {
        key: 'entityName',
        header: 'Name',
        width: '200px',
        render: (value) => <span className="text-sm">{value}</span>,
      },
      {
        key: 'relationship',
        header: 'Relationship',
        width: '150px',
        render: (value) => (
          <span className="text-sm text-muted-foreground">{value}</span>
        ),
      },
      {
        key: 'changes',
        header: 'Changes',
        width: '250px',
        render: (_, row) => (
          <div className="space-y-1">
            {row.changes.map((change, idx) => (
              <ChangeDisplay key={idx} change={change} />
            ))}
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '80px',
        render: (_, row) =>
          row.canNavigate && row.navigationUrl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.(row)}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          ) : null,
      },
    ],
    [onNavigate]
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No items will be impacted by these changes.
      </div>
    );
  }

  return (
    <DataTable
      data={items}
      columns={columns}
      keyField="id"
      searchable={false}
      stickyHeader
      excelMode={{
        enabled: true,
        showRowNumbers: true,
        columnHeaderStyle: 'field-names',
        gridBorders: true,
        showFooter: false,
        sheetName: 'Impact Analysis',
        compactMode: true,
      }}
    />
  );
}
