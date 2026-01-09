'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SmartGrid } from '@/components/ui-v2/smart-grid';
import { EditableCell } from '@/components/ui-v2/editable-cell';
import { Column } from '@/components/ui-v2/data-table';
import { StockStatusBadge } from '@/components/inventory/stock-status-badge';
import { PermissionButton } from '@/components/ui/permission-button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StockStatus } from '@/types';
import Link from 'next/link';
import {
  ChangeImpactDialog,
  useChangeImpact,
} from '@/components/change-impact';
import { FieldChange } from '@/lib/change-impact/types';

// =============================================================================
// TYPES
// =============================================================================

export interface InventoryItem {
  id: string; // Inventory ID (or Part ID if distinct)
  partId: string;
  partNumber: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  isCritical: boolean;
  minStockLevel: number;
  reorderPoint: number;
  safetyStock: number;
  quantity: number;
  reserved: number;
  available: number;
  status: StockStatus;
  warehouseId?: string;
  warehouseName?: string;
}

interface InventoryTableProps {
  initialData?: InventoryItem[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// =============================================================================
// STATS CARDS
// =============================================================================

function StatsCards({ inventory }: { inventory: InventoryItem[] }) {
  const criticalCount = inventory.filter(
    (i) => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK'
  ).length;
  const reorderCount = inventory.filter((i) => i.status === 'REORDER').length;
  const okCount = inventory.filter((i) => i.status === 'OK').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{inventory.length}</div>
          <p className="text-xs text-muted-foreground">Tổng SKU</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <p className="text-xs text-muted-foreground">Critical / Hết hàng</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-amber-600">{reorderCount}</div>
          <p className="text-xs text-muted-foreground">Cần đặt hàng</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{okCount}</div>
          <p className="text-xs text-muted-foreground">Đủ hàng</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Field labels for change impact
const INVENTORY_FIELD_LABELS: Record<string, { label: string; valueType: FieldChange['valueType'] }> = {
  quantity: { label: 'Quantity', valueType: 'number' },
  safetyStock: { label: 'Safety Stock', valueType: 'number' },
  minStockLevel: { label: 'Min Stock Level', valueType: 'number' },
  reorderPoint: { label: 'Reorder Point', valueType: 'number' },
};

export function InventoryTable({ initialData = [] }: InventoryTableProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialData);
  const [loading, setLoading] = useState(false);

  // Change Impact state
  const pendingUpdateRef = useRef<{
    rowId: string;
    field: string;
    value: any;
    oldValue: any;
    item: InventoryItem;
  } | null>(null);

  const changeImpact = useChangeImpact({
    onSuccess: () => {
      // Execute the pending update after confirmation
      if (pendingUpdateRef.current) {
        const { rowId, field, value, item } = pendingUpdateRef.current;
        executeUpdate(rowId, field, value, item);
        pendingUpdateRef.current = null;
      }
    },
    onError: () => {
      // Still allow update if impact check fails
      if (pendingUpdateRef.current) {
        const { rowId, field, value, item } = pendingUpdateRef.current;
        executeUpdate(rowId, field, value, item);
        pendingUpdateRef.current = null;
      }
    },
  });

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory');
      const result = await response.json();

      if (response.ok) {
        // Transform data
        const items: InventoryItem[] = (result.data || result || []).map((item: any) => ({
          id: item.id, // Inventory ID
          partId: item.partId || item.part?.id,
          partNumber: item.partNumber || item.part?.partNumber,
          name: item.name || item.part?.name,
          category: item.category || item.part?.category,
          unit: item.unit || item.part?.unit,
          unitCost: item.unitCost || item.part?.unitCost || 0,
          isCritical: item.isCritical || item.part?.isCritical || false,
          minStockLevel: item.minStockLevel || item.part?.planning?.minStockLevel || 0,
          reorderPoint: item.reorderPoint || item.part?.planning?.reorderPoint || 0,
          safetyStock: item.safetyStock || item.part?.planning?.safetyStock || 0,
          quantity: item.quantity || 0,
          reserved: item.reserved || item.reservedQty || 0,
          available: item.available ?? ((item.quantity || 0) - (item.reserved || item.reservedQty || 0)),
          status: item.status || 'OK', // This status might be stale if we edit locally, could recalc
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName || item.warehouse?.name,
        }));
        setInventory(items);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Không thể tải danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Execute the actual update (called after impact confirmation)
  const executeUpdate = async (rowId: string, field: string, value: any, item: InventoryItem) => {
    const oldValue = (item as any)[field];

    // Optimistic Update
    setInventory(prev => prev.map(i => i.id === rowId ? { ...i, [field]: value } : i));

    try {
      if (field === 'quantity') {
        // Update Inventory Record
        await fetch(`/api/inventory/${rowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: Number(value) }),
        });
        toast.success(`Cập nhật số lượng: ${value}`);
      } else if (['minStockLevel', 'reorderPoint', 'safetyStock'].includes(field)) {
        // Update Part Planning
        await fetch(`/api/parts/${item.partId}/planning`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: Number(value) }),
        });
        toast.success(`Cập nhật định mức: ${value}`);
      }
    } catch (error) {
      console.error('Update failed', error);
      toast.error('Cập nhật thất bại');
      // Revert
      setInventory(prev => prev.map(i => i.id === rowId ? { ...i, [field]: oldValue } : i));
    }
  };

  // Update Handler - with Change Impact check
  const handleUpdate = async (rowId: string, field: string, value: any) => {
    // Find item
    const item = inventory.find(i => i.id === rowId);
    if (!item) return;

    const oldValue = (item as any)[field];

    // Skip if value unchanged
    if (oldValue === value || Number(oldValue) === Number(value)) {
      return;
    }

    // Create change object for impact check
    const fieldConfig = INVENTORY_FIELD_LABELS[field];
    if (!fieldConfig) {
      // Unknown field, just execute directly
      executeUpdate(rowId, field, value, item);
      return;
    }

    const changes: FieldChange[] = [{
      field,
      fieldLabel: fieldConfig.label,
      oldValue,
      newValue: value,
      valueType: fieldConfig.valueType,
    }];

    // Store pending update
    pendingUpdateRef.current = { rowId, field, value, oldValue, item };

    // Check impact
    await changeImpact.checkImpact('inventory', rowId, changes);
  };

  const columns: Column<InventoryItem>[] = useMemo(() => [
    {
      key: 'partNumber',
      header: 'Part Number',
      width: '120px',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/${row.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {value}
          </Link>
          {row.isCritical && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </div>
      )
    },
    {
      key: 'quantity',
      header: 'Quantity',
      width: '100px',
      align: 'right',
      type: 'number',
      sortable: true,
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="quantity"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'quantity', val)}
          className="font-bold dark:text-white"
        />
      )
    },
    {
      key: 'available',
      header: 'Available',
      width: '100px',
      align: 'right',
      type: 'number',
    },
    {
      key: 'safetyStock',
      header: 'Safety Stock',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="safetyStock"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'safetyStock', val)}
          className="text-slate-500 dark:text-slate-400"
        />
      )
    },
    {
      key: 'minStockLevel',
      header: 'Min Stock',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="minStockLevel"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'minStockLevel', val)}
          className="text-slate-500 dark:text-slate-400"
        />
      )
    },
    {
      key: 'reorderPoint',
      header: 'Reorder Pt',
      width: '100px',
      align: 'right',
      type: 'number',
      render: (value, row) => (
        <EditableCell
          value={value}
          rowId={row.id}
          columnId="reorderPoint"
          type="number"
          onSave={(val) => handleUpdate(row.id, 'reorderPoint', val)}
          className="text-slate-500 dark:text-slate-400"
        />
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      align: 'center',
      render: (_, row) => <StockStatusBadge status={row.status} />
    },
    {
      key: 'unitCost',
      header: 'Cost',
      width: '100px',
      align: 'right',
      render: (val) => formatCurrency(val)
    }
  ], [inventory]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Area */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Smart Inventory Grid
          </h1>
          <p className="text-xs text-muted-foreground">Excel-mode enabled: Click cells to edit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchInventory()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <PermissionButton permission="inventory:adjust" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Adjust
          </PermissionButton>
        </div>
      </div>

      <StatsCards inventory={inventory} />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <SmartGrid
          data={inventory}
          columns={columns}
          keyField="id"
          loading={loading}
          searchable
          pagination
          pageSize={20}
          stickyHeader
          excelMode={{
            enabled: true,
            showRowNumbers: true,
            columnHeaderStyle: 'field-names',
            gridBorders: true,
            showFooter: true,
            sheetName: 'Inventory',
            compactMode: true,
          }}
        />
      </div>

      {/* Change Impact Dialog */}
      <ChangeImpactDialog
        open={changeImpact.showDialog}
        onOpenChange={changeImpact.setShowDialog}
        result={changeImpact.result}
        loading={changeImpact.loading}
        onConfirm={changeImpact.confirm}
        onCancel={() => {
          changeImpact.cancel();
          pendingUpdateRef.current = null;
        }}
      />
    </div>
  );
}

export default InventoryTable;
