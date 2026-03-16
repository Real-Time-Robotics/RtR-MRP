'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Package, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import { clientLogger } from '@/lib/client-logger';
import { Button } from '@/components/ui/button';
import { SmartGrid } from '@/components/ui-v2/smart-grid';
import { EditableCell } from '@/components/ui-v2/editable-cell';
import { Column } from '@/components/ui-v2/data-table';
import { PermissionButton } from '@/components/ui/permission-button';
import { usePaginatedData } from '@/hooks/use-paginated-data';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/language-context';
import Link from 'next/link';
import {
  ChangeImpactDialog,
  useChangeImpact,
} from '@/components/change-impact';
import { EntityTooltip } from '@/components/entity-tooltip';
import { FieldChange } from '@/lib/change-impact/types';

// Import extracted components and types
import {
  InventoryItem,
  InventoryTableProps,
  AdjustData,
  DEFAULT_ADJUST_DATA,
  INVENTORY_FIELD_LABELS,
  formatCurrency,
} from './inventory-types';
import { CompactStatsBar } from '@/components/ui/compact-stats-bar';
import { InventoryAdjustDialog } from './inventory-adjust-dialog';

// Re-export InventoryItem for backward compatibility
export type { InventoryItem } from './inventory-types';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InventoryTable({ initialData = [] }: InventoryTableProps) {
  const { t } = useLanguage();

  // Server-side paginated data
  const {
    data: rawInventory,
    loading,
    pagination,
    meta,
    refresh,
    setSearch,
    setFilters,
  } = usePaginatedData<InventoryItem>({
    endpoint: '/api/inventory',
    initialPageSize: 50,
  });

  // Transform raw API data (handle both flat and nested response shapes)
  const inventory = useMemo(() => {
    type RawInventoryItem = InventoryItem & {
      part?: {
        id?: string;
        partNumber?: string;
        name?: string;
        category?: string;
        unit?: string;
        unitCost?: number;
        isCritical?: boolean;
        planning?: {
          minStockLevel?: number;
          reorderPoint?: number;
          safetyStock?: number;
        };
      };
      reservedQty?: number;
      warehouse?: { name?: string };
    };
    return rawInventory.map((item: RawInventoryItem) => ({
      id: item.id,
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
      status: item.status || 'OK',
      warehouseId: item.warehouseId,
      warehouseName: item.warehouseName || item.warehouse?.name,
      lotNumber: item.lotNumber || null,
      expiryDate: item.expiryDate || null,
      locationCode: item.locationCode || null,
    })) as InventoryItem[];
  }, [rawInventory]);

  // Summary counts from API response (stored alongside pagination)
  const [summary, setSummary] = useState({ total: 0, critical: 0, reorder: 0, ok: 0 });

  // Fetch summary from the raw API response
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/inventory?page=1&pageSize=1');
        const result = await res.json();
        if (result.summary) {
          setSummary(result.summary);
        } else if (result.pagination) {
          setSummary(prev => ({ ...prev, total: result.pagination.totalItems }));
        }
      } catch {
        // Fallback: use local data
      }
    };
    fetchSummary();
  }, [rawInventory]);

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustData, setAdjustData] = useState<AdjustData>(DEFAULT_ADJUST_DATA);
  const [adjusting, setAdjusting] = useState(false);

  // Change Impact state
  const pendingUpdateRef = useRef<{
    rowId: string;
    field: string;
    value: string | number;
    oldValue: string | number | boolean | undefined;
    item: InventoryItem;
  } | null>(null);

  // Local optimistic state overlay
  const [localUpdates, setLocalUpdates] = useState<Record<string, Partial<InventoryItem>>>({});

  // Merge server data with local optimistic updates
  const displayInventory = useMemo(() => {
    if (Object.keys(localUpdates).length === 0) return inventory;
    return inventory.map(item => {
      const updates = localUpdates[item.id];
      return updates ? { ...item, ...updates } : item;
    });
  }, [inventory, localUpdates]);

  const changeImpact = useChangeImpact({
    onSuccess: () => {
      if (pendingUpdateRef.current) {
        const { rowId, field, value, item } = pendingUpdateRef.current;
        executeUpdate(rowId, field, value, item);
        pendingUpdateRef.current = null;
      }
    },
    onError: () => {
      if (pendingUpdateRef.current) {
        const { rowId, field, value, item } = pendingUpdateRef.current;
        executeUpdate(rowId, field, value, item);
        pendingUpdateRef.current = null;
      }
    },
  });

  const submitAdjustment = async () => {
    if (!adjustData.partId || !adjustData.warehouseId || !adjustData.quantity) {
      toast.error(t('inv.selectPartError'));
      return;
    }

    setAdjusting(true);
    try {
      const quantity = parseInt(adjustData.quantity);

      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: adjustData.partId,
          warehouseId: adjustData.warehouseId,
          adjustmentType: adjustData.adjustmentType === 'ADD' ? 'add' : 'subtract',
          quantity,
          reason: adjustData.reason || 'Manual adjustment',
        }),
      });

      if (res.ok) {
        toast.success(t('inv.adjustSuccess'));
        setAdjustDialogOpen(false);
        setAdjustData(DEFAULT_ADJUST_DATA);
        setLocalUpdates({});
        refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || t('inv.adjustFailed'));
      }
    } catch (error) {
      clientLogger.error('Adjustment failed', error);
      toast.error(t('inv.adjustFailed'));
    } finally {
      setAdjusting(false);
    }
  };

  // Execute the actual update (called after impact confirmation)
  const executeUpdate = async (rowId: string, field: string, value: string | number, item: InventoryItem) => {
    const oldValue = item[field as keyof InventoryItem];

    // Optimistic Update via local overlay
    setLocalUpdates(prev => ({ ...prev, [rowId]: { ...prev[rowId], [field]: value } }));

    try {
      if (field === 'quantity') {
        await fetch(`/api/inventory/${rowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: Number(value) }),
        });
        toast.success(t('inv.updateQtySuccess', { value: String(value) }));
      } else if (['minStockLevel', 'reorderPoint', 'safetyStock'].includes(field)) {
        await fetch(`/api/parts/${item.partId}/planning`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: Number(value) }),
        });
        toast.success(t('inv.updatePlanSuccess', { value: String(value) }));
      }
    } catch (error) {
      clientLogger.error('Update failed', error);
      toast.error(t('inv.updateFailed'));
      // Revert optimistic update
      setLocalUpdates(prev => {
        const copy = { ...prev };
        if (copy[rowId]) {
          const updated = { ...copy[rowId] };
          delete updated[field as keyof InventoryItem];
          if (Object.keys(updated).length === 0) delete copy[rowId];
          else copy[rowId] = updated;
        }
        return copy;
      });
    }
  };

  // Update Handler - with Change Impact check
  const handleUpdate = async (rowId: string, field: string, value: string | number) => {
    const item = displayInventory.find(i => i.id === rowId);
    if (!item) return;

    const oldValue = item[field as keyof InventoryItem];

    // Skip if value unchanged
    if (oldValue === value || Number(oldValue) === Number(value)) {
      return;
    }

    const fieldConfig = INVENTORY_FIELD_LABELS[field];
    if (!fieldConfig) {
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

    pendingUpdateRef.current = { rowId, field, value, oldValue, item };
    await changeImpact.checkImpact('inventory', rowId, changes);
  };

  // Column definitions
  const columns: Column<InventoryItem>[] = useMemo(() => [
    {
      key: 'partNumber',
      header: t('inv.partNumber'),
      width: '120px',
      sortable: true,
      sticky: 'left',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.partId ? (
            <EntityTooltip type="part" id={row.partId}>
              <Link href={`/inventory/${row.id}`} className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-help">
                {value}
              </Link>
            </EntityTooltip>
          ) : (
            <Link href={`/inventory/${row.id}`} className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:underline">
              {value}
            </Link>
          )}
          {row.isCritical && <AlertTriangle className="h-3 w-3 text-orange-500" />}
        </div>
      )
    },
    {
      key: 'name',
      header: t('inv.partName'),
      width: '180px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'lotNumber',
      header: 'Lot Number',
      width: '120px',
      sortable: true,
      render: (value) => value ? String(value) : <span className="text-slate-400">-</span>,
    },
    {
      key: 'warehouseName',
      header: t('inv.warehouse'),
      width: '120px',
      sortable: true,
      render: (value, row) => row.warehouseId ? (
        <EntityTooltip type="warehouse" id={row.warehouseId}>
          <span className="text-sm cursor-help">{value || '-'}</span>
        </EntityTooltip>
      ) : <span className="text-sm">{value || '-'}</span>,
    },
    {
      key: 'category',
      header: t('column.category'),
      width: '120px',
      sortable: true,
      hidden: true,
    },
    {
      key: 'unit',
      header: t('column.unit'),
      width: '70px',
      hidden: true,
    },
    {
      key: 'quantity',
      header: t('inv.quantity'),
      width: '100px',
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
      key: 'reserved',
      header: t('inv.reserved'),
      width: '90px',
      type: 'number',
      hidden: true,
      render: (value) => <span className="text-amber-600">{value}</span>,
    },
    {
      key: 'available',
      header: t('inv.available'),
      width: '100px',
      type: 'number',
      render: (value) => <span className="text-green-600 font-medium">{value}</span>,
    },
    {
      key: 'safetyStock',
      header: 'Safety Stock',
      width: '100px',
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
      header: t('column.status'),
      width: '120px',
      sortable: true,
      cellClassName: (_, row) => {
        const map: Record<string, string> = {
          OK: 'bg-green-100 dark:bg-green-900/30',
          REORDER: 'bg-amber-100 dark:bg-amber-900/30',
          CRITICAL: 'bg-red-100 dark:bg-red-900/30',
          OUT_OF_STOCK: 'bg-red-100 dark:bg-red-900/30',
        };
        return map[row.status] || '';
      },
      render: (_, row) => {
        const labels: Record<string, string> = {
          OK: t('inventoryStatus.ok'), REORDER: t('inventoryStatus.reorder'), CRITICAL: t('inventoryStatus.critical'), OUT_OF_STOCK: t('inventoryStatus.outOfStock'),
        };
        return <span className="text-xs font-medium">{labels[row.status] || row.status}</span>;
      },
    },
    {
      key: 'unitCost',
      header: t('column.unitCost'),
      width: '100px',
      type: 'currency',
      sortable: true,
      render: (val) => formatCurrency(val)
    },
  ], [displayInventory, t]);

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Header Area - COMPACT */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-semibold font-mono uppercase tracking-wider text-gray-900 dark:text-mrp-text-primary flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            {t('inv.pageTitle')}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-mrp-text-muted">{t('inv.pageDesc')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setLocalUpdates({}); refresh(); }}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {t('common.refresh')}
          </Button>
          <PermissionButton
            permission="inventory:adjust"
            size="sm"
            onClick={() => setAdjustDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Adjust
          </PermissionButton>
        </div>
      </div>

      <CompactStatsBar stats={[
        { label: t('inv.totalSKU'), value: summary.total },
        { label: t('inv.criticalOutOfStock'), value: summary.critical, color: 'text-red-600' },
        { label: t('inv.reorderNeeded'), value: summary.reorder, color: 'text-amber-600' },
        { label: t('inv.inStock'), value: summary.ok, color: 'text-green-600' },
      ]} />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <SmartGrid
          data={displayInventory}
          columns={columns}
          keyField="id"
          loading={loading}
          searchable
          pagination={false}
          virtualize
          virtualRowHeight={36}
          stickyHeader
          columnToggle
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

      {/* Adjust Inventory Dialog */}
      <InventoryAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        adjustData={adjustData}
        onAdjustDataChange={setAdjustData}
        adjusting={adjusting}
        onSubmit={submitAdjustment}
        displayInventory={displayInventory}
      />
    </div>
  );
}

export default InventoryTable;
